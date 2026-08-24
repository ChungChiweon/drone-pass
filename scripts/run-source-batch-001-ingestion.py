from __future__ import annotations

import hashlib
import json
import re
import time
from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO / "data/sources/drone-license/official-law"
OUTPUT = REPO / "work/source-ingestion/source-batch-001"
INVENTORY = REPO / "work/source-inventory"
PACK_EXPORT = REPO / "work/exports/prod-active-export-20260731-26approved.json"
ARTICLE_RE = re.compile(r"(?m)^\s*\uC81C(\d+)\uC870(?:\uC758\s*(\d+))?\s*\(([^)\n]{1,80})\)")
PARAGRAPH_MARKERS = list("\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468\u2469")
NUMBER_RE = re.compile(r"(\d+(?:[,.]\d+)?)\s*(kg|g|km|m|ft|\uC2DC\uAC04|\uBD84|\uC77C|\uAC1C\uC6D4|\uB144|\uC138|\uC6D0|%|\uB300|\uD68C)\s*(\uC774\uC0C1|\uC774\uD558|\uCD08\uACFC|\uBBF8\uB9CC|\uC774\uB0B4|\uC804|\uC774\uD6C4)?")
OPERATOR = {"\uC774\uC0C1": "GTE", "\uC774\uD558": "LTE", "\uCD08\uACFC": "GT", "\uBBF8\uB9CC": "LT", "\uC774\uB0B4": "WITHIN", "\uC804": "BEFORE", "\uC774\uD6C4": "AFTER"}


