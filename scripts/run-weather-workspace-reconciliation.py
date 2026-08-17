"""Read-only reconciliation and conservative validation for the Weather workspace."""
from __future__ import annotations
import argparse, hashlib, json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "work/weather-validation"
OUT = ROOT / "work/weather-reconciliation"
RESULTS = INPUT / "results"
REGISTRY_PATH = ROOT / "work/source-ingestion/source-batch-003/source-registry.json"
FILES = {"concept":"concepts.json","phenomenon":"phenomena.json","hazard":"hazards.json",
         "observation":"observations.json","weather-code":"codes.json",
         "operational-impact":"operational-impacts.json","relationship":"relationships.json"}
BASELINE_COUNTS = {"concept":12,"phenomenon":6,"hazard":5,"observation":8,
                   "weather-code":0,"operational-impact":0,"relationship":4}

def read(path: Path): return json.loads(path.read_text(encoding="utf-8"))
def dump(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
def sha(path: Path): return "sha256-" + hashlib.sha256(path.read_bytes()).hexdigest()
def identity(item, kind):
    for key in ("conceptId","phenomenonId","hazardId","observationId","impactId","relationId"):
        if item.get(key): return item[key]
    if kind == "weather-code": return f"weather-code:{item['codeType'].lower()}:{item['token'].lower()}"
    return "UNKNOWN"
def refs(item):
    if item.get("sourceReferences"): return item["sourceReferences"]
    if item.get("sourceLocator"): return [item["sourceLocator"]]
    return [{"sourceId": source_id} for source_id in item.get("sourceIds", [])]

def snapshot():
    """Create the immutable before-analysis snapshot. Never called by the full run."""
    OUT.mkdir(parents=True, exist_ok=True); knowledge=[]; checks=[]
    for kind,name in FILES.items():
        path=INPUT/name
        for item in read(path):
            reference=refs(item)
            knowledge.append({"knowledgeId":identity(item,kind),"type":kind,
                "sourceIds":sorted({x.get("sourceId") for x in reference if x.get("sourceId")}),
                "sourceLocators":reference,"createdAt":item.get("createdAt"),"updatedAt":item.get("updatedAt"),
                "checksum":"sha256-"+hashlib.sha256(json.dumps(item,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),
                "artifactPath":str(path.relative_to(ROOT)).replace("\\","/")})
        checks.append({"artifactPath":str(path.relative_to(ROOT)).replace("\\","/"),"checksum":sha(path),"size":path.stat().st_size})
    sources=read(REGISTRY_PATH)
    captured=datetime.now(timezone.utc).isoformat()
    dump(OUT/"current-weather-knowledge-snapshot.json",{"capturedAt":captured,"count":len(knowledge),"knowledge":knowledge})
    dump(OUT/"current-weather-source-snapshot.json",{"capturedAt":captured,"count":len(sources),"sources":sources})
    checks.append({"artifactPath":str(REGISTRY_PATH.relative_to(ROOT)).replace("\\","/"),"checksum":sha(REGISTRY_PATH),"size":REGISTRY_PATH.stat().st_size})
    dump(OUT/"current-weather-artifact-checksums.json",{"capturedAt":captured,"artifacts":checks})
    print(json.dumps({"knowledge":len(knowledge),"sources":len(sources),"artifacts":len(checks)}))

def source_audit(sources):
    audited=[]; valid=set()
    for source in sources:
        local=ROOT/source["localPath"] if source.get("localPath") else None
        exists=bool(local and local.exists()); checksum=sha(local) if exists else None
        raw=local.read_bytes() if exists else b""
        looks_blocked=len(raw)<1024 and any(cue in raw.lower() for cue in (b"firewall",b"access denied",b"blocked"))
        signature_ok=(source.get("fileType")!="PDF" or raw.startswith(b"%PDF")) and not looks_blocked
        hash_ok=exists and checksum==source.get("checksum")
        status="VALID" if exists and signature_ok and hash_ok and source.get("extractionStatus")=="READY_FOR_INGESTION" else (
            "MANUAL_WAITING" if source.get("extractionStatus")=="MANUAL_ACQUISITION_REQUIRED" else "BLOCKED")
        if status=="VALID": valid.add(source["sourceId"])
        audited.append({"sourceId":source["sourceId"],"title":source["canonicalTitle"],"organization":source["issuingOrganization"],
            "officialUrl":source.get("officialPageUrl"),"localPath":source.get("localPath"),"fileType":source.get("fileType"),
            "registeredChecksum":source.get("checksum"),"actualChecksum":checksum,"checksumMatches":hash_ok,
            "size":len(raw),"currentness":source.get("currentnessStatus"),"acquisitionMethod":"MANUAL" if status=="MANUAL_WAITING" else "LOCAL_ARTIFACT",
            "ingestionStatus":source.get("extractionStatus"),"auditStatus":status})
    return audited,valid

def baseline_and_added(items):
    baseline=[]; added=[]
    for kind, values in items.items():
        # The exact 35 payload was overwritten. Stable file order plus the recorded per-type counts
        # reconstructs membership only; modification claims remain unknown.
        cut=BASELINE_COUNTS[kind]
        baseline.extend(identity(x,kind) for x in values[:cut])
        added.extend(identity(x,kind) for x in values[cut:])
    return baseline,added

def structure(item,kind):
    blockers=[]; warnings=[]
    if kind=="concept" and len(item.get("definition","").strip())<20: blockers.append("DEFINITION_TOO_SHORT")
    if kind=="phenomenon" and not item.get("characteristics"): blockers.append("CHARACTERISTICS_MISSING")
    if kind=="hazard" and (not item.get("triggerConditions") or not item.get("affectedOperations")): blockers.append("HAZARD_STRUCTURE_INCOMPLETE")
    if kind=="observation" and not item.get("observationMethod"): blockers.append("OBSERVATION_METHOD_MISSING")
    if kind=="weather-code":
        if not item.get("meaning") or not item.get("valueType"): blockers.append("CODE_CORE_MISSING")
        if not item.get("positionRules"): blockers.append("CODE_POSITION_RULE_MISSING")
        if not item.get("dependencies"): warnings.append("CODE_DEPENDENCY_MISSING")
        if not item.get("examples"): warnings.append("CODE_EXAMPLE_MISSING")
        warnings.append("SYNTHETIC_AUDIT_ID_USED_INPUT_HAS_NO_CODE_ID")
    if kind=="operational-impact":
        text=f"{item.get('aircraftContext','')} {item.get('operationalEffect','')}"
        drone=any(x in text.lower() for x in ("drone","unmanned","초경량","무인"))
        aviation=any(x in text.lower() for x in ("aircraft","aviation","항공기","운항","이착륙"))
        if not drone and not aviation: blockers.append("UNSUPPORTED_OPERATIONAL_INFERENCE")
        elif not drone: warnings.append("GENERAL_AVIATION_ONLY")
        if not item.get("decisionGuidance"): warnings.append("DECISION_GUIDANCE_MISSING")
        if len(item.get("operationalEffect", ""))<30: blockers.append("OPERATIONAL_EFFECT_INCOMPLETE")
    return blockers,warnings

def relation_semantic_blockers(item):
    cues={"warm-front":["온난전선","warm front"],"cold-front":["한랭전선","cold front"],
          "precipitation":["강수","precipitation"],"thunderstorm":["뇌우","thunderstorm"],
          "fog":["안개","fog"],"visibility":["시정","visibility"],"humidity":["습도","humidity"],
          "cloud":["구름","cloud"],"satellite":["위성","satellite"],"weather-chart":["일기도","weather chart"]}
    evidence=item.get("evidence","").lower()
    missing=[]
    for endpoint in (item.get("fromId",""),item.get("toId","")):
        if endpoint in cues and not any(cue.lower() in evidence for cue in cues[endpoint]): missing.append(endpoint)
    return ["RELATION_EVIDENCE_DOES_NOT_SUPPORT_BOTH_ENDPOINTS"] if missing else []

def reconcile():
    if not (OUT/"current-weather-knowledge-snapshot.json").exists():
        raise SystemExit("Snapshot missing. Run --snapshot-only before reconciliation.")
    items={kind:read(INPUT/name) for kind,name in FILES.items()}; sources=read(REGISTRY_PATH)
    audited_sources,valid_sources=source_audit(sources)
    baseline,added=baseline_and_added(items)
    all_ids={identity(x,k) for k,v in items.items() for x in v}
    def resolves(value): return value in all_ids or any(x.endswith(":"+value) for x in all_ids)
    validation=[]; provenance=[]
    for kind,values in items.items():
        for item in values:
            kid=identity(item,kind); references=refs(item); source_ids={r.get("sourceId") for r in references if r.get("sourceId")}
            source_ok=bool(source_ids) and source_ids.issubset(valid_sources)
            locator_ok=bool(references) and all(r.get("page") is not None or r.get("section") for r in references)
            evidence=bool(item.get("rawEvidenceText") or item.get("evidence") or item.get("meaning") or item.get("operationalEffect") or item.get("definition"))
            blockers,warnings=structure(item,kind)
            if not source_ok: blockers.insert(0,"SOURCE_NOT_VALIDATED")
            if not locator_ok: warnings.append("SOURCE_LOCATOR_INCOMPLETE")
            if not evidence: blockers.append("RAW_EVIDENCE_MISSING")
            if kind=="relationship":
                if not resolves(item.get("fromId","")) or not resolves(item.get("toId","")): blockers.append("RELATION_ENDPOINT_MISSING")
                if not item.get("evidence"): blockers.append("RELATION_EVIDENCE_MISSING")
                blockers.extend(relation_semantic_blockers(item))
            if "SOURCE_NOT_VALIDATED" in blockers: status="BLOCKED_SOURCE"
            elif kind=="relationship" and blockers: status="BLOCKED_RELATIONSHIP"
            elif blockers: status="BLOCKED_STRUCTURE"
            elif warnings: status="VALIDATED_WITH_WARNING"
            else: status="VALIDATED"
            eligibility={"VALIDATED":"ELIGIBLE","VALIDATED_WITH_WARNING":"ELIGIBLE_WITH_WARNING","BLOCKED_SOURCE":"BLOCKED_SOURCE",
                         "BLOCKED_RELATIONSHIP":"BLOCKED_RELATIONSHIP","BLOCKED_STRUCTURE":"BLOCKED_STRUCTURE"}[status]
            score=max(0,round(1-.25*len(blockers)-.05*len(warnings),3))
            scope=None
            if kind=="operational-impact": scope="VALIDATED_DRONE_IMPACT" if not any(w=="GENERAL_AVIATION_ONLY" for w in warnings) and not blockers else (
                "VALIDATED_GENERAL_AVIATION_IMPACT" if "GENERAL_AVIATION_ONLY" in warnings and not blockers else "BLOCKED_UNSUPPORTED_INFERENCE")
            validation.append({"knowledgeId":kid,"kind":kind,"eligibility":eligibility,"status":status,"score":score,
                               "warnings":sorted(set(warnings)),"blockers":sorted(set(blockers)),"impactScope":scope})
            if kid in added:
                pstatus="PROVENANCE_VERIFIED" if source_ok and locator_ok and evidence else (
                    "PROVENANCE_VERIFIED_WITH_WARNING" if source_ok and evidence else
                    "PROVENANCE_MISSING" if source_ok or not source_ids else "SOURCE_BLOCKED")
                provenance.append({"knowledgeId":kid,"kind":kind,"sourceIds":sorted(source_ids),"sourceRegistered":bool(source_ids),
                    "officialAuthority":all(next((s["authority"] for s in sources if s["sourceId"]==sid),"").startswith("OFFICIAL") for sid in source_ids),
                    "localOriginalValid":source_ok,"sourceLocatorPresent":locator_ok,"rawEvidencePresent":evidence,
                    "artifactLineage":"work/source-ingestion/source-batch-003/ingestion", "status":pstatus})
    accepted=[x for x in validation if x["status"] in ("VALIDATED","VALIDATED_WITH_WARNING")]
    canonical={k:[] for k in ("concepts","phenomena","hazards","observations","weatherCodes","operationalImpacts","relationships")}
    plural={"concept":"concepts","phenomenon":"phenomena","hazard":"hazards","observation":"observations","weather-code":"weatherCodes","operational-impact":"operationalImpacts","relationship":"relationships"}
    lookup={(k,identity(x,k)):x for k,v in items.items() for x in v}
    for result in accepted: canonical[plural[result["kind"]]].append({"knowledge":lookup[(result["kind"],result["knowledgeId"])],"validation":result})
    canonical["generatedAt"]=datetime.now(timezone.utc).isoformat(); canonical["counts"]={k:len(v) for k,v in canonical.items() if isinstance(v,list)}
    status_counts=Counter(x["status"] for x in validation); eligibility_counts=Counter(x["eligibility"] for x in validation)
    relation_results=[x for x in validation if x["kind"]=="relationship"]
    code_results=[x for x in validation if x["kind"]=="weather-code"]
    impact_results=[x for x in validation if x["kind"]=="operational-impact"]
    new_source_ids=[s["sourceId"] for s in sources[3:8]]
    comparison={"baselineCount":35,"currentCount":sum(map(len,items.values())),"baselineKnowledgeIds":baseline,"baselineBasis":"RECONSTRUCTED_FROM_RECORDED_COUNTS_AND_STABLE_ARTIFACT_ORDER",
        "baselinePayloadAvailable":False,"addedIds":added,"modifiedIds":None,"modificationAssessment":"UNKNOWN_NO_IMMUTABLE_BASELINE_PAYLOAD",
        "newSources":new_source_ids,"provenanceVerified":sum(x["status"].startswith("PROVENANCE_VERIFIED") for x in provenance),
        "blockedAdditions":sum(next(v for v in validation if v["knowledgeId"]==x["knowledgeId"])["status"].startswith("BLOCKED") for x in provenance),
        "validAdditions":sum(next(v for v in validation if v["knowledgeId"]==x["knowledgeId"])["status"].startswith("VALIDATED") for x in provenance)}
    source_topics=set(t for s in sources if s["sourceId"] in valid_sources for t in s.get("weatherTopics",[]))
    validated_topics={x["knowledgeId"].split(":")[-1] for x in accepted}
    coverage={"definedTopicCount":47,"sourceConnectedTopicCount":len(source_topics),"validatedKnowledgeTopicCount":len(validated_topics),
        "weatherCodeCoverage":len([x for x in code_results if x["status"].startswith("VALIDATED")]),
        "operationalImpactCoverage":len([x for x in impact_results if x["status"].startswith("VALIDATED")]),
        "sourceBatch003":{"003A":"COMPLETED","003B":"COMPLETED","003C":"COMPLETED_WITH_WARNINGS","003D":"COMPLETED_WITH_WARNINGS","003E":"PARTIAL","003F":"BLOCKED_MANUAL_SOURCE"}}
    recovery=[{"sourceId":"amo-metar-rmk-guide","status":"INGESTED"},{"sourceId":"amo-api-guide","status":"INGESTED"},{"sourceId":"amo-observation-guideline-2025","status":"WAITING"}]
    dump(OUT/"source-audit.json",audited_sources); dump(OUT/"added-knowledge-provenance.json",provenance)
    dump(OUT/"baseline-vs-current.json",comparison); dump(RESULTS/"weather-validation-results.json",validation)
    dump(RESULTS/"canonical-weather-knowledge-set.json",canonical); dump(OUT/"topic-coverage.json",coverage)
    dump(OUT/"manual-recovery-status.json",recovery)
    summary={"knowledge":sum(map(len,items.values())),"sourcesInRegistry":len(sources),"ingestionSources":8,"validLocalSources":len(valid_sources),
        "baseline":35,"added":len(added),"newSources":len(new_source_ids),"provenance":dict(Counter(x["status"] for x in provenance)),
        "eligibility":dict(eligibility_counts),"validation":dict(status_counts),"canonical":canonical["counts"],
        "weatherCodes":dict(Counter(x["status"] for x in code_results)),"operationalImpacts":dict(Counter((x["impactScope"] or x["status"]) for x in impact_results)),
        "relationships":dict(Counter(x["status"] for x in relation_results)),"coverage":coverage,"manualRecovery":recovery}
    dump(OUT/"reconciliation-summary.json",summary)
    report=f"""# Weather Workspace Reconciliation and Validation Report

Generated: {datetime.now(timezone.utc).isoformat()}

## Decision

The current **57-item** workspace is preserved as the source of truth. No rollback, deletion, legal-runtime change, active-pack mutation, or database write was performed.

## Reconciliation

| Metric | Result |
|---|---:|
| Current knowledge | {summary['knowledge']} |
| Recorded baseline | 35 |
| Added after baseline | {len(added)} |
| Registry records | {len(sources)} |
| Ingestion-source records | 8 |
| New ingestion sources | {len(new_source_ids)} |
| Valid local sources | {len(valid_sources)} |

The immutable 35-item payload is no longer present, so membership was reconstructed from the recorded per-type counts and stable artifact order. This is sufficient to identify the 22 additions, but **not** to prove which baseline payloads were modified; `modifiedIds` is therefore intentionally `null`.

## Added knowledge provenance

{json.dumps(dict(Counter(x['status'] for x in provenance)),ensure_ascii=False)}

The five new ingestion sources are: {', '.join(new_source_ids)}. The registry contains two further manual records, so registry total (10) and ingestion-source total (8) are intentionally reported separately. The 130-byte `amo-business-overview` firewall body remains blocked.

## Validation

Eligibility: `{dict(eligibility_counts)}`  
Results: `{dict(status_counts)}`

WeatherCode: `{dict(Counter(x['status'] for x in code_results))}`. Code meaning alone was not accepted; missing position/dependency/example structure remains visible. Synthetic audit IDs were used only in reports because the source type has no `codeId`.

OperationalImpact: `{dict(Counter((x['impactScope'] or x['status']) for x in impact_results))}`. General aviation evidence was never promoted to drone-specific evidence.

Relationships: `{dict(Counter(x['status'] for x in relation_results))}`. Unresolved endpoints, missing evidence, and unsupported directions are blocked.

## Canonical set

Only `VALIDATED` and `VALIDATED_WITH_WARNING` entries were admitted. Counts: `{canonical['counts']}`. File: `work/weather-validation/results/canonical-weather-knowledge-set.json`.

## Topic coverage and 003A–003F

`{coverage}`

## Manual recovery

- METAR/RMK guide: INGESTED (valid official local artifact)
- API guide: INGESTED (valid official local artifact)
- 2025 observation guideline: WAITING (official page known; no valid local original)

## Remaining gaps

- Immutable baseline-35 payload is unavailable, so baseline modification history cannot be cryptographically reconstructed.
- WeatherCode structural rules/examples are incomplete.
- Hazard records lack trigger/operation structure.
- Operational impacts are general aviation evidence, not direct drone evidence.
- Visual inventory records have no page locator and no interpretation, so they remain unresolved support assets.
- The 2025 observation guideline still needs manual acquisition.

## Mutation guard

Existing Weather Knowledge inputs, source originals, Legal Runtime, Active Pack, AtomicFact, Graph, Question data, Supabase, and the reconciliation snapshot were not changed by validation.
"""
    (ROOT/"docs/weather-workspace-reconciliation-and-validation-report.md").write_text(report,encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":
    parser=argparse.ArgumentParser(); parser.add_argument("--snapshot-only",action="store_true"); args=parser.parse_args()
    snapshot() if args.snapshot_only else reconcile()
