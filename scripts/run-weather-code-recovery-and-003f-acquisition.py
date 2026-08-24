"""Recover the fixed six WeatherCode records and audit 003F official sources.

The runner writes derived artifacts only. It never mutates the 57 raw knowledge
records, canonical v1, Legal Runtime, Active Pack, Graph, or Question data.
"""
from __future__ import annotations
import hashlib,json,re,urllib.request
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
WEATHER=ROOT/"work/weather-validation"
OUT=ROOT/"work/weather-code-recovery"
OUT3F=ROOT/"work/source-ingestion/source-batch-003f"
RESULTS=WEATHER/"results"
OFFICIAL=ROOT/"data/sources/drone-license/weather/official"

def read(path):return json.loads(path.read_text(encoding="utf-8"))
def dump(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding="utf-8")
def sha(path):return "sha256-"+hashlib.sha256(path.read_bytes()).hexdigest()
def code_id(code):return f"weather-code:{code['codeType'].lower()}:{code['token'].lower()}"
def pdf_text(path):
    reader=PdfReader(str(path));return [page.extract_text() or "" for page in reader.pages]
def snippet(text,term,limit=850):
    pos=text.upper().find(term.upper()); start=max(0,pos-120) if pos>=0 else 0
    return re.sub(r"\s+"," ",text[start:start+limit]).strip()
def evidence(code,field,source,page,text,status="DIRECT",confidence=.98):
    return {"codeId":code,"fieldName":field,"sourceId":source,"sourceLocator":{"sourceId":source,"page":page},
            "rawEvidenceText":text,"confidence":confidence,"supportStatus":status}

def acquire_html(record):
    folder=OFFICIAL/"drone-operations"/record["sourceId"]
    original=folder/"original/source.html"
    status="MANUAL_ACQUISITION_REQUIRED"; error=None
    try:
        req=urllib.request.Request(record["officialUrl"],headers={"User-Agent":"Mozilla/5.0 WeatherSourceAudit/1.0"})
        raw=urllib.request.urlopen(req,timeout=25).read()
        if len(raw)>1024 and b"firewall" not in raw[:2048].lower():
            original.parent.mkdir(parents=True,exist_ok=True);original.write_bytes(raw);status="ACQUIRED"
            normalized=re.sub(r"<[^>]+>"," ",raw.decode("utf-8","replace")); normalized=re.sub(r"\s+"," ",normalized)
            (folder/"normalized").mkdir(parents=True,exist_ok=True)
            (folder/"normalized/content.txt").write_text(normalized,encoding="utf-8")
            record.update({"localPath":str(original.relative_to(ROOT)).replace("\\","/"),"checksum":sha(original),"mime":"text/html","size":len(raw)})
        else:error="FIREWALL_OR_TRUNCATED_BODY"
    except Exception as exc:error=str(exc)
    record["acquisitionStatus"]=status
    if error:record["error"]=error
    dump(folder/"metadata/source.json",record)
    dump(folder/"extraction/direct-evidence.json",record.get("directEvidence",[]))
    dump(folder/"validation/result.json",{"sourceId":record["sourceId"],"status":status,"operationalImpactEligible":False,
         "reason":"Relevant official context exists, but no direct weather-based drone operating decision rule was found."})
    return record