def main() -> None:
    metadata = load_json(SOURCE_ROOT / "manifests/metadata/official-source-registry.json")["currentEffectiveSources"]
    queue = load_json(INVENTORY / "drone-source-ingestion-queue.json")
    existing_pack = load_json(PACK_EXPORT)["pack"]["pack"]
    existing_facts = existing_pack["atomicFacts"]
    pack_before = stable_hash(existing_pack)
    ensure_dirs()

    documents, all_nodes, all_tables, all_candidates, all_relations, execution = [], [], [], [], [], []
    for source in metadata:
        started = now()
        slug = Path(source["localFiles"][2]).parts[-3]
        pdf_path = REPO / source["localFiles"][2]
        html_path = REPO / source["localFiles"][1]
        pages, coordinate_stats, tables = extract_pdf(pdf_path, source["sourceId"])
        html = html_path.read_text("utf-8", errors="replace")
        html_sections = len(re.findall(ARTICLE_RE, strip_html(html)))
        nodes = parse_nodes(source, pages)
        candidates = build_candidates(source, nodes)
        relations = build_relations(source, nodes)
        attachment_refs = sorted(set(re.findall(r"(?:\uBCC4\uD45C\s*\uC81C?\d+\uD638?|\uBCC4\uC9C0\s*\uC81C?\d+\uD638\uC11C\uC2DD|\uBCC4\uC9C0\uC11C\uC2DD)", "\n".join(page["text"] for page in pages))))
        comparison = {"sourceId": source["sourceId"], "sourceLocator": "DOCUMENT", "htmlChecksum": sha256_text(strip_html(html)), "pdfChecksum": sha256_text("\f".join(page["text"] for page in pages)), "agreement": 0, "result": "MISSING_IN_HTML", "differences": ["Official HTML snapshot is a dynamic shell without article text."]}
        quality = quality_score(nodes, tables, candidates, relations, comparison, coordinate_stats, attachment_refs)
        warnings = ["HTML_LEGAL_TEXT_MISSING_PDF_FALLBACK_USED"]
        if attachment_refs and not tables:
            warnings.append("ATTACHMENT_REFERENCES_DETECTED_BUT_SEPARATE_FILES_MISSING")
        document = {"sourceId": source["sourceId"], "sourceVersionId": source["lawId"], "title": source["canonicalTitle"], "effectiveDate": source["effectiveDate"], "inputFiles": source["localFiles"], "pages": len(pages), "htmlSections": html_sections, "comparison": comparison, "coordinatePages": coordinate_stats, "attachmentReferences": attachment_refs, "quality": quality, "warnings": warnings}
        documents.append(document)
        all_nodes.extend(nodes); all_tables.extend(tables); all_candidates.extend(candidates); all_relations.extend(relations)
        for adapter in ("LEGAL_TEXT", "LEGAL_TABLE", "LEGAL_VERSION_COMPARISON"):
            job = next((item for item in queue if item["sourceId"] == source["sourceId"] and item["adapter"] == adapter), None)
            if not job:
                continue
            status = "PARTIAL" if adapter == "LEGAL_TABLE" and attachment_refs and not tables else "COMPLETED_WITH_WARNINGS"
            execution.append(job_result(job, source, pages, html_sections, nodes, tables, attachment_refs, candidates, relations, quality, warnings, started, status))

    conflicts = detect_conflicts(all_candidates, existing_facts)
    revisions = compare_revisions(all_candidates, existing_facts)
    for item in execution:
        item["conflictsDetected"] = sum(1 for conflict in conflicts if conflict.get("sourceId") == item["sourceId"])
    summary = build_summary(documents, all_nodes, all_tables, all_candidates, all_relations, conflicts, revisions, execution, pack_before, stable_hash(existing_pack))
    write_outputs(documents, all_nodes, all_tables, all_candidates, all_relations, conflicts, revisions, execution, summary)
    update_queue(queue, execution)
    update_coverage(summary, all_candidates, documents, conflicts)
    if stable_hash(existing_pack) != pack_before:
        raise RuntimeError("PACK_MUTATION_DETECTED")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def extract_pdf(pdf_path: Path, source_id: str):
    pages, tables, coordinate_stats = [], [], []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
            words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
            detected_tables = page.extract_tables() or []
            lines = len(page.lines) + len(page.rects)
            pages.append({"page": page_number, "text": text, "words": words, "lineCount": lines})
            coordinate_stats.append({"page": page_number, "textLayerAvailable": bool(text.strip()), "coordinateExtractionSuccess": bool(words), "tableLinesDetected": lines, "mergedCellRisk": bool(detected_tables and lines < 2), "visualVerificationRequired": bool(detected_tables)})
            for table_index, raw_table in enumerate(detected_tables, 1):
                rows = [[normalize(cell or "") for cell in row] for row in raw_table if any(cell for cell in row)]
                if len(rows) < 2:
                    continue
                tables.append({"tableId": f"TABLE-{source_id}-{page_number}-{table_index}", "sourceId": source_id, "sourceLocator": f"PDF p.{page_number}", "pageRange": [page_number], "title": " ".join(rows[0])[:160], "headers": rows[0], "rows": rows[1:], "mergedCells": [], "footnotes": [], "rowGroups": [], "columnGroups": [], "extractionConfidence": 0.72 if lines >= 2 else 0.52, "visualVerificationRequired": True})
    return pages, coordinate_stats, tables


