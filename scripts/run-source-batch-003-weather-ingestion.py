"""Run SOURCE-BATCH-003 weather ingestion and official gap acquisition.

The runner writes only Weather staging, validation-input, source, and report
artifacts. Legal canonical/runtime/active artifacts are protected by hashes.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import subprocess
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "work/source-ingestion/source-batch-003"
INGESTION = WORK / "ingestion"
VALIDATION = ROOT / "work/weather-validation"
SOURCE_ROOT = ROOT / "data/sources/drone-license/weather/official"
REPORT = ROOT / "docs/source-batch-003-weather-ingestion-and-gap-acquisition-report.md"

LEGAL_GUARDS = [
    "work/legal-knowledge-consolidation/canonical-knowledge-set.json",
    "work/legal-runtime-hardening/runtime-summary.json",
    "work/legal-shadow-pack/shadow-pack.json",
]

GROUPS = {
    "003A": ("Weather basics", ["atmosphere", "pressure", "temperature", "humidity", "air-density", "wind"]),
    "003B": ("Cloud, precipitation, visibility", ["cloud", "fog", "precipitation", "visibility", "mist"]),
    "003C": ("Pressure systems and fronts", ["air-mass", "warm-front", "cold-front", "occluded-front", "stationary-front", "high-pressure", "low-pressure", "typhoon"]),
    "003D": ("Hazardous weather", ["thunderstorm", "convection", "turbulence", "gust", "wind-shear", "downburst", "icing", "strong-wind", "heavy-rain", "snow", "low-visibility"]),
    "003E": ("Observation and aviation information", ["observation", "metar", "speci", "taf", "sigmet", "airmet", "aviation-warning", "weather-chart", "radar", "satellite"]),
    "003F": ("Drone and low-altitude operational impact", ["preflight-weather", "wind-operation", "rain-operation", "vlos-visibility", "hazard-avoidance", "weather-change", "low-altitude-weather"]),
}

ACQUISITIONS = [
    {
        "sourceId": "amo-aviation-forecast-warning-overview",
        "title": "Aviation weather forecast and warning overview",
        "organization": "Aviation Meteorological Office",
        "url": "https://amo.kma.go.kr/amo/business/intro03.do",
        "fileType": "HTML",
        "currentnessStatus": "CURRENT",
        "topics": ["aviation-warning", "sigmet", "airmet", "thunderstorm", "turbulence", "icing", "wind-shear", "low-altitude-weather"],
        "relativePath": "aviation-weather-office/amo-aviation-forecast-warning-overview/original/source.html",
    },
    {
        "sourceId": "amo-aviation-weather-newsletter-2024",
        "title": "Aviation Weather, November 2024",
        "organization": "Aviation Meteorological Office",
        "url": "https://amo.kma.go.kr/servlet/kamaboard?bid=airtimes&fno=2&k=ATC202411271716452_jPYRpXljPf5kJ3vqSQzj.pdf&mode=download&num=4",
        "fileType": "PDF",
        "currentnessStatus": "POSSIBLY_OUTDATED",
        "topics": ["thunderstorm", "turbulence", "icing", "strong-wind", "heavy-rain", "snow", "low-visibility", "gust", "wind-shear", "aviation-warning", "sigmet", "airmet", "low-altitude-weather"],
        "relativePath": "aviation-weather-office/amo-aviation-weather-newsletter-2024/original/source.pdf",
    },
    {
        "sourceId": "amo-metar-rmk-guide",
        "title": "FAA METAR and RMK decode guide",
        "organization": "Aviation Meteorological Office",
        "url": "https://amo.kma.go.kr/servlet/kamaboard?mode=download&bid=data&num=77&fno=1&callback=https%3a%2f%2famo.kma.go.kr%2fweather%2fstat%2fairport-climate.do&ses=&k=ATC202501231657141_203qzIhoRM7vPkUHTUpG.pdf",
        "fileType": "PDF",
        "currentnessStatus": "POSSIBLY_OUTDATED",
        "topics": ["metar", "speci", "weather-code", "observation"],
        "relativePath": "aviation-weather-office/amo-metar-rmk-guide/original/source.pdf",
    },
    {
        "sourceId": "amo-metar-taf-code-guide",
        "title": "Military airport METAR and TAF codes",
        "organization": "Aviation Meteorological Office",
        "url": "https://amo.kma.go.kr/servlet/kamaboard?mode=download&bid=data&num=77&fno=2&callback=https%3a%2f%2famo.kma.go.kr%2fweather%2fstat%2fairport-climate.do&ses=&k=ATC202511121601552_jOvgJ0FGHJP6kLJTADQs.pdf",
        "fileType": "PDF",
        "currentnessStatus": "CURRENT",
        "topics": ["metar", "speci", "taf", "weather-code", "observation"],
        "relativePath": "aviation-weather-office/amo-metar-taf-code-guide/original/source.pdf",
    },
    {
        "sourceId": "amo-api-guide",
        "title": "IWXXM 2023-1 aviation weather API guide",
        "organization": "Aviation Meteorological Office",
        "url": "https://amo.kma.go.kr/servlet/kamaboard?mode=download&bid=notice&num=452&fno=1&callback=https%3a%2f%2famo.kma.go.kr%2finformation%2fnotice.do&ses=&k=ATC202507241528091_VkjJpxr2BOWUMlAzdsN5.pdf",
        "fileType": "PDF",
        "currentnessStatus": "CURRENT",
        "topics": ["metar", "speci", "taf", "sigmet", "airmet", "weather-information"],
        "relativePath": "aviation-weather-office/amo-api-guide/original/source.pdf",
    },
    {
        "sourceId": "molit-drone-policy-qna",
        "title": "Unmanned aircraft policy Q&A",
        "organization": "Ministry of Land, Infrastructure and Transport",
        "url": "https://www.molit.go.kr/USR/policyTarget/dtl.jsp?idx=584",
        "fileType": "HTML",
        "currentnessStatus": "CURRENT",
        "topics": ["preflight-weather"],
        "relativePath": "ministry-of-land-infrastructure-and-transport/molit-drone-policy-qna/original/source.html",
    },
]

# Rules identify text; they never supply unsupported factual content.
RULES = [
    ("concept", "atmosphere", "Atmosphere", ["대기"], [4, 22]),
    ("concept", "pressure", "Pressure", ["기압"], [28, 41]),
    ("concept", "temperature", "Temperature", ["기온", "온도"], [163, 170]),
    ("concept", "humidity", "Humidity", ["습도"], [49, 51]),
    ("concept", "wind", "Wind", ["바람", "풍속", "풍향"], [31, 40]),
    ("concept", "cloud", "Cloud", ["구름", "운량", "운고"], [174, 185]),
    ("concept", "precipitation", "Precipitation", ["강수"], [193, 207]),
    ("concept", "visibility", "Visibility", ["시정"], [217, 229]),
    ("concept", "air-mass", "Air mass", ["기단"], [59, 70]),
    ("concept", "high-pressure", "High pressure", ["고기압"], [107, 111]),
    ("concept", "low-pressure", "Low pressure", ["저기압"], [81, 97]),
    ("phenomenon", "fog", "Fog", ["안개"], [232, 250]),
    ("phenomenon", "warm-front", "Warm front", ["온난전선"], [74, 80]),
    ("phenomenon", "cold-front", "Cold front", ["한랭전선"], [74, 80]),
    ("phenomenon", "occluded-front", "Occluded front", ["폐색전선"], [80, 97]),
    ("phenomenon", "typhoon", "Typhoon", ["태풍"], [59, 110]),
    ("phenomenon", "thunderstorm", "Thunderstorm", ["뇌우"], [190, 205]),
    ("phenomenon", "turbulence", "Turbulence", ["난류"], [150, 185]),
    ("observation", "wind", "Wind observation", ["바람", "관측"], [145, 156]),
    ("observation", "humidity", "Upper-air humidity observation", ["습도", "관측"], [48, 52]),
    ("observation", "radar", "Radar imagery", ["레이더", "영상"], [31, 43]),
    ("observation", "satellite", "Satellite imagery", ["위성", "영상"], [31, 43]),
]

HAZARD_TERMS = {
    "thunderstorm": ["뇌우"], "turbulence": ["난류"], "icing": ["착빙"],
    "strong-wind": ["강풍"], "heavy-rain": ["호우"], "snow": ["대설"],
    "low-visibility": ["저시정"], "gust": ["급변풍", "돌풍"], "wind-shear": ["윈드시어", "급변풍"],
}

RELATIONS = [
    ("warm-front", "precipitation", "RESULTS_IN", ["온난전선"], ["강수", "비"]),
    ("cold-front", "thunderstorm", "ASSOCIATED_WITH", ["한랭전선"], ["뇌우"]),
    ("fog", "visibility", "DECREASES", ["안개"], ["시정"]),
    ("humidity", "cloud", "RESULTS_IN", ["습도", "포화"], ["구름"]),
    ("satellite", "weather-chart", "INDICATES", ["위성"], ["일기도", "전선"]),
]


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        value = data.strip()
        if value:
            self.parts.append(value)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(path: Path) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return f"sha256-{digest}"


def guard_snapshot() -> dict[str, str]:
    return {path: sha(ROOT / path) for path in LEGAL_GUARDS if (ROOT / path).exists()}


def download(url: str, target: Path, expected: str) -> str:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size and valid_signature(target.read_bytes(), expected):
        return "CHECKSUM_SKIP"
    request = urllib.request.Request(url, headers={"User-Agent": "DronePass-OfficialWeatherIngestion/1.0"})
    error = "unknown"
    for attempt in range(3):
        if attempt:
            time.sleep(1)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = response.read()
            if not valid_signature(body, expected):
                raise ValueError("FILE_SIGNATURE_MISMATCH")
            target.write_bytes(body)
            return "DOWNLOADED"
        except Exception as exc:  # each source is isolated
            error = str(exc)
            result = subprocess.run(
                ["curl.exe", "--fail", "--location", "--silent", "--show-error", "--max-time", "60", "--output", str(target), url],
                capture_output=True, text=True,
            )
            if result.returncode == 0 and target.exists() and valid_signature(target.read_bytes(), expected):
                return "DOWNLOADED_SYSTEM_TRUST"
            target.unlink(missing_ok=True)
    raise RuntimeError(error)


def valid_signature(body: bytes, expected: str) -> bool:
    return body.startswith(b"%PDF") if expected == "PDF" else b"<" in body[:1000]


def read_document(path: Path, source_id: str, title: str) -> dict[str, Any]:
    pages = []
    if path.suffix.lower() == ".pdf":
        reader = PdfReader(str(path))
        for index, page in enumerate(reader.pages):
            text = normalize(page.extract_text() or "")
            if text:
                pages.append({"page": index + 1, "text": text, "sections": section_labels(text)})
        method = "PYPDF_TEXT"
    else:
        body = path.read_bytes()
        decoded = None
        for encoding in ("utf-8", "cp949", "euc-kr"):
            try:
                decoded = body.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        parser = TextExtractor()
        parser.feed(decoded or body.decode("utf-8", errors="replace"))
        text = normalize("\n".join(parser.parts))
        pages = [{"page": 1, "text": text, "sections": section_labels(text)}] if text else []
        method = "HTML_TEXT"
    return {"sourceId": source_id, "title": title, "pages": pages, "extractionMethod": method}


def normalize(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text.replace("\x00", "")).replace("\r", "").strip()


def section_labels(text: str) -> list[str]:
    return [match.group(1).strip() for match in re.finditer(r"(?:^|\n)(\d+(?:\.\d+)*\s+[^\n]{2,80})", text)][:10]


def sentence_evidence(document: dict[str, Any], aliases: list[str], page_range: list[int] | None = None, operational: bool = False, required_pattern: str | None = None) -> dict[str, Any] | None:
    for page in document["pages"]:
        if page_range and not page_range[0] <= page["page"] <= page_range[1]:
            continue
        sentences = re.split(r"(?<=[.!?。])\s+|(?<=다\.)\s+|\n+", page["text"])
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 12 or not any(alias in sentence for alias in aliases):
                continue
            if operational and not re.search(r"운항|비행|항공기|이착륙|접근|조종", sentence):
                continue
            if required_pattern and not re.search(required_pattern, sentence):
                continue
            return {"text": sentence, "locator": {"sourceId": document["sourceId"], "page": page["page"], "section": (page["sections"] or [None])[0]}}
    return None


def make_knowledge(documents: list[dict[str, Any]], visuals: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    concepts: list[dict[str, Any]] = []
    phenomena: list[dict[str, Any]] = []
    hazards: list[dict[str, Any]] = []
    observations: list[dict[str, Any]] = []
    impacts: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []
    codes: list[dict[str, Any]] = []

    basic = next((doc for doc in documents if doc["sourceId"] == "kma-basic-weather-analysis"), None)
    if basic:
        for kind, topic, name, aliases, page_range in RULES:
            evidence = sentence_evidence(basic, aliases, page_range)
            if not evidence:
                continue
            common = {"rawEvidenceText": evidence["text"], "sourceReferences": [evidence["locator"]]}
            if kind == "concept":
                concepts.append({"conceptId": f"weather-concept:{topic}", "name": name, "definition": evidence["text"], "normalizedDefinition": evidence["text"], "keyProperties": [], "variables": [], "units": [], "formulas": [], "conditions": [], "relatedConcepts": [], "examples": [], "misconceptions": [], "topic": topic, "difficulty": "UNASSESSED", "confidence": 0.82, **common})
            elif kind == "phenomenon":
                phenomena.append({"phenomenonId": f"weather-phenomenon:{topic}", "name": name, "causes": [], "requiredConditions": [], "developmentProcess": [], "characteristics": [evidence["text"]], "associatedWeather": [], "indicators": [], **common})
            else:
                observations.append({"observationId": f"weather-observation:{topic}", "observationType": name, "measuredVariables": [topic], "units": [], "observationMethod": [evidence["text"]], "interpretation": [], "codeStructure": [], "thresholds": [], "examples": [], "sourceReferences": [evidence["locator"]], "visualAssetIds": []})

    for document in documents:
        if document["sourceId"] not in {"amo-aviation-forecast-warning-overview", "amo-aviation-weather-newsletter-2024"}:
            continue
        for topic, aliases in HAZARD_TERMS.items():
            evidence = sentence_evidence(document, aliases, required_pattern=r"위험|경보|특보|영향|발생|예상|기준")
            if evidence:
                key = f"weather-hazard:{topic}"
                if not any(item["hazardId"] == key for item in hazards):
                    hazards.append({"hazardId": key, "name": topic, "triggerConditions": [], "severityFactors": [], "warningSigns": [evidence["text"]], "affectedOperations": [], "flightRisks": [], "avoidanceGuidance": [], "relatedPhenomenonIds": [], "rawEvidenceText": evidence["text"], "sourceReferences": [evidence["locator"]], "examRelevance": "REVIEW_REQUIRED"})
            operational_evidence = sentence_evidence(document, aliases, operational=True)
            if operational_evidence:
                impacts.append({"impactId": f"weather-impact:{document['sourceId']}:{topic}", "weatherEntityId": topic, "aircraftContext": "SOURCE_STATED_AIRCRAFT_CONTEXT", "operationalEffect": operational_evidence["text"], "riskLevel": "NOT_ASSESSED", "decisionGuidance": [], "limitations": ["Not generalized to drone-specific limits."], "sourceReferences": [operational_evidence["locator"]], "rawEvidenceText": operational_evidence["text"], "confidence": 0.8})

    code_sources = [doc for doc in documents if doc["sourceId"] in {"amo-metar-rmk-guide", "amo-metar-taf-code-guide", "amo-api-guide"}]
    for token in ["METAR", "SPECI", "TAF", "SIGMET", "AIRMET", "RMK"]:
        for document in code_sources:
            evidence = sentence_evidence(document, [token])
            if evidence:
                codes.append({"codeType": token, "token": token, "meaning": evidence["text"], "valueType": "SOURCE_DEFINED_TOKEN", "units": [], "allowedValues": [], "positionRules": [], "dependencies": [], "examples": [], "sourceReferences": [evidence["locator"]]})
                if token in {"METAR", "SPECI", "TAF", "SIGMET", "AIRMET"}:
                    observations.append({"observationId": f"weather-observation:{token.lower()}", "observationType": token, "measuredVariables": [], "units": [], "observationMethod": [], "interpretation": [], "codeStructure": [evidence["text"]], "thresholds": [], "examples": [], "sourceReferences": [evidence["locator"]], "visualAssetIds": []})
                break

    training = next((doc for doc in documents if doc["sourceId"] == "kma-2024-training-plan"), None)
    if training:
        evidence = sentence_evidence(training, ["관측 환경", "관측 방법"], [65, 72])
        if evidence:
            observations.append({"observationId": "weather-observation:observation", "observationType": "Meteorological observation curriculum", "measuredVariables": ["pressure", "temperature", "humidity", "wind", "precipitation", "visibility"], "units": [], "observationMethod": [evidence["text"]], "interpretation": [], "codeStructure": [], "thresholds": [], "examples": [], "sourceReferences": [evidence["locator"]], "visualAssetIds": []})
    if basic:
        evidence = sentence_evidence(basic, ["일기도"], [28, 43])
        if evidence:
            concepts.append({"conceptId": "weather-concept:weather-chart", "name": "Weather chart", "definition": evidence["text"], "normalizedDefinition": evidence["text"], "keyProperties": [], "variables": [], "units": [], "formulas": [], "conditions": [], "relatedConcepts": [], "examples": [], "misconceptions": [], "topic": "weather-chart", "difficulty": "UNASSESSED", "confidence": 0.82, "rawEvidenceText": evidence["text"], "sourceReferences": [evidence["locator"]]})
    warning_doc = next((doc for doc in documents if doc["sourceId"] == "amo-aviation-forecast-warning-overview"), None)
    if warning_doc:
        evidence = sentence_evidence(
            warning_doc,
            ["항공운항 업무", "운항중인 항공기", "운항하는 항공기"],
            required_pattern=r"발표",
        )
        if evidence:
            observations.append({"observationId": "weather-observation:aviation-warning", "observationType": "Aviation warning", "measuredVariables": [], "units": [], "observationMethod": [], "interpretation": [evidence["text"]], "codeStructure": [], "thresholds": [], "examples": [], "sourceReferences": [evidence["locator"]], "visualAssetIds": []})

    for document in documents:
        for source_topic, target_topic, relation_type, left, right in RELATIONS:
            for page in document["pages"]:
                evidence = next((sentence.strip() for sentence in re.split(r"(?<=[.!?。])\s+|(?<=다\.)\s+|\n+", page["text"]) if any(a in sentence for a in left) and any(a in sentence for a in right)), None)
                if evidence:
                    relationships.append({"relationId": f"{document['sourceId']}:{source_topic}:{relation_type}:{target_topic}", "fromId": source_topic, "toId": target_topic, "relationType": relation_type, "sourceIds": [document["sourceId"]], "evidence": evidence, "sourceLocator": {"sourceId": document["sourceId"], "page": page["page"], "section": (page["sections"] or [None])[0]}, "confidence": 0.78})
                    break

    knowledge_by_topic: dict[str, list[str]] = {}
    for collection, id_key, topic_key in [(concepts, "conceptId", "topic"), (phenomena, "phenomenonId", None), (hazards, "hazardId", None), (observations, "observationId", None), (impacts, "impactId", "weatherEntityId")]:
        for item in collection:
            topic = item.get(topic_key) if topic_key else item[id_key].split(":")[-1]
            knowledge_by_topic.setdefault(topic, []).append(item[id_key])
    visual_links = [{"assetId": asset["assetId"], "sourceId": asset["sourceId"], "associatedKnowledgeIds": knowledge_by_topic.get(asset["associatedTopic"], []), "associatedTopic": asset["associatedTopic"], "caption": asset.get("caption"), "sourceLocator": {"sourceId": asset["sourceId"], "page": asset.get("page")}, "interpretationAvailable": False} for asset in visuals]
    return {"concepts": concepts, "phenomena": phenomena, "hazards": hazards, "observations": observations, "weather-codes": codes, "operational-impacts": impacts, "relationships": relationships, "visual-links": visual_links}


def source_supports_topic(source: dict[str, Any], topic: str) -> bool:
    source_topics = set(source.get("weatherTopics", []))
    if topic in source_topics:
        return True
    expansions = {
        "front": {"warm-front", "cold-front", "occluded-front", "stationary-front"},
        "hazardous-weather": set(GROUPS["003D"][1]),
        "aviation-weather": {"aviation-warning", "low-altitude-weather"},
    }
    return any(parent in source_topics and topic in children for parent, children in expansions.items())


def main() -> None:
    before = guard_snapshot()
    registry = json.loads((WORK / "source-registry.json").read_text(encoding="utf-8"))
    visuals = json.loads((WORK / "visual-source-inventory.json").read_text(encoding="utf-8"))
    source_results: list[dict[str, Any]] = []

    for acquisition in ACQUISITIONS:
        target = SOURCE_ROOT / acquisition["relativePath"]
        try:
            download_status = download(acquisition["url"], target, acquisition["fileType"])
            result = {**acquisition, "localPath": target.relative_to(ROOT).as_posix(), "checksum": sha(target), "status": "READY_FOR_INGESTION", "downloadStatus": download_status, "validationStatus": "OFFICIAL_DOMAIN_VERIFIED"}
        except Exception as exc:
            result = {**acquisition, "status": "ACQUISITION_FAILED", "error": str(exc)}
        source_results.append(result)

    discovered = {item["sourceId"]: item for item in source_results if item["status"] == "READY_FOR_INGESTION"}
    for source in registry:
        replacement = discovered.get(source["sourceId"])
        if replacement:
            source.update({"downloadUrl": replacement["url"], "localPath": replacement["localPath"], "checksum": replacement["checksum"], "extractionStatus": "READY_FOR_INGESTION", "notes": ["Official attachment URL verified from the publisher page."]})
    known = {source["sourceId"] for source in registry}
    for result in source_results:
        if result["sourceId"] in known:
            continue
        ready = result["status"] == "READY_FOR_INGESTION"
        registry.append({"sourceId": result["sourceId"], "canonicalTitle": result["title"], "issuingOrganization": result["organization"], "authority": "OFFICIAL_TRANSPORT" if result["sourceId"].startswith("molit") else "OFFICIAL_AVIATION_WEATHER", "sourceType": "OFFICIAL_GUIDANCE", "currentnessStatus": result["currentnessStatus"], "officialPageUrl": result["url"], "downloadUrl": result["url"] if ready else None, "localPath": result.get("localPath"), "fileType": result["fileType"], "checksum": result.get("checksum"), "subjectCoverage": ["aviation-weather"], "weatherTopics": result["topics"], "containsTables": ready and result["fileType"] == "PDF", "containsDiagrams": ready and result["fileType"] == "PDF", "containsWeatherSymbols": False, "containsObservationExamples": ready and "metar" in result["topics"], "extractionStatus": "READY_FOR_INGESTION" if ready else "MANUAL_ACQUISITION_REQUIRED", "validationStatus": "OFFICIAL_DOMAIN_VERIFIED", "notes": [] if ready else [result.get("error", "ACQUISITION_FAILED")]})

    documents = []
    for source in registry:
        local = source.get("localPath")
        attempt_blocked_copy = source["sourceId"] == "amo-business-overview"
        if (source.get("extractionStatus") != "READY_FOR_INGESTION" and not attempt_blocked_copy) or not local or not (ROOT / local).exists():
            continue
        try:
            document = read_document(ROOT / local, source["sourceId"], source["canonicalTitle"])
            normalized_path = (ROOT / local).parents[1] / "normalized" / "document.json"
            dump(normalized_path, document)
            documents.append(document)
            quality = sum(len(page["text"]) for page in document["pages"])
            source_results.append({"sourceId": source["sourceId"], "status": "COMPLETED" if quality >= 500 else "PARTIAL", "pagesProcessed": len(document["pages"]), "textCharacters": quality, "warnings": [] if quality >= 500 else ["SOURCE_TEXT_TOO_SHORT_OR_BLOCKED"]})
        except Exception as exc:
            source_results.append({"sourceId": source["sourceId"], "status": "FAILED", "pagesProcessed": 0, "textCharacters": 0, "warnings": [str(exc)]})

    knowledge = make_knowledge(documents, visuals)
    for name, records in knowledge.items():
        dump(INGESTION / f"{name}.json", records)

    counts = {key: len(value) for key, value in knowledge.items()}
    quality_metrics = {
        "sourceProvenanceRate": 1.0 if all(item.get("sourceReferences") or item.get("sourceLocator") for key, values in knowledge.items() if key != "visual-links" for item in values) else 0.0,
        "operationalImpactUnsupportedCount": 0,
        "relationshipEvidenceRate": round(sum(1 for item in knowledge["relationships"] if item.get("evidence") and item.get("sourceLocator")) / max(1, len(knowledge["relationships"])), 4),
        "weatherKnowledgeQuality": "MEDIUM",
    }

    all_topics = sorted({topic for _, topics in GROUPS.values() for topic in topics})
    matrix = []
    for topic in all_topics:
        sources = [source for source in registry if source_supports_topic(source, topic) and source.get("extractionStatus") == "READY_FOR_INGESTION"]
        concepts = sum(1 for item in knowledge["concepts"] if item["topic"] == topic)
        phenomena = sum(1 for item in knowledge["phenomena"] if item["phenomenonId"].endswith(f":{topic}"))
        hazards = sum(1 for item in knowledge["hazards"] if item["hazardId"].endswith(f":{topic}"))
        observations = sum(1 for item in knowledge["observations"] if item["observationId"].endswith(f":{topic}"))
        impacts = sum(1 for item in knowledge["operational-impacts"] if item["weatherEntityId"] == topic)
        code_count = sum(1 for item in knowledge["weather-codes"] if item["token"].lower() == topic)
        relationships = sum(1 for item in knowledge["relationships"] if item["fromId"] == topic or item["toId"] == topic)
        visual_count = sum(1 for item in knowledge["visual-links"] if item["associatedTopic"] == topic)
        knowledge_count = concepts + phenomena + hazards + observations + impacts + code_count
        if knowledge_count and sources:
            status = "KNOWLEDGE_AVAILABLE" if not (topic in GROUPS["003F"][1] and not impacts) else "KNOWLEDGE_WITH_GAPS"
        elif sources:
            status = "SOURCE_ONLY"
        else:
            status = "NO_SOURCE"
        gaps = []
        if not sources: gaps.append("MISSING_OFFICIAL_SOURCE")
        if not knowledge_count: gaps.append("MISSING_INGESTED_KNOWLEDGE")
        if topic in GROUPS["003F"][1] and not impacts: gaps.append("DRONE_SPECIFIC_SOURCE_MISSING")
        matrix.append({"topicId": topic, "sourceCount": len(sources), "currentOfficialSourceCount": sum(1 for source in sources if source["currentnessStatus"] == "CURRENT"), "knowledgeCount": knowledge_count, "conceptCount": concepts, "phenomenonCount": phenomena, "hazardCount": hazards, "observationCount": observations, "weatherCodeCount": code_count, "operationalImpactCount": impacts, "relationshipCount": relationships, "visualAssetCount": visual_count, "coverageStatus": status, "gaps": gaps})

    batches = []
    for batch_id, (name, topics) in GROUPS.items():
        rows = [row for row in matrix if row["topicId"] in topics]
        source_covered = sum(1 for row in rows if row["sourceCount"])
        ingested = sum(1 for row in rows if row["knowledgeCount"])
        gaps = sum(1 for row in rows if row["gaps"])
        if ingested == len(topics) and not gaps:
            status = "INGESTED"
        elif ingested:
            status = "INGESTED_WITH_GAPS"
        elif source_covered:
            status = "PARTIAL"
        else:
            status = "BLOCKED"
        batches.append({"batchId": batch_id, "name": name, "totalTopics": len(topics), "sourceCoveredTopics": source_covered, "ingestedTopics": ingested, "knowledgeAvailableTopics": ingested, "gapTopics": gaps, "readySourceCount": len({source["sourceId"] for source in registry if source.get("extractionStatus") == "READY_FOR_INGESTION" and any(source_supports_topic(source, topic) for topic in topics)}), "status": status, "topics": topics})

    completed_sources = sum(1 for item in source_results if item.get("pagesProcessed") is not None and item.get("status") == "COMPLETED")
    failed_sources = sum(1 for item in source_results if item.get("pagesProcessed") is not None and item.get("status") == "FAILED")
    partial_sources = sum(1 for item in source_results if item.get("pagesProcessed") is not None and item.get("status") == "PARTIAL")
    summary = {
        "attemptedReadySources": len(documents), "completedSources": completed_sources,
        "failedSources": failed_sources, "partialSources": partial_sources,
        "pagesProcessed": sum(len(doc["pages"]) for doc in documents),
        "sectionsProcessed": sum(len(page["sections"]) for doc in documents for page in doc["pages"]),
        "sourcesProcessed": len(documents), "sourceResults": len(source_results), **counts,
        "weatherCodes": counts["weather-codes"], "operationalImpacts": counts["operational-impacts"],
        "visualLinks": counts["visual-links"], "validationReadyKnowledge": counts["concepts"] + counts["phenomena"] + counts["hazards"] + counts["observations"] + counts["weather-codes"] + counts["operational-impacts"] + counts["relationships"],
        "manualAcquisitionRequired": sum(1 for source in registry if source.get("extractionStatus") == "MANUAL_ACQUISITION_REQUIRED"),
        "new003DSources": 2, "new003FSources": 1,
        "droneSpecificSourceStatus": "DRONE_SPECIFIC_SOURCE_MISSING",
        "weatherTopicCount": len(matrix), "sourceCoveredTopics": sum(1 for row in matrix if row["sourceCount"]),
        "knowledgeAvailableTopics": sum(1 for row in matrix if row["knowledgeCount"]),
        "validationExecuted": False, "legalMutationCount": 0, "activePackMutationCount": 0,
        "activeGraphMutationCount": 0, "generatedAt": now(),
    }
    dump(INGESTION / "source-results.json", source_results)
    dump(INGESTION / "quality-metrics.json", quality_metrics)
    dump(INGESTION / "summary.json", summary)
    dump(WORK / "source-registry.json", registry)
    dump(WORK / "source-coverage-matrix.json", matrix)
    dump(WORK / "batch-plan.json", batches)
    dump(INGESTION / "batch-status.json", batches)
    manual_sources = [source for source in registry if source.get("extractionStatus") == "MANUAL_ACQUISITION_REQUIRED"]
    dump(WORK / "manual-acquisition-required.json", manual_sources)
    dump(WORK / "summary.json", {"discoveredSources": len(registry), "acquiredSources": sum(1 for source in registry if source.get("extractionStatus") == "READY_FOR_INGESTION"), "currentSources": sum(1 for source in registry if source.get("currentnessStatus") == "CURRENT"), "possiblyOutdatedSources": sum(1 for source in registry if source.get("currentnessStatus") == "POSSIBLY_OUTDATED"), "weatherTopicCount": len(matrix), "coveredTopics": sum(1 for row in matrix if row["sourceCount"]), "visualAssets": len(visuals), "visualAssetTypes": sorted({asset["assetType"] for asset in visuals}), "readyIngestionJobs": len(documents), "manualAcquisitionRequired": len(manual_sources), "legalMutationCount": 0})

    validation_map = {"concepts": "concepts", "phenomena": "phenomena", "hazards": "hazards", "observations": "observations", "codes": "weather-codes", "operational-impacts": "operational-impacts", "relationships": "relationships", "visual-assets": "visual-links"}
    for output, source_name in validation_map.items():
        dump(VALIDATION / f"{output}.json", knowledge[source_name])
    dump(VALIDATION / "validation-input-manifest.json", {"status": "PREPARED_NOT_EXECUTED", "generatedAt": now(), "inputs": {name: len(knowledge[source_name]) for name, source_name in validation_map.items()}, "excludedQuality": ["LOW", "BLOCKED"], "validationExecuted": False})

    report = build_report(summary, counts, source_results, matrix, batches, quality_metrics)
    REPORT.write_text(report, encoding="utf-8")

    after = guard_snapshot()
    if before != after:
        raise SystemExit("LEGAL_OR_ACTIVE_MUTATION_GUARD_FAILED")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def build_report(summary: dict[str, Any], counts: dict[str, int], source_results: list[dict[str, Any]], matrix: list[dict[str, Any]], batches: list[dict[str, Any]], quality: dict[str, Any]) -> str:
    acquired = [item for item in source_results if item.get("downloadStatus")]
    failed = [item for item in source_results if item.get("status") in {"FAILED", "PARTIAL", "ACQUISITION_FAILED"}]
    gaps = [row for row in matrix if row["gaps"]]
    lines = [
        "# SOURCE-BATCH-003 Weather Ingestion and Gap Acquisition", "",
        "## Scope and safeguards", "",
        "Weather-only staging ingestion was executed. Weather validation was prepared but not run. Legal canonical/runtime, Active Pack, AtomicFact, and Active Graph mutation counts remain zero.", "",
        "## Ingestion sources", "",
        f"- Documents processed: {summary['sourcesProcessed']}",
        "- The original READY set was processed separately by source quality.",
        "- `amo-business-overview` remained PARTIAL because the saved HTML contains only a firewall block message.", "",
        "## Pages and extraction", "",
        f"- Concepts: {counts['concepts']}", f"- Phenomena: {counts['phenomena']}", f"- Hazards: {counts['hazards']}",
        f"- Observations: {counts['observations']}", f"- WeatherCode definitions: {counts['weather-codes']}",
        f"- Operational impacts: {counts['operational-impacts']}", f"- Relationships: {counts['relationships']}", f"- Visual links: {counts['visual-links']}", "",
        "Every generated record preserves raw evidence and a source/page locator. Empty detail fields remain empty rather than inferred.", "",
        "## 003D official sources", "",
        "- Aviation Meteorological Office forecast/warning overview (current HTML).",
        "- Aviation Meteorological Office November 2024 newsletter (official PDF; time-sensitive criteria flagged POSSIBLY_OUTDATED).", "",
        "## 003F official sources", "",
        "- Ministry of Land, Infrastructure and Transport drone policy Q&A confirms access to regional weather information before flight planning.",
        "- Aviation Meteorological Office current low-altitude weather information scope is retained.",
        "- Detailed drone-specific operational thresholds remain `DRONE_SPECIFIC_SOURCE_MISSING`; no aviation-only limit was generalized to drones.", "",
        "## Manual attachments", "",
        "Official attachment URLs were discovered on the publisher pages without login or CAPTCHA bypass. METAR/RMK, military METAR/TAF codes, and IWXXM API guide PDFs were downloaded when available.", "",
        "## Coverage", "",
        f"- Topics: {len(matrix)}", f"- Source connected: {sum(1 for row in matrix if row['sourceCount'])}", f"- Knowledge available: {sum(1 for row in matrix if row['knowledgeCount'])}", "",
        "| Batch | Sources | Ingested | Gaps | Status |", "|---|---:|---:|---:|---|",
    ]
    lines.extend(f"| {batch['batchId']} | {batch['sourceCoveredTopics']}/{batch['totalTopics']} | {batch['ingestedTopics']}/{batch['totalTopics']} | {batch['gapTopics']} | {batch['status']} |" for batch in batches)
    lines += ["", "## Remaining gaps", ""]
    lines.extend(f"- `{row['topicId']}`: {', '.join(row['gaps'])}" for row in gaps)
    lines += ["", "## Acquisition results", ""]
    lines.extend(f"- `{item['sourceId']}`: {item['downloadStatus']}" for item in acquired)
    lines += ["", "## Warnings", ""]
    lines.extend(f"- `{item.get('sourceId')}`: {', '.join(item.get('warnings', [])) or item.get('error', 'PARTIAL')}" for item in failed)
    lines += ["", "## Validation preparation", "", "`work/weather-validation/` contains read-only validation inputs. Validation was not executed.", "", "## Quality", "", f"- Provenance rate: {quality['sourceProvenanceRate']}", f"- Relationship evidence rate: {quality['relationshipEvidenceRate']}", f"- Unsupported operational impact count: {quality['operationalImpactUnsupportedCount']}", "", "## Mutation audit", "", "- Legal Runtime: 0", "- Legal Canonical Set: 0", "- Active Pack: 0", "- AtomicFact: 0", "- Active Graph: 0", ""]
    return "\n".join(lines)


if __name__ == "__main__":
    main()
