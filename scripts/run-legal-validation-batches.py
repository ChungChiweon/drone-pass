#!/usr/bin/env python3
"""Deterministic read-only validation of LEGAL-VALIDATION-BATCH-001..008."""
from __future__ import annotations
import hashlib, json, re, shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[1]; LEGAL=ROOT/"work/legal-validation"; RESULTS=LEGAL/"results"; COMBINED=RESULTS/"combined"
PACK=ROOT/"work/dronepass-active-pack--kr-drone-license-mrm0omvd.json"; GRAPH=ROOT/"work/graph-version-snapshots/graph-activation-final-state-20260801.json"
WEIGHTS={"source":.20,"statement":.20,"numeric":.15,"condition":.15,"exception":.10,"currentness":.10,"exam":.10}
MODALS=[(r"하여야|해야|받아야","OBLIGATION"),(r"해서는 아니|하여서는 아니|금지","PROHIBITION"),(r"할 수 있|할 수 있다","PERMISSION"),(r"제외|적용하지 아니","EXCEPTION"),(r"인정","RECOGNITION")]
OPS=[(r"이상","GTE"),(r"이하","LTE"),(r"초과","GT"),(r"미만","LT"),(r"이내","WITHIN"),(r"이후","AFTER"),(r"총|합계","AGGREGATE"),(r"각각","PER_ITEM")]
CONDITION_CUES=["다음 각 호의 어느 하나","각각","총","해당하는 경우","다음 각 목","국토교통부령으로 정하는","별표에서 정하는"]

def load(p:Path): return json.loads(p.read_text(encoding="utf-8"))
def dump(p:Path,v:Any): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding="utf-8")
def sha(p:Path): return "sha256-"+hashlib.sha256(p.read_bytes()).hexdigest()
def guard():
 p=load(PACK)["pack"]["pack"]; g=load(GRAPH)["finalState"]
 return {"packChecksum":sha(PACK),"packId":g["packId"],"atomicFactCount":len(p["atomicFacts"]),"approvedFactCount":g["approvedFacts"],"activeGraphVersion":g["activeVersionId"],"activeRelations":g["activeRelations"]}
def clean(s): return re.sub(r"\s+","",(s or "").lower())
def score(parts): return round(sum(parts[k]*WEIGHTS[k] for k in WEIGHTS),4)

def duplicate_map(cands):
 groups=defaultdict(list)
 for c in cands:
  if clean(c.get("normalizedStatement")): groups[clean(c.get("normalizedStatement"))].append(c)
 out={c["candidateId"]:{"status":"DISTINCT","canonicalCandidateId":None,"duplicateCandidateIds":[]} for c in cands}; reports=[]
 for key,members in sorted(groups.items()):
  if len(members)<2: continue
  ordered=sorted(members,key=lambda c:(c.get("validationEligibility") not in {"ELIGIBLE","ELIGIBLE_WITH_WARNINGS"},not str(c.get("currentnessStatus","")).startswith("CURRENT"),not bool(c.get("sourceLocator")),-float(c.get("structureConfidence",0)),-float(c.get("extractionConfidence",0)),c["candidateId"]))
  canonical=ordered[0]; ids=[x["candidateId"] for x in ordered]
  reports.append({"duplicateGroup":members[0].get("duplicateGroup") or "auto:"+hashlib.sha1(key.encode()).hexdigest()[:12],"canonicalCandidateId":canonical["candidateId"],"duplicateCandidateIds":ids[1:],"duplicateReason":"Identical normalized rule; canonical selected by currentness, locator, structure and extraction quality"})
  for c in ordered[1:]: out[c["candidateId"]]={"status":"EXACT_DUPLICATE","canonicalCandidateId":canonical["candidateId"],"duplicateCandidateIds":ids[1:]}
 return out,reports