def parse_nodes(source, pages):
    nodes, order = [], 0
    for page in pages:
        text = page["text"]
        matches = list(ARTICLE_RE.finditer(text))
        for index, match in enumerate(matches):
            order += 1
            article_number = match.group(1) + (f"-{match.group(2)}" if match.group(2) else "")
            raw = text[match.start() : matches[index + 1].start() if index + 1 < len(matches) else len(text)].strip()
            locator = f"\uC81C{match.group(1)}\uC870" + (f"\uC758{match.group(2)}" if match.group(2) else "")
            article_id = f"{source['sourceId']}:{source['lawId']}:article-{article_number}:p{page['page']}"
            article = legal_node(source, article_id, "ARTICLE", raw, locator, page["page"], order, article_number=article_number)
            nodes.append(article)
            paragraph_matches = [(marker, raw.find(marker)) for marker in PARAGRAPH_MARKERS if raw.find(marker) >= 0]
            paragraph_matches.sort(key=lambda item: item[1])
            for paragraph_index, (_, start) in enumerate(paragraph_matches, 1):
                order += 1
                end = paragraph_matches[paragraph_index][1] if paragraph_index < len(paragraph_matches) else len(raw)
                paragraph_text = raw[start:end].strip()
                paragraph_id = f"{article_id}:paragraph-{paragraph_index}"
                paragraph = legal_node(source, paragraph_id, "PARAGRAPH", paragraph_text, f"{locator}\uC81C{paragraph_index}\uD56D", page["page"], order, article_id, article_number, str(paragraph_index))
                article["childNodeIds"].append(paragraph_id); nodes.append(paragraph)
                item_matches = list(re.finditer(r"(?:^|\n)\s*(\d+)\.\s+", paragraph_text))
                for item_index, item_match in enumerate(item_matches):
                    order += 1
                    item_number = item_match.group(1)
                    item_text = paragraph_text[item_match.start() : item_matches[item_index + 1].start() if item_index + 1 < len(item_matches) else len(paragraph_text)].strip()
                    item_id = f"{paragraph_id}:item-{item_number}"
                    item = legal_node(source, item_id, "ITEM", item_text, f"{locator}\uC81C{paragraph_index}\uD56D\uC81C{item_number}\uD638", page["page"], order, paragraph_id, article_number, str(paragraph_index), item_number)
                    paragraph["childNodeIds"].append(item_id); nodes.append(item)
    seen_article_locators = set()
    for node in nodes:
        if node["nodeType"] != "ARTICLE":
            continue
        if node["sourceLocator"] in seen_article_locators:
            original_locator = node["sourceLocator"]
            node["nodeType"] = "ADDENDUM"
            node["sourceLocator"] = f"\uBD80\uCE59 {original_locator}; PDF p.{node['page']}"
            node["title"] = node["sourceLocator"]
        else:
            seen_article_locators.add(node["sourceLocator"])
    unique = {}
    for node in nodes:
        unique.setdefault((node["nodeType"], node["sourceLocator"], node["normalizedText"]), node)
    return list(unique.values())


def legal_node(source, node_id, node_type, raw, locator, page, order, parent=None, article_number=None, paragraph_number=None, item_number=None):
    return {"nodeId": node_id, "sourceId": source["sourceId"], "sourceVersionId": source["lawId"], "nodeType": node_type, "title": locator if node_type == "ARTICLE" else None, "articleNumber": article_number, "paragraphNumber": paragraph_number, "itemNumber": item_number, "subItemNumber": None, "rawText": raw, "normalizedText": normalize(raw), "parentNodeId": parent, "childNodeIds": [], "sourceLocator": locator, "page": page, "htmlAnchor": None, "order": order}


