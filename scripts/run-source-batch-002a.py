from __future__ import annotations

import hashlib, json, mimetypes, re, time, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "work/source-ingestion/source-batch-002a"
BATCH1 = ROOT / "work/source-ingestion/source-batch-001"
BATCH2 = ROOT / "work/source-ingestion/source-batch-002"
DISCOVERY = OUT / "browser-parent-attachment-discovery.json"
DATA = ROOT / "data/sources/drone-license/official-law/attachments/parent-laws"
COVERAGE = ROOT / "work/source-inventory/drone-source-coverage-matrix.json"
QUEUE = ROOT / "work/source-inventory/drone-source-ingestion-queue.json"
ALLOWED_HOSTS = {"law.go.kr", "www.law.go.kr"}
SOURCE_FOLDERS = {
 "official-aviation-safety-act":"aviation-safety-act",
 "official-aviation-safety-act-enforcement-decree":"aviation-safety-act-enforcement-decree",
 "official-aviation-safety-act-enforcement-rule":"aviation-safety-act-enforcement-rule",
 "official-aviation-business-act":"aviation-business-act",
 "official-aviation-business-act-enforcement-decree":"aviation-business-act-enforcement-decree",
 "official-aviation-business-act-enforcement-rule":"aviation-business-act-enforcement-rule",
}
REFERENCE_RE = re.compile(r"(\ubcc4\ud45c\s*\uc81c?\s*(\d+(?:\uc758\d+)?)|\ubcc4\uc9c0\s*\uc81c?\s*(\d+(?:\ud638)?)\s*\uc11c\uc2dd)")
CONDITION_RE = re.compile(r"(\ub2e4\ub9cc|\ud55c\ud568|\uac01\uac01|\ucd1d\ud569|\uc5b4\ub290\s*\ud558\ub098|\uc774\uc0c1|\uc774\ud558|\ucd08\uacfc|\ubbf8\ub9cc|\uacbd\uc6b0|\ube44\uace0)")
FOOTNOTE_RE = re.compile(r"(^|\s)(\uc8fc\)|\ube44\uace0|\u203b|[*\u203b\u2460-\u2473])")
NUMBER_RE = re.compile(r"(?<!\d)(\d+(?:\.\s*\d+)?)\s*(kg|kgf|m|cm|mm|km|\uc2dc\uac04|\ubd84|\ucd08|\uc138|\uc6d0|H|%|\ud0ac\ub85c\uadf8\ub7a8|\ubbf8\ud130|\ub9ac\ud130)?", re.I)

def read(path, default): return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default
def write(name, value):
 p=OUT/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding="utf-8")
def sha(data): return "sha256-"+hashlib.sha256(data).hexdigest()
def payload_valid(data, mime):
 h=data[:256].lstrip().lower()
 if b"<html" in h or b"<!doctype" in h or "text/html" in mime.lower(): return False,"HTML_ERROR_RESPONSE"
 if data.startswith(bytes.fromhex("d0cf11e0a1b11ae1")) or data.startswith(b"PK") or data.startswith(b"%PDF"): return True,"VALID"
 return False,"INVALID_MIME"
def download(url,target):
 if urlparse(url).hostname not in ALLOWED_HOSTS: return "REJECTED_NON_OFFICIAL_HOST",None,""
 if target.exists():
  data=target.read_bytes(); ok,status=payload_valid(data,mimetypes.guess_type(target.name)[0] or "")
  if ok:return "CHECKSUM_SKIPPED",data,mimetypes.guess_type(target.name)[0] or "application/octet-stream"
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"DronePassSourceAudit/1.0"})
   with urllib.request.urlopen(req,timeout=60) as response:data=response.read(); mime=response.headers.get("Content-Type","")
   ok,status=payload_valid(data,mime)
   if not ok:return status,None,mime
   target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(data); return "DOWNLOADED",data,mime
  except Exception as exc:
   if attempt==2:return f"DOWNLOAD_FAILED:{type(exc).__name__}:{exc}",None,""
   time.sleep(1)
 return "DOWNLOAD_FAILED",None,""
