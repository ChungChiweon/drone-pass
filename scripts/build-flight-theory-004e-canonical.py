#!/usr/bin/env python3
"""Build and freeze the deterministic, detached 004E Canonical artifact."""
from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "work/flight-theory-validation/004e"
RESULTS = BASE / "results"
INDEX = ROOT / "work/flight-theory-validation/canonical-flight-theory-index.json"
GENERATED_AT = "2026-08-22T00:00:00Z"
GAPS = [
    "flight:controller", "flight:link-loss", "flight:control-link",
    "flight:telemetry", "flight:fpv", "flight:video-transmission",
    "flight:failsafe", "flight:communication-range", "flight:spectrum-safety",
]
SOURCE_FILES = {
    "RF_CONCEPT": ("rf-concepts.json", "conceptId", "rf"),
    "COMMUNICATION_COMPONENT": ("communication-components.json", "componentId", "component"),
    "COMMUNICATION_LINK": ("communication-links.json", "linkId", "link"),
    "INTERFERENCE": ("interference-knowledge.json", "knowledgeId", "interference"),
    "FORMULA": ("formulas.json", "formulaId", "formula"),
    "RELATIONSHIP": ("relationships.json", "relationshipId", "relationship"),
}
TYPE_MAP = {
    "RF_CONCEPT": "RF_CONCEPT",
    "COMMUNICATION_COMPONENT": "COMMUNICATION_COMPONENT",
    "COMMUNICATION_LINK": "COMMUNICATION_LINK",
    "INTERFERENCE": "INTERFERENCE_KNOWLEDGE",
    "FORMULA": "TECHNICAL_FORMULA",
    "RELATIONSHIP": "RELATIONSHIP",
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stable(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value) -> str:
    return "sha256-" + hashlib.sha256(stable(value).encode("utf-8")).hexdigest()


def file_digest(path: Path) -> str:
    return "sha256-" + hashlib.sha256(path.read_bytes()).hexdigest()


def stable_key(source_id: str) -> str:
    return source_id.split(":", 1)[-1].replace("_", "-").lower()


def canonical_count(payload: dict) -> int:
    if isinstance(payload.get("units"), list):
        return len(payload["units"])
    return len(payload.get("canonicalUnits", [])) + len(payload.get("relationshipUnits", []))


def existing_canonical_paths() -> dict[str, Path]:
    return {
        batch: ROOT / f"work/flight-theory-validation/{batch}/results/canonical-flight-knowledge-{batch}.json"
        for batch in ("004a", "004b", "004c", "004d", "004f", "004g", "004h")
    }


def build() -> tuple[dict, dict[str, dict]]:
    inventory = load(RESULTS / "canonical-candidate-inventory.json")
    validation = load(RESULTS / "validation-summary.json")
    statuses = Counter(item["canonicalEligibility"] for item in inventory)
    if (
        len(inventory) != 16
        or statuses != {"READY": 10, "READY_WITH_WARNING": 6}
        or any(item.get("canonicalId") is not None for item in inventory)
        or validation.get("inputDrift")
        or validation.get("canonicalGenerated")
        or validation.get("canonicalIdIssued") != 0
        or validation.get("canonicalCandidateCount") != 16
        or validation.get("unsupportedInferenceCount") != 0
    ):
        raise RuntimeError("CANONICAL_INPUT_DRIFT")

    rows: dict[str, dict] = {}
    row_types: dict[str, str] = {}
    for candidate_type, (filename, id_key, _) in SOURCE_FILES.items():
        for row in load(BASE / filename):
            source_id = row[id_key]
            rows[source_id] = row
            row_types[source_id] = candidate_type
    if set(rows) != {item["sourceKnowledgeId"] for item in inventory}:
        raise RuntimeError("CANONICAL_INPUT_DRIFT")

    id_map = {
        item["sourceKnowledgeId"]: (
            f"flight-004e:{SOURCE_FILES[item['suggestedKnowledgeType']][2]}:"
            f"{stable_key(item['sourceKnowledgeId'])}"
        )
        for item in inventory
    }
    if len(set(id_map.values())) != 16:
        raise RuntimeError("CANONICAL_ID_COLLISION")

    units: list[dict] = []
    formulas: list[dict] = []
    relationships: list[dict] = []
    inventory_by_id = {item["sourceKnowledgeId"]: item for item in inventory}
    for item in inventory:
        source_id = item["sourceKnowledgeId"]
        source = rows[source_id]
        kind = TYPE_MAP[item["suggestedKnowledgeType"]]
        common = {
            "knowledgeId": id_map[source_id],
            "sourceKnowledgeId": source_id,
            "knowledgeType": kind,
            "technicalContext": item["technicalContext"],
            "validationStatus": item["validationStatus"],
            "canonicalEligibility": item["canonicalEligibility"],
            "warnings": deepcopy(item["warningConstraints"]),
            "warningConstraints": deepcopy(item["warningConstraints"]),
            "questionConstraints": deepcopy(item["questionConstraints"]),
            "sourceReferences": deepcopy(item["sourceReferences"]),
            "sourceLocator": deepcopy(item["sourceReferences"][0]),
            "boundaryLineage": deepcopy(item["boundaryLineage"]),
        }
        payload = {
            key: deepcopy(value)
            for key, value in source.items()
            if key not in {
                "conceptId", "componentId", "linkId", "knowledgeId", "formulaId",
                "relationshipId", "rawEvidence", "rawEvidenceText", "confidence",
                "technicalContext", "sourceReferences", "questionConstraints",
            }
        }
        if kind == "RELATIONSHIP":
            source_endpoint = source["sourceKnowledgeId"]
            target_endpoint = source["targetKnowledgeId"]
            if source_endpoint not in id_map or target_endpoint not in id_map:
                raise RuntimeError("DANGLING_RELATIONSHIP_ENDPOINT")
            relationships.append({
                **common,
                "sourceEndpoint": source_endpoint,
                "targetEndpoint": target_endpoint,
                "sourceCanonicalId": id_map[source_endpoint],
                "targetCanonicalId": id_map[target_endpoint],
                "relationType": source["relationType"],
                "direction": source["direction"],
                "evidence": source["evidence"],
                "sourceLocator": deepcopy(source["sourceLocator"]),
            })
        elif kind == "TECHNICAL_FORMULA":
            formulas.append({**common, **payload})
        else:
            units.append({**common, **payload})

    all_items = units + formulas + relationships
    if len(units) != 11 or len(formulas) != 1 or len(relationships) != 4 or len(all_items) != 16:
        raise RuntimeError("CANONICAL_COUNT_MISMATCH")
    if any(item["technicalContext"] == "UAS_SPECIFIC" for item in all_items):
        raise RuntimeError("UAS_CONTEXT_PROMOTION")

    serialized = stable(all_items).lower()
    forbidden_inferences = (
        "drone controller", "control-link", "control link", "telemetry", "fpv",
        "video transmission", "lost-link", "lost link", "failsafe", "return-to-home",
        "return to home", "automatic rth", "exact communication distance",
    )
    if any(term in serialized for term in forbidden_inferences):
        # Constraints and explicit limitations may contain guard terms; only source payload is checked below.
        source_payload = stable([
            {k: v for k, v in rows[item["sourceKnowledgeId"]].items() if k not in ("limitations", "questionConstraints")}
            for item in inventory
        ]).lower()
        if any(term in source_payload for term in forbidden_inferences):
            raise RuntimeError("UNSUPPORTED_INFERENCE_DETECTED")

    canonical_ids = {item["knowledgeId"] for item in all_items}
    if any(
        relation[endpoint] not in canonical_ids
        for relation in relationships
        for endpoint in ("sourceCanonicalId", "targetCanonicalId")
    ):
        raise RuntimeError("DANGLING_RELATIONSHIP_ENDPOINT")

    visual_validation = load(RESULTS / "visual-validation.json")[0]
    visual_source = load(BASE / "visual-assets.json")[0]
    visual_support = [{
        "assetId": visual_validation["visualId"],
        "source": visual_validation["sourceReference"]["sourceId"],
        "locator": deepcopy(visual_validation["sourceReference"]),
        "linkedCanonicalIds": [id_map[source_id] for source_id in visual_validation["linkedKnowledge"]],
        "status": visual_validation["status"],
        "interpretationRequired": visual_source["interpretationRequired"],
        "canonicalKnowledgeUnit": False,
    }]

    table_validation = load(RESULTS / "table-validation.json")[0]
    exclusions = [{
        "tableId": table_validation["tableId"],
        "source": table_validation["sourceReference"]["sourceId"],
        "locator": deepcopy(table_validation["sourceReference"]),
        "status": table_validation["status"],
        "reason": table_validation["reason"],
        "legalLineage": table_validation["legalLineage"],
        "canonicalKnowledgeUnit": False,
    }]
    regulatory_lineage = {
        "batchId": "004E",
        "entries": exclusions,
        "flightTheoryCanonicalCount": 0,
        "spectrumSafetyGapResolved": False,
    }

    by_topic: dict[str, list[dict]] = defaultdict(list)
    for item in units + formulas:
        topic_id = rows[item["sourceKnowledgeId"]].get("topicId")
        if topic_id:
            by_topic[topic_id].append(item)
    for relation in relationships:
        for endpoint in (relation["sourceEndpoint"], relation["targetEndpoint"]):
            topic_id = rows[endpoint].get("topicId")
            if topic_id and relation not in by_topic[topic_id]:
                by_topic[topic_id].append(relation)
    topic_input = load(RESULTS / "topic-validation-coverage.json")
    coverage = []
    for topic in topic_input:
        topic_id = topic["topicId"]
        related = by_topic.get(topic_id, [])
        knowledge = [item for item in related if item["knowledgeType"] not in ("RELATIONSHIP", "TECHNICAL_FORMULA")]
        relation_rows = [item for item in related if item["knowledgeType"] == "RELATIONSHIP"]
        formula_rows = [item for item in related if item["knowledgeType"] == "TECHNICAL_FORMULA"]
        is_gap = topic_id in GAPS
        warning_count = sum(item["canonicalEligibility"] == "READY_WITH_WARNING" for item in related)
        status = "NO_KNOWLEDGE" if is_gap else "READY_WITH_GAPS" if warning_count else "CANONICAL_READY"
        coverage.append({
            "topicId": topic_id,
            "canonicalKnowledgeCount": len(knowledge),
            "relationshipCount": len(relation_rows),
            "formulaCount": len(formula_rows),
            "warningCanonicalCount": warning_count,
            "visualSupportCount": topic["visualSupport"],
            "regulatorySupportCount": topic["tableSupport"],
            "technicalContexts": sorted({item["technicalContext"] for item in related}),
            "gapReason": "NO_DIRECT_OFFICIAL_UAS_EVIDENCE" if is_gap else None,
            "status": status,
        })

    context_distribution = dict(Counter(item["technicalContext"] for item in units))
    if context_distribution != {"AVIATION_COMMUNICATION": 8, "RF_GENERAL": 3}:
        raise RuntimeError("TECHNICAL_CONTEXT_DRIFT")
    if {topic["topicId"] for topic in coverage if topic["status"] == "NO_KNOWLEDGE"} != set(GAPS):
        raise RuntimeError("GAP_GUARD_FAILED")

    input_paths = [BASE / filename for filename, _, _ in SOURCE_FILES.values()]
    input_paths += [
        RESULTS / "canonical-candidate-inventory.json",
        RESULTS / "validation-summary.json",
        RESULTS / "validation-results.json",
        RESULTS / "visual-validation.json",
        RESULTS / "table-validation.json",
    ]
    source_snapshot = {
        "candidateInventoryChecksum": digest(inventory),
        "validationSummaryChecksum": digest(validation),
        "inputChecksums": {
            str(path.relative_to(ROOT)).replace("\\", "/"): file_digest(path)
            for path in input_paths
        },
        "sourceIds": sorted({reference["sourceId"] for item in inventory for reference in item["sourceReferences"]}),
    }
    readiness = {
        "status": "READY_WITH_GAPS",
        "readyForShadowRuntime": True,
        "canonicalCount": 16,
        "gapCount": 9,
        "gaps": GAPS,
        "uasSpecificCount": 0,
        "unsupportedInferenceCount": 0,
        "constraintsRequired": True,
        "activeRuntimeChanged": False,
    }
    question_constraints = {
        "allowedByContext": {
            "RF_GENERAL": ["RF_CONCEPT", "SIGNAL_BEHAVIOR", "INTERFERENCE_CONCEPT", "ANTENNA_FUNCTION"],
            "AVIATION_COMMUNICATION": ["COMMUNICATION_CONCEPT", "COMPONENT_FUNCTION", "LINK_CONCEPT"],
        },
        "prohibited": [
            "DRONE_RANGE", "DRONE_FAILSAFE", "DRONE_CONTROL_LINK",
            "DRONE_CONTROLLER_OPERATION", "DRONE_TELEMETRY_OPERATION", "DRONE_FPV_OPERATION",
            "PRODUCT_SPECIFIC_OPERATION",
        ],
    }
    canonical = {
        "setId": "canonical-flight-theory:004e:v1",
        "version": "1.0.0",
        "batchId": "004E",
        "canonicalUnits": units,
        "relationshipUnits": relationships,
        "formulaUnits": formulas,
        "warningIds": [item["knowledgeId"] for item in all_items if item["canonicalEligibility"] == "READY_WITH_WARNING"],
        "excludedIds": [item["tableId"] for item in exclusions],
        "visualSupportIds": [item["assetId"] for item in visual_support],
        "regulatoryLineage": regulatory_lineage,
        "topicCoverage": coverage,
        "gapAnalysis": {"count": 9, "topics": GAPS},
        "technicalContextDistribution": context_distribution,
        "questionConstraints": question_constraints,
        "sourceSnapshot": source_snapshot,
        "runtimeReadiness": readiness,
        "freezeStatus": "READY_WITH_GAPS_FROZEN",
        "generatedAt": GENERATED_AT,
    }
    checksum_payload = deepcopy(canonical)
    checksum_payload.pop("generatedAt")
    canonical["checksum"] = digest(checksum_payload)

    existing = {}
    for batch, path in existing_canonical_paths().items():
        payload = load(path)
        existing[batch.upper()] = {
            "batchId": batch.upper(),
            "canonicalCount": canonical_count(payload),
            "readiness": payload.get("runtimeReadiness", {}).get("status") if isinstance(payload.get("runtimeReadiness"), dict) else payload.get("runtimeReadiness", "FROZEN"),
            "freezeStatus": payload.get("freezeStatus") or (payload.get("runtimeReadiness", {}).get("freezeStatus") if isinstance(payload.get("runtimeReadiness"), dict) else None) or "FROZEN",
            "checksum": payload["checksum"],
            "gapCount": len(payload.get("gapAnalysis", {}).get("topics", [])) or sum(1 for row in payload.get("topicCoverage", []) if row.get("status") in ("NO_KNOWLEDGE", "READY_WITH_GAPS", "VALIDATED_WITH_GAPS")),
            "sourceContext": sorted({
                unit.get("technicalContext") or unit.get("context")
                for unit in payload.get("units", []) + payload.get("canonicalUnits", [])
                if unit.get("technicalContext") or unit.get("context")
            }),
        }
    batch004e = {
        "batchId": "004E", "canonicalCount": 16, "readiness": readiness["status"],
        "freezeStatus": canonical["freezeStatus"], "checksum": canonical["checksum"],
        "gapCount": 9, "sourceContext": sorted(context_distribution),
    }
    batches = [existing[key] for key in ("004A", "004B", "004C", "004D")] + [batch004e] + [existing[key] for key in ("004F", "004G", "004H")]
    total = sum(batch["canonicalCount"] for batch in batches)
    if total != 216:
        raise RuntimeError("CANONICAL_TOTAL_DRIFT")
    index = {
        "indexId": "canonical-flight-theory:index:v1",
        "totalCanonicalCount": total,
        "batches": batches,
        "knowledgeCounts": {batch["batchId"]: batch["canonicalCount"] for batch in batches},
        "relationshipCounts": {"004E": 4},
        "warningCounts": {"004E": 6},
        "gapCounts": {batch["batchId"]: batch["gapCount"] for batch in batches},
        "frozenBatchCount": sum(bool(batch["freezeStatus"]) for batch in batches),
        "sourceSnapshots": {"004E": source_snapshot},
        "checksums": {batch["batchId"]: batch["checksum"] for batch in batches},
        "activePack": False,
    }

    summary = {
        "batchId": "004E", "canonicalInput": 16, "canonicalGenerated": 16,
        "canonicalUnits": 11, "relationshipUnits": 4, "formulaUnits": 1,
        "typeDistribution": dict(Counter(item["knowledgeType"] for item in all_items)),
        "candidateStatus": dict(statuses), "technicalContext": context_distribution,
        "uasSpecificCount": 0, "visualSupportCount": 1, "visualCanonicalCount": 0,
        "regulatoryTableCount": 1, "regulatoryTableCanonicalCount": 0,
        "gapCount": 9, "gaps": GAPS,
        "topicStatusCounts": dict(Counter(item["status"] for item in coverage)),
        "runtimeReadiness": readiness["status"], "freezeStatus": canonical["freezeStatus"],
        "existingCanonicalBaseline": sum(existing[key]["canonicalCount"] for key in existing),
        "totalFlightTheoryCanonical": total, "tsStatus": "WAITING_FOR_MANUAL_FILE",
        "checksum": canonical["checksum"], "checksumReproducible": canonical["checksum"] == digest(checksum_payload),
        "unsupportedInferenceCount": 0,
        "mutations": {
            "existingCanonical": 0, "activePack": 0, "atomicFact": 0, "graph": 0,
            "graphVersion": 0, "question": 0, "legal": 0, "weather": 0, "supabase": 0,
        },
    }
    return canonical, {
        "canonical-summary.json": summary,
        "canonical-visual-support.json": {"batchId": "004E", "items": visual_support, "canonicalCount": 0},
        "canonical-exclusions.json": {"batchId": "004E", "items": exclusions, "count": len(exclusions)},
        "regulatory-lineage.json": regulatory_lineage,
        "canonical-topic-coverage.json": coverage,
        "runtime-readiness.json": readiness,
        "freeze-status.json": {
            "batchId": "004E", "status": canonical["freezeStatus"],
            "resumeConditions": ["OFFICIAL_TS_UAS_TECHNICAL_MANUAL", "NEW_OFFICIAL_UAS_COMMUNICATION_SOURCE", "CANONICAL_ERROR", "CRITICAL_RUNTIME_SAFETY_BUG"],
        },
        "canonical-execution.json": {
            "batchId": "004E", "status": "COMPLETED", "inputDrift": False,
            "checksumReproducible": True, "unsupportedInferenceCount": 0,
            "mutationCount": 0, "generatedAt": GENERATED_AT,
        },
        "canonical-flight-theory-index.json": index,
    }


def main() -> None:
    existing_paths = existing_canonical_paths()
    validation_paths = [
        RESULTS / name for name in (
            "canonical-candidate-inventory.json", "validation-summary.json", "validation-results.json",
            "validated.json", "validated-with-warning.json", "blocked.json", "rf-validation.json",
            "communication-validation.json", "link-validation.json", "interference-validation.json",
            "relationship-validation.json", "formula-validation.json", "visual-validation.json",
            "table-validation.json", "duplicate-boundary-analysis.json", "topic-validation-coverage.json",
            "runtime-readiness-preview.json", "execution.json",
        )
    ]
    protected_paths = list(existing_paths.values()) + validation_paths
    before = {str(path): file_digest(path) for path in protected_paths}
    canonical_first, artifacts_first = build()
    canonical_second, artifacts_second = build()
    if canonical_first["checksum"] != canonical_second["checksum"] or stable(canonical_first) != stable(canonical_second):
        raise RuntimeError("NON_DETERMINISTIC_CANONICAL_BUILD")
    save(RESULTS / "canonical-flight-knowledge-004e.json", canonical_first)
    for filename, payload in artifacts_first.items():
        target = INDEX if filename == "canonical-flight-theory-index.json" else RESULTS / filename
        save(target, payload)
    after = {str(path): file_digest(path) for path in protected_paths}
    if before != after:
        raise RuntimeError("EXISTING_CANONICAL_MUTATION")
    print(json.dumps(artifacts_second["canonical-summary.json"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