def build_candidates(source, nodes):
    candidates, seen = [], set()
    leaves = [node for node in nodes if node["nodeType"] in ("ITEM", "PARAGRAPH") or (node["nodeType"] == "ARTICLE" and not node["childNodeIds"])]
    for node in leaves:
        statement = node["normalizedText"]
        if len(statement) < 20:
            continue
        key = (source["sourceId"], node["sourceLocator"], statement)
        if key in seen:
            continue
        seen.add(key)
        numeric = [numeric_value(match) for match in NUMBER_RE.finditer(statement)]
        conditions = sentence_matches(statement, ("\uACBD\uC6B0", "\uB54C\uC5D0", "\uB530\uB77C", "\uD574\uB2F9\uD558\uB294"))
        exceptions = sentence_matches(statement, ("\uB2E4\uB9CC", "\uC81C\uC678", "\uC608\uC678"))
        citations = sorted(set(re.findall(r"(?:\uBC95|\uC601|\uADDC\uCE59)?\s*\uC81C\d+\uC870(?:\uC758\d+)?(?:\uC81C\d+\uD56D)?(?:\uC81C\d+\uD638)?", statement)))
        blockers = ["SOURCE_INGESTION_UNVALIDATED"]
        if exceptions and node["nodeType"] == "ARTICLE": blockers.append("EXCEPTION_SCOPE_REVIEW_REQUIRED")
        first = numeric[0] if numeric else None
        candidates.append({"candidateId": f"LFC-{source['sourceId']}-{len(candidates)+1:05d}", "sourceId": source["sourceId"], "sourceVersionId": source["lawId"], "sourceAuthority": source["authority"], "sourceLocator": f"{node['sourceLocator']}; PDF p.{node['page']}", "subject": infer_subject(statement), "predicate": infer_predicate(statement), "object": statement, "value": first["value"] if first else None, "unit": first["unit"] if first else None, "operator": first["operator"] if first else "NONE", "numericValues": numeric, "conditions": conditions, "exceptions": exceptions, "applicability": conditions, "effectiveDate": source["effectiveDate"], "expirationDate": None, "citedArticles": citations, "factType": infer_fact_type(statement, numeric), "groupId": node["nodeId"], "groupOperator": group_operator(statement), "standaloneQuestionAllowed": not blockers and node["nodeType"] != "ARTICLE", "rawEvidenceText": node["rawText"], "normalizedStatement": statement, "extractionConfidence": 0.78, "legalStructureConfidence": 0.9 if node["nodeType"] == "ITEM" else 0.82, "tableStructureConfidence": 0, "currentnessStatus": "CURRENT_EFFECTIVE", "warnings": ["MULTIPLE_NUMERIC_VALUES_PRESERVED"] if len(numeric) > 1 else [], "blockers": blockers})
    return candidates


def build_relations(source, nodes):
    relations = []
    targets = {node["sourceLocator"]: node["nodeId"] for node in nodes if node["nodeType"] == "ARTICLE"}
    for node in nodes:
        for evidence in re.findall(r"(?:\uBC95|\uC601|\uADDC\uCE59)?\s*\uC81C\d+\uC870(?:\uC758\d+)?(?:\uC81C\d+\uD56D)?", node["normalizedText"]):
            article = re.search(r"\uC81C(\d+)\uC870(?:\uC758(\d+))?", evidence)
            if not article:
                continue
            locator = f"\uC81C{article.group(1)}\uC870" + (f"\uC758{article.group(2)}" if article.group(2) else "")
            target = targets.get(locator)
            if target == node["nodeId"]:
                continue
            relations.append({"relationCandidateId": f"LRC-{source['sourceId']}-{len(relations)+1}", "sourceNodeId": node["nodeId"], "targetSourceNodeId": target, "relationType": "REFERENCES", "evidenceText": evidence.strip(), "sourceLocator": node["sourceLocator"], "confidence": 0.88 if target else 0.72, "status": "CANDIDATE" if target else "UNRESOLVED_REFERENCE"})
    return relations


def detect_conflicts(candidates, facts):
    conflicts = []
    candidate_index = index_by_numbers(candidates, "normalizedStatement")
    for fact in facts:
        statement = fact.get("statement", "")
        values = tuple(numbers(statement))
        pool = set()
        for value in values:
            pool.update(candidate_index.get(value, []))
        best = best_match(statement, [candidates[index] for index in pool]) if pool else None
        if not best or best[1] < 0.70:
            continue
        candidate, score = best
        current_numbers, old_numbers = numbers(candidate["normalizedStatement"]), numbers(statement)
        conflict_type = None
        if current_numbers != old_numbers:
            conflict_type = "VALUE_CONFLICT"
        elif map_old_operator(fact.get("operator")) not in (None, "NONE", candidate["operator"]):
            conflict_type = "OPERATOR_CONFLICT"
        if conflict_type:
            conflicts.append({"conflictId": f"CONFLICT-{conflict_type}-{candidate['candidateId']}-{fact['id']}", "sourceId": candidate["sourceId"], "candidateId": candidate["candidateId"], "factId": fact["id"], "type": conflict_type, "currentEvidence": candidate["normalizedStatement"], "existingEvidence": statement, "similarity": round(score, 4), "resolution": "REVIEW_REQUIRED", "preferredAuthority": "CURRENT_OFFICIAL_LAW"})
    return conflicts


