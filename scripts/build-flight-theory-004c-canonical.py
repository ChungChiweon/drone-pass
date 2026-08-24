#!/usr/bin/env python3
"""Build the frozen 004C Canonical set from the approved candidate inventory only."""
from __future__ import annotations
import hashlib, json
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"work/flight-theory-validation/004c"
RESULTS=BASE/"results"

def load(path): return json.loads(path.read_text(encoding="utf-8"))
def stable(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def digest(value): return "sha256-"+hashlib.sha256(stable(value).encode()).hexdigest()
def save(name,value): (RESULTS/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def source_id(x): return x.get("conceptId") or x.get("componentId") or x.get("knowledgeId") or x.get("formulaId") or x.get("relationshipId")
def key(value): return value.split(":",1)[-1].replace("_","-").lower()
def canonical_type(candidate):
    kind=candidate["suggestedKnowledgeType"]
    if kind=="ELECTRICAL_CONCEPT" and key(candidate["sourceKnowledgeId"]) in ("power","power-system"): return "POWER_CONCEPT"
    return {"FORMULA":"TECHNICAL_FORMULA","SAFETY_KNOWLEDGE":"BATTERY_SAFETY"}.get(kind,kind)
def prefix(kind):
    return {"ELECTRICAL_CONCEPT":"electrical","POWER_CONCEPT":"power","PROPULSION_COMPONENT":"propulsion","BATTERY_KNOWLEDGE":"battery","BATTERY_SAFETY":"battery-safety","TECHNICAL_FORMULA":"formula","RELATIONSHIP":"relationship"}[kind]
def constraints(ctx):
    if ctx=="ELECTRICAL_GENERAL": return {"allowed":["ELECTRICAL_CONCEPT","FORMULA_INTERPRETATION","RELATIONSHIP_SELECTION"],"prohibited":["UAS_SPECIFIC_OPERATION"]}
    if ctx=="BATTERY_GENERAL": return {"allowed":["BATTERY_CONCEPT","BATTERY_SAFETY_CONCEPT","C_RATE_CONCEPT"],"prohibited":["DRONE_LIPO_OPERATION","DRONE_BATTERY_THRESHOLD","PRODUCT_SPECIFIC_BATTERY_RULE"]}
    if ctx=="AVIATION_GENERAL": return {"allowed":["COMPONENT_FUNCTION","TECHNICAL_CONCEPT"],"prohibited":["DRONE_SPECIFIC_CONFIGURATION"]}
    raise RuntimeError("UNSUPPORTED_TECHNICAL_CONTEXT")

inventory=load(RESULTS/"canonical-candidate-inventory.json")
validation=load(RESULTS/"validation-summary.json")
visual_validation=load(RESULTS/"visual-validation.json")
table_validation=load(RESULTS/"table-validation.json")
boundary=load(RESULTS/"duplicate-boundary-analysis.json")
topic_validation=load(RESULTS/"topic-validation-coverage.json")

if len(inventory)!=29: raise RuntimeError("CANDIDATE_COUNT_MISMATCH")
counts=Counter(x["canonicalEligibility"] for x in inventory)
if counts!={"READY":9,"READY_WITH_WARNING":20}: raise RuntimeError("CANDIDATE_STATUS_MISMATCH")
if any(x.get("canonicalId") is not None for x in inventory): raise RuntimeError("CANDIDATE_ALREADY_CANONICALIZED")
if any(x["canonicalEligibility"] not in ("READY","READY_WITH_WARNING") for x in inventory): raise RuntimeError("BLOCKED_CANDIDATE_PRESENT")
if validation["canonicalBaseline"]!=151 or validation["canonicalGenerated"]: raise RuntimeError("VALIDATION_BASELINE_MISMATCH")

source_rows={}
for name in ("concepts.json","propulsion-components.json","battery-knowledge.json","safety-knowledge.json","formulas.json","relationships.json"):
    for item in load(BASE/name): source_rows[source_id(item)]=item
if set(source_rows)!=set(x["sourceKnowledgeId"] for x in inventory): raise RuntimeError("INVENTORY_SOURCE_MISMATCH")

id_map={}
for candidate in inventory:
    kind=canonical_type(candidate)
    id_map[candidate["sourceKnowledgeId"]]=f"flight-004c:{prefix(kind)}:{key(candidate['sourceKnowledgeId'])}"
if len(set(id_map.values()))!=29: raise RuntimeError("CANONICAL_ID_COLLISION")

lineage={x["newKnowledgeId"]:{"existingBatch":x["existingBatch"],"classification":x["classification"],"reason":x["reason"]} for x in boundary}
units=[]; relations=[]
for candidate in inventory:
    original=source_rows[candidate["sourceKnowledgeId"]]
    kind=canonical_type(candidate); ctx=candidate["technicalContext"]
    if ctx not in ("ELECTRICAL_GENERAL","AVIATION_GENERAL","BATTERY_GENERAL"): raise RuntimeError("CONTEXT_GENERALIZATION_DETECTED")
    text=stable(original).lower()
    if "lipo" in text: raise RuntimeError("LIPO_GENERALIZATION_DETECTED")
    common={"knowledgeId":id_map[candidate["sourceKnowledgeId"]],"sourceKnowledgeId":candidate["sourceKnowledgeId"],"knowledgeType":kind,"topicId":original.get("topicId"),"technicalContext":ctx,"sourceReferences":candidate["sourceReferences"],"supportedQuestionTypes":constraints(ctx)["allowed"],"questionConstraints":constraints(ctx),"qualityScore":1.0 if candidate["canonicalEligibility"]=="READY" else 0.93,"warnings":candidate["warningConstraints"],"validationStatus":candidate["validationStatus"],"canonicalEligibility":candidate["canonicalEligibility"],"lineage":lineage.get(candidate["sourceKnowledgeId"])}
    if kind=="RELATIONSHIP":
        relations.append({**common,"sourceEndpoint":original["sourceKnowledgeId"],"targetEndpoint":original["targetKnowledgeId"],"sourceCanonicalId":id_map[original["sourceKnowledgeId"]],"targetCanonicalId":id_map[original["targetKnowledgeId"]],"relationType":original["relationType"],"direction":"SOURCE_TO_TARGET","evidence":original["evidence"],"sourceLocator":original["sourceLocator"]})
    else:
        payload={k:v for k,v in original.items() if k not in ("conceptId","componentId","knowledgeId","formulaId","relationshipId","confidence","status","warnings","technicalContext","sourceReferences","rawEvidenceText")}
        units.append({**common,**payload,"rawEvidenceText":original.get("rawEvidenceText"),"batteryContext":original.get("batteryContext")})

if len([x for x in units if x["knowledgeType"]=="TECHNICAL_FORMULA"])!=2: raise RuntimeError("FORMULA_COUNT_MISMATCH")
if len(relations)!=7: raise RuntimeError("RELATIONSHIP_COUNT_MISMATCH")
if len(visual_validation)!=102 or any(x["status"]!="SUPPORTIVE_UNRESOLVED" for x in visual_validation): raise RuntimeError("VISUAL_SUPPORT_MISMATCH")
if len(table_validation)!=2 or any(x["status"]!="PAGE_REVIEW_REQUIRED" for x in table_validation): raise RuntimeError("TABLE_EXCLUSION_MISMATCH")

visual_support=[{"assetId":x["assetId"],"status":x["status"],"sourceLocator":x["sourceLocator"],"topicId":x["topicId"],"knowledgeIds":x["knowledgeIds"],"canonicalKnowledgeIds":[id_map[i] for i in x["knowledgeIds"] if i in id_map],"canonicalKnowledgeUnit":False} for x in visual_validation]
exclusions=[{"tableId":x["tableId"],"source":x["sourceId"],"locator":{"page":x["page"]},"status":x["status"],"reason":"Table boundary and headers require page review; no Canonical unit created."} for x in table_validation]

unit_by_topic=defaultdict(list)
for x in units+relations:
    if x.get("topicId"): unit_by_topic[x["topicId"]].append(x)
visual_by_topic=Counter(x["topicId"] for x in visual_support)
table_source=load(BASE/"tables.json"); table_by_topic=Counter(x["topic"] for x in table_source)
gaps=set(validation["gaps"]); topic_coverage=[]
for topic in topic_validation:
    rows=unit_by_topic[topic["topicId"]]
    status="NO_KNOWLEDGE" if topic["topicId"] in gaps else ("READY_WITH_GAPS" if any(x["canonicalEligibility"]=="READY_WITH_WARNING" for x in rows) else "CANONICAL_READY")
    topic_coverage.append({"topicId":topic["topicId"],"canonicalKnowledgeCount":sum(x["knowledgeType"]!="RELATIONSHIP" for x in rows),"warningCanonicalCount":sum(x["canonicalEligibility"]=="READY_WITH_WARNING" for x in rows),"formulaCount":sum(x["knowledgeType"]=="TECHNICAL_FORMULA" for x in rows),"relationshipCount":sum(x["knowledgeType"]=="RELATIONSHIP" for x in rows),"supportingVisualCount":visual_by_topic[topic["topicId"]],"unresolvedTableCount":table_by_topic[topic["topicId"]],"status":status,"gaps":topic["gaps"]})

runtime="READY_WITH_GAPS" if len(gaps)==7 else "NEEDS_MORE_SOURCE"
freeze="READY_WITH_GAPS_FROZEN" if runtime=="READY_WITH_GAPS" else "READY_FOR_SHADOW_RUNTIME_FROZEN"
source_snapshot={"candidateInventoryChecksum":digest(inventory),"validationInputChecksum":validation["inputChecksum"],"sourceIds":sorted({r["sourceId"] for x in inventory for r in x["sourceReferences"]})}
canonical={"setId":"canonical-flight-theory:004c:v1","version":"1.0.0","batchId":"004C","canonicalUnits":units,"relationshipUnits":relations,"warningIds":[x["knowledgeId"] for x in units+relations if x["canonicalEligibility"]=="READY_WITH_WARNING"],"excludedIds":[x["tableId"] for x in exclusions],"unresolvedVisualIds":[x["assetId"] for x in visual_support],"unresolvedTableIds":[x["tableId"] for x in exclusions],"topicCoverage":topic_coverage,"gapAnalysis":{"count":7,"topics":sorted(gaps),"lipoPreserved":True},"runtimeReadiness":runtime,"freezeStatus":freeze,"sourceSnapshot":source_snapshot}
canonical["checksum"]=digest(canonical)

summary={"batchId":"004C","canonicalInput":29,"canonicalGenerated":len(units)+len(relations),"canonicalUnits":len(units),"relationshipUnits":len(relations),"typeDistribution":dict(Counter(x["knowledgeType"] for x in units+relations)),"candidateStatus":dict(counts),"technicalContext":dict(Counter(x["technicalContext"] for x in units+relations)),"formulaCount":sum(x["knowledgeType"]=="TECHNICAL_FORMULA" for x in units),"relationshipCount":len(relations),"visualSupportCount":len(visual_support),"visualCanonicalCount":0,"unresolvedTableCount":len(exclusions),"tableCanonicalCount":0,"gapCount":7,"gaps":sorted(gaps),"runtimeReadiness":runtime,"freezeStatus":freeze,"existingCanonicalBaseline":151,"totalFlightTheoryCanonical":151+len(units)+len(relations),"tsRecoveryStatus":"WAITING_FOR_MANUAL_FILE","nextBatch":"004D","checksum":canonical["checksum"],"checksumReproducible":canonical["checksum"]==digest({k:v for k,v in canonical.items() if k!="checksum"}),"mutations":{"existingCanonical":0,"activePack":0,"atomicFact":0,"graph":0,"question":0,"legal":0,"weather":0,"supabase":0}}
save("canonical-flight-knowledge-004c.json",canonical)
save("canonical-summary.json",summary)
save("canonical-exclusions.json",exclusions)
save("canonical-visual-support.json",visual_support)
save("topic-validation-coverage.json",topic_coverage)
save("runtime-readiness.json",{"batchId":"004C","status":runtime,"freezeStatus":freeze,"questionGenerationExecuted":False,"shadowRuntimeExecuted":False,"resumeConditions":["TS_OFFICIAL_TECHNICAL_MANUAL_ACQUIRED","NEW_OFFICIAL_UAS_SOURCE_ACQUIRED","CRITICAL_VALIDATION_OR_RUNTIME_ERROR"]})
print(json.dumps(summary,ensure_ascii=False,indent=2))
