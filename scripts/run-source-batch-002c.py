#!/usr/bin/env python3
"""Finalize the five remaining table packets and prepare legal-validation input.

This is read-only with respect to Pack, Fact, Graph and question state. Explicit
human table decisions are never fabricated.
"""
from __future__ import annotations

import json
import re
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
B1 = ROOT / "work/source-ingestion/source-batch-001"
B2A = ROOT / "work/source-ingestion/source-batch-002a"
B2B = ROOT / "work/source-ingestion/source-batch-002b"
OUT = ROOT / "work/source-ingestion/source-batch-002c"
PACKETS = OUT / "table-review-packets"
LEGAL = ROOT / "work/legal-validation"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def annex(table_id: str) -> int:
    return int(re.search(r":attachment:(\d+):", table_id).group(1))


def make_packet(item: dict[str, Any], table: dict[str, Any], overlay: dict[str, Any], renders: list[dict[str, Any]]) -> dict[str, Any]:
    packet_dir = PACKETS / item["tableId"].replace(":", "_")
    packet_dir.mkdir(parents=True, exist_ok=True)
    pages = [render for render in renders if render["annex"] == annex(item["tableId"])]
    images = []
    for render in pages:
        source = ROOT / render["localPath"]
        destination = packet_dir / source.name
        shutil.copyfile(source, destination)
        with Image.open(source) as original:
            image = original.convert("RGB")
            draw = ImageDraw.Draw(image)
            boundary = render.get("tableBoundary")
            if boundary:
                draw.rectangle((boundary["x"], boundary["y"], boundary["x"] + boundary["width"], boundary["y"] + boundary["height"]), outline="red", width=3)
            for y in render.get("horizontalLines", []): draw.line((0, y, image.width, y), fill="blue", width=1)
            for x in render.get("verticalLines", []): draw.line((x, 0, x, image.height), fill="green", width=1)
            overlay_path = packet_dir / f"{source.stem}-overlay.png"
            image.save(overlay_path)
            crop_path = packet_dir / f"{source.stem}-unresolved-region.png"
            image.crop((0, max(0, int(image.height * .45)), image.width, image.height)).save(crop_path)
            marker_crop = None
            note_crop = None
            if annex(item["tableId"]) == 6 and render["page"] == 2:
                marker_crop = packet_dir / "annex-06-marker-area.png"
                note_crop = packet_dir / "annex-06-note-block.png"
                image.crop((0, int(image.height * .52), image.width, image.height)).save(marker_crop)
                image.crop((0, int(image.height * .60), image.width, image.height)).save(note_crop)
            images.append({"page": render["page"], "officialImage": str(destination.relative_to(ROOT)).replace("\\", "/"), "overlayImage": str(overlay_path.relative_to(ROOT)).replace("\\", "/"), "unresolvedRegionCrop": str(crop_path.relative_to(ROOT)).replace("\\", "/"), "markerCrop": str(marker_crop.relative_to(ROOT)).replace("\\", "/") if marker_crop else None, "noteBlockCrop": str(note_crop.relative_to(ROOT)).replace("\\", "/") if note_crop else None, "officialSourceUrl": render["officialSourceUrl"], "checksum": render["checksum"]})
    questions = ["파란/초록 좌표선이 원본 표의 행·열 경계를 정확히 따르는가?"]
    if annex(item["tableId"]) == 6:
        questions += ["첫 번째 * 비고는 무인비행기·무인수직이착륙기·무인비행선 행에만 적용되는가?", "두 번째 * 비고는 표 전체 실기시험장 규격에 적용되는가?"]
    packet = {"tableId": item["tableId"], "attachmentId": item["tableId"].rsplit(":table:", 1)[0], "pageRange": overlay["pageRange"], "unresolvedRegions": item["unresolvedRegions"], "unresolvedFootnotes": item["unresolvedFootnotes"], "currentVisualMatchScore": overlay["visualMatchScore"], "currentTableModel": table, "affectedCandidateIds": item["affectedCandidateIds"], "images": images, "questions": questions[:3], "reviewerDecision": None}
    dump(packet_dir / "review-packet.json", packet)
    return packet