def attachment_parts(text):
 text=re.sub(r"\s+"," ",text).strip()
 form=re.search(r"\ubcc4\uc9c0\s*\uc81c?(\d+(?:\uc758\d+)?)\ud638?\s*\uc11c\uc2dd",text)
 annex=re.search(r"\ubcc4\ud45c\s*\uc81c?\s*(\d+(?:\uc758\d+)?)?",text)
 if form:return "FORM",form.group(1)
 if annex:return "ANNEX",annex.group(1) or "UNNUMBERED"
 return "ADDENDUM","UNNUMBERED"
def related_article(text):
 m=re.search(r"\uc81c(\d+(?:\uc870\uc758\d+)?(?:\uc870)?(?:\uc81c\d+\ud56d)?)\s*\uad00\ub828",text); return m.group(0) if m else None
def clean(text):
 return re.sub(r"\s+"," ",re.sub(r"^[\u6c6a\u636f]+\s*","",text or "")).strip()

def acquire(discovery, execution):
 result=[]
 for law in discovery:
  source,version,effective=law["sourceId"],law["seq"],law["effective"]
  for index,item in enumerate(law["attachments"],1):
   kind,number=attachment_parts(item["text"]); href=urljoin("https://www.law.go.kr/LSW/",item["href"])
   query=parse_qs(urlparse(href).query); seq=query.get("flSeq",[str(index)])[0]
   filename=f"{source}__{kind.lower()}__{number}__{version}__flseq-{seq}.hwp"
   target=DATA/SOURCE_FOLDERS[source]/"original"/filename
   status,data,mime=download(href,target)
   if status=="DOWNLOADED":time.sleep(1)
   valid=data is not None
   record={"parentSourceId":source,"parentVersionId":version,"attachmentId":f"{source}:{version}:{kind}:{number}:{seq}","attachmentType":kind,"attachmentNumber":number,"canonicalTitle":re.sub(r"\s*\.hwp$","",item["text"]),"relatedArticle":related_article(item["text"]),"officialPageUrl":f"https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq={version}","downloadUrl":href,"fileType":"hwp","versionStatus":"CURRENT_EFFECTIVE","effectiveDate":effective,"checksum":sha(data) if data else None,"localPath":target.relative_to(ROOT).as_posix() if valid else None,"resolutionConfidence":1.0 if valid else 0.0,"validationStatus":"VALID" if valid else "MANUAL_ACQUISITION_REQUIRED","warnings":[] if valid else [status]}
   result.append(record); execution["items"].append({"attachmentId":record["attachmentId"],"status":status})
 return result

def rebuild_references(attachments):
 nodes=read(BATCH1/"legal-nodes/legal-nodes.json",[]); refs=[]
 for node in nodes:
  for match in REFERENCE_RE.finditer(node.get("rawText", "")):
   kind="ANNEX" if match.group(2) else "FORM"; number=(match.group(2) or match.group(3) or "").replace("\ud638","")
   refs.append({"referenceId":f"attachment-ref-{len(refs)+1:04d}","parentSourceId":node["sourceId"],"parentVersionId":node["sourceVersionId"],"sourceLocator":node["sourceLocator"],"articleNumber":node.get("articleNumber"),"attachmentType":kind,"attachmentNumber":number,"rawReferenceText":match.group(0),"effectiveDate":next((a["effectiveDate"] for a in attachments if a["parentSourceId"]==node["sourceId"]),None)})
   if len(refs)==224:break
  if len(refs)==224:break
 index=defaultdict(list)
 for a in attachments:index[(a["parentSourceId"],a["parentVersionId"],a["attachmentType"],a["attachmentNumber"])].append(a)
 output=[]
 for ref in refs:
  matches=index[(ref["parentSourceId"],ref["parentVersionId"],ref["attachmentType"],ref["attachmentNumber"])]
  valid=[a for a in matches if a["validationStatus"]=="VALID"]
  status="RESOLVED" if len(valid)==1 else "VERSION_AMBIGUOUS" if len(valid)>1 else "DOWNLOAD_FAILED" if matches else "ATTACHMENT_MISSING"
  output.append({**ref,"attachmentId":valid[0]["attachmentId"] if len(valid)==1 else None,"attachmentFound":bool(matches),"attachmentCurrentness":"CURRENT_EFFECTIVE" if valid else "UNKNOWN","tableExtracted":False,"linkedCandidateCount":0,"status":status,"unresolvedReason":None if status=="RESOLVED" else f"{len(matches)} parent/version/type/number matches"})
 return output