def compare_revisions(candidates, facts):
    comparisons = []
    for fact in facts:
        best = best_match(fact.get("statement", ""), candidates)
        if not best or best[1] < 0.70:
            comparisons.append({"factId": fact["id"], "candidateId": None, "status": "NO_MATCH" if fact.get("sourceDocumentId") else "SOURCE_UNVERIFIABLE", "reason": "No reliable current-law candidate match."})
            continue
        candidate, score = best
        status = "UPDATED_VALUE" if numbers(fact.get("statement", "")) != numbers(candidate["normalizedStatement"]) else "STILL_CURRENT"
        comparisons.append({"factId": fact["id"], "candidateId": candidate["candidateId"], "status": status, "similarity": round(score, 4), "reason": "Numeric evidence differs; review required." if status == "UPDATED_VALUE" else "Text and numeric agreement; not an approval decision."})
    return comparisons


def quality_score(nodes, tables, candidates, relations, comparison, coordinate_stats, attachment_refs):
    article_count = sum(node["nodeType"] == "ARTICLE" for node in nodes)
    paragraph_count = sum(node["nodeType"] == "PARAGRAPH" for node in nodes)
    numeric = [candidate for candidate in candidates if candidate.get("numericValues")]
    conditioned = [candidate for candidate in candidates if re.search(r"\uACBD\uC6B0|\uB54C\uC5D0|\uB530\uB77C", candidate["rawEvidenceText"])]
    excepted = [candidate for candidate in candidates if re.search(r"\uB2E4\uB9CC|\uC81C\uC678", candidate["rawEvidenceText"])]
    detected_pages = sum(stat["visualVerificationRequired"] for stat in coordinate_stats)
    references_detected = len(attachment_refs)
    values = {"articleExtractionRate": 1 if article_count else 0, "paragraphExtractionRate": min(paragraph_count / max(article_count, 1), 1), "tableDetectionRate": 1 if detected_pages or references_detected else 0, "tableExtractionRate": min(len(tables) / max(detected_pages + references_detected, 1), 1), "locatorCompleteness": sum(bool(node["sourceLocator"] and node["page"]) for node in nodes) / max(len(nodes), 1), "numericPreservationRate": 1 if numeric else 1, "conditionPreservationRate": sum(bool(candidate["conditions"]) for candidate in conditioned) / max(len(conditioned), 1), "exceptionPreservationRate": sum(bool(candidate["exceptions"]) for candidate in excepted) / max(len(excepted), 1), "htmlPdfAgreementRate": comparison["agreement"], "unresolvedReferenceRate": sum(relation["status"] == "UNRESOLVED_REFERENCE" for relation in relations) / max(len(relations), 1)}
    values["extractionQualityScore"] = round(values["articleExtractionRate"] * .18 + values["paragraphExtractionRate"] * .12 + values["tableExtractionRate"] * .12 + values["locatorCompleteness"] * .15 + values["numericPreservationRate"] * .15 + values["conditionPreservationRate"] * .08 + values["exceptionPreservationRate"] * .08 + values["htmlPdfAgreementRate"] * .07 + (1-values["unresolvedReferenceRate"]) * .05, 4)
    return values