def normalize_relevance(candidate: dict[str, Any]) -> str:
    if candidate.get("examRelevance") in {"HIGH", "MEDIUM", "LOW", "NONE", "UNKNOWN"}:
        return candidate["examRelevance"]
    text = " ".join(str(candidate.get(key) or "") for key in ("subject", "predicate", "object", "normalizedStatement", "factType"))
    fact_type = candidate.get("factType")
    if fact_type in {"NUMERIC_THRESHOLD", "ADMINISTRATIVE_SANCTION", "PENALTY", "PROHIBITION", "EXCEPTION"} or candidate.get("numericValues"):
        return "HIGH"
    if re.search(r"벌칙|과태료|벌금|징역|금지|초과|이하|이상|미만|특별비행|안전성인증", text):
        return "HIGH"
    if fact_type in {"REQUIREMENT", "OBLIGATION", "DEFINITION"} or re.search(r"정의|분류|절차|교육|검사|신고|승인|증명|자격|항공사업", text):
        return "MEDIUM"
    return "LOW"


def normalized_candidate(candidate: dict[str, Any], table_unresolved: set[str], conflict_ids: set[str]) -> dict[str, Any]:
    is_table = "tableId" in candidate
    blockers = list(dict.fromkeys(candidate.get("blockers", [])))
    warnings = list(dict.fromkeys(candidate.get("warnings", [])))
    confidence = float(candidate.get("extractionConfidence", 0))
    currentness = candidate.get("currentnessStatus", "UNKNOWN")
    authority = candidate.get("sourceAuthority") or ("OFFICIAL_ADMINISTRATIVE_RULE" if is_table else "UNKNOWN")
    locator = candidate.get("sourceLocator")
    if is_table and candidate.get("tableId") in table_unresolved:
        eligibility = "BLOCKED_TABLE_UNRESOLVED"; blockers.append("TABLE_REVIEW_DECISION_REQUIRED")
    elif candidate.get("candidateId") in conflict_ids:
        eligibility = "BLOCKED_CONFLICT"; blockers.append("SUBSTANTIVE_CONFLICT")
    elif not str(authority).startswith("OFFICIAL") or not locator:
        eligibility = "BLOCKED_SOURCE_UNVERIFIABLE"; blockers.append("SOURCE_OR_LOCATOR_UNVERIFIABLE")
    elif currentness not in {"CURRENT_EFFECTIVE", "CURRENT"}:
        eligibility = "BLOCKED_SOURCE_UNVERIFIABLE"; blockers.append("CURRENTNESS_UNVERIFIABLE")
    elif confidence < .7:
        eligibility = "BLOCKED_LOW_QUALITY"; blockers.append("LOW_EXTRACTION_CONFIDENCE")
    elif warnings or any(blocker not in {"SOURCE_INGESTION_UNVALIDATED"} for blocker in blockers):
        eligibility = "ELIGIBLE_WITH_WARNINGS"
    else:
        eligibility = "ELIGIBLE"
    return {
        "candidateId": candidate.get("candidateId"), "sourceId": candidate.get("sourceId"), "sourceVersionId": candidate.get("sourceVersionId"), "sourceAuthority": authority,
        "sourceLocator": locator, "subject": candidate.get("subject"), "predicate": candidate.get("predicate"), "object": candidate.get("object"), "value": candidate.get("value"), "unit": candidate.get("unit"), "operator": candidate.get("operator"),
        "conditions": candidate.get("conditions", []), "exceptions": candidate.get("exceptions", []), "applicability": candidate.get("applicability", []), "effectiveDate": candidate.get("effectiveDate"), "factType": candidate.get("factType") or "TABLE_REQUIREMENT",
        "groupId": candidate.get("groupId"), "groupOperator": candidate.get("groupOperator"), "rawEvidenceText": candidate.get("rawEvidenceText"), "normalizedStatement": candidate.get("normalizedStatement"),
        "extractionConfidence": confidence, "structureConfidence": candidate.get("legalStructureConfidence", candidate.get("tableStructureConfidence", 0)), "currentnessStatus": currentness,
        "examRelevance": normalize_relevance(candidate), "validationEligibility": eligibility, "blockers": list(dict.fromkeys(blockers)), "warnings": warnings, "tableId": candidate.get("tableId"), "duplicateGroup": None,
    }