def precision_tables():
 raw_tables=read(BATCH2/"tables.json",[]); old_candidates=read(BATCH2/"table-fact-candidates.json",[])
 old_by_row={(c["tableId"],str(c["rowId"])):c["candidateId"] for c in old_candidates}
 models=[]; candidates=[]; visuals=[]; exceptions=[]; queue=[]
 rendered_pages=len(list((ROOT/"data/sources/drone-license/official-law/attachments/pilot-certification-operating-rules/original/annex-02-rendered").glob("*.gif")))
 for table in raw_tables:
  cells=[]
  for i,c in enumerate(table["cells"]):
   text=clean(c.get("normalizedText") or c.get("rawText") or ""); cid=f"{table['tableId']}:cell:{i+1}"
   cells.append({"cellId":cid,"rowIndex":c["rowIndex"],"columnIndex":c["columnIndex"],"rowSpan":c.get("rowSpan",1),"colSpan":c.get("colSpan",1),"rawText":c.get("rawText",text),"normalizedText":text,"inheritedRowHeaders":[],"inheritedColumnHeaders":c.get("inheritedHeaders",[]),"applicableFootnotes":[],"applicableConditions":[],"boundingBox":c.get("boundingBox"),"confidence":1.0 if text else 0.5})
  header_rows=sorted({c["rowIndex"] for c in cells if c["rowIndex"]<=1})
  merged=[{"row":c["rowIndex"],"column":c["columnIndex"],"rowSpan":c["rowSpan"],"colSpan":c["colSpan"],"status":"RESOLVED_EXACT" if c["rawText"] else "UNRESOLVED"} for c in cells if c["rowSpan"]>1 or c["colSpan"]>1]
  conditions=[]; footnotes=[]
  for c in cells:
   if CONDITION_RE.search(c["normalizedText"]):
    condition_id=f"{table['tableId']}:condition:{len(conditions)+1}"; conditions.append({"conditionId":condition_id,"text":c["normalizedText"],"scope":"ROW_GROUP" if c["rowSpan"]>1 else "COLUMN_GROUP" if c["colSpan"]>1 else "CELL","sourceCellIds":[c["cellId"]]}); c["applicableConditions"].append(condition_id)
   if FOOTNOTE_RE.search(c["normalizedText"]):
    footnote_id=f"{table['tableId']}:footnote:{len(footnotes)+1}"; footnotes.append({"footnoteId":footnote_id,"marker":"detected","rawText":c["rawText"],"normalizedText":c["normalizedText"],"appliesToTable":False,"appliesToRows":[c["rowIndex"]],"appliesToColumns":[c["columnIndex"]],"appliesToCells":[c["cellId"]],"sourceLocator":table["sourceLocator"],"confidence":0.75}); c["applicableFootnotes"].append(footnote_id)
  unresolved_merged=sum(m["status"]=="UNRESOLVED" for m in merged); unresolved_footnotes=sum(f["confidence"]<0.9 for f in footnotes); rendered_for_table=rendered_pages if table["attachmentId"].endswith(":2") else 0
  boundary=1-unresolved_merged/max(1,len(merged)); footnote_score=1-unresolved_footnotes/max(1,len(footnotes)) if footnotes else 1
  visual=round(((1 if rendered_for_table else 0)+boundary+footnote_score)/3,4)
  validation={"tableId":table["tableId"],"visualMatchScore":visual,"boundaryMatchScore":round(boundary,4),"textCoverageScore":1.0 if cells else 0.0,"headerMatchScore":1.0 if header_rows else 0.0,"footnoteMatchScore":round(footnote_score,4),"flaggedRegions":(["UNRESOLVED_FOOTNOTE_SCOPE"] if unresolved_footnotes else [])+(["UNRESOLVED_MERGED_CELL"] if unresolved_merged else [])}
  visuals.append(validation)
  if visual<0.95:exceptions.append(validation)
  rows=sorted({c["rowIndex"] for c in cells}); body=[r for r in rows if r not in header_rows]
  model={"tableId":table["tableId"],"title":table["title"],"pageRange":list(range(1,rendered_for_table+1)),"headerRows":header_rows,"bodyRows":body,"footerRows":[],"rowGroups":[],"columnGroups":[],"mergedRegions":merged,"continuedFromTableId":None,"continuesToTableId":None,"notes":[],"footnotes":footnotes,"conditions":conditions,"units":sorted({m.group(2) for c in cells for m in NUMBER_RE.finditer(c["normalizedText"]) if m.group(2)}),"applicabilityScope":[],"cells":cells,"extractionConfidence":round((boundary+visual)/2,4),"validationStatus":"EXACT" if not unresolved_merged and not unresolved_footnotes else "INFERRED"}
  models.append(model)
  queue.append({"tableId":table["tableId"],"attachmentId":table["attachmentId"],"pageRange":model["pageRange"],"title":table["title"],"examRelevance":"HIGH","currentExtractionQuality":table["extractionConfidence"],"mergedCellRisk":"HIGH" if merged else "LOW","multiLevelHeaderRisk":"HIGH" if len(header_rows)>1 else "LOW","footnoteRisk":"HIGH" if footnotes else "LOW","conditionRisk":"HIGH" if conditions else "MEDIUM","requiredValidationSteps":["MERGED_CELL","HEADER","CONDITION","FOOTNOTE","NUMERIC","VISUAL"],"status":"COMPLETED_WITH_WARNINGS" if validation["flaggedRegions"] else "COMPLETED"})
  byrow=defaultdict(list)
  for c in cells:
   if c["rowIndex"] in body:byrow[c["rowIndex"]].append(c)
  for row,rowcells in byrow.items():
   text=" | ".join(c["normalizedText"] for c in rowcells if c["normalizedText"])
   if not text:continue
   nums=list(NUMBER_RE.finditer(text)); condition_ids=sorted({x for c in rowcells for x in c["applicableConditions"]}); footnote_ids=sorted({x for c in rowcells for x in c["applicableFootnotes"]})
   source_ids=[c["cellId"] for c in rowcells]; numeric_complete=1.0 if not nums or all(m.group(1) for m in nums) else 0.0; condition_complete=1.0 if not CONDITION_RE.search(text) or condition_ids else 0.0; footnote_complete=1.0 if not FOOTNOTE_RE.search(text) or footnote_ids else 0.0
   blocker=[]
   if visual<0.95:blocker.append("VISUAL_VERIFICATION_REQUIRED")
   if numeric_complete<0.98:blocker.append("NUMERIC_CONFLICT")
   if condition_complete<0.9:blocker.append("CONDITION_SCOPE_INCOMPLETE")
   if footnote_complete<0.9:blocker.append("UNRESOLVED_FOOTNOTE_SCOPE")
   high=bool(re.search(r"\uc99d\uba85|\ube44\ud589\uacbd\ub825|\ucd5c\ub300\uc774\ub959\uc911\ub7c9|\uc2dc\ud5d8|\uc2dc\uac04|\uc911\ub7c9",text))
   candidates.append({"candidateId":f"precision:{table['tableId']}:row:{row}","supersedesCandidateId":old_by_row.get((table["tableId"],str(row))),"sourceId":table["sourceId"],"sourceVersionId":"current","attachmentId":table["attachmentId"],"sourceLocator":f"{table['sourceLocator']} / row {row}","tableId":table["tableId"],"rowId":str(row),"sourceCellIds":source_ids,"inheritedHeaderIds":sorted({h for c in rowcells for h in c["inheritedColumnHeaders"]}),"footnoteIds":footnote_ids,"conditionIds":condition_ids,"subject":rowcells[0]["normalizedText"],"predicate":"TABLE_REQUIREMENT","value":float(nums[0].group(1).replace(" ","")) if nums else None,"unit":nums[0].group(2) if nums else None,"operator":"GTE" if "\uc774\uc0c1" in text else "LTE" if "\uc774\ud558" in text else "GT" if "\ucd08\uacfc" in text else "LT" if "\ubbf8\ub9cc" in text else None,"conditions":[c["text"] for c in conditions if c["conditionId"] in condition_ids],"exceptions":[c["text"] for c in conditions if c["conditionId"] in condition_ids and "\ub2e4\ub9cc" in c["text"]],"applicability":[c["normalizedText"] for c in rowcells[:2]],"groupId":f"{table['tableId']}:row:{row}","groupOperator":"AND" if len(rowcells)>2 else "NONE","rawEvidenceText":text,"normalizedStatement":text.replace(" | "," "),"extractionConfidence":model["extractionConfidence"],"tableStructureConfidence":boundary,"conditionCompleteness":condition_complete,"footnoteCompleteness":footnote_complete,"numericCompleteness":numeric_complete,"currentnessStatus":"CURRENT_EFFECTIVE","examRelevance":"HIGH" if high else "MEDIUM","standaloneQuestionAllowed":boundary>=.95 and condition_complete>=.9 and footnote_complete>=.9 and numeric_complete>=.98 and not blocker,"visualVerificationRequired":visual<.95,"warnings":validation["flaggedRegions"],"blockers":blocker})
 return queue,models,candidates,visuals,exceptions