def relevance(c):
 text=" ".join(str(c.get(k) or "") for k in ["subject","predicate","object","normalizedStatement","factType"])
 if re.search(r"제출서식 상세|담당 부서|위원회 내부|내부 결재|서식의 기재",text): return "LOW",.35,["administrative or form detail"]
 if re.search(r"NUMERIC_THRESHOLD|PENALTY|PROHIBITION|ADMINISTRATIVE_SANCTION|자격|증명|비행승인|금지|준수|벌칙|과태료|사업요건|정의|분류|초과|이하|이상|미만",text): return "HIGH",1,["direct exam rule, definition, prohibition or threshold"]
 if re.search(r"REQUIREMENT|OBLIGATION|절차|신고|검사|교육|승인",text): return "MEDIUM",.75,["supporting legal procedure or obligation"]
 return "NONE",.1,["no direct exam linkage"]

def validate(c,batch_id,dupe,conflicts):
 passed=[];failed=[];warnings=list(c.get("warnings",[]));blockers=[];evidence=[]
 # source
 official=str(c.get("sourceAuthority","")).startswith("OFFICIAL"); source_block=[]
 if official:passed.append("OFFICIAL_SOURCE")
 else:failed.append("OFFICIAL_SOURCE");source_block.append("SOURCE_NOT_OFFICIAL")
 for field,rule in [("sourceVersionId","SOURCE_VERSION_PRESENT"),("sourceLocator","EXACT_LOCATOR"),("rawEvidenceText","RAW_EVIDENCE_PRESENT")]:
  if c.get(field) and not (field=="sourceLocator" and c[field]=="DOCUMENT"):passed.append(rule)
  else:failed.append(rule);source_block.append(rule+"_MISSING")
 if c.get("validationEligibility")=="BLOCKED_TABLE_UNRESOLVED":source_block.append("TABLE_UNRESOLVED")
 if "FUTURE" in c.get("currentnessStatus",""):source_block.append("FUTURE_EFFECTIVE_ONLY")
 if not c.get("currentnessStatus","").startswith("CURRENT"):source_block.append("CURRENTNESS_UNVERIFIABLE")
 blockers+=source_block; source_score=max(0,1-.25*len(source_block)); evidence.append(f"{c.get('sourceId')}:{c.get('sourceVersionId')}:{c.get('sourceLocator')}")
 # statement
 statement_block=[];raw=c.get("rawEvidenceText") or "";norm=c.get("normalizedStatement") or ""
 if c.get("subject"):passed.append("SUBJECT_PRESENT")
 else:failed.append("SUBJECT_PRESENT");statement_block.append("SUBJECT_MISSING")
 if c.get("predicate"):passed.append("PREDICATE_PRESENT")
 else:failed.append("PREDICATE_PRESENT");statement_block.append("PREDICATE_MISSING")
 if len(norm)>=min(20,len(raw.strip())):passed.append("STATEMENT_COMPLETE")
 else:failed.append("STATEMENT_COMPLETE");statement_block.append("STATEMENT_FRAGMENT")
 for pattern,label in MODALS:
  if re.search(pattern,raw) and not re.search(pattern,norm):failed.append("MODAL_"+label);statement_block.append("MODALITY_DIRECTION_LOST")
 blockers+=statement_block; statement_score=max(0,1-.3*len(statement_block));evidence.append(raw[:240])
 # numeric
 numeric_block=[];numbers=[float(x) for x in re.findall(r"\d+(?:\.\d+)?",raw)]
 numeric_claim=c.get("factType")=="NUMERIC_THRESHOLD" or c.get("value") is not None or bool(c.get("unit")) or c.get("operator") not in (None,"NONE") or bool(re.search(r"\d+(?:\.\d+)?\s*(?:kg|g|m|cm|km|원|만원|억원|시간|분|일|개월|년|%)(?:\s*(?:이상|이하|초과|미만|이내))?",raw,re.I))
 if numbers and numeric_claim:
  structured=c.get("value") is not None or c.get("unit") or c.get("operator") not in (None,"NONE")
  if not structured:warnings.append("UNSTRUCTURED_NUMERIC_EVIDENCE")
  expected=[op for pattern,op in OPS if re.search(pattern,raw)]
  if expected and c.get("operator") not in (None,"NONE") and c.get("operator") not in expected:numeric_block.append("OPERATOR_CONFLICT")
  if c.get("value") is not None and float(c["value"]) not in numbers:numeric_block.append("NUMERIC_VALUE_MISMATCH")
  if re.search(r"\d\s*(kg|g|m|cm|km|원|만원|억원|시간|분|일|개월|년|%)",raw,re.I) and not c.get("unit"):warnings.append("UNIT_NOT_STRUCTURED")
 blockers+=numeric_block;numeric_score=max(0,1-.5*len(numeric_block)-.03*sum(x in {"UNSTRUCTURED_NUMERIC_EVIDENCE","UNIT_NOT_STRUCTURED"} for x in warnings))
 # condition
 condition_block=[];structured_conditions=" ".join((c.get("conditions") or [])+(c.get("applicability") or []))
 for cue in [x for x in CONDITION_CUES if x in raw]:
  if cue not in structured_conditions and cue not in norm:condition_block.append("CONDITION_SCOPE_MISSING")
 blockers+=condition_block;condition_score=max(0,1-.35*len(condition_block))
 # exception
 exception_block=[]
 if re.search(r"다만|제외|예외|적용하지 아니|특별한 경우",raw) and not re.search(r"다만|제외|예외|적용하지 아니|특별한 경우",norm+" "+" ".join(c.get("exceptions") or [])):exception_block.append("EXCEPTION_SCOPE_MISSING")
 blockers+=exception_block;exception_score=.5 if exception_block else 1
 # duplicate/conflict/relevance
 if dupe["status"]=="EXACT_DUPLICATE":blockers.append("NON_CANONICAL_DUPLICATE")
 conflict_matches=[x for x in conflicts if x.get("candidateId")==c["candidateId"] and x.get("resolution")!="RESOLVED"]
 if conflict_matches:blockers.append("SUBSTANTIVE_CONFLICT")
 exam,exam_score,reasons=relevance(c);currentness=1 if c.get("currentnessStatus","").startswith("CURRENT") else 0
 parts={"source":source_score,"statement":statement_score,"numeric":numeric_score,"condition":condition_score,"exception":exception_score,"currentness":currentness,"exam":exam_score};total=score(parts)
 blockers=list(dict.fromkeys(blockers));warnings=list(dict.fromkeys(warnings));status="REVIEW_REQUIRED"
 if "TABLE_UNRESOLVED" in blockers or source_block:status="BLOCKED_SOURCE"
 elif "SUBSTANTIVE_CONFLICT" in blockers:status="BLOCKED_CONFLICT"
 elif "NON_CANONICAL_DUPLICATE" in blockers:status="BLOCKED_DUPLICATE"
 elif statement_block:status="BLOCKED_STATEMENT"
 elif numeric_block:status="BLOCKED_NUMERIC"
 elif condition_block:status="BLOCKED_CONDITION"
 elif exception_block:status="BLOCKED_EXCEPTION"
 elif exam in {"LOW","NONE"}:status="NOT_EXAM_RELEVANT"
 elif total>=.95 and not warnings:status="VALIDATED"
 elif total>=.90:status="VALIDATED_WITH_WARNING"
 action={"VALIDATED":"INCLUDE_IN_LEGAL_KNOWLEDGE_SET","VALIDATED_WITH_WARNING":"INCLUDE_WITH_WARNING","BLOCKED_CONFLICT":"REVIEW_CONFLICT","BLOCKED_CONDITION":"REVIEW_CONDITION","BLOCKED_EXCEPTION":"REVIEW_CONDITION","BLOCKED_SOURCE":"REVIEW_SOURCE","REVIEW_REQUIRED":"KEEP_BLOCKED"}.get(status,"EXCLUDE")
 return {"candidateId":c["candidateId"],"batchId":batch_id,"sourceId":c["sourceId"],"sourceVersionId":c.get("sourceVersionId"),"validationStatus":status,"validationScore":total,"sourceEvidenceScore":source_score,"statementScore":statement_score,"numericScore":numeric_score,"conditionScore":condition_score,"exceptionScore":exception_score,"currentnessScore":currentness,"examRelevanceScore":exam_score,"duplicateStatus":dupe["status"],"canonicalCandidateId":dupe.get("canonicalCandidateId"),"conflictStatus":"UNRESOLVED_CONFLICT" if conflict_matches else "NO_CONFLICT","passedRules":sorted(set(passed)),"failedRules":sorted(set(failed)),"warnings":warnings,"blockers":blockers,"evidence":evidence,"recommendedAction":action,"examRelevance":exam,"relevanceReasons":reasons}

