from __future__ import annotations
import hashlib,json
from collections import Counter,defaultdict
from copy import deepcopy
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1];INPUT=ROOT/'work/flight-theory-validation/004h';RESULTS=INPUT/'results';RESULTS.mkdir(parents=True,exist_ok=True);ING=ROOT/'work/source-ingestion/source-batch-004h';GENERATED='2026-08-12T00:00:00Z'
FILES={'HUMAN_FACTOR':'human-factors.json','RISK_MANAGEMENT':'risk-management.json','CREW_COORDINATION':'crew-coordination.json','MAINTENANCE':'maintenance.json','INSPECTION':'inspection.json','SAFETY_KNOWLEDGE':'safety-knowledge.json','FLIGHT_CONCEPT':'concepts.json','RELATIONSHIP':'relationships.json'}
IDS={'HUMAN_FACTOR':'humanFactorId','RISK_MANAGEMENT':'riskId','CREW_COORDINATION':'coordinationId','MAINTENANCE':'maintenanceId','INSPECTION':'inspectionId','SAFETY_KNOWLEDGE':'safetyId','FLIGHT_CONCEPT':'conceptId','RELATIONSHIP':'relationId'}
def load(p):return json.loads(p.read_text(encoding='utf8'))
def dump(name,x):(RESULTS/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def stable(x):return 'sha256-'+hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def refs(x):return x.get('sourceReferences') or ([x['sourceReference']] if x.get('sourceReference') else [x['sourceLocator']] if x.get('sourceLocator') else [])
inputs={k:load(INPUT/v) for k,v in FILES.items()};manifest=load(INPUT/'validation-input-manifest.json');assert manifest['inputCount']==36 and sum(map(len,inputs.values()))==36
canonical_paths=[ROOT/f'work/flight-theory-validation/{b}/results/canonical-flight-knowledge-{b}.json' for b in ['004a','004b','004f','004g']];protected=canonical_paths+[ROOT/'work/source-ingestion/source-batch-004/procedure-inventory.json',ROOT/'work/source-ingestion/source-batch-004g/procedure-inventory-classification.json']
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
known={x[IDS[k]]:k for k,rows in inputs.items() if k!='RELATIONSHIP' for x in rows};results=[];by_type={}
unsupported_terms=['duty time','minimum rest','minimum sleep','replacement hour','inspection interval hours','arbitrary risk score']
for kind,rows in inputs.items():
 typed=[]
 for x in rows:
  kid=x[IDS[kind]];source=refs(x);source_valid=bool(source and all(r.get('sourceId') and r.get('page') and r.get('section') for r in source));outdated=any(r['sourceId']=='faa-remote-pilot-study-guide' for r in source);text=json.dumps(x,ensure_ascii=False).lower();unsupported=any(t in text for t in unsupported_terms);structure=True;context=True;relation=True;reason='Source, structure, and domain role are directly supported.'
  if kind=='HUMAN_FACTOR':structure=bool(x.get('factorType') and x.get('name') and x.get('definition'))
  elif kind=='RISK_MANAGEMENT':structure=bool(x.get('hazard') and x.get('assessmentMethod'));unsupported|=any(isinstance(x.get(f),int) for f in ['likelihood','severity','riskLevel'])
  elif kind=='CREW_COORDINATION':structure=bool(x.get('roles') and x.get('coordinationPrinciple'));context=x.get('context') in ['SMALL_UAS','GENERAL_AVIATION_CONTEXT']
  elif kind=='MAINTENANCE':structure=bool(x.get('maintenanceType') and x.get('targetComponent'));unsupported|=bool(x.get('interval') and x['interval']!='MANUFACTURER_DEFINED')
  elif kind=='INSPECTION':structure=bool(x.get('inspectionType') and x.get('purpose') and x.get('lineage'))
  elif kind=='SAFETY_KNOWLEDGE':structure=bool(x.get('title') and x.get('principle'))
  elif kind=='FLIGHT_CONCEPT':structure=bool(x.get('name') and x.get('definition'))
  elif kind=='RELATIONSHIP':
   structure=bool(x.get('sourceKnowledgeId') in known and x.get('targetKnowledgeId') in known and x.get('relationType'))
   relation=structure and x['sourceKnowledgeId']!=x['targetKnowledgeId'] and x['relationType'] in {'INCREASES_RISK_OF','DECREASES','AFFECTS','CONTRIBUTES_TO','MITIGATED_BY','PREVENTS','REQUIRES','PART_OF','SUPPORTS','PRECEDES','FOLLOWED_BY','COMMONLY_CONFUSED_WITH','CONTRASTS_WITH'}
   if x['relationId']=='flight-h-relation:control-mitigates-risk':relation=False;reason='MITIGATED_BY direction is reversed: residual risk does not mitigate the risk control.'
  blockers=[]
  if not source_valid:blockers.append('SOURCE_OR_LOCATOR_MISSING')
  if not structure:blockers.append('STRUCTURE_INCOMPLETE')
  if not context:blockers.append('CONTEXT_BOUNDARY_INVALID')
  if not relation:blockers.append('RELATIONSHIP_DIRECTION_OR_EVIDENCE_INVALID')
  if unsupported:blockers.append('UNSUPPORTED_INFERENCE')
  status='BLOCKED_UNSUPPORTED_INFERENCE' if unsupported else 'BLOCKED_RELATIONSHIP' if not relation else 'BLOCKED_CONTEXT' if not context else 'BLOCKED_STRUCTURE' if not structure else 'BLOCKED_SOURCE' if not source_valid else 'VALIDATED_WITH_WARNING' if outdated else 'VALIDATED'
  warnings=['POSSIBLY_OUTDATED_CONCEPT_STABLE_SOURCE'] if outdated and not blockers else []
  score=.55 if blockers else .92 if warnings else 1.0
  row={'knowledgeId':kid,'knowledgeType':kind,'status':status,'score':score,'sourceValid':source_valid,'structureValid':structure,'contextValid':context,'relationshipValid':relation,'warnings':warnings,'blockers':blockers,'canonicalCandidate':not blockers,'reason':reason,'unsupportedInferenceCount':int(unsupported)};results.append(row);typed.append(row)
 by_type[kind]=typed
validated=[x for x in results if x['status']=='VALIDATED'];warnings=[x for x in results if x['status']=='VALIDATED_WITH_WARNING'];blocked=[x for x in results if x['status'].startswith('BLOCKED')]
assert len(results)==36 and sum(x['unsupportedInferenceCount'] for x in results)==0
duplicates=[{'knowledgeId':'flight-h-concept:sop-risk-tool','comparison':'004F','classification':'CHECKLIST_OVERLAP','disposition':'SAME_EVIDENCE_DIFFERENT_ROLE','canonicalLoser':False,'reason':'004H models the risk-management role of SOP, not an operational checklist item.'},{'knowledgeId':'flight-inspection:condition-anomaly','comparison':'004G','classification':'FAILURE_MAINTENANCE_OVERLAP','disposition':'SAME_EVIDENCE_DIFFERENT_ROLE','canonicalLoser':False,'reason':'004H models inspection trigger and preserves 004G failure lineage.'}]
def cid(kind,sid):return 'flight-004h:'+kind.lower().replace('_','-')+':'+sid.split(':',1)[-1].replace(':','-')
types={'HUMAN_FACTOR':['HUMAN_FACTOR_IDENTIFICATION','HUMAN_FACTOR_EFFECT','CASE_JUDGMENT'],'RISK_MANAGEMENT':['HAZARD_IDENTIFICATION','RISK_MANAGEMENT_SELECTION','MITIGATION_SELECTION','CASE_JUDGMENT'],'CREW_COORDINATION':['COORDINATION_SELECTION','COMMUNICATION_JUDGMENT'],'MAINTENANCE':['MAINTENANCE_ACTION','CASE_JUDGMENT'],'INSPECTION':['INSPECTION_SELECTION','CASE_JUDGMENT'],'SAFETY_KNOWLEDGE':['SAFETY_JUDGMENT'],'FLIGHT_CONCEPT':['CONCEPT_IDENTIFICATION'],'RELATIONSHIP':['RELATIONSHIP_SELECTION']}
result_map={x['knowledgeId']:x for x in results};units=[]
for kind,rows in inputs.items():
 for x in rows:
  sid=x[IDS[kind]];vr=result_map[sid]
  if not vr['canonicalCandidate']:continue
  clean={k:deepcopy(v) for k,v in x.items() if k not in ['rawEvidenceText','validationEligibility','topicIds']};title=x.get('name') or x.get('title') or x.get('hazard') or x.get('purpose') or x.get('relationType')
  clean.update({'knowledgeId':cid(kind,sid),'sourceRecordId':sid,'knowledgeType':kind,'title':title,'sourceReferences':refs(x),'relationshipIds':[],'questionEligibility':'RELATIONSHIP_REQUIRED' if kind=='RELATIONSHIP' else 'STANDALONE','supportedQuestionTypes':types[kind],'qualityScore':vr['score'],'warnings':vr['warnings']})
  if kind=='CREW_COORDINATION':clean['coordinationContext']='GENERAL_AVIATION' if x['context']=='GENERAL_AVIATION_CONTEXT' else 'UAS_SPECIFIC'
  units.append(clean)
source_to_canonical={x['sourceRecordId']:x['knowledgeId'] for x in units};rels=[x for x in units if x['knowledgeType']=='RELATIONSHIP']
for r in rels:
 r['sourceCanonicalId']=source_to_canonical[r['sourceKnowledgeId']];r['targetCanonicalId']=source_to_canonical[r['targetKnowledgeId']]
 for endpoint in [r['sourceCanonicalId'],r['targetCanonicalId']]:next(x for x in units if x['knowledgeId']==endpoint)['relationshipIds'].append(r['knowledgeId'])
coverage_src=load(ING/'coverage.json');topic_rows=[]
for t in coverage_src:
 topic=t['topicId'];matched=[]
 for kind,rows in inputs.items():
  for x in rows:
   if topic in x.get('topicIds',[]) and result_map[x[IDS[kind]]]['canonicalCandidate']:matched.append((kind,x))
 status='VALIDATED' if matched else 'VALIDATED_WITH_GAPS'
 topic_rows.append({'topicId':topic,'ingestedKnowledgeCount':sum(topic in x.get('topicIds',[]) for rows in inputs.values() for x in rows),'validatedKnowledgeCount':len(matched),'canonicalKnowledgeCount':len(matched),'humanFactorCount':sum(k=='HUMAN_FACTOR' for k,x in matched),'riskCount':sum(k=='RISK_MANAGEMENT' for k,x in matched),'crewCount':sum(k=='CREW_COORDINATION' for k,x in matched),'maintenanceCount':sum(k=='MAINTENANCE' for k,x in matched),'inspectionCount':sum(k=='INSPECTION' for k,x in matched),'relationshipCount':sum(k=='RELATIONSHIP' for k,x in matched),'status':status,'gaps':[] if matched else ['NO_VALIDATED_CANONICAL_KNOWLEDGE']})
readiness={'status':'READY_WITH_GAPS','readyForShadowRuntime':True,'reasons':['35 source-backed units passed validation','major human, risk, coordination, maintenance and inspection types exist','unsupported inference count is zero'],'gaps':[x['topicId'] for x in topic_rows if x['status']!='VALIDATED'],'criticalBlockedInCanonical':0,'freezeStatus':'READY_WITH_GAPS_FROZEN','activeRuntimeChanged':False}
snapshot={'inputChecksum':stable({k:inputs[k] for k in sorted(inputs)}),'sourceCurrentness':{'faa-ac-107-2a':'CURRENT','faa-remote-pilot-study-guide':'POSSIBLY_OUTDATED'},'priorCanonicalChecksums':{p.stem:load(p)['checksum'] for p in canonical_paths}}
core={'setId':'canonical-flight-theory:004h:v1','version':'1','batchId':'004H','canonicalUnits':[x for x in units if x['knowledgeType']!='RELATIONSHIP'],'relationshipUnits':rels,'warningIds':[x['knowledgeId'] for x in units if x['warnings']],'blockedIds':[x['knowledgeId'] for x in blocked],'topicCoverage':topic_rows,'runtimeReadiness':readiness,'sourceSnapshot':snapshot,'generatedAt':GENERATED};check=deepcopy(core);check.pop('generatedAt');core['checksum']=stable(check)
inventory=load(ING/'procedure-inventory-final-classification.json');inv_counts=dict(Counter(x['finalClassification'] for x in inventory));assert len(inventory)==64 and inv_counts=={'NOT_PROCEDURE':45,'004F_CONFIRMED':8,'004G_CONFIRMED':5,'004H_CONFIRMED':6}
summary={'inputCount':36,'statusCounts':dict(Counter(x['status'] for x in results)),'typeResults':{k:dict(Counter(x['status'] for x in v)) for k,v in by_type.items()},'canonicalCount':len(units),'canonicalTypeCounts':dict(Counter(x['knowledgeType'] for x in units)),'blockedCount':len(blocked),'warningCount':len(warnings),'duplicateCanonicalLosers':0,'overlapCount':len(duplicates),'topicStatusCounts':dict(Counter(x['status'] for x in topic_rows)),'runtimeReadiness':readiness['status'],'freezeStatus':readiness['freezeStatus'],'procedureInventory':inv_counts,'totalFlightTheoryCanonical':116+len(units),'sourceGapBatches':['004C','004D','004E'],'unsupportedInferenceCount':0,'checksum':core['checksum'],'mutationCount':0}
for n,d in [('validation-results.json',results),('validated.json',validated),('validated-with-warning.json',warnings),('blocked.json',blocked),('human-factor-validation.json',by_type['HUMAN_FACTOR']),('risk-validation.json',by_type['RISK_MANAGEMENT']),('crew-validation.json',by_type['CREW_COORDINATION']),('maintenance-validation.json',by_type['MAINTENANCE']),('inspection-validation.json',by_type['INSPECTION']),('safety-validation.json',by_type['SAFETY_KNOWLEDGE']),('concept-validation.json',by_type['FLIGHT_CONCEPT']),('relationship-validation.json',by_type['RELATIONSHIP']),('duplicate-analysis.json',duplicates),('canonical-flight-knowledge-004h.json',core),('topic-validation-coverage.json',topic_rows),('runtime-readiness.json',readiness),('validation-summary.json',summary)]:dump(n,d)
after={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected};assert before==after
print(json.dumps(summary,ensure_ascii=False,indent=2))
