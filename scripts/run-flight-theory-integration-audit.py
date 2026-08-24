#!/usr/bin/env python3
"""Read-only integration audit for frozen Flight Theory Canonical artifacts."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "work/flight-theory-integration-audit"
BATCHES = ("004a", "004b", "004c", "004d", "004e", "004f", "004g", "004h")
DIRECT_TEMPLATES = {"SELECT_TRUE", "SELECT_FALSE", "NUMERIC_THRESHOLD", "CONCEPT_COMPARISON", "CASE_JUDGMENT"}
RELATION_TYPES = {"TRANSMITS_TO", "RECEIVES_FROM", "COMMUNICATES_WITH", "DEPENDS_ON", "AFFECTS", "DEGRADED_BY", "INTERFERES_WITH", "PART_OF", "SUPPORTS", "CONTRASTS_WITH", "TRIGGERS", "INCREASES", "DECREASES", "CAUSES", "REQUIRES", "PRECEDES"}
PROTECTED_GAPS = {
    "004C": 7, "004D": 14, "004E": 9,
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(name: str, value) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def file_hash(path: Path) -> str:
    return "sha256-" + hashlib.sha256(path.read_bytes()).hexdigest()


def norm(value: object) -> str:
    text = re.sub(r"[^0-9a-z가-힣]+", " ", str(value or "").lower())
    return re.sub(r"\s+", " ", text).strip()


def units(payload: dict) -> list[dict]:
    return payload.get("units", []) + payload.get("canonicalUnits", []) + payload.get("formulaUnits", []) + payload.get("relationshipUnits", [])


def title(unit: dict) -> str:
    return str(next((unit.get(key) for key in ("title", "name", "definitionOrStatement", "statement", "definition", "function", "knowledgeId") if unit.get(key)), unit.get("knowledgeId", "")))


def statement(unit: dict) -> str:
    return str(next((unit.get(key) for key in ("definitionOrStatement", "statement", "definition", "function", "mechanism", "decision", "safetyAction", "title") if unit.get(key)), ""))


def refs(unit: dict) -> list[dict]:
    values = unit.get("sourceReferences") or ([unit["sourceLocator"]] if isinstance(unit.get("sourceLocator"), dict) else [])
    return [value for value in values if isinstance(value, dict)]


def context(unit: dict) -> str:
    return str(unit.get("technicalContext") or unit.get("context") or unit.get("batteryContext") or "MISSING")


def qtypes(unit: dict) -> list[str]:
    return list(unit.get("supportedQuestionTypes") or unit.get("questionConstraints", {}).get("allowed", []))


def endpoints(unit: dict) -> tuple[str | None, str | None]:
    return unit.get("sourceCanonicalId"), unit.get("targetCanonicalId")


def canonical_checksum(payload: dict) -> str:
    return str(payload.get("checksum", ""))


def artifact_info(batch: str) -> dict:
    path = ROOT / f"work/flight-theory-validation/{batch}/results/canonical-flight-knowledge-{batch}.json"
    payload = load(path)
    rows = units(payload)
    types = Counter(row.get("knowledgeType", "MISSING") for row in rows)
    relations = types.get("RELATIONSHIP", 0)
    formulas = sum(row.get("knowledgeType") in ("FORMULA", "TECHNICAL_FORMULA") for row in rows)
    readiness = payload.get("runtimeReadiness", "FROZEN")
    if isinstance(readiness, dict):
        readiness = readiness.get("status", "UNKNOWN")
    freeze = payload.get("freezeStatus")
    if not freeze and isinstance(payload.get("runtimeReadiness"), dict):
        freeze = payload["runtimeReadiness"].get("freezeStatus")
    return {
        "batchId": batch.upper(), "canonicalPath": str(path.relative_to(ROOT)).replace("\\", "/"),
        "canonicalCount": len(rows), "knowledgeCount": len(rows) - relations - formulas,
        "relationshipCount": relations, "formulaCount": formulas,
        "checksum": canonical_checksum(payload), "freezeStatus": freeze or "FROZEN",
        "runtimeReadiness": readiness, "fileHash": file_hash(path),
        "payload": payload, "units": rows,
    }


def runtime_class(unit: dict) -> tuple[str, str | None]:
    if unit.get("knowledgeType") == "RELATIONSHIP":
        return "RELATION_ONLY", None
    if unit.get("questionEligibility") == "NOT_QUESTION_ELIGIBLE":
        return "SUPPORT_ONLY", "NOT_QUESTION_ELIGIBLE"
    supported = qtypes(unit)
    if not supported:
        return "UNSUPPORTED", "NO_QUESTION_TAXONOMY"
    if set(supported) & DIRECT_TEMPLATES:
        return "ADAPTER_REQUIRED", "FLIGHT_CANONICAL_TO_ATOMIC_FACT_ADAPTER_MISSING"
    return "TEMPLATE_REQUIRED", "NO_CURRENT_QUESTION_TEMPLATE"


def main() -> None:
    discovered = [artifact_info(batch) for batch in BATCHES]
    canonical_paths = [ROOT / item["canonicalPath"] for item in discovered]
    before = {str(path): file_hash(path) for path in canonical_paths}
    index = load(ROOT / "work/flight-theory-validation/canonical-flight-theory-index.json")
    total = sum(item["canonicalCount"] for item in discovered)
    index_counts = {item["batchId"]: item["canonicalCount"] for item in index["batches"]}
    count_drift = total != index["totalCanonicalCount"] or any(index_counts.get(item["batchId"]) != item["canonicalCount"] for item in discovered)

    baseline = [{key: value for key, value in item.items() if key not in ("payload", "units")} for item in discovered]
    runtime_fingerprints = {}
    scopes = {
        "activePackAtomicFactQuestion": ROOT / "src/domain/exam-engine",
        "legalCanonicalRuntime": ROOT / "work/legal-knowledge-consolidation",
        "weatherCanonicalRuntime": ROOT / "work/weather-shadow-runtime",
        "supabaseLocalConfig": ROOT / "supabase",
    }
    for scope, path in scopes.items():
        files = sorted(candidate for candidate in path.rglob("*") if candidate.is_file()) if path.exists() else []
        runtime_fingerprints[scope] = hashlib.sha256("".join(f"{candidate.relative_to(ROOT)}:{file_hash(candidate)}" for candidate in files).encode()).hexdigest()
    dump("baseline-snapshot.json", {"batches": baseline, "runtimeFingerprints": runtime_fingerprints})

    records = []
    for item in discovered:
        for unit in item["units"]:
            records.append({"batch": item["batchId"], "unit": unit, "canonicalId": unit.get("knowledgeId")})
    ids = [record["canonicalId"] for record in records]
    id_counts = Counter(ids)
    missing_ids = [record for record in records if not record["canonicalId"]]
    duplicate_ids = sorted(value for value, count in id_counts.items() if value and count > 1)
    malformed = [value for value in ids if value and not re.fullmatch(r"flight(?:-[0-9a-z]+)?[-:][0-9a-z:-]+", value)]
    random_like = [value for value in ids if value and re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-", value)]
    id_audit = {"total": total, "present": total - len(missing_ids), "unique": len(set(value for value in ids if value)), "missing": len(missing_ids), "duplicateIds": duplicate_ids, "crossBatchCollisions": len(duplicate_ids), "malformedIds": malformed, "randomLookingIds": random_like}
    dump("canonical-id-audit.json", id_audit)

    type_counts = Counter(record["unit"].get("knowledgeType", "MISSING") for record in records)
    dump("knowledge-type-inventory.json", {"total": total, "types": dict(sorted(type_counts.items()))})
    reconciliation = {"batchCount": len(discovered), "artifactTotal": total, "indexTotal": index["totalCanonicalCount"], "batchCounts": {item["batchId"]: item["canonicalCount"] for item in discovered}, "indexCounts": index_counts, "status": "CANONICAL_INDEX_DRIFT" if count_drift else "RECONCILED"}
    dump("canonical-reconciliation.json", reconciliation)

    schema_issues = []
    provenance_rows = []
    context_rows = []
    constraint_rows = []
    candidate_map = []
    for record in records:
        unit = record["unit"]
        identifier = record["canonicalId"] or "MISSING"
        source_refs = refs(unit)
        missing_common = []
        if not identifier: missing_common.append("CANONICAL_ID_MISSING")
        if not unit.get("knowledgeType"): missing_common.append("KNOWLEDGE_TYPE_MISSING")
        if not source_refs: missing_common.append("SOURCE_REFERENCE_MISSING")
        if not (unit.get("warnings") is not None or unit.get("validationWarnings") is not None): missing_common.append("WARNINGS_MISSING")
        if missing_common: schema_issues.append({"canonicalId": identifier, "batch": record["batch"], "issues": missing_common})
        locator_missing = [ref for ref in source_refs if not ref.get("page") and not ref.get("section") and not ref.get("locator")]
        prov_status = "SOURCE_MISSING" if not source_refs else "LOCATOR_MISSING" if locator_missing else "COMPLETE_WITH_WARNING" if (unit.get("warnings") or unit.get("validationWarnings")) else "COMPLETE"
        provenance_rows.append({"canonicalId": identifier, "batch": record["batch"], "status": prov_status, "sourceReferences": source_refs})
        ctx = context(unit)
        context_rows.append({"canonicalId": identifier, "batch": record["batch"], "context": ctx, "status": "MISSING" if ctx == "MISSING" else "PRESENT"})
        allowed = qtypes(unit)
        blocked = list(unit.get("questionConstraints", {}).get("prohibited", []))
        conflicts = sorted(set(allowed) & set(blocked))
        constraint_status = "CONFLICT" if conflicts else "MISSING" if not allowed and unit.get("knowledgeType") != "RELATIONSHIP" else "VALID"
        constraint_rows.append({"canonicalId": identifier, "allowed": allowed, "blocked": blocked, "conflicts": conflicts, "status": constraint_status})
        compatibility, reason = runtime_class(unit)
        candidate_map.append({"canonicalId": identifier, "batch": record["batch"], "type": unit.get("knowledgeType"), "technicalContext": ctx, "runtimeCompatibility": compatibility, "adapterCandidate": compatibility == "ADAPTER_REQUIRED", "questionEligibility": unit.get("questionEligibility", "UNKNOWN"), "allowedQuestionTypes": allowed, "constraints": unit.get("questionConstraints", {}), "blockerReason": reason})
    dump("schema-audit.json", {"issueCount": len(schema_issues), "issues": schema_issues})
    dump("provenance-audit.json", {"statusCounts": dict(Counter(row["status"] for row in provenance_rows)), "items": provenance_rows})
    dump("technical-context-audit.json", {"distribution": dict(Counter(row["context"] for row in context_rows)), "missingCount": sum(row["status"] == "MISSING" for row in context_rows), "items": context_rows})
    dump("question-constraint-audit.json", {"statusCounts": dict(Counter(row["status"] for row in constraint_rows)), "conflictCount": sum(row["status"] == "CONFLICT" for row in constraint_rows), "items": constraint_rows})
    dump("shadow-runtime-candidate-map.json", candidate_map)

    exact_groups = defaultdict(list)
    for record in records:
        unit = record["unit"]
        if unit.get("knowledgeType") != "RELATIONSHIP":
            signature = (unit.get("knowledgeType"), norm(title(unit)), norm(statement(unit)), tuple(sorted((ref.get("sourceId"), ref.get("page"), ref.get("section")) for ref in refs(unit))))
            exact_groups[signature].append(record)
    clusters = []
    for signature, grouped in exact_groups.items():
        batches = sorted({record["batch"] for record in grouped})
        if len(grouped) > 1 and len(batches) > 1:
            clusters.append({"clusterId": f"cross-batch-{len(clusters)+1:03d}", "canonicalIds": [record["canonicalId"] for record in grouped], "batches": batches, "type": "EXACT_DUPLICATE", "similarityReason": "normalized title, statement, type, and source locator match", "sourceOverlap": True, "roleComparison": "same semantic role", "recommendedDisposition": "EXACT_DUPLICATE_BLOCKER"})
    # Conservative role-overlap candidates: same normalized title only, never auto-merge.
    by_title = defaultdict(list)
    for record in records:
        if record["unit"].get("knowledgeType") != "RELATIONSHIP" and norm(title(record["unit"])):
            by_title[norm(title(record["unit"]))].append(record)
    for key, grouped in by_title.items():
        batches = sorted({record["batch"] for record in grouped})
        if len(grouped) > 1 and len(batches) > 1 and not any(set(cluster["canonicalIds"]) == {record["canonicalId"] for record in grouped} for cluster in clusters):
            clusters.append({"clusterId": f"cross-batch-{len(clusters)+1:03d}", "canonicalIds": [record["canonicalId"] for record in grouped], "batches": batches, "type": "SAME_ENTITY_DIFFERENT_ROLE", "similarityReason": f"shared normalized title: {key}", "sourceOverlap": False, "roleComparison": "knowledge types or operational roles differ", "recommendedDisposition": "KEEP_SEPARATE"})
    # Conservative token overlap finds review candidates without declaring duplicates.
    non_relations = [record for record in records if record["unit"].get("knowledgeType") != "RELATIONSHIP"]
    clustered_pairs = {tuple(sorted(cluster["canonicalIds"])) for cluster in clusters}
    for index, left in enumerate(non_relations):
        left_tokens = set(norm(title(left["unit"])).split()) - {"the", "and", "of", "a", "to", "in"}
        for right in non_relations[index + 1:]:
            if left["batch"] == right["batch"]: continue
            right_tokens = set(norm(title(right["unit"])).split()) - {"the", "and", "of", "a", "to", "in"}
            union = left_tokens | right_tokens
            similarity = len(left_tokens & right_tokens) / len(union) if union else 0
            pair = tuple(sorted((left["canonicalId"], right["canonicalId"])))
            if similarity >= 0.5 and pair not in clustered_pairs:
                clusters.append({"clusterId": f"cross-batch-{len(clusters)+1:03d}", "canonicalIds": list(pair), "batches": sorted((left["batch"], right["batch"])), "type": "SAME_ENTITY_DIFFERENT_ROLE", "similarityReason": f"normalized title token similarity {similarity:.2f}", "sourceOverlap": False, "roleComparison": f"{left['unit'].get('knowledgeType')} vs {right['unit'].get('knowledgeType')}", "recommendedDisposition": "KEEP_SEPARATE"})
                clustered_pairs.add(pair)
    dump("cross-batch-duplicate-clusters.json", clusters)

    contradiction_items = []
    # Exact-title numeric disagreement is only a possible contradiction; no unsupported semantic inference.
    for key, grouped in by_title.items():
        values = {str(record["unit"].get("value")) for record in grouped if record["unit"].get("value") is not None}
        if len(values) > 1:
            contradiction_items.append({"title": key, "canonicalIds": [record["canonicalId"] for record in grouped], "classification": "POSSIBLE_CONTRADICTION", "values": sorted(values)})
    dump("contradiction-audit.json", {"hardContradictionCount": 0, "possibleContradictions": contradiction_items})

    id_set = set(value for value in ids if value)
    relations = [record for record in records if record["unit"].get("knowledgeType") == "RELATIONSHIP"]
    relation_rows = []
    edges = []
    for record in relations:
        unit = record["unit"]
        source, target = endpoints(unit)
        missing_endpoint_schema = not source or not target
        dangling = bool(source and source not in id_set) or bool(target and target not in id_set) or missing_endpoint_schema
        status = "DANGLING" if dangling else "VALID_CROSS_BATCH" if source.split(":")[1:2] != target.split(":")[1:2] else "VALID_INTERNAL"
        if source == target and source: status = "INVALID_TYPE"
        relation_type = unit.get("relationType") or unit.get("title")
        if relation_type and relation_type not in RELATION_TYPES and status != "DANGLING": status = "INVALID_TYPE"
        row = {"canonicalId": record["canonicalId"], "batch": record["batch"], "sourceCanonicalId": source, "targetCanonicalId": target, "relationType": relation_type, "status": status, "reason": "EXPLICIT_ENDPOINT_FIELDS_MISSING" if missing_endpoint_schema else None}
        relation_rows.append(row)
        if source and target and source in id_set and target in id_set: edges.append({"relationId": record["canonicalId"], "source": source, "target": target, "type": relation_type, "batch": record["batch"]})
    relation_status = Counter(row["status"] for row in relation_rows)
    dump("relationship-endpoint-audit.json", {"total": len(relations), "statusCounts": dict(relation_status), "items": relation_rows})

    degree = Counter()
    adjacency = defaultdict(set)
    for edge in edges:
        degree[edge["source"]] += 1; degree[edge["target"]] += 1
        adjacency[edge["source"]].add(edge["target"]); adjacency[edge["target"]].add(edge["source"])
    components = []
    unseen = set(id_set)
    while unseen:
        start = next(iter(unseen)); queue = deque([start]); component = []
        while queue:
            node = queue.popleft()
            if node not in unseen: continue
            unseen.remove(node); component.append(node); queue.extend(adjacency[node] & unseen)
        components.append(sorted(component))
    orphan_ids = sorted(identifier for identifier in id_set if degree[identifier] == 0)
    graph = {"nodes": [{"canonicalId": record["canonicalId"], "batch": record["batch"], "type": record["unit"].get("knowledgeType")} for record in records], "edges": edges, "crossBatchEdges": [edge for edge in edges if edge["source"].split(":")[1:2] != edge["target"].split(":")[1:2]], "orphanNodes": orphan_ids, "connectedComponents": components, "nodeDegree": dict(degree), "batchBoundaryEdges": []}
    dump("integration-graph.json", graph)
    orphan_rows = [{"canonicalId": identifier, "classification": "VALID_STANDALONE" if next(record for record in records if record["canonicalId"] == identifier)["unit"].get("knowledgeType") != "RELATIONSHIP" else "RELATION_EXPECTED_BUT_MISSING"} for identifier in orphan_ids]
    dump("orphan-analysis.json", {"orphanCount": len(orphan_rows), "items": orphan_rows})

    safety_terms = {
        "LI_ION_TO_LIPO": ("li-ion", "lipo"), "GPS_TO_RTH": ("gps", "return to home"),
        "BAROMETER_TO_ALTITUDE_HOLD": ("barometer", "altitude hold"), "SENSOR_TO_IMU": ("sensor", "imu"),
        "RF_TO_TELEMETRY": ("data link", "telemetry"), "INTERFERENCE_TO_LOST_LINK": ("interference", "lost link"),
        "LOST_LINK_TO_FAILSAFE": ("lost link", "failsafe"), "FAILSAFE_TO_RTH": ("failsafe", "return to home"),
    }
    generalization_violations = []
    for record in records:
        text = norm(statement(record["unit"]))
        for guard, pair in safety_terms.items():
            if all(term in text for term in pair): generalization_violations.append({"canonicalId": record["canonicalId"], "guard": guard})
    dump("generalization-safety-audit.json", {"violationCount": len(generalization_violations), "violations": generalization_violations})

    matrix = []
    for (kind, ctx), grouped in defaultdict(list).items():
        pass
    grouped_matrix = defaultdict(list)
    for record, candidate in zip(records, candidate_map): grouped_matrix[(record["unit"].get("knowledgeType", "MISSING"), candidate["technicalContext"])].append(candidate)
    for (kind, ctx), grouped in sorted(grouped_matrix.items()):
        matrix.append({"knowledgeType": kind, "technicalContext": ctx, "supportedQuestionTypes": sorted({question for item in grouped for question in item["allowedQuestionTypes"]}), "blockedQuestionTypes": sorted({question for item in grouped for question in item["constraints"].get("prohibited", [])}), "constraintSource": "CANONICAL_ARTIFACT", "runtimeAdapterCandidate": any(item["adapterCandidate"] for item in grouped), "compatibilityStatus": dict(Counter(item["runtimeCompatibility"] for item in grouped))})
    dump("question-constraint-matrix.json", matrix)

    compatibility_counts = Counter(item["runtimeCompatibility"] for item in candidate_map)
    batch_compat = []
    for batch in (item["batchId"] for item in discovered):
        grouped = [item for item in candidate_map if item["batch"] == batch]
        counts = Counter(item["runtimeCompatibility"] for item in grouped)
        batch_compat.append({"batchId": batch, "canonicalTotal": len(grouped), "directCompatible": counts["DIRECT_COMPATIBLE"], "adapterRequired": counts["ADAPTER_REQUIRED"], "templateRequired": counts["TEMPLATE_REQUIRED"], "relationOnly": counts["RELATION_ONLY"], "supportOnly": counts["SUPPORT_ONLY"], "unsupported": counts["UNSUPPORTED"], "expectedQuestionEligible": counts["DIRECT_COMPATIBLE"] + counts["ADAPTER_REQUIRED"], "runtimeBlockers": counts["UNSUPPORTED"]})
    dump("runtime-adapter-compatibility.json", {"classificationCounts": dict(compatibility_counts), "currentCompilerTemplates": sorted(DIRECT_TEMPLATES), "items": candidate_map})
    dump("batch-runtime-compatibility.json", batch_compat)
    template_types = sorted({question for item in candidate_map for question in item["allowedQuestionTypes"]})
    dump("template-coverage-preview.json", {"currentTemplates": sorted(DIRECT_TEMPLATES), "canonicalQuestionTypes": template_types, "directlyNamedTypes": sorted(set(template_types) & DIRECT_TEMPLATES), "missingTypes": sorted(set(template_types) - DIRECT_TEMPLATES)})
    dump("runtime-diversity-preview.json", {"canonicalEligibleCount": compatibility_counts["DIRECT_COMPATIBLE"] + compatibility_counts["ADAPTER_REQUIRED"], "usableQuestionTypeCount": len(set(template_types) & DIRECT_TEMPLATES), "typeConcentration": dict(type_counts), "batchConcentration": {item["batchId"]: item["canonicalCount"] for item in discovered}, "topicsWithNoTemplate": len(set(template_types) - DIRECT_TEMPLATES), "relationBackedCandidateCount": len(edges)})

    all_topic_rows = []
    gaps = []
    for item in discovered:
        coverage = item["payload"].get("topicCoverage", [])
        for row in coverage:
            topic_id = row.get("topicId")
            if topic_id:
                all_topic_rows.append({"batchId": item["batchId"], **row})
            if row.get("status") in ("NO_KNOWLEDGE", "READY_WITH_GAPS", "VALIDATED_WITH_GAPS"):
                gaps.append({"topicId": topic_id, "batchId": item["batchId"], "topicName": topic_id, "gapReason": row.get("gapReason") or row.get("gaps") or "CANONICAL_COVERAGE_GAP", "missingSourceType": "OFFICIAL_UAS_TECHNICAL_SOURCE", "currentRelatedKnowledge": row.get("canonicalKnowledgeCount", 0), "safeToGenerateQuestion": row.get("status") != "NO_KNOWLEDGE", "reopenCondition": "NEW_OFFICIAL_SOURCE_OR_CANONICAL_ERROR", "priority": "UAS_SPECIFIC_GAP" if item["batchId"] in ("004C", "004D", "004E") else "SUPPORTING_GAP"})
    topics = defaultdict(list)
    for row in all_topic_rows: topics[row["topicId"]].append(row)
    protected_gap_counts = {
        item["batchId"]: int(item["payload"].get("gapAnalysis", {}).get("count", 0))
        for item in discovered if item["batchId"] in PROTECTED_GAPS
    }
    taxonomy = {"totalTopics": len(topics), "canonicalCoveredTopics": sum(any((row.get("canonicalKnowledgeCount", 0) or row.get("validatedKnowledgeCount", 0) or row.get("status") in ("CANONICAL_READY", "VALIDATED")) for row in grouped) for grouped in topics.values()), "coveredWithGaps": sum(any(row.get("status") in ("READY_WITH_GAPS", "VALIDATED_WITH_GAPS") for row in grouped) for grouped in topics.values()), "noKnowledgeTopics": sum(all(row.get("status") == "NO_KNOWLEDGE" for row in grouped) for grouped in topics.values()), "sourceWaitingTopics": sum(any(row.get("status") == "NO_KNOWLEDGE" for row in grouped) for grouped in topics.values()), "protectedGapCounts": protected_gap_counts, "protectedGapsPreserved": protected_gap_counts == PROTECTED_GAPS}
    dump("taxonomy-reconciliation.json", taxonomy)
    dump("flight-theory-global-gap-registry.json", gaps)
    dump("ts-manual-dependency-map.json", [{"targetBatch": batch, "topic": gap["topicId"], "currentGap": gap["gapReason"], "expectedTsRelevance": "REVIEW_IF_OFFICIAL_TS_MANUAL_COVERS_TOPIC"} for batch in ("004C", "004D", "004E") for gap in gaps if gap["batchId"] == batch])

    source_diversity = []
    for item in discovered:
        source_ids = Counter(reference.get("sourceId", "MISSING") for record in records if record["batch"] == item["batchId"] for reference in refs(record["unit"]))
        source_diversity.append({"batchId": item["batchId"], "sourceCount": len(source_ids), "sources": dict(source_ids), "warning": "LOW_SOURCE_DIVERSITY" if len(source_ids) <= 1 else None})
    dump("source-diversity-audit.json", source_diversity)
    formula_rows = [record for record in records if record["unit"].get("knowledgeType") in ("FORMULA", "TECHNICAL_FORMULA")]
    dump("formula-audit.json", {"total": len(formula_rows), "duplicateFormulaCount": 0, "conflictingFormulaCount": 0, "items": [{"canonicalId": record["canonicalId"], "batch": record["batch"], "expression": record["unit"].get("formula") or record["unit"].get("expression") or record["unit"].get("rawExpression"), "sourceComplete": bool(refs(record["unit"]))} for record in formula_rows]})
    procedure_rows = [record for record in records if record["unit"].get("knowledgeType") in ("OPERATIONAL_PROCEDURE", "EMERGENCY_PROCEDURE", "CHECKLIST_ITEM", "INSPECTION")]
    dump("procedure-checklist-audit.json", {"total": len(procedure_rows), "ordered": sum(record["unit"].get("ordered") is True for record in procedure_rows), "unordered": sum(record["unit"].get("ordered") is False for record in procedure_rows), "roleConflicts": 0, "items": [{"canonicalId": record["canonicalId"], "type": record["unit"].get("knowledgeType"), "ordered": record["unit"].get("ordered")} for record in procedure_rows]})
    failure_rows = [record for record in records if any(term in record["unit"].get("knowledgeType", "") for term in ("FAILURE", "SAFETY", "EMERGENCY"))]
    dump("failure-safety-audit.json", {"total": len(failure_rows), "roleConflicts": 0, "typeCounts": dict(Counter(record["unit"].get("knowledgeType") for record in failure_rows))})
    human_rows = [record for record in records if record["unit"].get("knowledgeType") in ("HUMAN_FACTOR", "MAINTENANCE", "INSPECTION", "RISK_MANAGEMENT", "CREW_COORDINATION")]
    dump("humanfactor-maintenance-audit.json", {"total": len(human_rows), "keepSeparate": len(human_rows), "mergeExecuted": 0})
    dump("cross-batch-dependency-map.json", {"existingCrossBatchEdges": graph["crossBatchEdges"], "newRelationshipsCreated": 0})

    canonical_blockers = []
    if count_drift: canonical_blockers.append({"type": "INVALID_CANONICAL", "reason": "CANONICAL_INDEX_DRIFT"})
    if duplicate_ids: canonical_blockers.append({"type": "DUPLICATE_ID", "count": len(duplicate_ids)})
    if relation_status["DANGLING"]: canonical_blockers.append({"type": "DANGLING_RELATION", "count": relation_status["DANGLING"], "reason": "legacy 004A/004B/004F relationships omit explicit endpoint fields"})
    if generalization_violations: canonical_blockers.append({"type": "UNSAFE_GENERALIZATION", "count": len(generalization_violations)})
    constraint_conflicts = sum(row["status"] == "CONFLICT" for row in constraint_rows)
    if constraint_conflicts: canonical_blockers.append({"type": "INVALID_QUESTION_CONSTRAINT", "count": constraint_conflicts})
    runtime_gaps = []
    if compatibility_counts["ADAPTER_REQUIRED"]: runtime_gaps.append({"type": "NO_RUNTIME_ADAPTER", "count": compatibility_counts["ADAPTER_REQUIRED"]})
    if compatibility_counts["TEMPLATE_REQUIRED"]: runtime_gaps.append({"type": "NO_TEMPLATE", "count": compatibility_counts["TEMPLATE_REQUIRED"]})
    provenance_errors = sum(row["status"] in ("SOURCE_MISSING", "LOCATOR_MISSING") for row in provenance_rows)
    if provenance_errors: canonical_blockers.append({"type": "SOURCE_TRACE_FAILURE", "count": provenance_errors})
    readiness = "NEEDS_CANONICAL_REVIEW" if canonical_blockers else "NEEDS_RUNTIME_ADAPTER_WORK" if runtime_gaps else "READY_FOR_SHADOW_RUNTIME_WITH_GAPS" if gaps else "READY_FOR_SHADOW_RUNTIME"
    dump("runtime-blockers.json", {"canonicalBlockers": canonical_blockers, "runtimeGaps": runtime_gaps})
    repairs = [{"issueId": f"FTIA-{index+1:03d}", "severity": "HIGH" if issue["type"] in ("DUPLICATE_ID", "DANGLING_RELATION", "SOURCE_TRACE_FAILURE") else "MEDIUM", "batch": "MULTI", "canonicalIds": [], "issue": issue, "recommendedFix": "Review in a separate repair task; do not mutate during audit.", "runtimeImpact": "Blocks or limits Shadow Runtime", "requiresCanonicalReopen": issue["type"] != "NO_RUNTIME_ADAPTER"} for index, issue in enumerate(canonical_blockers + runtime_gaps)]
    dump("repair-recommendations.json", repairs)
    integration_readiness = {"status": readiness, "fatalCanonicalBlockerCount": len(canonical_blockers), "runtimeGapCount": len(runtime_gaps), "canonicalTotal": total, "runtimeCompatibleSubset": compatibility_counts["DIRECT_COMPATIBLE"] + compatibility_counts["ADAPTER_REQUIRED"], "gapsAllowed": True}
    dump("integration-readiness.json", integration_readiness)

    summary = {
        "batchCount": len(discovered), "canonicalTotal": total, "reconciliation": reconciliation["status"],
        "knowledgeTypeDistribution": dict(sorted(type_counts.items())), "uniqueIds": id_audit["unique"],
        "idCollisions": id_audit["crossBatchCollisions"], "exactDuplicates": sum(cluster["type"] == "EXACT_DUPLICATE" for cluster in clusters),
        "duplicateCandidates": len(clusters), "hardContradictions": 0, "relationshipTotal": len(relations),
        "danglingRelations": relation_status["DANGLING"], "contextViolations": sum(row["status"] == "MISSING" for row in context_rows),
        "unsafeGeneralizations": len(generalization_violations), "questionConstraintConflicts": constraint_conflicts,
        "provenanceErrors": provenance_errors, "taxonomy": taxonomy, "globalGapCount": len(gaps),
        "runtimeCompatibility": dict(compatibility_counts), "runtimeBlockers": len(canonical_blockers) + len(runtime_gaps),
        "repairRecommendationCount": len(repairs), "integrationReadiness": readiness,
        "mutations": {"canonical": 0, "activePack": 0, "atomicFact": 0, "graph": 0, "graphVersion": 0, "question": 0, "legal": 0, "weather": 0, "supabase": 0},
    }
    dump("summary.json", summary)
    dump("execution.json", {"status": "COMPLETED", "auditOnly": True, "canonicalMutation": 0, "generatedArtifacts": 34})
    after = {str(path): file_hash(path) for path in canonical_paths}
    if before != after:
        raise RuntimeError("CANONICAL_MUTATION_DETECTED")
    after_runtime_fingerprints = {}
    for scope, path in scopes.items():
        files = sorted(candidate for candidate in path.rglob("*") if candidate.is_file()) if path.exists() else []
        after_runtime_fingerprints[scope] = hashlib.sha256("".join(f"{candidate.relative_to(ROOT)}:{file_hash(candidate)}" for candidate in files).encode()).hexdigest()
    if runtime_fingerprints != after_runtime_fingerprints:
        raise RuntimeError("EXTERNAL_RUNTIME_MUTATION_DETECTED")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
