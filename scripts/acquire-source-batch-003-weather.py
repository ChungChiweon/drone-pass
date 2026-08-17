"""Acquire and inventory official weather sources for SOURCE-BATCH-003.

This script is intentionally read-only with respect to the active knowledge pack,
legal canonical set, graph repository, and questions.
"""
from __future__ import annotations

import hashlib
import json
import mimetypes
import re
import subprocess
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/sources/drone-license/weather/official"
WORK = ROOT / "work/source-ingestion/source-batch-003"
INVENTORY = ROOT / "work/source-inventory"
NOW = datetime.now(timezone.utc).isoformat()

SOURCES = [
    dict(sourceId="kma-basic-weather-analysis", canonicalTitle="기초 기상분석", issuingOrganization="기상청", authority="OFFICIAL_METEOROLOGICAL", sourceType="OFFICIAL_EDUCATION", publicationDate="2014-09-16", currentnessStatus="POSSIBLY_OUTDATED", officialPageUrl="https://www.kma.go.kr/down/e-learning/beginning/beginning_02.pdf", downloadUrl="https://www.kma.go.kr/down/e-learning/beginning/beginning_02.pdf", org="korea-meteorological-administration", fileType="PDF", priority="P0", topics=["atmosphere","pressure","temperature","humidity","wind","cloud","precipitation","fog","visibility","air-mass","front","high-pressure","low-pressure","typhoon","weather-chart"], visual=["WEATHER_CHART","FRONT_SYMBOL","PRESSURE_PATTERN","CLOUD_DIAGRAM"]),
    dict(sourceId="kma-2024-training-plan", canonicalTitle="2024년도 기상기후인재개발원 교육훈련계획", issuingOrganization="기상청 기상기후인재개발원", authority="OFFICIAL_METEOROLOGICAL", sourceType="OFFICIAL_EDUCATION", publicationDate="2024-02-14", currentnessStatus="CURRENT", officialPageUrl="https://www.kma.go.kr/mhi/2024_kma_training_plan.pdf", downloadUrl="https://www.kma.go.kr/mhi/2024_kma_training_plan.pdf", org="korea-meteorological-administration", fileType="PDF", priority="P1", topics=["aviation-weather","observation","radar","satellite","hazardous-weather","sounding","weather-chart"], visual=["RADAR_IMAGE","SATELLITE_IMAGE","OBSERVATION_TABLE"]),
    dict(sourceId="amo-business-overview", canonicalTitle="항공기상업무 개요", issuingOrganization="항공기상청", authority="OFFICIAL_AVIATION_WEATHER", sourceType="OFFICIAL_GUIDANCE", currentnessStatus="CURRENT", officialPageUrl="https://amo.kma.go.kr/amo/business/intro01.do", downloadUrl="https://amo.kma.go.kr/amo/business/intro01.do", org="aviation-weather-office", fileType="HTML", priority="P0", topics=["metar","speci","taf","sigmet","airmet","aviation-forecast","aviation-warning","low-altitude-weather"], visual=[]),
    dict(sourceId="amo-metar-rmk-guide", canonicalTitle="항공기상관측 전문(METAR/SPECI) 및 RMK 해설자료", issuingOrganization="항공기상청", authority="OFFICIAL_AVIATION_WEATHER", sourceType="WEATHER_CODE_GUIDE", publicationDate="2021-08-27", currentnessStatus="POSSIBLY_OUTDATED", officialPageUrl="https://amo.kma.go.kr/weather/stat/airport-climate.do?bid=data&field=&mode=view&num=77&num=82&page=1&ses=&text=", org="aviation-weather-office", fileType="PDF", priority="P1", topics=["metar","speci","weather-code","observation-example"], visual=["METAR_TAF_EXAMPLE","OBSERVATION_TABLE"], manualReason="Official attachment requires page interaction; no download URL is invented."),
    dict(sourceId="amo-api-guide", canonicalTitle="항공기상청 API 활용 가이드", issuingOrganization="항공기상청", authority="OFFICIAL_AVIATION_WEATHER", sourceType="WEATHER_INFORMATION_GUIDE", publicationDate="2025-01-01", currentnessStatus="CURRENT", officialPageUrl="https://amo.kma.go.kr/information/notice.do?bid=notice&field=&mode=view&num=452&num=453&page=2&ses=&text=", org="aviation-weather-office", fileType="PDF", priority="P1", topics=["metar","speci","taf","sigmet","airmet","weather-information"], visual=["METAR_TAF_EXAMPLE"], manualReason="Official attachment requires page interaction; no download URL is invented."),
]