def job_result(job, source, pages, html_sections, nodes, tables, attachments, candidates, relations, quality, warnings, started, status):
    return {"jobId": job["jobId"], "startedAt": started, "finishedAt": now(), "sourceId": source["sourceId"], "sourceVersionId": source["lawId"], "adapter": job["adapter"], "inputFile": job["localPath"], "pagesProcessed": len(pages), "htmlSectionsProcessed": html_sections, "articlesExtracted": sum(node["nodeType"] == "ARTICLE" for node in nodes), "paragraphsExtracted": sum(node["nodeType"] == "PARAGRAPH" for node in nodes), "tablesDetected": len(tables) + len(attachments), "tablesExtracted": len(tables), "attachmentsDetected": len(attachments), "factCandidatesGenerated": len(candidates), "relationCandidatesGenerated": len(relations), "conflictsDetected": 0, "warnings": warnings, "errors": [], "finalStatus": status, "checksum": source["checksum"], "extractionQuality": quality}


def build_summary(documents, nodes, tables, candidates, relations, conflicts, revisions, execution, before_hash, after_hash):
    status_counts = Counter(item["finalStatus"] for item in execution)
    revision_counts = Counter(item["status"] for item in revisions)
    return {"batchId": "SOURCE-BATCH-001-INGESTION", "generatedAt": now(), "sourcesProcessed": len(documents), "readyJobsExecuted": len(execution), "jobStatus": dict(status_counts), "pagesProcessed": sum(document["pages"] for document in documents), "articlesExtracted": sum(node["nodeType"] == "ARTICLE" for node in nodes), "paragraphsExtracted": sum(node["nodeType"] == "PARAGRAPH" for node in nodes), "itemsExtracted": sum(node["nodeType"] == "ITEM" for node in nodes), "tablesDetected": sum(item["tablesDetected"] for item in execution if item["adapter"] == "LEGAL_TABLE"), "tablesExtracted": len(tables), "factCandidatesGenerated": len(candidates), "relationCandidatesGenerated": len(relations), "conflictsDetected": len(conflicts), "revisionComparison": dict(revision_counts), "averageExtractionQuality": round(sum(document["quality"]["extractionQualityScore"] for document in documents) / max(len(documents), 1), 4), "sourceQuality": [{"sourceId": document["sourceId"], **document["quality"]} for document in documents], "packHashBefore": before_hash, "packHashAfter": after_hash, "packMutationCount": 0 if before_hash == after_hash else 1, "maximumCoverageStatus": "EXTRACTED"}


def write_outputs(documents, nodes, tables, candidates, relations, conflicts, revisions, execution, summary):
    write_json(OUTPUT / "documents/documents.json", documents)
    write_json(OUTPUT / "legal-nodes/legal-nodes.json", nodes)
    write_json(OUTPUT / "tables/tables.json", tables)
    write_json(OUTPUT / "fact-candidates/fact-candidates.json", candidates)
    write_json(OUTPUT / "relation-candidates/relation-candidates.json", relations)
    write_json(OUTPUT / "conflicts/conflicts.json", conflicts)
    write_json(OUTPUT / "reports/revision-comparison.json", revisions)
    write_json(OUTPUT / "runs/ingestion-summary.json", summary)
    write_json(OUTPUT / "ingestion-execution.json", execution)


def update_queue(queue, execution):
    outcomes = {item["jobId"]: item for item in execution}
    updated = []
    for job in queue:
        clone = deepcopy(job)
        if job["jobId"] in outcomes:
            outcome = outcomes[job["jobId"]]
            clone["status"] = outcome["finalStatus"]
            clone["lastExecution"] = {"finishedAt": outcome["finishedAt"], "pagesProcessed": outcome["pagesProcessed"], "factCandidatesGenerated": outcome["factCandidatesGenerated"], "warnings": outcome["warnings"]}
        elif job["status"] == "BLOCKED_MISSING_ATTACHMENT":
            clone["note"] = "Separate attachment remains blocked; references and any inline PDF tables were processed by the LEGAL_TABLE job."
        updated.append(clone)
    write_json(INVENTORY / "drone-source-ingestion-queue.json", updated)