def topic_coverage(results,candidates,conflicts,dupe_reports):
 matrix=load(ROOT/"work/source-inventory/drone-source-coverage-matrix.json")["existingCoverage"]
 topics=[x for x in matrix if x["subject"]=="AVIATION_LAW"][:19]; cmap={c["candidateId"]:c for c in candidates}
 patterns={"law-system":r"법 체계|목적|적용범위","device-definition":r"정의|분류|초경량|무인비행","pilot-certification":r"조종자|증명|자격","device-report":r"신고","safety-certification":r"안전성인증","flight-approval":r"비행승인","special-flight-approval":r"특별비행","restricted-airspace":r"금지구역|제한구역","airspace":r"공역","pilot-compliance":r"준수사항","incident-reporting":r"사고|보고","insurance-business":r"보험","aviation-business-act":r"항공사업","airport-facilities-act":r"공항시설","administrative-sanctions":r"행정처분","penalties":r"벌칙|과태료|벌금|징역","operating-rules":r"운영세칙|실기시험","legal-tables":r"별표|TABLE","revision-history":r"개정|시행"}
 out=[]
 for t in topics:
  pat=patterns.get(t["topicId"],r"$^"); members=[r for r in results if re.search(pat," ".join(str(cmap.get(r["candidateId"],{}).get(k) or "") for k in ["subject","predicate","normalizedStatement","sourceLocator"]),re.I)]
  valid=[r for r in members if r["validationStatus"] in {"VALIDATED","VALIDATED_WITH_WARNING"}];blocked=[r for r in members if r not in valid]
  sources={r["sourceId"] for r in valid}; critical=sum(r["validationStatus"]=="BLOCKED_CONFLICT" for r in members)
  status="NO_VALIDATED_KNOWLEDGE" if not valid else ("VALIDATED" if len(valid)>=5 and not critical and len(sources)>=1 else "VALIDATED_WITH_GAPS" if len(valid)>=3 else "PARTIAL_VALIDATION")
  out.append({"topicId":t["topicId"],"topicLabel":t["topicLabel"],"validatedCandidateCount":len(valid),"validatedHighCount":sum(r["examRelevance"]=="HIGH" for r in valid),"validatedMediumCount":sum(r["examRelevance"]=="MEDIUM" for r in valid),"blockedCount":len(blocked),"conflictCount":critical,"duplicateCount":sum(r["duplicateStatus"]!="DISTINCT" for r in members),"currentOfficialSourceCount":len(sources),"sourceDiversity":len(sources),"coverageConfidence":round(min(1,len(valid)/5)*(.8 if critical else 1),4),"status":status})
 return out

