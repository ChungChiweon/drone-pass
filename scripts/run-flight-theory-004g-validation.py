from __future__ import annotations
import json,re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'work/flight-theory-validation/004g';OUT=BASE/'results';OUT.mkdir(parents=True,exist_ok=True)
def load(name):return json.loads((BASE/name).read_text(encoding='utf-8'))
def dump(name,value):(OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
groups=[('FAILURE_MODE',load('failure-modes.json')),('FAILURE_SYMPTOM',load('failure-symptoms.json')),('EMERGENCY_PROCEDURE',load('emergency-procedures.json')),('EMERGENCY_DECISION',load('emergency-decisions.json')),('SAFETY_KNOWLEDGE',load('safety-knowledge.json')),('FLIGHT_CONCEPT',load('concepts.json')),('RELATIONSHIP',load('relationships.json'))]
def kid(x):return x.get('failureId') or x.get('symptomId') or x.get('procedureId') or x.get('decisionId') or x.get('safetyId') or x.get('conceptId') or x.get('relationId')
def refs(x):return x.get('sourceReferences') or ([x['sourceReference']] if x.get('sourceReference') else [x['sourceLocator']] if x.get('sourceLocator') else [])
def evidence(x):return x.get('rawEvidenceText') or x.get('evidence') or ''
def primary(x):return bool(evidence(x).strip()) and any(r.get('sourceId')=='faa-ac-107-2a' and r.get('page') and r.get('section') for r in refs(x))
types={kid(x):kind for kind,items in groups if kind!='RELATIONSHIP' for x in items}
allowed={'TRIGGERS':{'EMERGENCY_DECISION'},'DETECTED_BY':{'FAILURE_SYMPTOM'},'CAUSES':{'FAILURE_MODE'},'RESULTS_IN':{'FAILURE_MODE','FAILURE_SYMPTOM'},'REQUIRES':{'EMERGENCY_PROCEDURE','EMERGENCY_DECISION'},'PREVENTED_BY':{'SAFETY_KNOWLEDGE'},'AFFECTS':{'FAILURE_MODE','SAFETY_KNOWLEDGE'},'PART_OF':{'FAILURE_MODE','EMERGENCY_PROCEDURE'},'PRECEDES':{'EMERGENCY_PROCEDURE'},'FOLLOWED_BY':{'EMERGENCY_PROCEDURE'},'CONTRASTS_WITH':{'FAILURE_MODE','EMERGENCY_DECISION'}}
results=[]
for kind,items in groups:
 for x in items:
  identifier=kid(x);source=primary(x);warnings=list(x.get('warnings',[]));blockers=[];boundary=True;structure=True;reason='Directly supported by current primary source.';status=None;duplicate_of=None
  if not source:blockers.append('PRIMARY_SOURCE_OR_LOCATOR_MISSING')
  if kind=='FAILURE_MODE':structure=bool(x.get('name') and (x.get('failureType') or x.get('affectedSystem') or x.get('affectedComponent')));reason='Failure or abnormal state is separate from observations and actions.'
  elif kind=='FAILURE_SYMPTOM':structure=bool(x.get('failureId') and x.get('observedCondition'));boundary='response' not in x and 'cause' not in x;reason='Observable indication only.'
  elif kind=='EMERGENCY_PROCEDURE':
   structure=bool(x.get('steps') and x.get('entryCondition'));boundary=not x.get('ordered') or bool(x.get('orderingEvidence'))
   if not boundary:blockers.append('ORDERING_EVIDENCE_MISSING')
   reason='Actions remain unordered because the source gives no explicit sequence.'
   if identifier=='flight-emergency:general-response':status='DUPLICATE';duplicate_of='flight-emergency-safety:minimize-injury-damage';reason='The single general action duplicates SafetyKnowledge and is not a distinct procedure.'
  elif kind=='EMERGENCY_DECISION':structure=bool(x.get('trigger') and x.get('observedCondition') and x.get('allowedResponse'));reason='Concrete trigger supports stop or inspection decision.'
  elif kind=='SAFETY_KNOWLEDGE':structure=bool(x.get('hazard') and (x.get('preventiveAction') or x.get('emergencyAction')));reason='General safety principle is source-supported.'
  elif kind=='FLIGHT_CONCEPT':structure=bool(x.get('name') and x.get('definition'));reason='Concept describes capability or emergency state without adding a response procedure.'
  elif kind=='RELATIONSHIP':
   endpoints=x.get('sourceKnowledgeId') in types and x.get('targetKnowledgeId') in types and x.get('sourceKnowledgeId')!=x.get('targetKnowledgeId');structure=bool(endpoints);boundary=types.get(x.get('targetKnowledgeId')) in allowed.get(x.get('relationType'),set())
   if not endpoints:blockers.append('RELATIONSHIP_ENDPOINT_INVALID')
   if not boundary:blockers.append('RELATIONSHIP_DIRECTION_OR_TARGET_TYPE_INVALID')
   reason='Direction and endpoint types are supported.' if boundary else 'Co-mention does not support the selected relation target type or direction.'
  if not structure:blockers.append(f'{kind}_STRUCTURE_INVALID')
  if kind=='FAILURE_SYMPTOM' and not boundary:blockers.append('SYMPTOM_CONTAINS_CAUSE_OR_RESPONSE')
  if not source:blockers.append('PRIMARY_SOURCE_REQUIRED')
  if status is None:status='BLOCKED' if blockers else 'VALIDATED_WITH_WARNING' if warnings else 'VALIDATED'
  results.append({'knowledgeId':identifier,'knowledgeType':kind,'status':status,'sourceValid':source,'structureValid':structure,'boundaryValid':bool(boundary),'warnings':warnings,'blockers':sorted(set(blockers)),'duplicateOf':duplicate_of,'canonicalCandidate':status in ('VALIDATED','VALIDATED_WITH_WARNING'),'conditionalCandidate':status=='VALIDATED_WITH_WARNING','unsupportedInferenceCount':0,'reason':reason})

forbidden=[r'\b\d+(?:\.\d+)?\s*%',r'RTH altitude',r'automatic RTH',r'GPS satellite count',r'motor-out procedure',r'fire suppression']
unsupported=[]
for kind,items in groups:
 for x in items:
  claim=' '.join(str(v) for k,v in x.items() if k not in ('rawEvidenceText','evidence','sourceReferences','sourceReference','sourceLocator') and isinstance(v,(str,int,float)))
  matches=[p for p in forbidden if re.search(p,claim,re.I)]
  if matches:unsupported.append({'knowledgeId':kid(x),'patterns':matches})
if unsupported:
 for row in results:
  if any(x['knowledgeId']==row['knowledgeId'] for x in unsupported):row.update(status='BLOCKED',canonicalCandidate=False,conditionalCandidate=False,unsupportedInferenceCount=1,blockers=sorted(set(row['blockers']+['UNSUPPORTED_INFERENCE'])))

canonical_files=['work/flight-theory-validation/004a/results/canonical-flight-knowledge-004a.json','work/flight-theory-validation/004b/results/canonical-flight-knowledge-004b.json','work/flight-theory-validation/004f/results/canonical-flight-knowledge-004f.json']
existing=[]
for filename in canonical_files:
 data=json.loads((ROOT/filename).read_text(encoding='utf-8'))
 for u in data.get('units',[]):existing.append({'batch':data.get('batchId'),'knowledgeId':u.get('knowledgeId'),'text':' '.join(str(u.get(k,'')) for k in ('title','definitionOrStatement','statement')).lower()})
existing_duplicates=[]
for kind,items in groups:
 for x in items:
  text=' '.join(str(x.get(k,'')) for k in ('name','title','definition','observedCondition','allowedResponse','emergencyAction','preventiveAction')).lower().strip()
  if not text:continue
  tokens=set(re.findall(r'[a-z0-9]+',text))
  for old in existing:
   old_tokens=set(re.findall(r'[a-z0-9]+',old['text']))
   similarity=len(tokens&old_tokens)/max(1,len(tokens|old_tokens))
   if similarity>=.8:existing_duplicates.append({'knowledgeId':kid(x),'existingKnowledgeId':old['knowledgeId'],'existingBatch':old['batch'],'similarity':round(similarity,3),'disposition':'EXISTING_REFERENCE_ONLY'})

no_topics=['flight:emergency-gps-error','flight:emergency-compass-error','flight:esc-failure','flight:rth-error','flight:forced-landing','flight:post-accident-response']
all_topic_ids={t for _,items in groups for x in items for t in x.get('topicIds',[])}
no_preservation=[{'topicId':t,'knowledgeGenerated':t in all_topic_ids,'status':'VIOLATION' if t in all_topic_ids else 'PRESERVED'} for t in no_topics]
warnings=[x for x in results if x['status']=='VALIDATED_WITH_WARNING'];blocked=[x for x in results if x['status']=='BLOCKED'];duplicates=[x for x in results if x['status']=='DUPLICATE'];no_candidate=[x for x in results if x['status']=='NO_CANONICAL_CANDIDATE'];validated=[x for x in results if x['status']=='VALIDATED']
candidates=[{'sourceKnowledgeId':x['knowledgeId'],'knowledgeType':x['knowledgeType'],'candidateStatus':'CONDITIONAL' if x['conditionalCandidate'] else 'READY','conditions':x['warnings'],'canonicalId':None} for x in results if x['canonicalCandidate']]
held=[{'sourceKnowledgeId':x['knowledgeId'],'knowledgeType':x['knowledgeType'],'status':x['status'],'reasons':x['blockers'] or [x['reason']]} for x in results if not x['canonicalCandidate']]
type_summary={}
for kind,_ in groups:type_summary[kind]=dict(Counter(x['status'] for x in results if x['knowledgeType']==kind))
deferred=json.loads((ROOT/'work/source-ingestion/source-batch-004g/deferred-knowledge.json').read_text(encoding='utf-8'))
summary={'inputCount':len(results),'statusCounts':dict(Counter(x['status'] for x in results)),'typeResults':type_summary,'warningCount':len(warnings),'blockedCount':len(blocked),'duplicateCount':len(duplicates),'noCanonicalCandidateCount':len(no_candidate),'existingCanonicalDuplicateCount':len(existing_duplicates),'canonicalCandidateCount':len(candidates),'canonicalCandidateReady':sum(x['candidateStatus']=='READY' for x in candidates),'canonicalCandidateConditional':sum(x['candidateStatus']=='CONDITIONAL' for x in candidates),'canonicalHeldCount':len(held),'noKnowledgePreserved':all(x['status']=='PRESERVED' for x in no_preservation),'unsupportedInferenceCount':len(unsupported),'deferred004HCount':len(deferred),'canonicalCreated':False,'canonicalMutationCount':0,'graphMutationCount':0,'activePackMutationCount':0,'questionMutationCount':0,'supabaseMutationCount':0,'status':'VALIDATION_COMPLETE_CANONICAL_NOT_CREATED'}
for name,value in [('validation-results.json',results),('validated.json',validated),('validated-with-warning.json',warnings),('blocked.json',blocked),('duplicate-analysis.json',{'intra004G':duplicates,'existingCanonical':existing_duplicates}),('no-canonical-candidate.json',no_candidate),('canonical-candidate-inventory.json',candidates),('canonical-candidate-held.json',held),('knowledge-type-summary.json',type_summary),('warning-analysis.json',warnings),('unsupported-inference-analysis.json',unsupported),('no-knowledge-preservation.json',no_preservation),('validation-summary.json',summary)]:dump(name,value)
print(json.dumps(summary,ensure_ascii=False,indent=2))
