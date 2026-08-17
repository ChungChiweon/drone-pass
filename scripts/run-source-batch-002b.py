#!/usr/bin/env python3
"""Resolve only SOURCE-BATCH-002A's nine table visual exceptions.

The runner consumes browser-discovered official image URLs. It never invents a URL,
mutates a pack, or promotes a fact. Missing render evidence remains unresolved.
"""
from __future__ import annotations

import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "work/source-ingestion/source-batch-002a"
OUT = ROOT / "work/source-ingestion/source-batch-002b"
RENDER_DIR = OUT / "rendered-pages"
OFFICIAL_HOST = "https://www.law.go.kr/LSW/flDownload.do?flSeq="

ANNEX_BY_TABLE = {
    "pilot-certification-operating-rules:attachment:1:table:1": 1,
    "pilot-certification-operating-rules:attachment:3:table:1": 3,
    "pilot-certification-operating-rules:attachment:3:table:2": 3,
    "pilot-certification-operating-rules:attachment:4:table:1": 4,
    "pilot-certification-operating-rules:attachment:5:table:1": 5,
    "pilot-certification-operating-rules:attachment:6:table:1": 6,
    "pilot-certification-operating-rules:attachment:7:table:1": 7,
    "pilot-certification-operating-rules:attachment:7:table:2": 7,
    "pilot-certification-operating-rules:attachment:8:table:1": 8,
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(name: str, value: Any) -> None:
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def groups(indices: list[int]) -> list[int]:
    result: list[list[int]] = []
    for value in indices:
        if not result or value > result[-1][-1] + 1:
            result.append([value])
        else:
            result[-1].append(value)
    return [round(sum(group) / len(group)) for group in result]


def inspect_grid(path: Path) -> dict[str, Any]:
    with Image.open(path) as image:
        gray = image.convert("L")
        width, height = gray.size
        px = gray.load()
        # A real ruled boundary occupies a substantial fraction of the page axis.
        horizontal = groups([y for y in range(height) if sum(px[x, y] < 80 for x in range(width)) / width >= 0.20])
        vertical = groups([x for x in range(width) if sum(px[x, y] < 80 for y in range(height)) / height >= 0.10])
        return {
            "width": width,
            "height": height,
            "dpi": list(image.info.get("dpi", (96, 96))),
            "horizontalLines": horizontal,
            "verticalLines": vertical,
            "tableBoundary": ({"x": min(vertical), "y": min(horizontal), "width": max(vertical)-min(vertical), "height": max(horizontal)-min(horizontal)} if len(vertical) >= 2 and len(horizontal) >= 2 else None),
        }


def score_ratio(actual: int, expected: int) -> float:
    if expected <= 0:
        return 1.0
    return round(min(actual, expected) / expected, 4)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    exceptions = read_json(BASE / "table-visual-exceptions.json")
    if {item["tableId"] for item in exceptions} != set(ANNEX_BY_TABLE):
        raise RuntimeError("The fixed nine-table exception scope changed; refusing to expand it")
    tables = {item["tableId"]: item for item in read_json(BASE / "precision-tables.json")}
    candidates = read_json(BASE / "precision-table-fact-candidates.json")
    discovered = read_json(OUT / "official-render-urls.json")
    urls_by_annex = {int(item["annex"]): item for item in discovered}
    rendered: list[dict[str, Any]] = []
    for annex in sorted(set(ANNEX_BY_TABLE.values())):
        record = urls_by_annex.get(annex)
        if not record or not record.get("urls"):
            continue
        for page, url in enumerate(record["urls"], 1):
            if not url.startswith(OFFICIAL_HOST):
                raise RuntimeError(f"Non-official render URL rejected: {url}")
            target = RENDER_DIR / f"annex-{annex:02d}-page-{page:02d}.gif"
            if not target.exists():
                with urllib.request.urlopen(url, timeout=30) as response:
                    target.write_bytes(response.read())
            payload = target.read_bytes()
            geometry = inspect_grid(target)
            rendered.append({
                "annex": annex, "page": page, "officialSourceUrl": url,
                "localPath": str(target.relative_to(ROOT)).replace("\\", "/"),
                "checksum": "sha256-" + hashlib.sha256(payload).hexdigest(),
                "attachmentVersionId": "2200000142833", "sourceLocator": f"별표 {annex} / page {page}",
                **geometry,
            })
    write_json("rendered-pages.json", rendered)

    pages_by_annex: dict[int, list[dict[str, Any]]] = {}
    for page in rendered:
        pages_by_annex.setdefault(page["annex"], []).append(page)
    text_layer_path = OUT / "browser-text-layers.json"
    text_layers = {int(item["annex"]): item for item in read_json(text_layer_path)} if text_layer_path.exists() else {}
    overlays = []
    detected = []
    resolved = []
    for table_id, annex in ANNEX_BY_TABLE.items():
        table = tables[table_id]
        pages = pages_by_annex.get(annex, [])
        expected_rows = len(set(cell["rowIndex"] for cell in table.get("cells", [])))
        expected_cols = len(set(cell["columnIndex"] for cell in table.get("cells", [])))
        row_lines = sum(max(0, len(page["horizontalLines"]) - 1) for page in pages)
        col_lines = max([max(0, len(page["verticalLines"]) - 1) for page in pages] or [0])
        boundary = 1.0 if pages and any(page["tableBoundary"] for page in pages) else 0.0
        row_score = score_ratio(row_lines, expected_rows)
        col_score = score_ratio(col_lines, expected_cols)
        text_score = 1.0 if table.get("cells") and pages else 0.0
        merged_score = 1.0 if not any(region.get("status") == "UNRESOLVED" for region in table.get("mergedRegions", [])) else 0.0
        header_score = 1.0 if table.get("headerRows") and pages else 0.0
        continuation_score = 1.0 if not (table.get("continuedFromTableId") or table.get("continuesToTableId")) else 0.75
        # Footnote area cannot be claimed from an image alone without a marker-to-cell scope.
        raw_notes = table.get("notes", []) + [f.get("rawText", "") for f in table.get("footnotes", [])]
        markers = []
        for index, note in enumerate(raw_notes):
            marker = re.match(r"^\s*(주\s*\d*|비고\s*\d*|※|\*\*?|\(?\d+\)|\(?[가-하A-Za-z]\))", note)
            if marker:
                item = {"markerId": f"{table_id}:marker:{index+1}", "tableId": table_id, "markerText": marker.group(1), "markerType": "TEXT_MARKER", "page": pages[-1]["page"] if pages else None, "boundingBox": None, "sourceCellId": None, "noteBlockId": f"{table_id}:note:{index+1}", "confidence": 0.75}
                markers.append(item); detected.append(item)
                resolved.append({"footnoteId": item["markerId"], "tableId": table_id, "scopeType": "UNRESOLVED", "targetRowIds": [], "targetColumnIds": [], "targetCellIds": [], "evidence": ["marker text found but no coordinate-to-cell anchor"], "confidence": 0.75, "unresolvedReason": "Scope confidence below 0.90"})
        # The official viewer's text layer is preferred over OCR. Character style is
        # retained as coordinate provenance, but a footer symbol alone cannot prove scope.
        for page_record in text_layers.get(annex, {}).get("pages", []):
            chars = page_record.get("spans", [])
            for index, span in enumerate(chars):
                char = (span.get("char") or "").strip()
                if char not in {"*", "※", "†", "‡"}:
                    continue
                marker_id = f"{table_id}:render-marker:{page_record['page']}:{index}"
                if any(item["markerId"] == marker_id for item in detected):
                    continue
                item = {"markerId": marker_id, "tableId": table_id, "markerText": char, "markerType": "SYMBOL", "page": page_record["page"], "boundingBox": {"cssText": span.get("style")}, "sourceCellId": None, "noteBlockId": None, "confidence": 0.95}
                markers.append(item); detected.append(item)
                resolved.append({"footnoteId": marker_id, "tableId": table_id, "scopeType": "UNRESOLVED", "targetRowIds": [], "targetColumnIds": [], "targetCellIds": [], "evidence": ["official viewer text-layer symbol with coordinate CSS"], "confidence": 0.75, "unresolvedReason": "Marker is visible but row/cell applicability is not proved"})
        footnote_score = 1.0 if not markers and not raw_notes else 0.0
        component_scores = [boundary, row_score, col_score, merged_score, text_score, header_score, continuation_score, footnote_score]
        visual = round(sum(component_scores) / len(component_scores), 4)
        flags = []
        if row_score < .9: flags.append("ROW_BOUNDARY")
        if col_score < .9: flags.append("COLUMN_BOUNDARY")
        if footnote_score < .9: flags.append("FOOTNOTE_AREA")
        if not pages: flags.append("OFFICIAL_RENDER_MISSING")
        status = "VERIFIED" if visual >= .95 and not flags else ("VERIFIED_WITH_WARNINGS" if pages else "UNRESOLVED")
        overlays.append({"tableId": table_id, "annex": annex, "pageRange": [p["page"] for p in pages], "boundaryMatchScore": boundary, "rowMatchScore": row_score, "columnMatchScore": col_score, "mergedCellMatchScore": merged_score, "textCoverageScore": text_score, "headerMatchScore": header_score, "continuationMatchScore": continuation_score, "footnoteAreaMatchScore": footnote_score, "visualMatchScore": visual, "flaggedRegions": flags, "status": status})
    write_json("overlay-validation.json", overlays)
    write_json("detected-footnotes.json", detected)
    write_json("resolved-footnote-scopes.json", resolved)

    overlay_by_id = {item["tableId"]: item for item in overlays}
    scopes_by_table = {tid: [item for item in resolved if item["tableId"] == tid] for tid in ANNEX_BY_TABLE}
    v2 = []
    high_validation = []
    for original in candidates:
        current = dict(original)
        overlay = overlay_by_id.get(current["tableId"])
        if overlay:
            unresolved = [item for item in scopes_by_table[current["tableId"]] if item["scopeType"] == "UNRESOLVED"]
            blockers = [blocker for blocker in current.get("blockers", []) if blocker != "VISUAL_VERIFICATION_REQUIRED"]
            if overlay["status"] != "VERIFIED": blockers.append("TABLE_VISUAL_WARNING")
            if unresolved: blockers.append("FOOTNOTE_SCOPE_UNRESOLVED")
            current.update({"candidateVersion": 2, "supersedesVersion": 1, "footnoteIds": [x["footnoteId"] for x in scopes_by_table[current["tableId"]]], "footnoteCompleteness": 0.0 if unresolved else current.get("footnoteCompleteness", 1.0), "visualMatchScore": overlay["visualMatchScore"], "verifiedBoundingBoxes": [p["tableBoundary"] for p in pages_by_annex.get(ANNEX_BY_TABLE[current["tableId"]], []) if p["tableBoundary"]], "visualVerificationRequired": overlay["status"] != "VERIFIED", "blockers": list(dict.fromkeys(blockers)), "validationStatus": "TABLE_VALIDATED" if overlay["status"] == "VERIFIED" and not blockers else ("TABLE_VALIDATED_WITH_WARNINGS" if overlay["status"] != "UNRESOLVED" else "TABLE_REVIEW_REQUIRED")})
        v2.append(current)
        if current.get("examRelevance") == "HIGH":
            valid = current.get("visualMatchScore", 0) >= .95 and current.get("tableStructureConfidence", 0) >= .95 and current.get("conditionCompleteness", 0) >= .9 and current.get("numericCompleteness", 0) >= .98 and current.get("footnoteCompleteness", 0) >= .9 and not current.get("blockers")
            high_validation.append({"candidateId": current["candidateId"], "tableId": current["tableId"], "decision": "VALIDATED" if valid else "REVIEW_REQUIRED", "blockers": current.get("blockers", []), "visualMatchScore": current.get("visualMatchScore", 0), "reason": "All structural thresholds met" if valid else "At least one structural or visual threshold remains unresolved"})
    write_json("precision-table-fact-candidates-v2.json", v2)
    write_json("high-candidate-validation.json", high_validation)
    manual = [{"tableId": item["tableId"], "affectedCandidateIds": [c["candidateId"] for c in v2 if c["tableId"] == item["tableId"]], "unresolvedRegions": item["flaggedRegions"], "unresolvedFootnotes": [x["footnoteId"] for x in scopes_by_table[item["tableId"]] if x["scopeType"] == "UNRESOLVED"], "requiredHumanAction": "Compare flagged boundary/footnote areas against the official rendering; do not review candidates individually.", "severity": "HIGH" if item["status"] == "UNRESOLVED" else "MEDIUM"} for item in overlays if item["status"] != "VERIFIED"]
    write_json("manual-table-review-queue.json", manual)

    metric = lambda values: round(sum(values) / len(values), 4) if values else 0.0
    high_validated = sum(item["decision"] == "VALIDATED" for item in high_validation)
    quality = {"mergedCellResolutionRate": metric([o["mergedCellMatchScore"] for o in overlays]), "conditionPreservationRate": metric([c.get("conditionCompleteness", 0) for c in v2]), "numericPreservationRate": metric([c.get("numericCompleteness", 0) for c in v2]), "footnoteLinkRate": round((len(resolved)-sum(x["scopeType"] == "UNRESOLVED" for x in resolved))/len(resolved), 4) if resolved else 0.0, "visualMatchRate": metric([o["visualMatchScore"] for o in overlays]), "highCandidateValidationRate": round(high_validated/len(high_validation), 4) if high_validation else 0.0, "unresolvedTableRate": round(len(manual)/len(overlays), 4)}
    write_json("quality-metrics.json", quality)
    table_status = "TABLE_LAYER_VALIDATED" if not manual and quality["visualMatchRate"] >= .95 and quality["footnoteLinkRate"] >= .9 else ("TABLE_LAYER_BLOCKED" if not rendered else "TABLE_LAYER_PARTIAL")
    summary = {"scopeTables": len(overlays), "officialRenderedPages": len(rendered), "visualExceptionsBefore": 9, "visualExceptionsAfter": len(manual), "detectedFootnotes": len(detected), "resolvedFootnotes": sum(x["scopeType"] != "UNRESOLVED" for x in resolved), "highCandidates": len(high_validation), "validatedHighCandidates": high_validated, "reviewRequiredHighCandidates": sum(x["decision"] == "REVIEW_REQUIRED" for x in high_validation), "rejectedHighCandidates": sum(x["decision"] == "REJECTED" for x in high_validation), "manualReviewTables": len(manual), "tableLayerStatus": table_status, "mutationCount": 0}
    write_json("ingestion-summary.json", summary)
    write_json("execution.json", {"batchId": "SOURCE-BATCH-002B", "startedAt": datetime.now(timezone.utc).isoformat(), "completedAt": datetime.now(timezone.utc).isoformat(), "status": "COMPLETED", "checkpoint": "artifacts-written", "scopeExpanded": False, "mutationCount": 0})
    coverage_path = ROOT / "work/source-inventory/drone-source-coverage-matrix.json"
    coverage = read_json(coverage_path)
    coverage["sourceBatch002BIngestion"] = {
        "status": table_status,
        "validatedTableCount": sum(item["status"] == "VERIFIED" for item in overlays),
        "unresolvedTableCount": len(manual),
        "validatedHighCandidateCount": high_validated,
        "reviewRequiredHighCandidateCount": summary["reviewRequiredHighCandidates"],
        "footnoteResolvedCount": summary["resolvedFootnotes"],
        "footnoteUnresolvedCount": len(resolved) - summary["resolvedFootnotes"],
        "visualVerifiedTableCount": sum(item["status"] == "VERIFIED" for item in overlays),
        "coverageStatus": "VALIDATED" if table_status == "TABLE_LAYER_VALIDATED" else "PARTIALLY_EXTRACTED",
        "validated": table_status == "TABLE_LAYER_VALIDATED",
        "productionReady": False,
    }
    coverage_path.write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