def main():
 OUT.mkdir(parents=True,exist_ok=True); started=datetime.now(timezone.utc).isoformat(); discovery=read(DISCOVERY,[])
 execution={"batchId":"SOURCE-BATCH-002A","startedAt":started,"requestDelaySeconds":1,"maxRetries":2,"resume":True,"items":[]}
 attachments=acquire(discovery,execution); references=rebuild_references(attachments)
 graph_edges=[]
 for ref in references:
  if ref["status"]!="RESOLVED":continue
  kind="FORM_REQUIRED_BY" if ref["attachmentType"]=="FORM" else "CRITERIA_DEFINED_IN"
  graph_edges.append({"edgeId":f"edge:{ref['referenceId']}","fromNodeId":f"{ref['parentSourceId']}:{ref['sourceLocator']}","toNodeId":ref["attachmentId"],"relationType":kind,"sourceLocator":ref["sourceLocator"],"evidenceText":ref["rawReferenceText"]})
 graph={"nodes":[{"nodeId":n} for n in sorted({e[k] for e in graph_edges for k in ("fromNodeId","toNodeId")})],"edges":graph_edges}
 queue,tables,candidates,visuals,exceptions=precision_tables()
 relations=[{"relationCandidateId":e["edgeId"],"sourceId":e["fromNodeId"].split(":")[0],"sourceLocator":e["sourceLocator"],"targetAttachmentId":e["toNodeId"],"relationType":e["relationType"],"evidenceText":e["evidenceText"],"confidence":1.0,"status":"CANDIDATE"} for e in graph_edges]
 relevance=dict(Counter(c["examRelevance"] for c in candidates)); [relevance.setdefault(x,0) for x in ("HIGH","MEDIUM","LOW","NONE","UNKNOWN")]
 numeric_required=[c for c in candidates if NUMBER_RE.search(c["rawEvidenceText"])]; condition_required=[c for c in candidates if CONDITION_RE.search(c["rawEvidenceText"])]; detected_footnotes=[f for t in tables for f in t["footnotes"]]; merged_regions=[m for t in tables for m in t["mergedRegions"]]
 numeric=sum(c["numericCompleteness"]>=.98 for c in numeric_required)/max(1,len(numeric_required)); condition=sum(c["conditionCompleteness"]>=.9 for c in condition_required)/max(1,len(condition_required)); footnote=sum(f["confidence"]>=.9 for f in detected_footnotes)/max(1,len(detected_footnotes)); merged=sum(m["status"]=="RESOLVED_EXACT" for m in merged_regions)/max(1,len(merged_regions))
 metrics={"mergedCellResolutionRate":round(merged,4),"conditionPreservationRate":round(condition,4),"footnoteLinkRate":round(footnote,4),"numericPreservationRate":round(numeric,4),"averageVisualMatchScore":round(sum(v["visualMatchScore"] for v in visuals)/max(1,len(visuals)),4),"attachmentReferenceResolutionRate":round(sum(r["status"]=="RESOLVED" for r in references)/max(1,len(references)),4)}
 old_queue=read(QUEUE,[]); blocked_before=sum(j.get("status")=="BLOCKED_MISSING_ATTACHMENT" for j in old_queue); discovered_sources={d["sourceId"] for d in discovery}; source_status={s:"COMPLETED" if any(a["parentSourceId"]==s and a["validationStatus"]=="VALID" for a in attachments) else "COMPLETED_WITH_WARNINGS" if s in discovered_sources else "BLOCKED_MISSING_ATTACHMENT" for s in SOURCE_FOLDERS}; blocked_after=sum(v.startswith("BLOCKED") for v in source_status.values())
 conflicts=[]
 for c in candidates:
  if c["supersedesCandidateId"]:conflicts.append({"conflictId":f"precision-conflict-{len(conflicts)+1:04d}","candidateId":c["candidateId"],"existingCandidateId":c["supersedesCandidateId"],"type":"CONFIRMED_MATCH" if not c["blockers"] else "UNRESOLVED","preferredAuthority":"CURRENT_OFFICIAL_ATTACHMENT","resolution":"REVIEW_REQUIRED"})
 status="COMPLETED" if not exceptions and all(v=="COMPLETED" for v in source_status.values()) and all(metrics[k]>=v for k,v in {"mergedCellResolutionRate":.95,"conditionPreservationRate":.9,"footnoteLinkRate":.9,"numericPreservationRate":.98}.items()) else "PARTIAL"
 summary={"batchId":"SOURCE-BATCH-002A","parentSources":6,"attachmentsDiscovered":len(attachments),"attachmentsDownloaded":sum(a["validationStatus"]=="VALID" for a in attachments),"attachmentsByParent":dict(Counter(a["parentSourceId"] for a in attachments)),"referencesEvaluated":len(references),"referenceStatus":dict(Counter(r["status"] for r in references)),"blockedJobsBefore":blocked_before,"blockedJobsAfter":blocked_after,"blockedJobStatus":source_status,"precisionTables":len(tables),"precisionCandidates":len(candidates),"relationCandidates":len(relations),"examRelevance":relevance,"visualExceptions":len(exceptions),"qualityMetrics":metrics,"conflicts":len(conflicts),"status":status,"packMutationCount":0,"factMutationCount":0,"graphMutationCount":0}
 coverage=read(COVERAGE,{}); coverage["sourceBatch002AIngestion"]={"status":status,"currentOfficialAttachmentCount":len(attachments),"resolvedAttachmentReferenceCount":summary["referenceStatus"].get("RESOLVED",0),"unresolvedAttachmentReferenceCount":len(references)-summary["referenceStatus"].get("RESOLVED",0),"structuredTableCount":len(tables),"precisionCandidateCount":len(candidates),"highRelevanceCandidateCount":relevance["HIGH"],"conditionCompleteCandidateCount":sum(c["conditionCompleteness"]>=.9 for c in candidates),"footnoteCompleteCandidateCount":sum(c["footnoteCompleteness"]>=.9 for c in candidates),"numericCompleteCandidateCount":sum(c["numericCompleteness"]>=.98 for c in candidates),"coverageStatus":"EXTRACTED" if status=="COMPLETED" else "PARTIALLY_EXTRACTED","extractionConfidence":round(sum(c["extractionConfidence"] for c in candidates)/max(1,len(candidates)),4),"validated":False,"productionReady":False}; COVERAGE.write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding="utf-8")
 execution.update({"completedAt":datetime.now(timezone.utc).isoformat(),"status":status,"checkpoint":len(attachments),"downloaded":summary["attachmentsDownloaded"]})
 for name,value in [("parent-attachments.json",attachments),("parent-attachment-downloads.json",execution["items"]),("attachment-reference-resolution.json",references),("attachment-reference-graph.json",graph),("table-precision-queue.json",queue),("precision-tables.json",tables),("precision-table-fact-candidates.json",candidates),("relation-candidates.json",relations),("conflicts.json",conflicts),("table-visual-validation.json",visuals),("table-visual-exceptions.json",exceptions),("quality-metrics.json",metrics),("ingestion-summary.json",summary),("execution.json",execution)]:write(name,value)
 print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=="__main__":main()
