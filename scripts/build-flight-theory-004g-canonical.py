from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "work/flight-theory-validation/004g"
RESULTS = INPUT / "results"
INGESTION = ROOT / "work/source-ingestion/source-batch-004g"
GENERATED_AT = "2026-08-12T00:00:00Z"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(name: str, value) -> None:
    (RESULTS / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stable_hash(value) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return "sha256-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()


def canonical_id(kind: str, source_id: str) -> str:
    prefixes = {
        "FAILURE_MODE": "flight-failure:",
        "FAILURE_SYMPTOM": "flight-failure:",
        "EMERGENCY_PROCEDURE": "flight-emergency:",
        "EMERGENCY_DECISION": "flight-emergency-decision:",
        "SAFETY_KNOWLEDGE": "flight-emergency-safety:",
        "FLIGHT_CONCEPT": "flight-emergency-concept:",
        "RELATIONSHIP": "flight-emergency-relation:",
    }
    key = source_id.removeprefix(prefixes[kind]).replace(":symptom:", "-symptom-")
    return f"flight-004g:{kind.lower().replace('_', '-')}:{key}"


def source_id(kind: str, row: dict) -> str:
    return {
        "FAILURE_MODE": "failureId",
        "FAILURE_SYMPTOM": "symptomId",
        "EMERGENCY_PROCEDURE": "procedureId",
        "EMERGENCY_DECISION": "decisionId",
        "SAFETY_KNOWLEDGE": "safetyId",
        "FLIGHT_CONCEPT": "conceptId",
        "RELATIONSHIP": "relationId",
    }[kind] and row[{
        "FAILURE_MODE": "failureId", "FAILURE_SYMPTOM": "symptomId",
        "EMERGENCY_PROCEDURE": "procedureId", "EMERGENCY_DECISION": "decisionId",
        "SAFETY_KNOWLEDGE": "safetyId", "FLIGHT_CONCEPT": "conceptId",
        "RELATIONSHIP": "relationId",
    }[kind]]


def title(kind: str, row: dict) -> str:
    return str(row.get("name") or row.get("title") or row.get("observedCondition") or row.get("trigger") or row.get("definition") or row.get("relationType"))


def refs(row: dict) -> list:
    return deepcopy(row.get("sourceReferences") or ([row["sourceReference"]] if row.get("sourceReference") else [row["sourceLocator"]] if row.get("sourceLocator") else []))


def question_types(kind: str, row: dict) -> list[str]:
    values = {
        "FAILURE_MODE": ["FAILURE_IDENTIFICATION", "CASE_JUDGMENT"],
        "FAILURE_SYMPTOM": ["SYMPTOM_IDENTIFICATION", "CASE_JUDGMENT"],
        "EMERGENCY_PROCEDURE": ["EMERGENCY_ACTION_SELECTION", "CASE_JUDGMENT"],
        "EMERGENCY_DECISION": ["EMERGENCY_JUDGMENT", "CASE_JUDGMENT"],
        "SAFETY_KNOWLEDGE": ["SAFETY_ACTION", "SAFETY_JUDGMENT"],
        "FLIGHT_CONCEPT": ["CONCEPT_IDENTIFICATION"],
        "RELATIONSHIP": ["RELATIONSHIP_SELECTION"],
    }[kind]
    if row.get("conceptId") == "flight-emergency-concept:emergency-landing-capability":
        return ["CONCEPT_IDENTIFICATION", "CAPABILITY_JUDGMENT"]
    return values


def build_unit(kind: str, row: dict, warning_map: dict[str, list[str]]) -> dict:
    sid = source_id(kind, row)
    warning_key = row.get({"SAFETY_KNOWLEDGE": "safetyId", "FLIGHT_CONCEPT": "conceptId"}.get(kind, ""), sid)
    warnings = deepcopy(warning_map.get(warning_key, []))
    constraints: dict[str, bool] = {}
    if warning_key == "flight-emergency-safety:battery-fire":
        constraints = {"allowPreventiveHandling": True, "allowFireSuppressionProcedure": False, "allowUnsupportedEmergencyAction": False}
    if warning_key == "flight-emergency-concept:emergency-landing-capability":
        constraints = {"allowCapabilityQuestion": True, "allowProcedureQuestion": False, "allowOrderedProcedure": False}
    excluded = {"rawEvidenceText", "validationEligibility", "confidence", "topicIds"}
    unit = {k: deepcopy(v) for k, v in row.items() if k not in excluded}
    unit.update({
        "knowledgeId": canonical_id(kind, sid), "sourceRecordId": sid,
        "knowledgeType": kind, "title": title(kind, row), "sourceReferences": refs(row),
        "relationshipIds": [], "qualityScore": 1.0, "validationWarnings": warnings,
        "constraints": constraints, "questionEligibility": "RELATIONSHIP_REQUIRED" if kind == "RELATIONSHIP" else "STANDALONE",
        "supportedQuestionTypes": question_types(kind, row),
    })
    if kind == "EMERGENCY_PROCEDURE":
        unit["ordered"] = False
        unit["orderingEvidence"] = row.get("orderingEvidence", "")
        assert "PROCEDURE_ORDER" not in unit["supportedQuestionTypes"]
    return unit


def main() -> None:
    inventory = load(RESULTS / "canonical-candidate-inventory.json")
    held = load(RESULTS / "canonical-candidate-held.json")
    validation = load(RESULTS / "validation-results.json")
    summary = load(RESULTS / "validation-summary.json")
    assert len(inventory) == 26 and all(x["canonicalId"] is None for x in inventory)
    assert Counter(x["candidateStatus"] for x in inventory) == {"READY": 24, "CONDITIONAL": 2}
    assert Counter(x["status"] for x in held) == {"BLOCKED": 5, "DUPLICATE": 1}
    assert summary["canonicalCreated"] is False and summary["unsupportedInferenceCount"] == 0

    before = {p: stable_hash(load(p)) for p in [
        RESULTS / "canonical-candidate-inventory.json", RESULTS / "validation-results.json",
        ROOT / "work/flight-theory-validation/004a/results/canonical-flight-knowledge-004a.json",
        ROOT / "work/flight-theory-validation/004b/results/canonical-flight-knowledge-004b.json",
        ROOT / "work/flight-theory-validation/004f/results/canonical-flight-knowledge-004f.json",
        INGESTION / "deferred-knowledge.json",
    ]}
    validated = {(x["knowledgeType"], x["knowledgeId"]): x for x in validation if x["canonicalCandidate"]}
    warning_map = {x["knowledgeId"]: x["warnings"] for x in validation if x["warnings"]}
    files = {
        "FAILURE_MODE": "failure-modes.json", "FAILURE_SYMPTOM": "failure-symptoms.json",
        "EMERGENCY_PROCEDURE": "emergency-procedures.json", "EMERGENCY_DECISION": "emergency-decisions.json",
        "SAFETY_KNOWLEDGE": "safety-knowledge.json", "FLIGHT_CONCEPT": "concepts.json", "RELATIONSHIP": "relationships.json",
    }
    units = []
    for kind, name in files.items():
        for row in load(INPUT / name):
            sid = source_id(kind, row)
            validation_id = row.get("failureId") if kind == "FAILURE_SYMPTOM" else sid
            if (kind, validation_id) in validated:
                units.append(build_unit(kind, row, warning_map))
    assert len(units) == 26 and len({x["knowledgeId"] for x in units}) == 26
    assert Counter(x["knowledgeType"] for x in units) == {"FAILURE_MODE": 9, "FAILURE_SYMPTOM": 8, "SAFETY_KNOWLEDGE": 3, "EMERGENCY_DECISION": 2, "FLIGHT_CONCEPT": 2, "EMERGENCY_PROCEDURE": 1, "RELATIONSHIP": 1}

    canonical_by_source = {x["sourceRecordId"]: x["knowledgeId"] for x in units}
    relation_units = [x for x in units if x["knowledgeType"] == "RELATIONSHIP"]
    for relation in relation_units:
        relation["sourceCanonicalId"] = canonical_by_source[relation["sourceKnowledgeId"]]
        relation["targetCanonicalId"] = canonical_by_source[relation["targetKnowledgeId"]]
        for endpoint in (relation["sourceCanonicalId"], relation["targetCanonicalId"]):
            next(x for x in units if x["knowledgeId"] == endpoint)["relationshipIds"].append(relation["knowledgeId"])

    blocked = [x for x in validation if x["status"] == "BLOCKED"]
    duplicate = next(x for x in validation if x["status"] == "DUPLICATE")
    exclusions = {
        "batchId": "004G", "blockedRelationships": [{
            "knowledgeId": x["knowledgeId"], "blocker": x["blockers"],
            "originalRelationType": next(r["relationType"] for r in load(INPUT / "relationships.json") if r["relationId"] == x["knowledgeId"]),
            "sourceKnowledgeId": next(r["sourceKnowledgeId"] for r in load(INPUT / "relationships.json") if r["relationId"] == x["knowledgeId"]),
            "targetKnowledgeId": next(r["targetKnowledgeId"] for r in load(INPUT / "relationships.json") if r["relationId"] == x["knowledgeId"]),
            "reason": x["reason"],
        } for x in blocked], "duplicates": [{
            "originalId": duplicate["knowledgeId"], "canonicalWinnerReference": duplicate["duplicateOf"], "duplicateReason": duplicate["reason"]
        }], "count": 6,
    }

    source_coverage = load(INGESTION / "coverage.json")
    validation_by_id = defaultdict(list)
    for x in validation:
        validation_by_id[x["knowledgeId"]].append(x)
    topic_rows = []
    for topic in source_coverage:
        topic_id = topic["topicId"]
        matched = [u for u in units if topic_id in next((r.get("topicIds", []) for kind, name in files.items() for r in load(INPUT / name) if source_id(kind, r) == u["sourceRecordId"]), [])]
        source_ids = {u["sourceRecordId"] for u in matched}
        validated_count = len(matched)
        no_knowledge = topic["coverageStatus"] == "NO_KNOWLEDGE"
        status = "NO_KNOWLEDGE" if no_knowledge else "READY_WITH_GAPS" if topic["coverageStatus"] == "INGESTED_WITH_GAPS" else "CANONICAL_READY"
        topic_rows.append({"topicId": topic_id, "validatedKnowledgeCount": validated_count, "canonicalKnowledgeCount": len(matched), "warningKnowledgeCount": sum(bool(u["validationWarnings"]) for u in matched), "excludedKnowledgeCount": 0, "relationshipCount": sum(u["knowledgeType"] == "RELATIONSHIP" for u in matched), "status": status, "gaps": deepcopy(topic.get("gaps", []))})
    no_knowledge = [x["topicId"] for x in topic_rows if x["status"] == "NO_KNOWLEDGE"]
    assert len(no_knowledge) == 6
    readiness = {"status": "READY_WITH_GAPS", "readyForShadowRuntime": True, "canonicalCount": 26, "criticalBlockersInCanonical": 0, "unsupportedInferenceCount": 0, "gaps": no_knowledge, "freezeStatus": "READY_WITH_GAPS_FROZEN", "activeRuntimeChanged": False}
    snapshot_files = [INPUT / x for x in files.values()] + [RESULTS / "canonical-candidate-inventory.json", RESULTS / "validation-results.json"]
    source_snapshot = {"primarySource": "faa-ac-107-2a", "supportingSource": "faa-remote-pilot-study-guide", "supportingSourceStatus": "POSSIBLY_OUTDATED", "inputChecksums": {str(p.relative_to(ROOT)).replace("\\", "/"): stable_hash(load(p)) for p in snapshot_files}}
    core = {"setId": "canonical-flight-theory:004g:v1", "version": "1", "batchId": "004G", "canonicalUnits": [u for u in units if u["knowledgeType"] != "RELATIONSHIP"], "relationshipUnits": relation_units, "warningIds": [u["knowledgeId"] for u in units if u["validationWarnings"]], "excludedIds": [x["knowledgeId"] for x in blocked] + [duplicate["knowledgeId"]], "topicCoverage": topic_rows, "runtimeReadiness": readiness, "sourceSnapshot": source_snapshot, "generatedAt": GENERATED_AT}
    checksum_core = deepcopy(core); checksum_core.pop("generatedAt")
    core["checksum"] = stable_hash(checksum_core)
    canonical_summary = {"inputCandidates": 26, "canonicalCount": 26, "readyCandidates": 24, "warningCanonical": 2, "excludedCount": 6, "typeDistribution": dict(Counter(x["knowledgeType"] for x in units)), "noKnowledgeTopics": 6, "runtimeReadiness": readiness["status"], "freezeStatus": readiness["freezeStatus"], "deferred004H": len(load(INGESTION / "deferred-knowledge.json")), "checksum": core["checksum"], "mutationCount": 0}
    dump("canonical-flight-knowledge-004g.json", core)
    dump("canonical-exclusions.json", exclusions)
    dump("canonical-summary.json", canonical_summary)
    dump("topic-validation-coverage.json", topic_rows)
    dump("runtime-readiness.json", readiness)
    after = {p: stable_hash(load(p)) for p in before}
    assert before == after
    print(json.dumps(canonical_summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