def main():
 RESULTS.mkdir(parents=True,exist_ok=True);COMBINED.mkdir(parents=True,exist_ok=True);before=guard();manifest=load(LEGAL/"validation-input-manifest.json");batches=load(LEGAL/"validation-batches.json");candidates=load(LEGAL/"body-candidates.json")+load(LEGAL/"table-candidates.json");by_id={c["candidateId"]:c for c in candidates};conflicts=load(LEGAL/"conflicts.json")
 ready_ids={i for b in batches for i in b["readyCandidateIds"]};blocked_ids={c["candidateId"] for c in candidates}-ready_ids
 if len(ready_ids)!=2926 or len(blocked_ids)!=75:raise RuntimeError(f"Input isolation mismatch: ready={len(ready_ids)} blocked={len(blocked_ids)}")
 ready=[by_id[i] for i in sorted(ready_ids)];dupes,dupe_reports=duplicate_map(candidates);all_results=[];batch_summaries=[]
 for b in batches:
  bid=b["batchId"];folder=RESULTS/bid.lower().replace("validation-batch-","batch-");folder.mkdir(parents=True,exist_ok=True);checkpoint=folder/"checkpoint.json"
  ids=sorted(set(b["readyCandidateIds"]));results=[validate(by_id[i],bid,dupes[i],conflicts) for i in ids];dump(folder/"validation-results.json",results)
  counts=Counter(x["validationStatus"] for x in results);state="COMPLETED_WITH_WARNINGS" if any(k not in {"VALIDATED"} for k in counts) else "COMPLETED"
  summary={"batchId":bid,"topic":b["topic"],"inputCandidateCount":len(ids),"status":state,"validationStatus":dict(counts),"checksum":"sha256-"+hashlib.sha256(json.dumps(results,sort_keys=True,ensure_ascii=False).encode()).hexdigest()};dump(folder/"summary.json",summary);dump(checkpoint,{"batchId":bid,"status":"COMPLETED","candidateCount":len(ids),"resultChecksum":summary["checksum"]});all_results+=results;batch_summaries.append(summary)
 all_results=sorted(all_results,key=lambda x:x["candidateId"]);dump(COMBINED/"validation-results.json",all_results)
 names={"validated-candidates.json":{"VALIDATED"},"validated-with-warning.json":{"VALIDATED_WITH_WARNING"},"review-required.json":{"REVIEW_REQUIRED"},"not-exam-relevant.json":{"NOT_EXAM_RELEVANT"}}
 for name,statuses in names.items():dump(COMBINED/name,[x for x in all_results if x["validationStatus"] in statuses])
 preblocked=[]
 for candidate_id in sorted(blocked_ids):
  c=by_id[candidate_id];is_conflict=c["validationEligibility"]=="BLOCKED_CONFLICT"
  preblocked.append({"candidateId":candidate_id,"batchId":None,"sourceId":c["sourceId"],"sourceVersionId":c.get("sourceVersionId"),"validationStatus":"BLOCKED_CONFLICT" if is_conflict else "BLOCKED_SOURCE","validationScore":0,"duplicateStatus":dupes[candidate_id]["status"],"canonicalCandidateId":dupes[candidate_id].get("canonicalCandidateId"),"conflictStatus":"UNRESOLVED_CONFLICT" if is_conflict else "NO_CONFLICT","warnings":c.get("warnings",[]),"blockers":["PRE_VALIDATION_CONFLICT" if is_conflict else "TABLE_UNRESOLVED"],"recommendedAction":"REVIEW_CONFLICT" if is_conflict else "KEEP_BLOCKED","examRelevance":c["examRelevance"]})
 dump(COMBINED/"blocked-candidates.json",[x for x in all_results if x["validationStatus"].startswith("BLOCKED")]+preblocked);dump(COMBINED/"duplicate-groups.json",dupe_reports)
 conflict_results=[{"candidateId":r["candidateId"],"status":r["conflictStatus"],"validationStatus":r["validationStatus"],"evidence":[x for x in conflicts if x.get("candidateId")==r["candidateId"]]} for r in all_results if r["conflictStatus"]!="NO_CONFLICT"]
 conflict_results += [{"candidateId":r["candidateId"],"status":"UNRESOLVED_CONFLICT","validationStatus":"BLOCKED_CONFLICT","evidence":[x for x in conflicts if x.get("candidateId")==r["candidateId"]]} for r in preblocked if r["validationStatus"]=="BLOCKED_CONFLICT"]
 dump(COMBINED/"conflict-results.json",conflict_results)
 revisions=load(LEGAL/"revision-comparison.json");assess=[]
 for x in revisions:
  status=x["status"];assess.append({"candidateId":x.get("candidateId"),"legacyFactIds":[x["factId"]],"revisionStatus":"CANDIDATE_NEWER" if status=="UPDATED_VALUE" else "STILL_CURRENT" if status=="STILL_CURRENT" else "COMPARISON_UNAVAILABLE" if status in {"NO_MATCH","SOURCE_UNVERIFIABLE"} else status,"changedFields":["value"] if status=="UPDATED_VALUE" else [],"evidence":[x.get("reason")],"recommendedLegacyAction":"REPLACE_LATER" if status=="UPDATED_VALUE" else "KEEP" if status=="STILL_CURRENT" else "REVIEW"});dump(COMBINED/"revision-assessments.json",assess)
 included=[x for x in all_results if x["validationStatus"] in {"VALIDATED","VALIDATED_WITH_WARNING"}];ids=sorted(x["candidateId"] for x in included);checksum="fnv1a-"+hashlib.sha256("|".join(ids).encode()).hexdigest()[:8]
 knowledge={"setId":"legal-knowledge-set:"+checksum,"sourceSnapshotId":"legal-source-registry-20260808","candidateIds":ids,"canonicalRules":[x["candidateId"] for x in included if x["duplicateStatus"]=="DISTINCT"],"duplicateReferences":{x["candidateId"]:x["canonicalCandidateId"] for x in all_results+preblocked if x.get("canonicalCandidateId") and x["candidateId"]!=x["canonicalCandidateId"]},"excludedCandidateIds":[x["candidateId"] for x in all_results if x not in included]+[x["candidateId"] for x in preblocked],"warningCandidateIds":[x["candidateId"] for x in included if x["validationStatus"]=="VALIDATED_WITH_WARNING"],"topicCoverage":dict(Counter(x["batchId"] for x in included)),"sourceCoverage":dict(Counter(x["sourceId"] for x in included)),"generatedAt":"2026-08-08T00:00:00+09:00","checksum":checksum};dump(COMBINED/"legal-knowledge-candidate-set.json",knowledge)
 coverage=topic_coverage(all_results+preblocked,candidates,conflicts,dupe_reports);dump(COMBINED/"topic-coverage.json",coverage)
 status_counts=Counter(x["validationStatus"] for x in all_results);preblocked_counts=Counter(x["validationStatus"] for x in preblocked);failure_counts=Counter(b for x in all_results+preblocked for b in x["blockers"]);after=guard();mutation=0 if before==after else 1
 summary={"inputCandidateCount":manifest["totalCandidateCount"],"executedCandidateCount":len(all_results),"preBlockedCandidateCount":len(blocked_ids),"preBlockedStatus":dict(preblocked_counts),"batchCount":len(batch_summaries),"batchSummaries":batch_summaries,"validationStatus":dict(status_counts),"blockerTypes":dict(failure_counts),"canonicalDuplicateGroupCount":len(dupe_reports),"conflictResultCount":len(conflict_results),"revisionAssessmentCount":len(assess),"legalKnowledgeSetCandidateCount":len(included),"topicCoverage":dict(Counter(x["status"] for x in coverage)),"tableLayerStatus":manifest["tableLayerStatus"],"beforeGuard":before,"afterGuard":after,"mutationCount":mutation};dump(COMBINED/"validation-summary.json",summary)
 # stratified review samples
 sample=[]
 for b in batches:
  rows=[x for x in all_results if x["batchId"]==b["batchId"]];cats={"VALIDATED_TOP":sorted([x for x in rows if x["validationStatus"]=="VALIDATED"],key=lambda x:-x["validationScore"])[:2],"VALIDATED_BOUNDARY":sorted([x for x in rows if x["validationStatus"]=="VALIDATED"],key=lambda x:x["validationScore"])[:2],"WARNING":[x for x in rows if x["warnings"]][:2],"CONFLICT":[x for x in rows if x["conflictStatus"]!="NO_CONFLICT"][:2],"DUPLICATE":[x for x in rows if x["duplicateStatus"]!="DISTINCT"][:2],"NUMERIC":[x for x in rows if x["numericScore"]<1 or "NUMERIC" in " ".join(x["passedRules"]+x["failedRules"])][:2],"EXCEPTION":[x for x in rows if "EXCEPTION" in " ".join(x["passedRules"]+x["failedRules"])][:2]}
  for category,items in cats.items():sample += [{"batchId":b["batchId"],"category":category,"candidateId":x["candidateId"],"status":x["validationStatus"],"score":x["validationScore"]} for x in items]
 dump(LEGAL/"validation-sample-manifest.json",sample)
 if mutation:raise RuntimeError("Pack/Fact/Graph mutation guard failed")
 print(json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":main()