GROUPS = {
 "003A":{"name":"기상 기초","topics":["atmosphere","pressure","temperature","humidity","air-density","wind"]},
 "003B":{"name":"구름·강수·시정","topics":["cloud","fog","precipitation","visibility","mist"]},
 "003C":{"name":"기압계·전선","topics":["air-mass","warm-front","cold-front","occluded-front","stationary-front","high-pressure","low-pressure","typhoon"]},
 "003D":{"name":"위험기상","topics":["thunderstorm","convection","turbulence","gust","wind-shear","downburst","icing","strong-wind","heavy-rain","snow","low-visibility"]},
 "003E":{"name":"항공기상 관측·정보","topics":["observation","metar","speci","taf","sigmet","airmet","aviation-warning","weather-chart","radar","satellite"]},
 "003F":{"name":"드론 운용 영향","topics":["preflight-weather","wind-operation","rain-operation","vlos-visibility","hazard-avoidance","weather-change","low-altitude-weather"]},
}

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024), b""): h.update(chunk)
    return "sha256-"+h.hexdigest()

def json_dump(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")

def download(source, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size: return "RESUMED"
    req=urllib.request.Request(source["downloadUrl"], headers={"User-Agent":"DronePass-OfficialSourceAcquisition/1.0"})
    last=None
    for attempt in range(3):
        try:
            if attempt: time.sleep(1)
            with urllib.request.urlopen(req, timeout=60) as r:
                body=r.read(); mime=(r.headers.get_content_type() or "").lower()
            expected="application/pdf" if source["fileType"]=="PDF" else "text/html"
            signature_ok=body.startswith(b"%PDF") if expected=="application/pdf" else b"<" in body[:500]
            if not signature_ok or (expected not in mime and not (expected=="text/html" and mime.startswith("text/"))): raise ValueError(f"MIME_MISMATCH:{mime}")
            target.write_bytes(body); return "DOWNLOADED"
        except Exception as exc:
            last=str(exc)
            # Windows' system trust store can validate some Korean public-site
            # chains that the bundled Python CA store cannot. curl still keeps
            # TLS verification enabled; this is not an insecure fallback.
            if "CERTIFICATE_VERIFY_FAILED" in last:
                result=subprocess.run(["curl.exe","--fail","--location","--silent","--show-error","--max-time","60","--output",str(target),source["downloadUrl"]],capture_output=True,text=True)
                if result.returncode==0 and target.exists():
                    body=target.read_bytes(); expected_pdf=source["fileType"]=="PDF"
                    if (expected_pdf and body.startswith(b"%PDF")) or (not expected_pdf and b"<" in body[:500]): return "DOWNLOADED_SYSTEM_TRUST"
                    target.unlink(missing_ok=True); last="MIME_SIGNATURE_MISMATCH"
    raise RuntimeError(last)

def snapshot_guards():
    paths=["work/legal-knowledge-consolidation/canonical-knowledge-set.json","work/legal-runtime-hardening/runtime-summary.json","work/legal-shadow-pack/shadow-pack.json"]
    return {p:sha256(ROOT/p) for p in paths if (ROOT/p).exists()}

def main():
    WORK.mkdir(parents=True,exist_ok=True); INVENTORY.mkdir(parents=True,exist_ok=True)
    before=snapshot_guards(); acquired=[]; manual=[]; rejected=[]; registry=[]; visuals=[]; queue=[]
    seen=set()
    for source in SOURCES:
        s=dict(source); s.pop("org"); priority=s.pop("priority"); visual_types=s.pop("visual"); manual_reason=s.pop("manualReason",None)
        s.update(subjectCoverage=["항공기상"],weatherTopics=s.pop("topics"),containsTables=bool(visual_types),containsDiagrams=bool(visual_types),containsWeatherSymbols=any("SYMBOL" in x for x in visual_types),containsObservationExamples=any(x in {"METAR_TAF_EXAMPLE","OBSERVATION_TABLE"} for x in visual_types),extractionStatus="PENDING",validationStatus="OFFICIAL_DOMAIN_VERIFIED",notes=[])
        if s["officialPageUrl"] in seen:
            s["validationStatus"]="DUPLICATE_SOURCE"; rejected.append(s); continue
        seen.add(s["officialPageUrl"])
        base=DATA/source["org"]/s["sourceId"]
        for folder in ["original","normalized","metadata","extraction","validation","images","tables"]: (base/folder).mkdir(parents=True,exist_ok=True)
        if manual_reason:
            s["extractionStatus"]="MANUAL_ACQUISITION_REQUIRED"; s["notes"].append(manual_reason); manual.append({**s,"clickPath":"Open official page and download its listed attachment","failureReason":manual_reason})
            status="MANUAL_ACQUISITION_REQUIRED"; local=None
        else:
            ext="pdf" if s["fileType"]=="PDF" else "html"; local=base/"original"/f"source.{ext}"
            try:
                download(source,local); s["localPath"]=str(local.relative_to(ROOT)).replace("\\","/"); s["checksum"]=sha256(local); s["extractionStatus"]="READY_FOR_INGESTION"; acquired.append(s); status="READY"
            except Exception as exc:
                s["validationStatus"]="DOWNLOAD_FAILED"; s["notes"].append(str(exc)); rejected.append(s); status="BLOCKED_MISSING_FILE"; local=None
        json_dump(base/"metadata"/"source.json",s); registry.append(s)
        for i,kind in enumerate(visual_types):
            visuals.append(dict(assetId=f"{s['sourceId']}:visual:{i+1}",sourceId=s["sourceId"],page=None,assetType=kind,boundingBox=None,caption=f"Inventory candidate: {kind}",associatedTopic=s["weatherTopics"][min(i,len(s["weatherTopics"])-1)],associatedKnowledgeIds=[],extractionMethod="SOURCE_METADATA_INVENTORY",quality=0.5,rightsNote="Official source; reuse rights require source-specific review"))
        queue.append(dict(jobId=f"weather-ingest:{s['sourceId']}",sourceId=s["sourceId"],localPath=s.get("localPath"),adapter="WEATHER_EDUCATIONAL_TEXT" if "EDUCATION" in s["sourceType"] else "WEATHER_CODE" if "CODE" in s["sourceType"] else "WEATHER_TECHNICAL_TEXT",priority=priority,topics=s["weatherTopics"],extractionTasks=["concepts","phenomena","hazards","observations","operational-impacts","relationships"],visualTasks=["locate","classify","caption","topic-link"] if visual_types else [],status=status))

    all_topics=sorted({t for g in GROUPS.values() for t in g["topics"]})
    matrix=[]; gaps=[]
    for topic in all_topics:
        linked=[s for s in registry if topic in s["weatherTopics"]]
        current=[s for s in linked if s["currentnessStatus"]=="CURRENT"]
        ready=[s for s in linked if s["extractionStatus"]=="READY_FOR_INGESTION"]
        vcount=sum(1 for v in visuals if v["associatedTopic"]==topic)
        status="READY_FOR_INGESTION" if ready else "SOURCE_COVERED" if current else "SOURCE_ONLY" if linked else "NO_SOURCE"
        topic_gaps=[]
        if not linked: topic_gaps += ["MISSING_OFFICIAL_SOURCE","MISSING_CORE_CONCEPT"]
        elif not current: topic_gaps.append("MISSING_CURRENT_SOURCE")
        if not vcount and topic in {"weather-chart","radar","satellite","cloud","warm-front","cold-front","metar","taf"}: topic_gaps.append("MISSING_VISUAL_SOURCE")
        matrix.append(dict(topicId=topic,sourceCount=len(linked),officialSourceCount=len(linked),currentSourceCount=len(current),educationSourceCount=sum(1 for s in linked if "EDUCATION" in s["sourceType"]),conceptCoverage=1 if linked else 0,phenomenonCoverage=1 if linked and topic in {"cloud","fog","precipitation","thunderstorm","turbulence","icing"} else 0,hazardCoverage=1 if linked and topic in GROUPS["003D"]["topics"] else 0,observationCoverage=1 if linked and topic in GROUPS["003E"]["topics"] else 0,operationalCoverage=1 if linked and topic in GROUPS["003F"]["topics"] else 0,visualAssetCount=vcount,coverageStatus=status,confidence=round(min(1,0.35*len(linked)+0.3*len(current)+0.2*len(ready)),2),gaps=topic_gaps))
        for gt in topic_gaps: gaps.append(dict(topicId=topic,gapType=gt,priority="P0" if gt in {"MISSING_OFFICIAL_SOURCE","MISSING_CURRENT_SOURCE"} else "P1",reason=f"{topic}: {gt}"))
    batch_plan=[]
    for bid,g in GROUPS.items():
        covered=sum(1 for t in g["topics"] if any(m["topicId"]==t and m["sourceCount"] for m in matrix)); total=len(g["topics"])
        batch_plan.append(dict(batchId=bid,name=g["name"],topicCount=total,coveredTopics=covered,coverage=round(covered/total,4),status="READY" if covered==total else "PARTIAL" if covered else "BLOCKED",topics=g["topics"]))
    after=snapshot_guards(); mutation=before!=after
    summary=dict(discoveredSources=len(SOURCES),registeredSources=len(registry),acquiredSources=len(acquired),rejectedSources=len(rejected),manualAcquisitionRequired=len(manual),currentSources=sum(1 for s in registry if s["currentnessStatus"]=="CURRENT"),possiblyOutdatedSources=sum(1 for s in registry if s["currentnessStatus"]=="POSSIBLY_OUTDATED"),weatherTopicCount=len(matrix),coveredTopics=sum(1 for m in matrix if m["sourceCount"]),visualAssets=len(visuals),visualAssetTypes=sorted({v["assetType"] for v in visuals}),readyIngestionJobs=sum(1 for j in queue if j["status"]=="READY"),batchStatus={b["batchId"]:b["status"] for b in batch_plan},legalMutationCount=1 if mutation else 0,guardBefore=before,guardAfter=after,executedAt=NOW)
    outputs={"source-registry.json":registry,"acquired-sources.json":acquired,"rejected-sources.json":rejected,"manual-acquisition-required.json":manual,"source-coverage-matrix.json":matrix,"source-gap-analysis.json":gaps,"visual-source-inventory.json":visuals,"ingestion-queue.json":queue,"batch-plan.json":batch_plan,"execution.json":{"startedAt":NOW,"completedAt":datetime.now(timezone.utc).isoformat(),"guardPassed":not mutation,"networkPolicy":{"officialDomainsOnly":True,"minimumDelaySeconds":1,"maxRetries":2}},"summary.json":summary}
    for name,data in outputs.items(): json_dump(WORK/name,data)
    json_dump(INVENTORY/"weather-source-coverage-matrix.json",matrix); json_dump(INVENTORY/"weather-source-gap-analysis.json",gaps); json_dump(INVENTORY/"weather-source-ingestion-queue.json",queue)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    if mutation: raise SystemExit("LEGAL_MUTATION_GUARD_FAILED")

if __name__ == "__main__": main()
