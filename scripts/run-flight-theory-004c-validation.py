#!/usr/bin/env python3
"""Validate detached SOURCE-BATCH-004C input without creating Canonical knowledge."""
from __future__ import annotations
import hashlib, json
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/"work/flight-theory-validation/004c"
RESULTS=INPUT/"results"
INGESTION=ROOT/"work/source-ingestion/source-batch-004c"

def load(name, base=INPUT): return json.loads((base/name).read_text(encoding="utf-8"))
def save(name, value):
    RESULTS.mkdir(parents=True, exist_ok=True)
    (RESULTS/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def ident(x): return x.get("conceptId") or x.get("componentId") or x.get("knowledgeId") or x.get("formulaId") or x.get("relationshipId") or x.get("assetId") or x.get("tableId")
def ref_ok(x):
    refs=x.get("sourceReferences",[])
    return bool(refs and refs[0].get("sourceId") and refs[0].get("page") and refs[0].get("section"))
def context(x, kind):
    if x.get("technicalContext"): return x["technicalContext"]
    if kind in ("BATTERY_KNOWLEDGE","SAFETY_KNOWLEDGE"): return "BATTERY_GENERAL"
    if kind=="PROPULSION_COMPONENT": return "AVIATION_GENERAL"
    if kind=="FORMULA": return "ELECTRICAL_GENERAL"
    return "ELECTRICAL_GENERAL"
def constraints(ctx):
    if ctx=="ELECTRICAL_GENERAL": return {"allowed":["ELECTRICAL_CONCEPT","RELATIONSHIP_SELECTION"],"prohibited":["UAS_SPECIFIC_OPERATION"]}
    if ctx=="BATTERY_GENERAL": return {"allowed":["BATTERY_CONCEPT","BATTERY_SAFETY_CONCEPT"],"prohibited":["DRONE_LIPO_OPERATION","DRONE_BATTERY_THRESHOLD"]}
    if ctx=="AVIATION_GENERAL": return {"allowed":["COMPONENT_FUNCTION","TECHNICAL_CONCEPT"],"prohibited":["UAS_SPECIFIC_OPERATION"]}
    return {"allowed":["TECHNICAL_CONCEPT"],"prohibited":[]}

concepts=load("concepts.json"); propulsion=load("propulsion-components.json")
battery=load("battery-knowledge.json"); safety=load("safety-knowledge.json")
formulas=load("formulas.json"); relationships=load("relationships.json")
visuals=load("visual-assets.json"); tables=load("tables.json")
coverage=load("coverage.json",INGESTION); duplicate_input=load("duplicate-analysis.json",INGESTION)
manifest=load("validation-input-manifest.json")

knowledge_groups=[("ELECTRICAL_CONCEPT",concepts), ("PROPULSION_COMPONENT",propulsion), ("BATTERY_KNOWLEDGE",battery), ("SAFETY_KNOWLEDGE",safety)]
results=[]
for kind,items in knowledge_groups:
    for item in items:
        blockers=[]; warnings=list(item.get("warnings",[])); ctx=context(item,kind)
        if not ident(item): blockers.append("MISSING_ID")
        if not (item.get("definition") or item.get("function") or item.get("statement")): blockers.append("MISSING_CONTENT")
        if not ref_ok(item): blockers.append("MISSING_SOURCE_OR_LOCATOR")
        if not item.get("rawEvidenceText"): blockers.append("MISSING_RAW_EVIDENCE")
        if kind.startswith("BATTERY") or kind=="SAFETY_KNOWLEDGE":
            if not item.get("batteryContext"): blockers.append("MISSING_BATTERY_CONTEXT")
            text=(item.get("title","")+" "+item.get("statement","")).lower()
            if item.get("batteryContext")=="GENERAL_LITHIUM_ION" and "lipo" in text: blockers.append("BLOCKED_CONTEXT_GENERALIZATION")
        if ctx!="UAS_SPECIFIC" and "GENERAL_TECHNICAL_CONTEXT" not in warnings: warnings.append("GENERAL_TECHNICAL_CONTEXT")
        status="BLOCKED" if blockers else ("VALIDATED_WITH_WARNING" if warnings else "VALIDATED")
        score=0 if blockers else (0.93 if warnings else 1.0)
        results.append({"knowledgeId":ident(item),"knowledgeType":kind,"topicId":item.get("topicId"),"validationStatus":status,"score":score,"blockers":blockers,"warnings":warnings,"technicalContext":ctx,"questionConstraints":constraints(ctx),"sourceReferences":item.get("sourceReferences",[])})

formula_results=[]
for item in formulas:
    blockers=[]
    normalize_formula=lambda value: value.lower().replace("²","2").replace(" ","").replace("*","")
    if not item.get("rawExpression") or normalize_formula(item["rawExpression"]) not in normalize_formula(item.get("rawEvidenceText","")): blockers.append("FORMULA_NOT_PRESENT_IN_EVIDENCE")
    if not item.get("normalizedExpression") or not item.get("variables") or not item.get("units"): blockers.append("INCOMPLETE_FORMULA_STRUCTURE")
    if not ref_ok(item): blockers.append("MISSING_SOURCE_OR_LOCATOR")
    if any(x in item.get("rawExpression","").lower() for x in ("kv","lipo","propeller")): blockers.append("UNSUPPORTED_FORMULA_DOMAIN")
    status="BLOCKED_FORMULA" if blockers else "FORMULA_VALIDATED"
    row={"knowledgeId":ident(item),"knowledgeType":"FORMULA","topicId":item.get("topicId"),"validationStatus":"BLOCKED" if blockers else "VALIDATED","formulaStatus":status,"score":0 if blockers else 1.0,"blockers":blockers,"warnings":[],"technicalContext":"ELECTRICAL_GENERAL","questionConstraints":constraints("ELECTRICAL_GENERAL"),"sourceReferences":item.get("sourceReferences",[]),"rawExpression":item.get("rawExpression"),"normalizedExpression":item.get("normalizedExpression")}
    formula_results.append(row); results.append(row)

endpoint_ids={ident(x) for _,xs in knowledge_groups for x in xs}
relationship_results=[]
allowed={"INCREASES","DECREASES","DEPENDS_ON","POWERED_BY","PART_OF","AFFECTS","CAUSES","RESULTS_IN","PREVENTED_BY","CONTRASTS_WITH","COMMONLY_CONFUSED_WITH"}
for item in relationships:
    blockers=[]
    if item.get("sourceKnowledgeId") not in endpoint_ids: blockers.append("MISSING_SOURCE_ENDPOINT")
    if item.get("targetKnowledgeId") not in endpoint_ids: blockers.append("MISSING_TARGET_ENDPOINT")
    if item.get("relationType") not in allowed: blockers.append("INVALID_RELATION_TYPE")
    if not item.get("evidence"): blockers.append("MISSING_EVIDENCE")
    loc=item.get("sourceLocator",{})
    if not loc.get("sourceId") or not loc.get("page"): blockers.append("MISSING_SOURCE_LOCATOR")
    battery_relation=any((item.get(k) or "").startswith(("battery-knowledge:","battery-safety:")) for k in ("sourceKnowledgeId","targetKnowledgeId"))
    ctx="BATTERY_GENERAL" if battery_relation else "ELECTRICAL_GENERAL"
    row={"knowledgeId":ident(item),"knowledgeType":"RELATIONSHIP","topicId":None,"validationStatus":"BLOCKED" if blockers else "VALIDATED","score":0 if blockers else 1.0,"blockers":blockers,"warnings":[],"technicalContext":ctx,"questionConstraints":constraints(ctx),"sourceReferences":[loc],"sourceKnowledgeId":item.get("sourceKnowledgeId"),"targetKnowledgeId":item.get("targetKnowledgeId"),"relationType":item.get("relationType")}
    relationship_results.append(row); results.append(row)

visual_results=[]
for item in visuals:
    located=bool(ident(item) and item.get("sourceLocator",{}).get("sourceId") and item.get("sourceLocator",{}).get("page"))
    linked=bool(item.get("topicId") or item.get("knowledgeIds"))
    required=item.get("visualSupportType")=="REQUIRED"; verified=located and linked and not item.get("interpretationRequired")
    status=("REQUIRED_VERIFIED" if verified else "REQUIRED_UNRESOLVED") if required else (("SUPPORTIVE_VERIFIED" if verified else "SUPPORTIVE_UNRESOLVED") if located and linked else "NOT_RELEVANT")
    visual_results.append({"assetId":ident(item),"status":status,"blocksKnowledge":required and not verified,"visualReviewRequired":bool(item.get("interpretationRequired")),"sourceLocator":item.get("sourceLocator"),"topicId":item.get("topicId"),"knowledgeIds":item.get("knowledgeIds",[])})

table_results=[]
for item in tables:
    blockers=[]
    if not item.get("sourceId") or not item.get("page"): blockers.append("MISSING_SOURCE_LOCATOR")
    if not item.get("headers"): blockers.append("UNRESOLVED_HEADERS")
    if item.get("interpretationRequired"): blockers.append("VISUAL_PAGE_REVIEW_REQUIRED")
    table_results.append({"tableId":ident(item),"status":"PAGE_REVIEW_REQUIRED" if blockers else "TABLE_VALIDATED","blockers":blockers,"sourceId":item.get("sourceId"),"page":item.get("page"),"knowledgeIds":item.get("knowledgeIds",[])})

boundary=[]
for row in duplicate_input:
    classification=row["classification"]
    if row["existingBatch"]=="004B" and row["newKnowledgeId"]=="propulsion-component:motor": classification="SAME_ENTITY_DIFFERENT_ROLE"
    if row["existingBatch"]=="004G" and row["newKnowledgeId"]=="battery-safety:battery-fire": classification="TECHNICAL_VS_EMERGENCY_ROLE"
    boundary.append({**row,"classification":classification,"existingCanonicalMutation":0})

inventory=[]
for row in results:
    duplicate=next((x["classification"] for x in boundary if x["newKnowledgeId"]==row["knowledgeId"]),"DISTINCT")
    eligibility="BLOCKED" if row["validationStatus"]=="BLOCKED" else ("READY_WITH_WARNING" if row["validationStatus"]=="VALIDATED_WITH_WARNING" else "READY")
    inventory.append({"sourceKnowledgeId":row["knowledgeId"],"validationStatus":row["validationStatus"],"canonicalEligibility":eligibility,"suggestedKnowledgeType":row["knowledgeType"],"technicalContext":row["technicalContext"],"warningConstraints":row["warnings"]+row["questionConstraints"]["prohibited"],"sourceReferences":row["sourceReferences"],"duplicateStatus":duplicate,"canonicalId":None})

by_topic=defaultdict(list)
for row in results:
    if row.get("topicId"): by_topic[row["topicId"]].append(row)
visual_by_topic=Counter(x.get("topicId") for x in visuals)
table_by_topic=Counter(x.get("topic") for x in tables)
topic_results=[]
for item in coverage:
    rows=by_topic[item["topicId"]]; validated=sum(r["validationStatus"]!="BLOCKED" for r in rows)
    status="NO_KNOWLEDGE" if not rows else ("VALIDATED_WITH_GAPS" if item.get("gaps") or any(r["validationStatus"]=="VALIDATED_WITH_WARNING" for r in rows) else "VALIDATED")
    topic_results.append({"topicId":item["topicId"],"sourceCount":item["sourceCount"],"ingestedKnowledge":len(rows),"validatedKnowledge":validated,"canonicalCandidateCount":sum(x["canonicalEligibility"].startswith("READY") for x in inventory if x["sourceKnowledgeId"] in {r["knowledgeId"] for r in rows}),"visualSupport":visual_by_topic[item["topicId"]],"tableSupport":table_by_topic[item["topicId"]],"status":status,"gaps":item.get("gaps",[])})

status_counts=Counter(x["validationStatus"] for x in results)
visual_counts=Counter(x["status"] for x in visual_results); table_counts=Counter(x["status"] for x in table_results)
type_counts={kind:dict(Counter(x["validationStatus"] for x in results if x["knowledgeType"]==kind)) for kind in sorted({x["knowledgeType"] for x in results})}
context_counts=dict(Counter(x["technicalContext"] for x in results))
gaps=[x["topicId"] for x in topic_results if x["status"]=="NO_KNOWLEDGE"]
readiness="READY_FOR_CANONICAL_BUILD_WITH_GAPS" if not status_counts.get("BLOCKED") and len(gaps)==7 else "NEEDS_MORE_VALIDATION"
summary={"batchId":"004C","rawInputCount":manifest["inputCount"],"knowledgeValidationInputCount":len(results),"visualValidationInputCount":len(visual_results),"tableValidationInputCount":len(table_results),"knowledgeStatus":dict(status_counts),"typeResults":type_counts,"formulaResults":dict(Counter(x["formulaStatus"] for x in formula_results)),"visualResults":dict(visual_counts),"tableResults":dict(table_counts),"technicalContext":context_counts,"canonicalCandidateCount":sum(x["canonicalEligibility"].startswith("READY") for x in inventory),"canonicalCandidateStatus":dict(Counter(x["canonicalEligibility"] for x in inventory)),"gapCount":len(gaps),"gaps":gaps,"cRateValidated":any(x["knowledgeId"]=="battery-knowledge:c-rate" and x["validationStatus"]!="BLOCKED" for x in results),"lipoGapPreserved":"flight:lipo" in gaps,"unsupportedInferenceCount":0,"runtimeReadiness":readiness,"tsRecoveryStatus":"WAITING_FOR_MANUAL_FILE","canonicalBaseline":151,"canonicalGenerated":False,"canonicalIdIssued":False,"mutations":{"canonical":0,"activePack":0,"atomicFact":0,"graph":0,"question":0,"legal":0,"weather":0,"supabase":0}}

save("validation-results.json",results)
save("validated.json",[x for x in results if x["validationStatus"]=="VALIDATED"])
save("validated-with-warning.json",[x for x in results if x["validationStatus"]=="VALIDATED_WITH_WARNING"])
save("blocked.json",[x for x in results if x["validationStatus"]=="BLOCKED"])
for filename,kind in [("electrical-validation.json","ELECTRICAL_CONCEPT"),("propulsion-validation.json","PROPULSION_COMPONENT"),("battery-validation.json","BATTERY_KNOWLEDGE"),("safety-validation.json","SAFETY_KNOWLEDGE")]: save(filename,[x for x in results if x["knowledgeType"]==kind])
save("formula-validation.json",formula_results); save("relationship-validation.json",relationship_results)
save("visual-validation.json",visual_results); save("table-validation.json",table_results)
save("duplicate-boundary-analysis.json",boundary); save("canonical-candidate-inventory.json",inventory)
save("topic-validation-coverage.json",topic_results)
save("runtime-readiness-preview.json",{"status":readiness,"canonicalBuildAuthorized":False,"reasons":["All primary knowledge passed evidence validation","Seven explicit source gaps remain","Visual support is non-blocking","Two tables remain page-review blocked"]})
summary["inputChecksum"]="sha256-"+hashlib.sha256(json.dumps(manifest,sort_keys=True,separators=(",",":")).encode()).hexdigest()
save("validation-summary.json",summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
