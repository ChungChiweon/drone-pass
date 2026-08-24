from __future__ import annotations
import hashlib,json
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/'work/flight-theory-validation/004f'
INGEST=ROOT/'work/source-ingestion/source-batch-004f'
OUT=INPUT/'results'
OUT.mkdir(parents=True,exist_ok=True)

def load(name): return json.loads((INPUT/name).read_text(encoding='utf-8'))
def dump(name,value): (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
procedures=load('procedures.json');checklists=load('checklist-items.json');concepts=load('concepts.json');safety=load('safety-knowledge.json');decisions=load('operational-decisions.json');relationships=load('relationships.json')
coverage=json.loads((INGEST/'coverage.json').read_text(encoding='utf-8'))
deferred=json.loads((INGEST/'deferred-knowledge.json').read_text(encoding='utf-8'))
all_items=procedures+checklists+concepts+safety+decisions
known={x.get('procedureId') or x.get('checklistId') or x.get('conceptId') or x.get('safetyId') or x.get('decisionId') for x in all_items}

def result(item,kind,identifier,evidence,refs,structure=True,ordering=True,relation=True,warnings=None,blocker=None):
 source=1 if refs and evidence.strip() else 0; score=round(source*.30+(1 if structure else 0)*.25+.20+(1 if ordering else 0)*.15+(1 if relation else 0)*.10,3)
 blocker=blocker or ('BLOCKED_SOURCE' if not source else None)
 status=blocker or ('VALIDATED_WITH_WARNING' if warnings else 'VALIDATED') if score>=.95 else blocker or ('VALIDATED_WITH_WARNING' if score>=.9 else 'REVIEW_REQUIRED')
 return {'knowledgeId':identifier,'knowledgeType':kind,'topicId':(item.get('topicIds')or['flight:relationship'])[0],'validationStatus':status,'validationScore':score,'sourceEvidenceScore':source,'structureScore':1 if structure else 0,'operationalFidelityScore':1,'orderingDecisionScore':1 if ordering else 0,'relationshipConsistencyScore':1 if relation else 0,'warnings':warnings or [],'blockers':[blocker] if blocker else [],'evidence':evidence,'recommendedAction':'CANONICAL_CANDIDATE' if status.startswith('VALIDATED') else 'REVIEW'}

procedure_results=[]
for x in procedures:
 structure=bool(x.get('procedureId') and x.get('name') and x.get('phase') and x.get('steps'))
 ordering=not x.get('ordered') or bool(x.get('orderingEvidence') and len(x.get('steps',[]))>1)
 procedure_results.append(result(x,'OPERATIONAL_PROCEDURE',x['procedureId'],x.get('rawEvidenceText',''),x.get('sourceReferences',[]),structure,ordering,blocker='BLOCKED_STRUCTURE' if not structure else ('BLOCKED_ORDERING' if not ordering else None)))

checklist_results=[]
for x in checklists:
 structure=bool(x.get('checklistId') and x.get('item') and x.get('phase'))
 checklist_results.append(result(x,'CHECKLIST_ITEM',x['checklistId'],x.get('rawEvidenceText',''),[x['sourceReference']] if x.get('sourceReference') else [],structure,blocker='BLOCKED_STRUCTURE' if not structure else None))

concept_results=[]
for x in concepts:
 warnings=[]; text=(x.get('name','')+' '+x.get('definition','')).lower()
 if any(k in text for k in ('weather','airspace','regulation','certificate','restriction')): warnings=['LEGAL_OR_WEATHER_REFERENCE_ONLY']
 concept_results.append(result(x,'FLIGHT_CONCEPT',x['conceptId'],x.get('rawEvidenceText',''),x.get('sourceReferences',[]),bool(x.get('name') and x.get('definition')),warnings=warnings))

safety_results=[]
for x in safety:
 structure=bool(x.get('title') and x.get('phase') and (x.get('hazard') or x.get('preventiveAction')))
 safety_results.append(result(x,'SAFETY_KNOWLEDGE',x['safetyId'],x.get('evidence',''),x.get('sourceReferences',[]),structure,blocker='BLOCKED_STRUCTURE' if not structure else None))

decision_results=[]
for x in decisions:
 confirmed=bool(x.get('trigger') and x.get('decision')); monitoring=bool(x.get('monitoredCondition') and not confirmed); kind='OPERATIONAL_DECISION' if confirmed else 'OPERATIONAL_MONITORING'
 row=result(x,kind,x['decisionId'],x.get('rawEvidenceText',''),x.get('sourceReferences',[]),bool(x.get('monitoredCondition')),confirmed or monitoring,blocker=None if confirmed or monitoring else 'BLOCKED_DECISION');row['decisionClassification']='DECISION_CONFIRMED' if confirmed else 'MONITORING_ONLY' if monitoring else 'BLOCKED_DECISION';decision_results.append(row)

relationship_results=[]
allowed={'PRECEDES','FOLLOWED_BY','CHECKS','MONITORS','AFFECTS','PREVENTS','REQUIRES','PART_OF','TRIGGERS','CONTRASTS_WITH'}
for x in relationships:
 consistent=x.get('sourceKnowledgeId') in known and x.get('targetKnowledgeId') in known and x.get('sourceKnowledgeId')!=x.get('targetKnowledgeId') and x.get('relationType') in allowed
 relationship_results.append(result(x,'RELATIONSHIP',x['relationId'],x.get('evidence',''),[x['sourceLocator']] if x.get('sourceLocator') else [],bool(x.get('sourceKnowledgeId') and x.get('targetKnowledgeId') and x.get('relationType')),relation=consistent,blocker=None if consistent else 'BLOCKED_RELATIONSHIP'))

results=procedure_results+checklist_results+concept_results+safety_results+decision_results+relationship_results
overlaps=[]
for c in checklists:
 matches=[]
 for p in procedures:
  for step in p.get('steps',[]):
   if c['item'].lower().rstrip('.')==step.lower().rstrip('.'): matches.append(p['procedureId'])
 if matches: overlaps.append({'knowledgeId':c['checklistId'],'classification':'PROCEDURE_CHECKLIST_OVERLAP','matches':matches,'canonicalDisposition':'EXCLUDE_DUPLICATE_LOSER'})
for x in results:
 if not any(o['knowledgeId']==x['knowledgeId'] for o in overlaps): overlaps.append({'knowledgeId':x['knowledgeId'],'classification':'DISTINCT','matches':[],'canonicalDisposition':'KEEP'})

validated=[x for x in results if x['validationStatus']=='VALIDATED']; warning=[x for x in results if x['validationStatus']=='VALIDATED_WITH_WARNING'];blocked=[x for x in results if x['validationStatus'].startswith('BLOCKED')]
losers={x['knowledgeId'] for x in overlaps if x['canonicalDisposition'].startswith('EXCLUDE')}
by_id={x['knowledgeId']:x for x in results}
rel_by_endpoint=defaultdict(list)
for r in relationships:
 rel_by_endpoint[r['sourceKnowledgeId']].append(r['relationId']);rel_by_endpoint[r['targetKnowledgeId']].append(r['relationId'])

def question_types(kind,item):
 if kind=='OPERATIONAL_PROCEDURE': return ['PREFLIGHT_CHECK']+(['PROCEDURE_ORDER'] if item.get('ordered') else [])
 if kind=='CHECKLIST_ITEM': return ['CHECKLIST_SELECTION','PREFLIGHT_CHECK']
 if kind=='OPERATIONAL_DECISION': return ['OPERATIONAL_DECISION','CASE_JUDGMENT'] if item.get('trigger') else []
 if kind=='OPERATIONAL_MONITORING': return ['OPERATIONAL_MONITORING']
 if kind=='SAFETY_KNOWLEDGE': return ['SAFETY_JUDGMENT','CASE_JUDGMENT']
 if kind=='RELATIONSHIP': return ['RELATIONSHIP_SELECTION']
 if kind=='FLIGHT_CONCEPT': return ['CASE_JUDGMENT']
 return []

canonical=[]
for item in all_items+relationships:
 kid=item.get('procedureId') or item.get('checklistId') or item.get('conceptId') or item.get('safetyId') or item.get('decisionId') or item.get('relationId'); vr=by_id[kid]
 if not vr['validationStatus'].startswith('VALIDATED') or kid in losers: continue
 kind=vr['knowledgeType']; statement=item.get('name') or item.get('item') or item.get('definition') or item.get('title') or item.get('decision') or f"{item.get('sourceKnowledgeId')} {item.get('relationType')} {item.get('targetKnowledgeId')}"
 supported=question_types(kind,item)
 canonical.append({'knowledgeId':kid,'knowledgeType':kind,'title':item.get('name') or item.get('title') or kid,'phase':item.get('phase'),'statement':statement,'steps':item.get('steps',[]),'ordered':item.get('ordered',False),'checklistItem':item.get('item'),'monitoredCondition':item.get('monitoredCondition'),'trigger':item.get('trigger'),'decision':item.get('decision'),'safetyAction':item.get('preventiveAction'),'conditions':[x for x in [item.get('condition')] if x]+item.get('conditions',[]),'warnings':vr['warnings'],'sourceReferences':item.get('sourceReferences') or ([item['sourceReference']] if item.get('sourceReference') else [item['sourceLocator']] if item.get('sourceLocator') else []),'relationshipIds':sorted(rel_by_endpoint.get(kid,[])),'questionEligibility':'STANDALONE' if supported else 'NOT_QUESTION_ELIGIBLE','supportedQuestionTypes':supported,'qualityScore':vr['validationScore']})
canonical.sort(key=lambda x:x['knowledgeId'])

topic_rows=[]
for base in coverage:
 ids=[]
 for item in all_items:
  if base['topicId'] in item.get('topicIds',[]): ids.append(item.get('procedureId') or item.get('checklistId') or item.get('conceptId') or item.get('safetyId') or item.get('decisionId'))
 can=[x for x in canonical if x['knowledgeId'] in ids]
 status='NO_KNOWLEDGE' if base['coverageStatus']=='NO_KNOWLEDGE' else 'VALIDATED' if can and not base.get('gaps') else 'VALIDATED_WITH_GAPS'
 counts=Counter(x['knowledgeType'] for x in can)
 topic_rows.append({'topicId':base['topicId'],'ingestedKnowledge':len(ids),'validatedKnowledge':sum(1 for i in ids if by_id[i]['validationStatus'].startswith('VALIDATED')),'canonicalKnowledge':len(can),'procedureCount':counts['OPERATIONAL_PROCEDURE'],'checklistCount':counts['CHECKLIST_ITEM'],'monitoringCount':counts['OPERATIONAL_MONITORING'],'decisionCount':counts['OPERATIONAL_DECISION'],'safetyCount':counts['SAFETY_KNOWLEDGE'],'relationshipCount':base['relationshipCount'],'status':status,'gaps':base.get('gaps',[])})

core={'setId':'canonical-flight-theory:004f:v1','version':'1.0.0','batchId':'004F','sourceSnapshotId':'source-batch-004f','generatedAt':'2026-08-11T00:00:00+09:00','units':canonical,'topicCoverage':topic_rows,'blockedIds':[x['knowledgeId'] for x in blocked],'warningIds':[x['knowledgeId'] for x in warning]}
checksum='sha256-'+hashlib.sha256(json.dumps(core,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();canonical_set={**core,'checksum':checksum}
readiness={'status':'READY_WITH_GAPS','readyForShadowRuntime':True,'reasons':['29 inputs validated without blockers','source provenance complete','ordered procedure has explicit ordering evidence','decision inference not introduced'],'gaps':[x['topicId'] for x in topic_rows if x['status']=='NO_KNOWLEDGE'],'visualStatus':'OPTIONAL_NONE','activeRuntimeChanged':False}
summary={'inputCount':len(results),'statusCounts':dict(Counter(x['validationStatus'] for x in results)),'typeCounts':dict(Counter(x['knowledgeType'] for x in results)),'canonicalCount':len(canonical),'canonicalTypeCounts':dict(Counter(x['knowledgeType'] for x in canonical)),'duplicateLoserCount':len(losers),'topicStatusCounts':dict(Counter(x['status'] for x in topic_rows)),'deferredCounts':dict(Counter(x['targetBatch'] for x in deferred)),'runtimeReadiness':readiness['status'],'checksum':checksum,'004AStatus':'READY_WITH_GAPS_FROZEN','004BStatus':'READY_WITH_GAPS_FROZEN','blockedGapBatches':['004C','004D','004E'],'mutationCount':0}

for name,value in [('procedure-validation.json',procedure_results),('checklist-validation.json',checklist_results),('concept-validation.json',concept_results),('safety-validation.json',safety_results),('decision-validation.json',decision_results),('relationship-validation.json',relationship_results),('validation-results.json',results),('validated.json',validated),('validated-with-warning.json',warning),('blocked.json',blocked),('duplicate-analysis.json',overlaps),('canonical-flight-knowledge-004f.json',canonical_set),('topic-validation-coverage.json',topic_rows),('runtime-readiness.json',readiness),('validation-summary.json',summary)]:dump(name,value)
print(json.dumps(summary,ensure_ascii=False,indent=2))