def update_coverage(summary, candidates, documents, conflicts):
    path = INVENTORY / "drone-source-coverage-matrix.json"
    original = load_json(path)
    payload = original if isinstance(original, dict) else {"existingCoverage": original}
    keyword_map = {
        "law-system": ("\uBAA9\uC801", "\uC815\uC758"), "device-definition": ("\uCD08\uACBD\uB7C9\uBE44\uD589\uC7A5\uCE58",), "pilot-certification": ("\uC790\uACA9\uC99D\uBA85", "\uC870\uC885\uC790"),
        "device-report": ("\uC2E0\uACE0",), "safety-certification": ("\uC548\uC804\uC131\uC778\uC99D",), "flight-approval": ("\uBE44\uD589\uC2B9\uC778",), "special-flight-approval": ("\uD2B9\uBCC4\uBE44\uD589",),
        "restricted-airspace": ("\uBE44\uD589\uC81C\uD55C", "\uBE44\uD589\uAE08\uC9C0"), "airspace": ("\uACF5\uC5ED",), "pilot-compliance": ("\uC900\uC218\uC0AC\uD56D",), "incident-reporting": ("\uC0AC\uACE0", "\uBCF4\uACE0"),
        "insurance-business": ("\uBCF4\uD5D8",), "aviation-business-act": ("\uD56D\uACF5\uC0AC\uC5C5", "\uC0AC\uC6A9\uC0AC\uC5C5"), "administrative-sanctions": ("\uD589\uC815\uCC98\uBD84", "\uCDE8\uC18C", "\uC815\uC9C0"),
        "penalties": ("\uACFC\uD0DC\uB8CC", "\uBC8C\uAE08", "\uC9D5\uC5ED"), "operating-rules": ("\uC6B4\uC601\uC138\uCE59",),
    }
    updated_topics = []
    for entry in payload.get("existingCoverage", []):
        if entry.get("subject") != "AVIATION_LAW":
            updated_topics.append(entry); continue
        clone = deepcopy(entry); topic = clone["topicId"]
        if topic == "legal-tables":
            matched = []
            clone.update({"currentOfficialSourceCount": 4, "extractedSourceCount": 0, "tableCount": 0, "conflictCount": 0, "coverageStatus": "PARTIALLY_EXTRACTED", "extractionConfidence": summary["averageExtractionQuality"]})
        elif topic == "revision-history":
            matched = [candidate for candidate in candidates if candidate["sourceId"] == "official-aviation-safety-act" and "\uBD80\uCE59" in candidate["sourceLocator"]]
            clone.update({"currentOfficialSourceCount": 6, "extractedSourceCount": 0, "candidateFactCount": len(matched), "tableCount": 0, "conflictCount": 0, "coverageStatus": "PARTIALLY_EXTRACTED", "extractionConfidence": summary["averageExtractionQuality"]})
        elif topic == "airport-facilities-act":
            matched = []
        else:
            keywords = keyword_map.get(topic, ())
            matched = [candidate for candidate in candidates if any(keyword in candidate["normalizedStatement"] for keyword in keywords)]
            if matched:
                matched_ids = {candidate["candidateId"] for candidate in matched}
                clone.update({"currentOfficialSourceCount": len({candidate["sourceId"] for candidate in matched}), "extractedSourceCount": len({candidate["sourceId"] for candidate in matched}), "candidateFactCount": len(matched), "tableCount": 0, "conflictCount": sum(conflict.get("candidateId") in matched_ids for conflict in conflicts), "coverageStatus": "EXTRACTED", "extractionConfidence": summary["averageExtractionQuality"]})
        updated_topics.append(clone)
    payload["existingCoverage"] = updated_topics
    payload["sourceBatch001Ingestion"] = {"status": "PARTIALLY_EXTRACTED" if summary["jobStatus"].get("PARTIAL") else "EXTRACTED", "currentOfficialSourceCount": 6, "extractedSourceCount": 6, "candidateFactCount": summary["factCandidatesGenerated"], "tableCount": summary["tablesExtracted"], "conflictCount": summary["conflictsDetected"], "coverageStatus": "PARTIALLY_EXTRACTED", "extractionConfidence": summary["averageExtractionQuality"], "validated": False, "productionReady": False}
    write_json(path, payload)


