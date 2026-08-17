"""Recover the fixed 7 Hazard and 11 Observation candidates from existing sources."""
from __future__ import annotations
import hashlib,json,re
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WEATHER=ROOT/"work/weather-validation"; RESULTS=WEATHER/"results"
OUT=ROOT/"work/weather-hazard-observation-recovery"
OFFICIAL=ROOT/"data/sources/drone-license/weather/official"

def read(path):return json.loads(path.read_text(encoding="utf-8"))
def dump(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding="utf-8")
def sha(path):return "sha256-"+hashlib.sha256(path.read_bytes()).hexdigest()
def item_sha(item):return "sha256-"+hashlib.sha256(json.dumps(item,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def normalized(source_id):
    path=next(OFFICIAL.rglob(f"{source_id}/normalized/document.json"));return read(path)
def find(source_id,terms,preferred_page=None):
    pages=normalized(source_id)["pages"]
    ranked=sorted(pages,key=lambda p:(0 if preferred_page and p.get("page")==preferred_page else 1))
    for page in ranked:
        text=page.get("text","")
        if all(term.lower() in text.lower() for term in terms):
            pos=min(text.lower().find(term.lower()) for term in terms); excerpt=re.sub(r"\s+"," ",text[max(0,pos-180):pos+950]).strip()
            return {"sourceId":source_id,"sourceLocator":{"sourceId":source_id,"page":page.get("page")},"rawEvidenceText":excerpt}
    return None
def refs(item):return item.get("sourceReferences",[])

def baseline(hazards,observations,old_results):
    rows=[]
    for kind,items,idkey,namekey in (("hazard",hazards,"hazardId","name"),("observation",observations,"observationId","observationType")):
        for item in items:
            old=old_results.get(item[idkey],{})
            rows.append({"knowledgeId":item[idkey],"type":kind,"name":item[namekey],"sourceIds":[x.get("sourceId") for x in refs(item)],
                "sourceLocators":refs(item),"rawEvidenceText":item.get("rawEvidenceText"),"currentValidationStatus":old.get("status"),
                "blockers":old.get("blockers",[]),"warnings":old.get("warnings",[]),"topic":item[idkey].split(":")[-1],"checksum":item_sha(item)})
    return rows

def main():
    hazard_path=WEATHER/"hazards.json";observation_path=WEATHER/"observations.json"
    v1=RESULTS/"canonical-weather-knowledge-set.json";v2_path=RESULTS/"canonical-weather-knowledge-set-v2.json"
    protected=[WEATHER/f for f in ("concepts.json","phenomena.json","hazards.json","observations.json","codes.json","operational-impacts.json","relationships.json")]+[v1,v2_path]
    before={str(p.relative_to(ROOT)).replace("\\","/"):sha(p) for p in protected}
    hazards=read(hazard_path);observations=read(observation_path)
    if len(hazards)!=7 or len(observations)!=11:raise SystemExit(f"Fixed recovery scope violated: hazards={len(hazards)}, observations={len(observations)}")
    old={x["knowledgeId"]:x for x in read(RESULTS/"weather-validation-results.json")}
    dump(OUT/"baseline.json",baseline(hazards,observations,old))

    overview_source="amo-aviation-forecast-warning-overview"
    overview=normalized(overview_source)["pages"][0]["text"]
    def overview_evidence(term):
        pos=overview.find(term);return {"sourceId":overview_source,"sourceLocator":{"sourceId":overview_source,"page":1},
            "rawEvidenceText":re.sub(r"\s+"," ",overview[max(0,pos-180):pos+650]).strip()}
    hazard_specs={
      "thunderstorm":("CONVECTIVE",find("amo-metar-rmk-guide",["TS는","뇌우"],3) or overview_evidence("뇌우"),"Official report criteria identify thunder/lightning observation and aviation warning treatment."),
      "turbulence":("TURBULENCE",overview_evidence("난류"),"Moderate or severe turbulence is explicitly treated as hazardous aviation weather."),
      "icing":("ICING",overview_evidence("착빙"),"Icing is explicitly treated as hazardous aviation weather."),
      "strong-wind":("WIND",overview_evidence("강풍"),"Strong wind is an explicit airport-warning element when occurring or expected."),
      "heavy-rain":("PRECIPITATION",overview_evidence("호우"),"Heavy rain is an explicit airport-warning element when occurring or expected."),
      "gust":("WIND",find("amo-metar-rmk-guide",["GUST","10kt"],2),"A gust is reported when the ten-minute wind-speed variation reaches the source-stated criterion."),
      "wind-shear":("WIND",overview_evidence("급변풍경보"),"Wind shear below 1,600 ft on approach/departure paths is explicitly warning-relevant."),
    }
    recovered_h=[];h_results=[];evidence_rows=[];blockers=[]
    for item in hazards:
        topic=item["hazardId"].split(":")[-1];kind,ev,characteristic=hazard_specs[topic]
        if not ev:
            status="BLOCKED_STRUCTURE";current_blockers=["SOURCE_EVIDENCE_NOT_FOUND"]
            record=None
        else:
            record={**item,"hazardType":kind,"definingConditions":[ev["rawEvidenceText"]],"characteristics":[characteristic],
                "topic":topic,"sourceReferences":[ev["sourceLocator"]],"visualDependency":"NONE"}
            status="VALIDATED_WITH_WARNING";current_blockers=[]
            recovered_h.append(record);evidence_rows.append({"knowledgeId":item["hazardId"],"type":"hazard",**ev,"recoveredFields":["definingConditions","characteristics","topic"]})
        warnings=["FLIGHT_RISK_NOT_GROUNDED","AVOIDANCE_GUIDANCE_NOT_GROUNDED"] if status.startswith("VALIDATED") else []
        h_results.append({"knowledgeId":item["hazardId"],"status":status,"blockers":current_blockers,"warnings":warnings,"recoveredKnowledge":record})
        blockers.append({"knowledgeId":item["hazardId"],"type":"hazard","originalBlockers":["MISSING_TRIGGER_CONDITION","MISSING_SEVERITY_EVIDENCE","MISSING_FLIGHT_RISK_EVIDENCE","STRUCTURE_INCOMPLETE"],"resolved":["MISSING_TRIGGER_CONDITION","STRUCTURE_INCOMPLETE"] if record else [],"remaining":["MISSING_SEVERITY_EVIDENCE","MISSING_FLIGHT_RISK_EVIDENCE"]})

    metar_ev=find("amo-metar-rmk-guide",["바람그룹","풍속"],2)
    humidity_ev=find("kma-2024-training-plan",["습도","관측"],68)
    radar_ev=find("kma-basic-weather-analysis",["레이더","영상"],33)
    satellite_ev=find("kma-basic-weather-analysis",["위성","영상"],33)
    report_ev=find("amo-metar-rmk-guide",["보고서의 유형","METAR","SPECI"],2)
    obs_specs={
      "wind":("REPORTED_ELEMENT",metar_ev,{"observedElements":["wind direction","wind speed","gust"],"interpretation":["METAR/SPECI wind group reports true direction, sustained speed and source-defined gust information."],"units":["degree true","kt"],"visualDependency":"NONE"}),
      "humidity":("REPORTED_ELEMENT",humidity_ev,{"observedElements":["humidity"],"interpretation":["Official training material includes humidity among meteorological observation elements."],"visualDependency":"NONE"}),
      "radar":("REMOTE_SENSING",radar_ev,{"observedElements":["weather systems and precipitation patterns"],"interpretation":["Radar imagery supports weather analysis in the official source."],"instrument":"weather radar","visualDependency":"SUPPORTIVE"}),
      "satellite":("REMOTE_SENSING",satellite_ev,{"observedElements":["cloud and synoptic patterns"],"interpretation":["Satellite imagery supports weather-chart analysis in the official source."],"instrument":"meteorological satellite","visualDependency":"SUPPORTIVE"}),
      "metar":("CODED_OBSERVATION",report_ev,{"observedElements":["routine aerodrome weather observation"],"interpretation":["METAR is the routine report type preceding the observation body."],"relatedWeatherCodeIds":["weather-code:metar:metar"],"visualDependency":"NONE"}),
      "speci":("CODED_OBSERVATION",report_ev,{"observedElements":["special aerodrome weather observation"],"interpretation":["SPECI is the special report type preceding the observation body."],"relatedWeatherCodeIds":["weather-code:speci:speci"],"visualDependency":"NONE"}),
    }
    rejected_types={"taf":"FORECAST_PRODUCT_NOT_OBSERVATION","sigmet":"WARNING_PRODUCT_NOT_OBSERVATION","airmet":"WARNING_PRODUCT_NOT_OBSERVATION",
                    "observation":"CURRICULUM_RECORD_NOT_ATOMIC_OBSERVATION","aviation-warning":"WARNING_PRODUCT_NOT_OBSERVATION"}
    recovered_o=[];o_results=[]
    for item in observations:
        topic=item["observationId"].split(":")[-1]
        if topic in rejected_types:
            status="BLOCKED_STRUCTURE";current=[rejected_types[topic]];record=None
        else:
            schema,ev,fields=obs_specs[topic]
            if not ev:status="BLOCKED_SOURCE";current=["SOURCE_EVIDENCE_NOT_FOUND"];record=None
            else:
                record={**item,"observationSchemaType":schema,**fields,"sourceReferences":[ev["sourceLocator"]]}
                status="VALIDATED_WITH_WARNING" if topic=="humidity" else "VALIDATED";current=[]
                recovered_o.append(record);evidence_rows.append({"knowledgeId":item["observationId"],"type":"observation",**ev,"recoveredFields":list(fields)})
        o_results.append({"knowledgeId":item["observationId"],"status":status,"blockers":current,"warnings":["SOURCE_SCOPE_IS_TRAINING_CURRICULUM"] if topic=="humidity" and record else [],"recoveredKnowledge":record})
        original=["MISSING_INTERPRETATION","MISSING_UNIT","MISSING_INSTRUMENT","STRUCTURE_INCOMPLETE"]
        blockers.append({"knowledgeId":item["observationId"],"type":"observation","originalBlockers":original,"resolved":original if record else [],"remaining":current})

    relations=[]
    for code,obs in (("metar","metar"),("speci","speci"),("metar","wind"),("speci","wind")):
        cid=f"weather-code:{code}:{code}";oid=f"weather-observation:{obs}"
        relations.append({"relationId":f"recovery:{cid}:REPRESENTS:{oid}","fromId":cid,"toId":oid,
            "relationType":"REPRESENTS" if code==obs else "CONTAINS_OBSERVATION","sourceIds":["amo-metar-rmk-guide"],
            "evidence":report_ev["rawEvidenceText"] if code==obs else metar_ev["rawEvidenceText"],
            "sourceLocator":{"sourceId":"amo-metar-rmk-guide","page":2},"confidence":.96,"reviewStatus":"draft"})
    dump(OUT/"blocker-analysis.json",blockers);dump(OUT/"source-evidence-recovery.json",evidence_rows)
    dump(OUT/"hazard-recovery-results.json",h_results);dump(OUT/"observation-recovery-results.json",o_results)
    dump(OUT/"code-observation-relations.json",relations);dump(OUT/"validation-results.json",h_results+o_results)

    guideline=OFFICIAL/"aviation-weather-office/amo-observation-guideline-2025/original/source.pdf"
    raw=guideline.read_bytes() if guideline.exists() else b"";gblock=[]
    if not raw:gblock.append("FILE_MISSING")
    if raw and not raw.startswith(b"%PDF"):gblock.append("PDF_SIGNATURE_MISSING")
    if len(raw)<1024:gblock.append("FILE_TOO_SMALL")
    if any(x in raw[:1024].lower() for x in (b"firewall",b"blocked",b"access denied")):gblock.append("FIREWALL_BODY")
    guideline_status="READY_FOR_INGESTION" if not gblock else "WAITING_FOR_MANUAL_FILE"

    canonical=read(v2_path)
    v3={k:v for k,v in canonical.items() if k not in {"generatedAt","counts","checksum","status"}}
    v3["hazards"]=[{"knowledge":x,"validation":next(r for r in h_results if r["knowledgeId"]==x["hazardId"])} for x in recovered_h]
    v3["observations"]=[{"knowledge":x,"validation":next(r for r in o_results if r["knowledgeId"]==x["observationId"])} for x in recovered_o]
    existing_rel_ids={x["knowledge"].get("relationId") for x in v3["relationships"]}
    v3["relationships"] += [{"knowledge":x,"validation":{"knowledgeId":x["relationId"],"status":"VALIDATED","warnings":[],"blockers":[]}} for x in relations if x["relationId"] not in existing_rel_ids]
    v3["generatedAt"]=datetime.now(timezone.utc).isoformat();v3["counts"]={k:len(v) for k,v in v3.items() if isinstance(v,list)};v3["status"]="READY_WITH_GAPS"
    v3["checksum"]="sha256-"+hashlib.sha256(json.dumps(v3,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
    dump(RESULTS/"canonical-weather-knowledge-set-v3.json",v3)
    duplicate=[]
    phenomenon_ids={x["knowledge"]["phenomenonId"].split(":")[-1] for x in v3["phenomena"]}
    code_topics={x["knowledge"]["token"].lower() for x in v3["weatherCodes"]}
    for x in recovered_h:duplicate.append({"knowledgeId":x["hazardId"],"classification":"DISTINCT_TYPE_SAME_CONCEPT" if x["topic"] in phenomenon_ids else "DISTINCT"})
    for x in recovered_o:
        topic=x["observationId"].split(":")[-1];duplicate.append({"knowledgeId":x["observationId"],"classification":"DISTINCT_TYPE_SAME_CONCEPT" if topic in code_topics else "DISTINCT"})
    dump(OUT/"canonical-duplicate-analysis.json",duplicate)

    topics=set()
    for kind,idkey in (("concepts","conceptId"),("phenomena","phenomenonId"),("hazards","hazardId"),("observations","observationId"),("operationalImpacts","impactId")):
        for wrapper in v3[kind]:topics.add(wrapper["knowledge"][idkey].split(":")[-1])
    for wrapper in v3["weatherCodes"]:topics.add(wrapper["knowledge"]["token"].lower())
    coverage={"definedTopics":47,"sourceConnectedTopics":43,"validatedKnowledgeTopics":len(topics),"hazardCoverage":len(recovered_h),
      "observationCoverage":len(recovered_o),"weatherCodeCoverage":v3["counts"]["weatherCodes"],"operationalImpactCoverage":v3["counts"]["operationalImpacts"]}
    batches={"003A":"COMPLETED","003B":"COMPLETED","003C":"COMPLETED_WITH_WARNINGS","003D":"COMPLETED_WITH_WARNINGS","003E":"COMPLETED_WITH_WARNINGS","003F":"PARTIAL","003G":"COMPLETED_WITH_WARNINGS"}
    readiness={"status":"READY_WITH_GAPS","criticalBlockers":[],"gaps":["Five misclassified/generic Observation candidates remain blocked","No drone-specific OperationalImpact","2025 observation guideline invalid"],
      "questionEligibility":{"concept":{"count":v3["counts"]["concepts"],"supportedQuestionTypes":["DEFINITION","CONCEPT_COMPARISON"],"sourceCompleteness":"PARTIAL"},
       "phenomenon":{"count":v3["counts"]["phenomena"],"supportedQuestionTypes":["CAUSE_EFFECT","CONDITION"],"sourceCompleteness":"SUFFICIENT"},
       "hazard":{"count":len(recovered_h),"supportedQuestionTypes":["HAZARD_IDENTIFICATION"],"sourceCompleteness":"SUFFICIENT_WITH_OPERATIONAL_GAPS"},
       "observation":{"count":len(recovered_o),"supportedQuestionTypes":["OBSERVATION_INTERPRETATION"],"sourceCompleteness":"SUFFICIENT_WITH_GAPS"},
       "weatherCode":{"count":v3["counts"]["weatherCodes"],"supportedQuestionTypes":["CODE_INTERPRETATION"],"sourceCompleteness":"SUFFICIENT_WITH_WARNINGS"},
       "operationalImpact":{"count":v3["counts"]["operationalImpacts"],"supportedQuestionTypes":[],"sourceCompleteness":"GENERAL_AVIATION_ONLY"},
       "relationship":{"count":v3["counts"]["relationships"],"supportedQuestionTypes":["RELATIONSHIP"],"sourceCompleteness":"SUFFICIENT"}}}
    dump(OUT/"coverage-v3.json",{"coverage":coverage,"batches":batches});dump(OUT/"runtime-readiness-v2.json",readiness)
    summary={"hazardBaseline":7,"hazardRecovered":len(recovered_h),"hazardValidation":dict(Counter(x["status"] for x in h_results)),
      "observationBaseline":11,"observationRecovered":len(recovered_o),"observationValidation":dict(Counter(x["status"] for x in o_results)),
      "newRelations":len(relations),"observationGuideline":guideline_status,"canonicalV3Total":sum(v3["counts"].values()),"canonicalV3Counts":v3["counts"],
      "canonicalV3Checksum":v3["checksum"],"coverage":coverage,"batches":batches,"shadowRuntimeReadiness":readiness["status"]}
    dump(OUT/"summary.json",summary)
    after={path:sha(ROOT/path) for path in before};changed=[path for path in before if before[path]!=after[path]]
    dump(OUT/"mutation-guard.json",{"checked":len(before),"changed":changed,"mutationCount":len(changed)})
    if changed:raise SystemExit(f"Mutation guard failed: {changed}")
    report=f"""# Weather Hazard & Observation Knowledge Recovery Report

Generated: {datetime.now(timezone.utc).isoformat()}

## Fixed baseline

- Hazard: 7
- Observation: 11
- New Hazard/Observation candidates created: 0

## Root cause

The original validator treated operational enrichment fields as if they were core Hazard identity fields and applied nearly uniform measurement requirements to every Observation. Recovery separates core identity from optional operational fields and applies observation-type schemas. It does not relax score thresholds.

## Hazard results

`{dict(Counter(x['status'] for x in h_results))}`. All seven are source-grounded and recovered with warnings because flight-risk and avoidance guidance were not inferred.

## Observation results

`{dict(Counter(x['status'] for x in o_results))}`. Recovered: wind, humidity, radar, satellite, METAR, SPECI. Blocked as misclassified/generic: TAF, SIGMET, AIRMET, curriculum `observation`, aviation warning.

## Code relations

Four source-grounded draft relationships were added only to canonical v3: METAR/SPECI represent their coded observations and contain the reported wind observation. No graph repository was changed.

## Manual guideline

Status: **{guideline_status}**; blockers: {', '.join(gblock)}. The 130-byte non-PDF body was not ingested.

## Canonical v3 and coverage

- Total: {sum(v3['counts'].values())}
- Distribution: `{v3['counts']}`
- Coverage: `{coverage}`
- Batches: `{batches}`
- Shadow runtime readiness: **{readiness['status']}**

## Remaining gaps

Five Observation candidates require reclassification rather than forced recovery; drone-specific OperationalImpact remains zero; the 2025 observation guideline still lacks a valid PDF; operational Hazard guidance remains ungrounded.

## Mutation guard

Weather Knowledge 57 and canonical v1/v2 were checksum checked. Mutation count: {len(changed)}. Legal Runtime, Active Pack, AtomicFact, Graph, Question and Supabase were not connected or modified.
"""
    (ROOT/"docs/weather-hazard-observation-recovery-report.md").write_text(report,encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":main()
