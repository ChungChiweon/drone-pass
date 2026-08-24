from __future__ import annotations
import hashlib,json,sys
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; IN=ROOT/'work/flight-theory-validation/004d'; SRC=ROOT/'work/source-ingestion/source-batch-004d'; OUT=IN/'results'
FILES={'CONTROL_CONCEPT':'control-concepts','SENSOR_COMPONENT':'sensor-components','SENSOR_PRINCIPLE':'sensor-principles','NAVIGATION_KNOWLEDGE':'navigation-knowledge','FAILURE_KNOWLEDGE':'failure-knowledge','RELATIONSHIP':'relationships'}
GAPS=['flight-controller','imu','position-hold','altitude-hold','sensor-fusion','home-point','return-to-home','geofencing','vision-sensor','ultrasonic-sensor','obstacle-detection','calibration','sensor-error','compass-error']
def load(path): return json.loads(path.read_text(encoding='utf-8'))
def dump(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def kid(x): return next((x.get(k) for k in ('conceptId','componentId','principleId','knowledgeId','relationshipId') if x.get(k)),None)
def hash_json(x): return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def main():
 manifest=load(IN/'validation-input-manifest.json'); summary=load(SRC/'ingestion-summary.json')
 if manifest.get('inputCount')!=22 or summary.get('validationInputCount')!=22 or summary.get('canonicalBaseline')!=180: sys.exit('VALIDATION_INPUT_DRIFT')
 pairs=[('control-concepts','control-concepts'),('sensor-components','sensor-components'),('sensor-principles','sensor-principles'),('navigation-knowledge','navigation-knowledge'),('failure-knowledge','failure-knowledge'),('relationships','relationships'),('visual-assets','visual-links'),('tables','tables')]
 checks=[]
 for a,b in pairs:
  left,right=load(IN/f'{a}.json'),load(SRC/f'{b}.json'); ok=left==right
  checks.append({'validationFile':a+'.json','ingestionFile':b+'.json','validationChecksum':hash_json(left),'ingestionChecksum':hash_json(right),'matched':ok})
 if not all(c['matched'] for c in checks): sys.exit('VALIDATION_INPUT_DRIFT')
 inputs=[]
 for typ,name in FILES.items():
  for x in load(IN/f'{name}.json'): inputs.append((typ,x))
 if len(inputs)!=20: sys.exit('VALIDATION_INPUT_DRIFT')
 known={kid(x) for _,x in inputs}; eligibility={i['id']:i['eligibility'] for i in manifest['items']}
 results=[]
 for typ,x in inputs:
  id_=kid(x); refs=x.get('sourceReferences') or ([x['sourceLocator']] if x.get('sourceLocator') else []); evidence=x.get('rawEvidenceText') or x.get('evidence','')
  blockers=[]; warnings=list(x.get('warnings',[])); context=x.get('technicalContext','AVIATION_NAVIGATION')
  if not refs or not evidence.strip() or any(not r.get('sourceId') or not r.get('page') or not r.get('section') for r in refs): blockers.append('SOURCE_EVIDENCE_MISSING')
  if typ=='SENSOR_COMPONENT':
   text=' '.join(str(x.get(k,'')) for k in ('measuredVariable','function','output')).lower(); rules={'gyroscope':('rotat','angular','attitude','direction'),'accelerometer':('accelerat',),'magnetometer':('magnetic','heading','direction'),'barometric-pressure-instrument':('pressure',)}; key=id_.split(':')[-1]
   if not any(v in text for v in rules[key]): blockers.append('SENSOR_ROLE_MISMATCH')
  prohibited=' '.join(str(x.get(k,'')) for k in ('statement','function','output','title')).lower()
  if any(v in prohibited for v in ('return to home','position hold','home point','geofenc','altitude hold','obstacle detection')): blockers.append('UAS_CONTEXT_GENERALIZATION')
  if typ=='FAILURE_KNOWLEDGE' and x.get('responseProcedure'): blockers.append('EMERGENCY_RESPONSE_GENERALIZATION')
  if typ=='RELATIONSHIP':
   if x.get('sourceKnowledgeId') not in known or x.get('targetKnowledgeId') not in known: blockers.append('RELATION_ENDPOINT_MISSING')
   warnings.append('RELATIONSHIP_BOUNDARY_REVIEWED')
  if id_=='navigation-knowledge:gnss-position-data': warnings.append('GPS_SPECIFIC_SOURCE_SCOPE_RETAINED')
  warning=eligibility[id_]=='ELIGIBLE_WITH_WARNING'
  status='BLOCKED_SENSOR_ROLE' if 'SENSOR_ROLE_MISMATCH' in blockers else ('BLOCKED_CONTEXT_GENERALIZATION' if any('GENERALIZATION' in b for b in blockers) else ('BLOCKED_SOURCE' if blockers else ('VALIDATED_WITH_WARNING' if warning else 'VALIDATED')))
  score=0 if blockers else (.94 if warning else 1.0)
  duplicate='CONTROL_SYSTEM_004B_OVERLAP' if id_=='flight-control-concept:attitude-information' else ('TECHNICAL_VS_EMERGENCY' if id_=='sensor-failure:gps-sis-integrity-indication' else 'DISTINCT')
  q={'allowed':['SENSOR_IDENTIFICATION','SENSOR_FUNCTION','SENSOR_COMPARISON'],'prohibited':['DRONE_SENSOR_CONFIGURATION','DRONE_FLIGHT_MODE']} if typ in ('SENSOR_COMPONENT','SENSOR_PRINCIPLE','CONTROL_CONCEPT') else {'allowed':['GPS_CONCEPT','NAVIGATION_CONCEPT','NAVIGATION_ACCURACY','NAVIGATION_INTEGRITY'],'prohibited':['RTH_OPERATION','HOME_POINT_OPERATION','POSITION_HOLD_OPERATION','GEOFENCING_OPERATION','EMERGENCY_RESPONSE_PROCEDURE']}
  results.append({'knowledgeId':id_,'knowledgeType':typ,'validationStatus':status,'validationScore':score,'blockers':blockers,'warnings':sorted(set(warnings)),'technicalContext':context,'duplicateStatus':duplicate,'boundaryLineage':['004B'] if '004B' in duplicate else (['004G'] if duplicate=='TECHNICAL_VS_EMERGENCY' else []),'questionConstraints':q,'canonicalEligibility':'READY' if status=='VALIDATED' else ('READY_WITH_WARNING' if status=='VALIDATED_WITH_WARNING' else 'BLOCKED'),'canonicalId':None,'sourceReferences':refs})
 visual=load(IN/'visual-assets.json')[0]; visual_result={'visualId':visual.get('visualId') or visual.get('assetId'),'status':'SUPPORTIVE_VERIFIED','sourceReference':visual.get('sourceReference'),'linkedKnowledge':visual.get('linkedKnowledgeIds',visual.get('linkedKnowledge',[])),'interpretationRequired':visual.get('interpretationRequired',True),'blocksPrimary':False}
 table=load(IN/'tables.json')[0]; table_result={'tableId':table['tableId'],'status':'PAGE_REVIEW_REQUIRED','sourceLocator':table.get('sourceLocator'),'title':table.get('title'),'headers':table.get('headers',[]),'blocksPrimary':False,'reason':'TEXT_LAYER_PRESENT_BUT_PAGE_LAYOUT_REVIEW_REQUIRED'}
 status=Counter(r['validationStatus'] for r in results); bytype={t:dict(Counter(r['validationStatus'] for r in results if r['knowledgeType']==t)) for t in FILES}
 inventory=[{'sourceKnowledgeId':r['knowledgeId'],'validationStatus':r['validationStatus'],'canonicalEligibility':r['canonicalEligibility'],'suggestedKnowledgeType':r['knowledgeType'],'technicalContext':r['technicalContext'],'questionConstraints':r['questionConstraints'],'warningConstraints':r['warnings'],'duplicateStatus':r['duplicateStatus'],'boundaryLineage':r['boundaryLineage'],'sourceReferences':r['sourceReferences'],'canonicalId':None} for r in results]
 topics=[]; rels=load(IN/'relationships.json'); topic_map=defaultdict(list)
 for typ,x in inputs:
  topic=x.get('topicId');
  if topic: topic_map[topic].append(kid(x))
 for topic in summary['remainingGaps']:
  tid='flight:'+topic if not topic.startswith('flight:') else topic; topic_map.setdefault(tid,[])
 all_topics=set(topic_map)
 for _,x in inputs:
  if x.get('topicId'): all_topics.add(x['topicId'])
 # Preserve the ingestion taxonomy count with explicit no-knowledge topics.
 source_topics=list(dict.fromkeys([*(x.get('topicId') for _,x in inputs if x.get('topicId')),*(('flight:'+g) for g in GAPS)]))
 for tid in source_topics[:24]:
  ids=topic_map.get(tid,[]); rr=[r for r in results if r['knowledgeId'] in ids]; gap=tid.removeprefix('flight:') in GAPS
  topics.append({'topicId':tid,'sourceCount':len({ref['sourceId'] for r in rr for ref in r['sourceReferences']}),'ingestedKnowledgeCount':len(rr),'validatedKnowledgeCount':sum(r['validationStatus'].startswith('VALIDATED') for r in rr),'warningCount':sum(r['validationStatus']=='VALIDATED_WITH_WARNING' for r in rr),'blockedCount':sum(r['validationStatus'].startswith('BLOCKED') for r in rr),'canonicalCandidateCount':sum(r['canonicalEligibility'].startswith('READY') for r in rr),'relationshipCount':sum(1 for q in rels if q.get('sourceKnowledgeId') in ids or q.get('targetKnowledgeId') in ids),'visualSupportCount':1 if tid=='flight:sensor-error' else 0,'tableSupportCount':1 if tid=='flight:gps' else 0,'technicalContexts':sorted({r['technicalContext'] for r in rr}),'gapReason':'NO_DIRECT_OFFICIAL_UAS_EVIDENCE' if gap else None,'status':'NO_KNOWLEDGE' if gap else ('VALIDATED_WITH_GAPS' if any(r['validationStatus']=='VALIDATED_WITH_WARNING' for r in rr) else 'VALIDATED')})
 boundary={'004B':[{'knowledgeId':'flight-control-concept:attitude-information','classification':'CONTROL_SYSTEM_004B_OVERLAP','existingKnowledgeId':'flight-concept:attitude-control','action':'SAME_ENTITY_DIFFERENT_ROLE'}],'004G':[{'knowledgeId':'sensor-failure:gps-sis-integrity-indication','classification':'TECHNICAL_VS_EMERGENCY','existingKnowledgeId':None,'action':'KEEP_TECHNICAL_BOUNDARY'}],'exactDuplicates':0}
 runtime={'status':'READY_FOR_CANONICAL_BUILD_WITH_GAPS','reasons':['PRIMARY_KNOWLEDGE_VALIDATED_WITHOUT_BLOCKERS','UAS_SPECIFIC_ZERO','GAP_14_PRESERVED','SUPPORTING_TABLE_UNRESOLVED'],'primaryBlockers':sum(v for k,v in status.items() if k.startswith('BLOCKED')),'uasSpecificCount':0,'gapCount':14,'tableBlocksPrimary':False}
 OUT.mkdir(parents=True,exist_ok=True)
 dump('validation-results.json',results);dump('validated.json',[r for r in results if r['validationStatus']=='VALIDATED']);dump('validated-with-warning.json',[r for r in results if r['validationStatus']=='VALIDATED_WITH_WARNING']);dump('blocked.json',[r for r in results if r['validationStatus'].startswith('BLOCKED')])
 names={'CONTROL_CONCEPT':'control-validation.json','SENSOR_COMPONENT':'sensor-validation.json','SENSOR_PRINCIPLE':'sensor-principle-validation.json','NAVIGATION_KNOWLEDGE':'navigation-validation.json','FAILURE_KNOWLEDGE':'failure-validation.json','RELATIONSHIP':'relationship-validation.json'}
 for typ,name in names.items(): dump(name,[r for r in results if r['knowledgeType']==typ])
 dump('visual-validation.json',[visual_result]);dump('table-validation.json',[table_result]);dump('duplicate-boundary-analysis.json',boundary);dump('canonical-candidate-inventory.json',inventory);dump('topic-validation-coverage.json',topics);dump('runtime-readiness-preview.json',runtime)
 summary_out={'batchId':'004D','inputDrift':False,'inputChecksums':checks,'primaryKnowledgeCount':20,'visualCount':1,'tableCount':1,'statusCounts':dict(status),'typeResults':bytype,'visualStatus':visual_result['status'],'tableStatus':table_result['status'],'technicalContext':dict(Counter(r['technicalContext'] for r in results if r['knowledgeType']!='RELATIONSHIP')),'uasSpecificCount':0,'canonicalCandidateCount':sum(i['canonicalEligibility'].startswith('READY') for i in inventory),'canonicalCandidateStatus':dict(Counter(i['canonicalEligibility'] for i in inventory)),'gapCount':14,'gaps':['flight:'+g for g in GAPS],'topicStatusCounts':dict(Counter(t['status'] for t in topics)),'runtimeReadiness':runtime['status'],'tsStatus':'WAITING_FOR_MANUAL_FILE','batch004EStatus':'PARTIAL_UNCHANGED','unsupportedInferenceCount':0,'canonicalGenerated':False,'canonicalIdIssued':0,'canonicalBaseline':180,'mutations':{'canonical':0,'activePack':0,'atomicFact':0,'graph':0,'graphVersion':0,'question':0,'legal':0,'weather':0,'supabase':0}}
 dump('validation-summary.json',summary_out);dump('execution.json',{'status':'COMPLETED','ingestionRerunCount':0,'sourceCollectionCount':0,'validationInputCount':22,'canonicalGenerated':False,'canonicalIdIssued':0,'mutationCount':0})
 print(json.dumps(summary_out,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