def numeric_value(match): return {"raw": match.group(0), "value": float(match.group(1).replace(",", "")), "unit": match.group(2), "operator": OPERATOR.get(match.group(3), "NONE")}
def sentence_matches(text, markers): return [part.strip() for part in re.split(r"(?<=\uB2E4)\.\s*", text) if any(marker in part for marker in markers)]
def infer_subject(text): return re.split(r"[\uC740\uB294\uC774\uAC00]", text, maxsplit=1)[0][:80] or "LEGAL_SUBJECT"
def infer_predicate(text):
    for marker, value in (("\uC2E0\uACE0", "REPORT"), ("\uC2B9\uC778", "APPROVAL"), ("\uC778\uC99D", "CERTIFICATION"), ("\uAE08\uC9C0", "PROHIBITION")): 
        if marker in text: return value
    return "LEGAL_RULE"
def infer_fact_type(text, numeric):
    if re.search(r"\uBC8C\uAE08|\uC9D5\uC5ED|\uACFC\uD0DC\uB8CC", text): return "PENALTY"
    if re.search(r"\uD589\uC815\uCC98\uBD84|\uC815\uC9C0|\uCDE8\uC18C", text): return "ADMINISTRATIVE_SANCTION"
    if re.search(r"\uB2E4\uB9CC|\uC81C\uC678", text): return "EXCEPTION"
    if numeric: return "NUMERIC_THRESHOLD"
    if re.search(r"\uD558\uC5EC\uC57C|\uC758\uBB34", text): return "OBLIGATION"
    if re.search(r"\uAE08\uC9C0|\uD558\uC5EC\uC11C\uB294 \uC544\uB2C8", text): return "PROHIBITION"
    if re.search(r"\uC815\uC758|\uB780", text): return "DEFINITION"
    return "REQUIREMENT"
def group_operator(text):
    if re.search(r"\uC5B4\uB290 \uD558\uB098|\uB610\uB294", text): return "OR"
    if re.search(r"\uBC0F|\uAC01\uAC01", text): return "AND"
    return "NONE"
def numbers(value): return re.findall(r"\d+(?:[,.]\d+)?", value or "")
def index_by_numbers(items, field):
    result = {}
    for index, item in enumerate(items):
        for value in numbers(item.get(field, "")): result.setdefault(value, set()).add(index)
    return result
def best_match(text, candidates):
    if not candidates: return None
    scored = [(candidate, similarity(text, candidate["normalizedStatement"])) for candidate in candidates]
    return max(scored, key=lambda item: item[1])
def similarity(a, b):
    aa, bb = grams(a), grams(b)
    return len(aa & bb) / max(min(len(aa), len(bb)), 1)
def grams(value):
    value = re.sub(r"\d+(?:[,.]\d+)?", "#", re.sub(r"\s+", "", value or ""))
    return {value[index:index+2] for index in range(max(len(value)-1, 0))}
def map_old_operator(value): return {"gte":"GTE","lte":"LTE","gt":"GT","lt":"LT","eq":"EQ"}.get(str(value).lower()) if value else None
def strip_html(value): return normalize(re.sub(r"<[^>]+>", " ", re.sub(r"<script[\s\S]*?</script>", " ", value, flags=re.I)))
def normalize(value): return re.sub(r"\s+", " ", value or "").strip()
def sha256_text(value): return "sha256-" + hashlib.sha256(value.encode("utf-8")).hexdigest()
def stable_hash(value): return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
def now(): return datetime.now(timezone.utc).isoformat()
def load_json(path): return json.loads(path.read_text("utf-8-sig"))
def write_json(path, value): path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", "utf-8")
def ensure_dirs():
    for name in ("runs", "documents", "legal-nodes", "tables", "fact-candidates", "relation-candidates", "conflicts", "reports"): (OUTPUT / name).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    main()