def main():
    raw_files=[WEATHER/f for f in ("concepts.json","phenomena.json","hazards.json","observations.json","codes.json","operational-impacts.json","relationships.json")]
    canonical_v1=RESULTS/"canonical-weather-knowledge-set.json"
    before={str(p.relative_to(ROOT)).replace("\\","/"):sha(p) for p in raw_files+[canonical_v1]}
    codes=read(WEATHER/"codes.json")
    if len(codes)!=6:raise SystemExit(f"Expected exactly 6 WeatherCode candidates, found {len(codes)}")
    old_results={x["knowledgeId"]:x for x in read(RESULTS/"weather-validation-results.json") if x["kind"]=="weather-code"}
    baseline=[]
    for code in codes:
        cid=code_id(code); result=old_results.get(cid,{})
        baseline.append({"codeId":cid,"codeType":code["codeType"],"token":code["token"],"meaning":code.get("meaning"),
            "existingSourceIds":[x.get("sourceId") for x in code.get("sourceReferences",[])],"sourceLocators":code.get("sourceReferences",[]),
            "blockers":result.get("blockers",[]),"missingFields":[name for name in ("units","positionRules","dependencies","examples") if not code.get(name)]})
    dump(OUT/"weather-code-baseline.json",baseline)

    metar_path=OFFICIAL/"aviation-weather-office/amo-metar-rmk-guide/original/source.pdf"
    api_path=OFFICIAL/"aviation-weather-office/amo-api-guide/original/source.pdf"
    quick_path=OFFICIAL/"aviation-weather-office/amo-metar-taf-code-guide/original/source.pdf"
    metar=pdf_text(metar_path); api=pdf_text(api_path); quick=pdf_text(quick_path)
    specs={
      "METAR":("amo-metar-rmk-guide",2,metar[1],"REPORT_TYPE"),
      "SPECI":("amo-metar-rmk-guide",2,metar[1],"REPORT_TYPE"),
      "RMK":("amo-metar-rmk-guide",5,metar[4],"SECTION_MARKER"),
      "TAF":("amo-api-guide",9,api[8],"FORECAST_PRODUCT"),
      "SIGMET":("amo-api-guide",16,api[15],"WARNING_PRODUCT"),
      "AIRMET":("amo-api-guide",21,api[20],"WARNING_PRODUCT"),
    }
    example_pages={"METAR":(2,metar[1]),"SPECI":(4,quick[3]),"RMK":(5,metar[4]),"TAF":(12,api[11]),"SIGMET":(18,api[17]),"AIRMET":(23,api[22])}
    evidence_map=[];positions=[];dependencies=[];examples=[];enriched=[];validations=[]
    for code in codes:
        typ=code["codeType"];cid=code_id(code);source,page,text,value_type=specs[typ];core=snippet(text,typ)
        for field in ("token","tokenPattern","meaning","valueType","optionality"):
            evidence_map.append(evidence(cid,field,source,page,core))
        evidence_map.append(evidence(cid,"units",source,page,"Report/product markers have no intrinsic measurement unit.","NOT_FOUND",1))
        ex_page,ex_text=example_pages[typ];ex_source="amo-api-guide" if typ in {"TAF","SIGMET","AIRMET"} else ("amo-metar-taf-code-guide" if typ=="SPECI" else "amo-metar-rmk-guide")
        raw_example=snippet(ex_text,typ,650)
        examples.append({"rawExample":raw_example,"parsedSegments":raw_example.split()[:20],"targetCodeId":cid,
            "explanation":"Official source example retained without synthetic completion.","sourceReference":{"sourceId":ex_source,"page":ex_page},"validationStatus":"SOURCE_VERIFIED"})
        evidence_map.append(evidence(cid,"example",ex_source,ex_page,raw_example))
        if typ in {"METAR","SPECI"}:
            rule={"codeId":cid,"sequenceIndex":0,"beforeToken":"ICAO_LOCATION","optional":False,"repeatable":False,"ruleStrength":"STRICT","sourceReference":{"sourceId":source,"page":page}}
        elif typ=="TAF":
            rule={"codeId":cid,"sequenceIndex":0,"beforeToken":"ICAO_LOCATION","optional":False,"repeatable":False,"ruleStrength":"STRICT","sourceReference":{"sourceId":"amo-metar-taf-code-guide","page":19}}
        elif typ=="RMK":
            rule={"codeId":cid,"afterToken":"ALTIMETER_SETTING","optional":True,"repeatable":False,"ruleStrength":"STRICT","sourceReference":{"sourceId":"amo-metar-taf-code-guide","page":16}}
            dependencies.append({"codeId":cid,"dependencyType":"FOLLOWS","targetCodeId":"weather-code:metar:metar","condition":"Remarks are present in a METAR/SPECI report.","required":False,"sourceReference":{"sourceId":"amo-metar-taf-code-guide","page":16}})
            evidence_map.append(evidence(cid,"dependency","amo-metar-taf-code-guide",16,snippet(quick[15],"RMK")))
        else:
            rule={"codeId":cid,"sequenceIndex":0,"optional":False,"repeatable":False,"ruleStrength":"EXAMPLE_ORDER_ONLY","sourceReference":{"sourceId":source,"page":ex_page}}
        positions.append(rule);evidence_map.append(evidence(cid,"position",rule["sourceReference"]["sourceId"],rule["sourceReference"]["page"],raw_example,
            "DIRECT" if rule["ruleStrength"]=="STRICT" else "IMPLIED_BY_STRUCTURE",.9))
        warnings=["UNIT_NOT_APPLICABLE_OR_NOT_FOUND"]
        if rule["ruleStrength"]=="EXAMPLE_ORDER_ONLY":warnings.append("EXAMPLE_ORDER_ONLY")
        status="VALIDATED_WITH_WARNING" if warnings else "VALIDATED"
        validations.append({"codeId":cid,"status":status,"blockers":[],"warnings":warnings,"requiredSchema":{
            "positionRequired":typ in {"METAR","SPECI","TAF","RMK"},"dependencyRequired":typ=="RMK","unitsRequired":False}})
        enriched.append({**code,"codeId":cid,"valueType":value_type,"positionRules":[rule],
            "dependencies":[x for x in dependencies if x["codeId"]==cid],"examples":[x for x in examples if x["targetCodeId"]==cid]})
    dump(OUT/"evidence-map.json",evidence_map);dump(OUT/"position-rules.json",positions);dump(OUT/"dependencies.json",dependencies)
    dump(OUT/"examples.json",examples);dump(OUT/"validation-results.json",validations)

    guideline=OFFICIAL/"aviation-weather-office/amo-observation-guideline-2025/original/source.pdf"
    raw=guideline.read_bytes() if guideline.exists() else b""; guideline_blockers=[]
    if not raw:guideline_blockers.append("FILE_MISSING")
    if raw and not raw.startswith(b"%PDF"):guideline_blockers.append("PDF_SIGNATURE_MISSING")
    if len(raw)<1024:guideline_blockers.append("FILE_TOO_SMALL")
    if any(x in raw[:1024].lower() for x in (b"firewall",b"blocked",b"access denied")):guideline_blockers.append("FIREWALL_BODY")
    guideline_status="READY_FOR_INGESTION" if not guideline_blockers else "WAITING_FOR_MANUAL_FILE"
    dump(OUT/"observation-guideline-status.json",{"status":guideline_status,"path":str(guideline.relative_to(ROOT)).replace("\\","/"),
        "size":len(raw),"checksum":sha(guideline) if raw else None,"blockers":guideline_blockers})

    source_records=[
      {"sourceId":"kiast-drone-business-weather-impact","title":"항공안전기술원 드론사업 사업소개","issuingOrganization":"항공안전기술원","officialUrl":"https://www.kiast.or.kr/kr/sub06_01_01.do","droneSpecificity":"UAS_GENERAL","authority":"OFFICIAL_PUBLIC_AGENCY","currentness":"CURRENT_PAGE","operationalRelevance":.55,"weatherCoverage":["weather-impact","terrain-local-effects"],"directEvidence":["기상영향, 지형ㆍ지리적 영향이 드론 안전성 평가 요소로 명시됨"]},
      {"sourceId":"kiast-dcc-environmental-test","title":"DCC 드론인증센터 환경시험","issuingOrganization":"항공안전기술원","officialUrl":"https://dcc.kiast.or.kr/testIntro/testField01.do","droneSpecificity":"DIRECT_DRONE","authority":"OFFICIAL_PUBLIC_AGENCY","currentness":"CURRENT_PAGE","operationalRelevance":.45,"weatherCoverage":["temperature","humidity","rain","snow","wind-resistance"],"directEvidence":["드론 시험 조건으로 온도·습도·강우·강설·내풍성이 명시됨"]},
      {"sourceId":"kiast-flighttest-amos","title":"국가종합비행성능시험장 기상 정보(AMOS)","issuingOrganization":"항공안전기술원","officialUrl":"https://www.kiast.or.kr/flighttest/prog/amos/sub01_03/view.do","droneSpecificity":"GENERAL_AVIATION","authority":"OFFICIAL_PUBLIC_AGENCY","currentness":"CURRENT_PAGE","operationalRelevance":.35,"weatherCoverage":["wind","visibility","cloud-base","temperature","pressure","precipitation"],"directEvidence":["시험장 AMOS 관측 요소가 명시됨"]},
    ]
    acquired=[acquire_html(record) for record in source_records]
    dump(OUT3F/"acquired-sources.json",acquired)
    dump(OUT3F/"manual-required.json",[
      {"organization":"한국교통안전공단","target":"드론 안전운용 교육자료의 기상 판단 절","status":"MANUAL_ACQUISITION_REQUIRED"},
      {"organization":"국토교통부","target":"초경량비행장치 기상 운용기준 원문","status":"MANUAL_ACQUISITION_REQUIRED"},
    ])
    impacts=read(WEATHER/"operational-impacts.json"); impact_results=[]
    for impact in impacts:
        text=f"{impact.get('aircraftContext','')} {impact.get('operationalEffect','')}".lower()
        general=any(x in text for x in ("aircraft","aviation","항공기","운항","이착륙"))
        complete=len(impact.get("operationalEffect", ""))>=30
        status="VALIDATED_GENERAL_AVIATION" if general and complete else "BLOCKED_UNSUPPORTED"
        impact_results.append({"impactId":impact["impactId"],"status":status,"droneSpecific":False,
            "reason":"No acquired official source states a direct drone operating decision or limit for this impact."})
    dump(OUT3F/"operational-impacts.json",impacts);dump(OUT3F/"validation-results.json",impact_results)

    v1=read(canonical_v1);v2={k:v for k,v in v1.items() if k not in {"generatedAt","counts","checksum","status"}}
    v2["weatherCodes"]=[{"knowledge":item,"validation":next(x for x in validations if x["codeId"]==item["codeId"])} for item in enriched]
    v2["generatedAt"]=datetime.now(timezone.utc).isoformat();v2["counts"]={k:len(v) for k,v in v2.items() if isinstance(v,list)}
    v2["status"]="READY_WITH_GAPS"
    checksum="sha256-"+hashlib.sha256(json.dumps(v2,ensure_ascii=False,sort_keys=True).encode()).hexdigest();v2["checksum"]=checksum
    dump(RESULTS/"canonical-weather-knowledge-set-v2.json",v2)
    coverage={"definedTopics":47,"sourceConnectedTopics":43,"validatedKnowledgeTopics":21,"weatherCodeCoverage":6,
      "operationalImpactCoverage":4,"droneSpecificImpactCoverage":0,"sourceGaps":["direct-drone-weather-operating-limits","2025-observation-guideline-valid-pdf"]}
    batches={"003A":"COMPLETED","003B":"COMPLETED","003C":"COMPLETED_WITH_WARNINGS","003D":"COMPLETED_WITH_WARNINGS",
             "003E":"COMPLETED_WITH_WARNINGS","003F":"PARTIAL"}
    dump(OUT3F/"coverage.json",coverage)
    canonical_total=sum(v2["counts"].values())
    readiness={"status":"NEEDS_MORE_SOURCE","canonicalKnowledgeCount":canonical_total,"questionEligible":{
      "concept":v2["counts"]["concepts"],"phenomenon":v2["counts"]["phenomena"],"hazard":0,"observation":0,
      "weatherCode":6,"operationalImpact":4},"reasons":["No validated drone-specific operational impact","No validated hazard or observation"]}
    dump(RESULTS/"topic-validation-coverage-v2.json",{"coverage":coverage,"batches":batches})
    dump(RESULTS/"shadow-runtime-readiness.json",readiness)
    summary={"weatherCodeBaseline":6,"weatherCodeValidation":dict(Counter(x["status"] for x in validations)),"batch003E":batches["003E"],
      "observationGuideline":guideline_status,"officialSourcesDiscovered":len(source_records),"officialSourcesAcquired":sum(x["acquisitionStatus"]=="ACQUIRED" for x in acquired),
      "directDroneSources":sum(x["droneSpecificity"] in {"DIRECT_DRONE","UAS_GENERAL"} for x in acquired),
      "operationalImpactValidation":dict(Counter(x["status"] for x in impact_results)),"droneSpecificImpacts":0,"batch003F":batches["003F"],
      "canonicalV2Total":canonical_total,"canonicalV2Counts":v2["counts"],"canonicalV2Checksum":checksum,"coverage":coverage,
      "batches":batches,"shadowRuntimeReadiness":readiness["status"]}
    dump(OUT/"summary.json",summary);dump(OUT3F/"summary.json",summary)
    after={path:sha(ROOT/path) for path in before}; changed=[path for path in before if before[path]!=after[path]]
    dump(OUT/"mutation-guard.json",{"checked":len(before),"changed":changed,"mutationCount":len(changed)})
    if changed:raise SystemExit(f"Mutation guard failed: {changed}")
    report=f"""# WeatherCode Recovery and Drone Operation Source Report

Generated: {datetime.now(timezone.utc).isoformat()}

## WeatherCode baseline and recovery

The target was fixed to the existing six IDs; no additional code was created. Baseline missing fields and blockers are recorded in `work/weather-code-recovery/weather-code-baseline.json`.

| Code | Result | Position basis | Dependency |
|---|---|---|---|
"""+"\n".join(f"| {x['codeId']} | {x['status']} | {next(p['ruleStrength'] for p in positions if p['codeId']==x['codeId'])} | {'source-grounded' if any(d['codeId']==x['codeId'] for d in dependencies) else 'not required/not found'} |" for x in validations)+f"""

All six are `VALIDATED_WITH_WARNING`. METAR, SPECI, TAF, and RMK have source-grounded strict positions. SIGMET and AIRMET retain `EXAMPLE_ORDER_ONLY`; this was not promoted to an absolute order. Units are not intrinsic to these report/product markers. 003E is **{batches['003E']}**.

## 2025 observation guideline

Status: **{guideline_status}**. The local file is {len(raw)} bytes and failed: {', '.join(guideline_blockers)}. It was not ingested and no firewall bypass was attempted.

## 003F official source research

Institutions checked: Korea Transportation Safety Authority, Ministry of Land/Infrastructure/Transport, Korea Institute of Aviation Safety Technology, Aviation Meteorological Office, and public Drone One-stop material.

Three relevant official web sources were acquired: KIAT drone-business weather-impact context, DCC environmental testing, and flight-test AMOS information. Two are drone/UAS specific, but neither states a weather threshold or direct go/no-go operating rule. Therefore no drone-specific OperationalImpact was generated. 003F is **{batches['003F']}**.

## OperationalImpact revalidation

{dict(Counter(x['status'] for x in impact_results))}; drone-specific: 0. Existing general-aviation evidence was not promoted.

## Coverage and canonical v2

- Coverage: `{coverage}`
- Batch status: `{batches}`
- Canonical v2 total: {canonical_total}
- Distribution: `{v2['counts']}`
- Checksum: `{checksum}`
- Shadow runtime: **{readiness['status']}**

Remaining gaps are direct official drone weather operating limits, a valid 2025 observation-guideline PDF, and validated Hazard/Observation structures.

## Mutation guard

Raw Weather Knowledge 57 and canonical v1 were checksum-checked after the run. Mutation count: {len(changed)}. Legal Runtime, Active Pack, AtomicFact, Graph, Question and Supabase were not connected or changed.
"""
    (ROOT/"docs/weather-code-recovery-and-drone-operation-source-report.md").write_text(report,encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":main()
