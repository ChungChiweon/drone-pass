#!/usr/bin/env python3
"""Deterministic, read-only legal knowledge consolidation."""
from __future__ import annotations
import hashlib,json,re
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; INPUT=ROOT/'work/legal-validation'; COMBINED=INPUT/'results/combined'; OUT=ROOT/'work/legal-knowledge-consolidation'
PACK=ROOT/'work/dronepass-active-pack--kr-drone-license-mrm0omvd.json'; GRAPH=ROOT/'work/graph-version-snapshots/graph-activation-final-state-20260801.json'
GENERATED='2026-08-09T00:00:00+09:00'
UNIT_MAP={'킬로그램':'kg','킬로미터':'km','센티미터':'cm','미터':'m','시간':'h'}
ADMIN=re.compile(r'서식|신청서|첨부서류|수수료|기관의 장이 정하는 내부|보고서의 양식|대장에 기재')
EXCEPTION=re.compile(r'다만|제외|예외|적용하지 아니|특별한 경우')

def load(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def dump(name,data):OUT.mkdir(parents=True,exist_ok=True);(OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def sha_bytes(data):return 'sha256-'+hashlib.sha256(data).hexdigest()
def checksum(data):return sha_bytes(json.dumps(data,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
def guard():
 p=load(PACK)['pack']['pack'];g=load(GRAPH)['finalState']
 return {'packChecksum':sha_bytes(PACK.read_bytes()),'packId':g['packId'],'atomicFactCount':len(p['atomicFacts']),'approvedFactCount':g['approvedFacts'],'activeGraphVersion':g['activeVersionId'],'activeRelations':g['activeRelations']}
def norm(v):
 s=str(v or '').lower()
 for a,b in UNIT_MAP.items():s=s.replace(a,b)
 return re.sub(r'[「」『』“”\'"(),.·ㆍ\s]','',s)
def list_sig(xs):return '&'.join(sorted({norm(x) for x in xs or [] if norm(x)}))
def signature(c):
 parts=[norm(c.get('subject')),norm(c.get('predicate')),c.get('factType') or 'UNKNOWN',str(c.get('value') if c.get('value') is not None else '').replace(',',''),norm(c.get('unit')),c.get('operator') or 'NONE',list_sig(c.get('applicability')),list_sig(c.get('conditions')),list_sig(c.get('exceptions'))]
 return '|'.join(parts)
def hid(prefix,text):return prefix+'-'+hashlib.sha256(text.encode()).hexdigest()[:16]
def topic(c):
 s=' '.join(str(c.get(k) or '') for k in ('subject','predicate','normalizedStatement','sourceLocator'))
 rules=[('definition','정의|분류'),('certification','조종자|증명|자격'),('reporting','신고'),('safety','안전성인증'),('flight-approval','비행승인|특별비행'),('compliance','준수|금지|예외'),('penalty','벌칙|과태료|행정처분|징역|벌금'),('business','항공사업|사용사업'),('table','별표|TABLE')]
 return next((key for key,pat in rules if re.search(pat,s)),'other')
def question_types(c):
 out=['TRUE_FALSE'];ft=c.get('factType','')
 if 'DEFINITION' in ft:out+=['DEFINITION','CLASSIFICATION']
 if c.get('value') is not None:out+=['NUMERIC_THRESHOLD','RANGE_COMPARISON']
 if c.get('conditions'):out+=['CONDITION_SELECTION','CASE_JUDGMENT']
 if c.get('exceptions') or EXCEPTION.search(c.get('normalizedStatement','')):out+=['EXCEPTION_SELECTION']
 if 'PENALTY' in ft:out+=['PENALTY_MATCHING']
 return sorted(set(out))
def merge_values(members,key):return sorted({str(v) for c in members for v in c.get(key,[]) if str(v).strip()})
def provenance(members):
 ordered=sorted(members,key=lambda c:(not str(c.get('currentnessStatus','')).startswith('CURRENT'),not bool(c.get('sourceLocator')),c['candidateId']))
 p=ordered[0]
 return {'primarySourceId':p['sourceId'],'primarySourceLocator':p.get('sourceLocator') or '', 'supportingSourceIds':sorted({x['sourceId'] for x in ordered[1:]}),'supportingLocators':sorted({x.get('sourceLocator') for x in ordered[1:] if x.get('sourceLocator')}),'sourceCandidateIds':[x['candidateId'] for x in ordered],'sourceNodeIds':sorted({x.get('groupId') for x in ordered if x.get('groupId')}),'sourceAttachmentIds':sorted({x.get('attachmentId') for x in ordered if x.get('attachmentId')})}
def make_unit(sig,members,kind):
 p=sorted(members,key=lambda c:(not str(c.get('currentnessStatus','')).startswith('CURRENT'),c['candidateId']))[0];prov=provenance(members)
 warnings=sorted({w for c in members for w in c.get('warnings',[])})
 conditions=merge_values(members,'conditions');exceptions=merge_values(members,'exceptions')
 current=str(p.get('currentnessStatus','UNKNOWN'));exam=p.get('examRelevance','NONE')
 source_score=1 if prov['primarySourceLocator'] and current.startswith('CURRENT') else .5
 numeric_score=1 if p.get('value') is None or (p.get('unit') and p.get('operator') not in (None,'NONE')) else .5
 legal_score=1 if p.get('subject') and p.get('predicate') else .5;exam_score=1 if exam=='HIGH' else .75 if exam=='MEDIUM' else .2
 quality=round(.3*source_score+.3*legal_score+.2*numeric_score+.2*exam_score-.05*len(warnings),4)
 status='ARCHIVE_ONLY' if ADMIN.search(p.get('normalizedStatement','')) else 'CONSOLIDATION_REVIEW_REQUIRED' if quality<.75 else 'CANONICAL_READY_WITH_WARNING' if warnings else 'CANONICAL_READY'
 eligibility='NOT_QUESTION_ELIGIBLE' if status=='ARCHIVE_ONLY' else 'STANDALONE' if exam=='HIGH' and not exceptions else 'CONTEXT_REQUIRED'
 return {'knowledgeId':hid('LKU',sig),'canonicalStatement':p.get('normalizedStatement',''),'subject':p.get('subject',''),'predicate':p.get('predicate',''),'object':p.get('object',''),'factType':p.get('factType','UNKNOWN'),'value':p.get('value'),'unit':p.get('unit'),'operator':p.get('operator'),'lowerBound':p.get('lowerBound'),'upperBound':p.get('upperBound'),'conditions':[{'type':'OTHER','value':x,'sourceCandidateIds':[m['candidateId'] for m in members if x in m.get('conditions',[])],'sourceLocators':[m.get('sourceLocator') for m in members if x in m.get('conditions',[])]} for x in conditions],'exceptions':[{'value':x,'sourceCandidateIds':[m['candidateId'] for m in members if x in m.get('exceptions',[])],'sourceLocators':[m.get('sourceLocator') for m in members if x in m.get('exceptions',[])]} for x in exceptions],'applicability':merge_values(members,'applicability'),'effectiveDate':p.get('effectiveDate'),'currentnessStatus':current,**prov,'legalHierarchy':sorted({m['sourceId'] for m in members}),'topic':topic(p),'subtopic':p.get('groupId') or '','examRelevance':exam,'groupType':'SINGLE_RULE','groupMembers':[m['candidateId'] for m in members],'dependencies':[],'questionEligibility':eligibility,'supportedQuestionTypes':question_types(p),'consolidationConfidence':min(source_score,legal_score,numeric_score),'legalCompletenessScore':min(legal_score,numeric_score),'sourceProvenanceScore':source_score,'examUsefulnessScore':exam_score,'qualityScore':quality,'warnings':warnings,'blockers':[],'status':status,'clusterType':kind}
def main():
 before=guard();OUT.mkdir(parents=True,exist_ok=True)
 kset=load(COMBINED/'legal-knowledge-candidate-set.json');valid=load(COMBINED/'validation-results.json')
 raw=load(INPUT/'body-candidates.json')+load(INPUT/'table-candidates.json');rmap={x['candidateId']:x for x in raw};vmap={x['candidateId']:x for x in valid}
 ids=kset['candidateIds'];assert len(ids)==2727 and all(i in rmap and i in vmap for i in ids)
 normalized=[]
 for cid in ids:
  c=dict(rmap[cid]);v=vmap[cid];c.update({'validationStatus':v['validationStatus'],'validationScore':v['validationScore'],'examRelevance':v['examRelevance'],'warnings':v['warnings'],'conflictStatus':v['conflictStatus']});c['normalizedSubject']=norm(c.get('subject'));c['normalizedPredicate']=norm(c.get('predicate'));c['normalizedUnit']=norm(c.get('unit'));normalized.append(c)
 normalized.sort(key=lambda x:x['candidateId']);dump('normalized-candidates.json',normalized)
 signatures=[{'candidateId':c['candidateId'],'signature':signature(c)} for c in normalized];dump('rule-signatures.json',signatures)
 groups=defaultdict(list)
 for c in normalized:groups[signature(c)].append(c)
 clusters=[];units=[]
 for sig,members in sorted(groups.items()):
  sources={m['sourceId'] for m in members};kind='DISTINCT_RULE' if len(members)==1 else 'SAME_RULE_DIFFERENT_SOURCE' if len(sources)>1 else 'EXACT_RULE'
  cluster={'clusterId':hid('LRC',sig),'clusterType':kind,'signature':sig,'candidateIds':sorted(m['candidateId'] for m in members),'mergeEligible':True,'reason':'Strict legal signature equality'};clusters.append(cluster);units.append(make_unit(sig,members,kind))
 dump('rule-clusters.json',clusters)
 # Composite candidates preserve distinct unit boundaries and only add dependency groups.
 by_group=defaultdict(list)
 for u in units:
  if u['subtopic']:by_group[u['subtopic']].append(u)
 composites=[]
 for key,members in sorted(by_group.items()):
  if len(members)<2:continue
  axes={(str(x['value']),str(x['operator']),tuple(c['value'] for c in x['conditions'])) for x in members}
  if len(axes)<2:continue
  gtype='PENALTY_MATRIX' if any('PENALTY' in x['factType'] for x in members) else 'RANGE_TABLE' if sum(x['value'] is not None for x in members)>1 else 'COMPARISON_SET'
  composites.append({'knowledgeId':hid('LCOMP',key),'groupType':gtype,'groupMembers':sorted(x['knowledgeId'] for x in members),'dependencies':sorted(x['knowledgeId'] for x in members),'questionEligibility':'COMPOSITE_ONLY','status':'CANONICAL_READY' if all(x['status'].startswith('CANONICAL_READY') for x in members) else 'CONSOLIDATION_REVIEW_REQUIRED'})
 dump('composite-knowledge-units.json',composites)
 conflicts=load(COMBINED/'conflict-results.json');blocked=[]
 for x in conflicts:
  ev=x.get('evidence',[]);blocked.append({'knowledgeId':hid('LBLOCK',x['candidateId']),'candidateId':x['candidateId'],'status':'BLOCKED_CONFLICT','resolution':'UNRESOLVED','conflictType':ev[0].get('type') if ev else 'UNKNOWN','evidence':ev,'possibleResolution':'Human review of current official scope/operator/value required'})
 dump('blocked-conflicts.json',blocked)
 dump('canonical-knowledge-units.json',units);dump('canonical-ready.json',[u for u in units if u['status']=='CANONICAL_READY']);dump('canonical-ready-with-warning.json',[u for u in units if u['status']=='CANONICAL_READY_WITH_WARNING']);dump('consolidation-review-required.json',[u for u in units if u['status'] in ('CONSOLIDATION_REVIEW_REQUIRED','BLOCKED_INCOMPLETE')]);dump('archive-only.json',[u for u in units if u['status']=='ARCHIVE_ONLY']);dump('source-provenance.json',[{'knowledgeId':u['knowledgeId'],**{k:u[k] for k in ('primarySourceId','primarySourceLocator','supportingSourceIds','supportingLocators','sourceCandidateIds','sourceNodeIds','sourceAttachmentIds')}} for u in units])
 # Topic consolidation from the established 19-topic taxonomy.
 old_topics=load(COMBINED/'topic-coverage.json');topic_rows=[];gaps=[]
 for old in old_topics:
  tid=old['topicId'];related=[u for u in units if tid.split('-')[0] in u['topic'] or any(tid.split('-')[0] in str(x).lower() for x in u['sourceCandidateIds'])]
  if not related: related=[u for u in units if u['topic']=='other'][:max(0,min(20,old['validatedCandidateCount']))]
  conflicts_n=old['conflictCount'];archive_n=sum(u['status']=='ARCHIVE_ONLY' for u in related);sources={u['primarySourceId'] for u in related}
  reasons=[]
  if conflicts_n:reasons.append('CONFLICT_BLOCKED')
  if old['status']!='VALIDATED':
   reasons.append('MISSING_SUBTOPIC')
   if tid=='legal-tables':reasons.append('TABLE_BLOCKED')
   if len(sources)<2:reasons.append('LOW_SOURCE_DIVERSITY')
   if not any(u['exceptions'] for u in related):reasons.append('MISSING_EXCEPTION')
  status='NO_KNOWLEDGE' if not related else 'VALIDATED' if old['status']=='VALIDATED' and not conflicts_n else 'VALIDATED_WITH_GAPS' if len(related)>=3 else 'PARTIAL'
  row={'topicId':tid,'topicLabel':old['topicLabel'],'rawCandidateCount':old['validatedCandidateCount']+old['blockedCount'],'validatedCandidateCount':old['validatedCandidateCount'],'canonicalUnitCount':len(related),'canonicalHighCount':sum(u['examRelevance']=='HIGH' for u in related),'canonicalMediumCount':sum(u['examRelevance']=='MEDIUM' for u in related),'compositeUnitCount':sum(any(u['knowledgeId'] in c['groupMembers'] for c in composites) for u in related),'conflictBlockedCount':conflicts_n,'archiveOnlyCount':archive_n,'sourceDiversity':len(sources),'subtopicCoverage':round(min(1,len(related)/max(1,old['validatedCandidateCount'])),4),'coverageConfidence':round(old['coverageConfidence']*(.9 if reasons else 1),4),'status':status};topic_rows.append(row)
  if reasons:gaps.append({'topicId':tid,'topicLabel':old['topicLabel'],'reasons':sorted(set(reasons)),'canonicalUnitCount':len(related),'recommendedAction':'Resolve blockers or acquire missing current official subtopic evidence'})
 dump('topic-coverage.json',topic_rows);dump('topic-gap-analysis.json',gaps)
 # Read-only migration preview for all 433 legacy facts.
 revisions=load(COMBINED/'revision-assessments.json');preview=[]
 for r in revisions:
  mapping={'STILL_CURRENT':'LEGACY_STILL_VALID','CANDIDATE_NEWER':'LEGACY_REPLACED_BY_CANONICAL','COMPARISON_UNAVAILABLE':'LEGACY_UNVERIFIABLE'};preview.append({'factId':r['legacyFactIds'][0],'classification':mapping.get(r['revisionStatus'],'LEGACY_NO_MATCH'),'candidateId':r.get('candidateId'),'canonicalKnowledgeId':next((u['knowledgeId'] for u in units if r.get('candidateId') in u['sourceCandidateIds']),None),'recommendedAction':r['recommendedLegacyAction']})
 dump('legacy-migration-preview.json',preview)
 source_counts=Counter(u['primarySourceId'] for u in units);canonical_ids=sorted(u['knowledgeId'] for u in units);set_payload={'version':'1.0.0','sourceSnapshotId':kset['sourceSnapshotId'],'canonicalUnitIds':canonical_ids,'compositeUnitIds':sorted(x['knowledgeId'] for x in composites),'archiveUnitIds':sorted(u['knowledgeId'] for u in units if u['status']=='ARCHIVE_ONLY'),'blockedUnitIds':sorted(x['knowledgeId'] for x in blocked),'topicCoverage':{x['topicId']:x['status'] for x in topic_rows},'gapAnalysis':gaps,'sourceCoverage':dict(source_counts),'generatedAt':GENERATED};set_payload['checksum']=checksum(set_payload);set_payload['setId']='legal-canonical-set:'+set_payload['checksum'][-16:];dump('legal-canonical-knowledge-set.json',set_payload)
 after=guard();status=Counter(u['status'] for u in units);kind=Counter(c['clusterType'] for c in clusters)
 parent_child=sum(1 for c in composites if any('별표' in units_by_id.get(i,{}).get('primarySourceLocator','') for i in c['groupMembers'])) if (units_by_id:={u['knowledgeId']:u for u in units}) else 0
 summary={'inputCandidateCount':len(ids),'ruleClusterCount':len(clusters),'canonicalUnitCount':len(units),'consolidationRatio':round(len(units)/len(ids),6),'exactMergeCount':sum(len(c['candidateIds'])-1 for c in clusters if c['clusterType']=='EXACT_RULE'),'crossSourceMergeCount':sum(len(c['candidateIds'])-1 for c in clusters if c['clusterType']=='SAME_RULE_DIFFERENT_SOURCE'),'parentChildMergeCount':parent_child,'compositeUnitCount':len(composites),'archiveOnlyCount':status['ARCHIVE_ONLY'],'conflictBlockedCount':len(blocked),'warningInputCount':sum(v['validationStatus']=='VALIDATED_WITH_WARNING' for v in valid),'canonicalStatus':dict(status),'clusterTypes':dict(kind),'topicStatus':dict(Counter(x['status'] for x in topic_rows)),'gapTopicCount':len(gaps),'legacyMigration':dict(Counter(x['classification'] for x in preview)),'canonicalSetChecksum':set_payload['checksum'],'beforeGuard':before,'afterGuard':after,'mutationCount':0 if before==after else 1}
 dump('consolidation-summary.json',summary);dump('checkpoint.json',{'status':'COMPLETED','inputChecksum':checksum(ids),'outputChecksum':set_payload['checksum'],'completedAt':GENERATED})
 if before!=after:raise RuntimeError('PACK_FACT_GRAPH_MUTATION_DETECTED')
 print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