def topic(candidate: dict[str, Any]) -> tuple[str, str]:
    text = " ".join(str(candidate.get(key) or "") for key in ("subject", "predicate", "normalizedStatement"))
    rules = [("001", "정의·분류", r"정의|분류|종류|구분"), ("002", "조종자 증명·자격 기준", r"조종자|증명|자격|교육|시험"), ("003", "신고·안전성인증", r"신고|안전성인증|검사"), ("004", "비행승인·특별비행", r"비행승인|특별비행|공역"), ("005", "준수사항·금지·예외", r"준수|금지|제한|예외|의무"), ("006", "행정처분·벌칙·과태료", r"행정처분|벌칙|과태료|벌금|징역"), ("007", "항공사업법 관련", r"항공사업|사용사업|대여업|레저스포츠")]
    for batch_id, label, pattern in rules:
        if re.search(pattern, text): return batch_id, label
    return "008", "기타 HIGH/MEDIUM"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True); PACKETS.mkdir(parents=True, exist_ok=True); LEGAL.mkdir(parents=True, exist_ok=True)
    queue = load(B2B / "manual-table-review-queue.json")
    if len(queue) != 5: raise RuntimeError("Review scope is fixed to five tables")
    tables = {item["tableId"]: item for item in load(B2A / "precision-tables.json")}
    overlays = {item["tableId"]: item for item in load(B2B / "overlay-validation.json")}
    renders = load(B2B / "rendered-pages.json")
    packets = [make_packet(item, tables[item["tableId"]], overlays[item["tableId"]], renders) for item in queue]

    footnote_decisions = [
        {"footnoteId": "pilot-certification-operating-rules:attachment:6:table:1:render-marker:2:160", "resolution": "RESOLVED_EXACT", "scopeType": "MULTIPLE_CELLS", "targetRowIds": ["1", "4", "5"], "targetColumnIds": ["1"], "targetCellIds": ["pilot-certification-operating-rules:attachment:6:table:1:cell:4", "pilot-certification-operating-rules:attachment:6:table:1:cell:10", "pilot-certification-operating-rules:attachment:6:table:1:cell:12"], "noteText": "무인비행기, 무인수직이착륙기 및 무인비행선의 실기시험장 규격은 이착륙을 위한 시설(활주로 기준)의 규격이며 이동과 안전사고를 예방할 수 있는 공간은 별도로 확보하여야 함", "confidence": .98, "evidence": ["공식 별표 6 page 2", "marker와 첫 note block이 동일 페이지에서 연속 배치", "note가 세 종류를 명시"]},
        {"footnoteId": "pilot-certification-operating-rules:attachment:6:table:1:render-marker:2:271", "resolution": "RESOLVED_EXACT", "scopeType": "WHOLE_TABLE", "targetRowIds": ["1", "2", "3", "4", "5"], "targetColumnIds": ["0", "1"], "targetCellIds": [], "noteText": "실기시험장 규격은 단일 실기시험장 규격으로 여러 개인 경우에는 서로 중첩되지 않아야 함", "confidence": .97, "evidence": ["공식 별표 6 page 2", "두 번째 marker와 note block이 동일 페이지에서 연속 배치", "문언이 특정 종류가 아닌 실기시험장 규격 전체를 지칭"]},
    ]
    dump(OUT / "annex-06-footnote-decisions.json", footnote_decisions)
    review_decisions = [{"tableId": packet["tableId"], "reviewerDecision": "UNRESOLVED", "resolvedRegions": [], "resolvedFootnotes": footnote_decisions if annex(packet["tableId"]) == 6 else [], "evidence": [image["officialImage"] for image in packet["images"]], "confidence": 0, "reviewedAt": None, "notes": ["No human reviewer decision supplied; fail-closed"]} for packet in packets]
    dump(OUT / "table-review-decisions.json", review_decisions)

    high = [item for item in load(B2B / "high-candidate-validation.json") if item["decision"] == "REVIEW_REQUIRED"]
    five = {item["tableId"] for item in queue}
    impact = []
    for item in high:
        kind = "DIRECTLY_AFFECTED" if item["tableId"] in five else "NOT_AFFECTED"
        impact.append({"candidateId": item["candidateId"], "tableId": item["tableId"], "impact": kind, "footnoteDirect": ":attachment:6:" in item["tableId"], "previousDecision": item["decision"]})
    dump(OUT / "candidate-impact.json", impact)
    revalidated = []
    for affected in [item for item in impact if item["impact"] != "NOT_AFFECTED"]:
        prior = next(item for item in high if item["candidateId"] == affected["candidateId"])
        revalidated.append({"candidateId": affected["candidateId"], "tableId": affected["tableId"], "decision": "REVIEW_REQUIRED", "reason": "Footnote evidence was resolved where applicable, but an explicit table reviewer decision is still absent", "thresholdsChanged": False, "previousDecision": prior["decision"]})
    dump(OUT / "affected-candidate-revalidation.json", revalidated)

    body_raw = load(B1 / "fact-candidates/fact-candidates.json")
    table_raw = load(B2B / "precision-table-fact-candidates-v2.json")
    conflicts = load(B1 / "conflicts/conflicts.json")
    conflict_ids = {item["candidateId"] for item in conflicts if item.get("resolution") == "REVIEW_REQUIRED"}
    unresolved_tables = {item["tableId"] for item in queue}
    body = [normalized_candidate(item, unresolved_tables, conflict_ids) for item in body_raw]
    table_candidates = [normalized_candidate(item, unresolved_tables, conflict_ids) for item in table_raw]
    all_candidates = body + table_candidates
    duplicate_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in all_candidates:
        key = re.sub(r"\s+", "", (candidate.get("normalizedStatement") or "").lower())
        if key: duplicate_groups[key].append(candidate)
    for index, members in enumerate((members for members in duplicate_groups.values() if len(members) > 1), 1):
        for member in members: member["duplicateGroup"] = f"DUPLICATE-GROUP-{index:05d}"
    dump(LEGAL / "body-candidates.json", body)
    dump(LEGAL / "table-candidates.json", table_candidates)
    dump(LEGAL / "validated-table-candidates.json", [item for item in table_candidates if item["validationEligibility"] in {"ELIGIBLE", "ELIGIBLE_WITH_WARNINGS"}])
    dump(LEGAL / "unresolved-table-candidates.json", [item for item in table_candidates if item["validationEligibility"] == "BLOCKED_TABLE_UNRESOLVED"])
    shutil.copyfile(B1 / "relation-candidates/relation-candidates.json", LEGAL / "relation-candidates.json")
    shutil.copyfile(B1 / "conflicts/conflicts.json", LEGAL / "conflicts.json")
    shutil.copyfile(B1 / "reports/revision-comparison.json", LEGAL / "revision-comparison.json")
    documents = load(B1 / "documents/documents.json")
    source_snapshot = [{"sourceId": item["sourceId"], "sourceVersionId": item["sourceVersionId"], "title": item["title"], "effectiveDate": item["effectiveDate"], "pages": item["pages"], "inputFiles": item["inputFiles"], "quality": item["quality"], "authority": "OFFICIAL_LAW"} for item in documents]
    source_snapshot.append({"sourceId": "pilot-certification-operating-rules", "sourceVersionId": "2200000142833", "title": "무인비행장치 조종자 증명 운영세칙", "effectiveDate": "2025-05-14", "authority": "OFFICIAL_ADMINISTRATIVE_RULE", "pages": 13})
    dump(LEGAL / "source-registry-snapshot.json", source_snapshot)

    batch_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for candidate in all_candidates:
        if candidate["examRelevance"] in {"HIGH", "MEDIUM"}: batch_groups[topic(candidate)].append(candidate)
    batches = []
    for (batch_id, label), members in sorted(batch_groups.items()):
        ready = [item for item in members if item["validationEligibility"] in {"ELIGIBLE", "ELIGIBLE_WITH_WARNINGS"}]
        blocked = [item for item in members if item not in ready]
        batches.append({"batchId": f"VALIDATION-BATCH-{batch_id}", "topic": label, "sourceIds": sorted({item["sourceId"] for item in members}), "candidateIds": [item["candidateId"] for item in members], "candidateCount": len(members), "eligibleCount": sum(item["validationEligibility"] == "ELIGIBLE" for item in members), "eligibleWithWarningsCount": sum(item["validationEligibility"] == "ELIGIBLE_WITH_WARNINGS" for item in members), "blockedCount": len(blocked), "highRelevanceCount": sum(item["examRelevance"] == "HIGH" for item in members), "mediumRelevanceCount": sum(item["examRelevance"] == "MEDIUM" for item in members), "unresolvedConflictCount": sum(item["validationEligibility"] == "BLOCKED_CONFLICT" for item in members), "blockedCandidateIds": [item["candidateId"] for item in blocked], "readyCandidateIds": [item["candidateId"] for item in ready], "expectedConflicts": sorted({blocker for item in members for blocker in item["blockers"] if "CONFLICT" in blocker}), "status": "BLOCKED" if not ready else ("PARTIAL" if blocked else "READY")})
    dump(LEGAL / "validation-batches.json", batches)
    counts = Counter(item["validationEligibility"] for item in all_candidates)
    relevance = Counter(item["examRelevance"] for item in all_candidates)
    manifest = {"generatedAt": datetime.now(timezone.utc).isoformat(), "bodyCandidateCount": len(body), "tableCandidateCount": len(table_candidates), "totalCandidateCount": len(all_candidates), "duplicatesPreserved": True, "duplicateGroupCount": sum(1 for members in duplicate_groups.values() if len(members) > 1), "eligibility": dict(counts), "examRelevance": dict(relevance), "highRelevanceReadyCount": sum(item["examRelevance"] == "HIGH" and item["validationEligibility"] in {"ELIGIBLE", "ELIGIBLE_WITH_WARNINGS"} for item in all_candidates), "mediumRelevanceReadyCount": sum(item["examRelevance"] == "MEDIUM" and item["validationEligibility"] in {"ELIGIBLE", "ELIGIBLE_WITH_WARNINGS"} for item in all_candidates), "batchCount": len(batches), "tableLayerStatus": "TABLE_LAYER_PARTIAL", "mutationCount": 0}
    dump(LEGAL / "validation-input-manifest.json", manifest)
    dump(OUT / "ingestion-summary.json", {"targetTables": len(queue), "reviewPackets": len(packets), "footnotesResolvedExact": 2, "directlyAffectedCandidates": sum(item["impact"] == "DIRECTLY_AFFECTED" for item in impact), "indirectlyAffectedCandidates": 0, "notAffectedCandidates": sum(item["impact"] == "NOT_AFFECTED" for item in impact), "revalidation": dict(Counter(item["decision"] for item in revalidated)), "tableLayerStatus": "TABLE_LAYER_PARTIAL", "remainingExceptionTables": len(queue), "legalValidation": manifest, "mutationCount": 0})

    coverage_path = ROOT / "work/source-inventory/drone-source-coverage-matrix.json"
    coverage = load(coverage_path)
    coverage["sourceBatch002CIngestion"] = {"tableLayerStatus": "TABLE_LAYER_PARTIAL", "validatedTableCount": 4, "unresolvedTableCount": 5, "validationEligibleCandidateCount": counts["ELIGIBLE"] + counts["ELIGIBLE_WITH_WARNINGS"], "validationBlockedCandidateCount": len(all_candidates) - counts["ELIGIBLE"] - counts["ELIGIBLE_WITH_WARNINGS"], "highRelevanceEligibleCount": manifest["highRelevanceReadyCount"], "mediumRelevanceEligibleCount": manifest["mediumRelevanceReadyCount"], "validated": False, "productionReady": False}
    dump(coverage_path, coverage)
    print(json.dumps(load(OUT / "ingestion-summary.json"), ensure_ascii=False))


if __name__ == "__main__": main()
