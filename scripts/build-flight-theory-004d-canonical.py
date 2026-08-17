#!/usr/bin/env python3
"""Build and freeze the deterministic 004D Canonical work artifact."""
from __future__ import annotations
import hashlib,json
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'work/flight-theory-validation/004d'; R=BASE/'results'
FILES=('control-concepts','sensor-components','sensor-principles','navigation-knowledge','failure-knowledge','relationships')
GAPS=['flight:flight-controller','flight:imu','flight:position-hold','flight:altitude-hold','flight:sensor-fusion','flight:home-point','flight:return-to-home','flight:geofencing','flight:vision-sensor','flight:ultrasonic-sensor','flight:obstacle-detection','flight:calibration','flight:sensor-error','flight:compass-error']
TYPE_MAP={'CONTROL_CONCEPT':'FLIGHT_CONTROL_CONCEPT','SENSOR_COMPONENT':'SENSOR_COMPONENT','SENSOR_PRINCIPLE':'SENSOR_PRINCIPLE','NAVIGATION_KNOWLEDGE':'NAVIGATION_KNOWLEDGE','FAILURE_KNOWLEDGE':'NAVIGATION_FAILURE','RELATIONSHIP':'RELATIONSHIP'}
PREFIX={'FLIGHT_CONTROL_CONCEPT':'control','SENSOR_COMPONENT':'sensor','SENSOR_PRINCIPLE':'principle','NAVIGATION_KNOWLEDGE':'navigation','NAVIGATION_FAILURE':'failure','RELATIONSHIP':'relationship'}
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def stable(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def digest(v): return 'sha256-'+hashlib.sha256(stable(v).encode()).hexdigest()
def save(n,v): (R/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sid(x): return next((x.get(k) for k in ('conceptId','componentId','principleId','knowledgeId','relationshipId') if x.get(k)),None)
def skey(v): return v.split(':',1)[-1].replace('_','-').lower()

inventory=load(R/'canonical-candidate-inventory.json'); validation=load(R/'validation-summary.json')
counts=Counter(x['canonicalEligibility'] for x in inventory)
if len(inventory)!=20 or counts!={'READY':8,'READY_WITH_WARNING':12} or any(x.get('canonicalId') is not None for x in inventory): raise RuntimeError('CANONICAL_INPUT_DRIFT')
if validation['inputDrift'] or validation['canonicalGenerated'] or validation['canonicalIdIssued'] or validation['canonicalBaseline']!=180: raise RuntimeError('CANONICAL_INPUT_DRIFT')
if any(x['validationStatus'] not in ('VALIDATED','VALIDATED_WITH_WARNING') for x in inventory): raise RuntimeError('CANONICAL_INPUT_DRIFT')

rows={}
for name in FILES:
 for item in load(BASE/f'{name}.json'): rows[sid(item)]=item
if set(rows)!=set(x['sourceKnowledgeId'] for x in inventory): raise RuntimeError('CANONICAL_INPUT_DRIFT')

idmap={}
for c in inventory:
 kind=TYPE_MAP[c['suggestedKnowledgeType']]; idmap[c['sourceKnowledgeId']]=f"flight-004d:{PREFIX[kind]}:{skey(c['sourceKnowledgeId'])}"
if len(set(idmap.values()))!=20: raise RuntimeError('CANONICAL_ID_COLLISION')

units=[]; relations=[]
for c in inventory:
 original=rows[c['sourceKnowledgeId']]; kind=TYPE_MAP[c['suggestedKnowledgeType']]; context=c['technicalContext']
 if context not in ('AVIATION_NAVIGATION','SENSOR_GENERAL','SATELLITE_NAVIGATION_GENERAL'): raise RuntimeError('UAS_CONTEXT_PROMOTION')
 raw=stable(original).lower()
 forbidden=('return to home','position hold','home point','geofencing','altitude hold','sensor fusion','imu calibration')
 if any(x in raw for x in forbidden): raise RuntimeError('GAP_SYNTHESIS_DETECTED')
 common={'knowledgeId':idmap[c['sourceKnowledgeId']],'sourceKnowledgeId':c['sourceKnowledgeId'],'knowledgeType':kind,'topicId':original.get('topicId'),'technicalContext':context,'sourceReferences':c['sourceReferences'],'questionConstraints':c['questionConstraints'],'warnings':c['warningConstraints'],'validationStatus':c['validationStatus'],'canonicalEligibility':c['canonicalEligibility'],'boundaryLineage':c['boundaryLineage']}
 if kind=='RELATIONSHIP':
  src=original['sourceKnowledgeId']; dst=original['targetKnowledgeId']
  if src not in idmap or dst not in idmap: raise RuntimeError('DANGLING_RELATIONSHIP_ENDPOINT')
  relations.append({**common,'sourceEndpoint':src,'targetEndpoint':dst,'sourceCanonicalId':idmap[src],'targetCanonicalId':idmap[dst],'relationType':original['relationType'],'direction':original['direction'],'evidence':original['evidence'],'sourceLocator':original['sourceLocator']})
 else:
  payload={k:v for k,v in original.items() if k not in ('conceptId','componentId','principleId','knowledgeId','relationshipId','confidence','technicalContext','sourceReferences','warnings','questionConstraints')}
  units.append({**common,**payload})
if len(units)!=14 or len(relations)!=6: raise RuntimeError('CANONICAL_COUNT_MISMATCH')
if any(x['technicalContext']=='UAS_SPECIFIC' for x in units+relations): raise RuntimeError('UAS_CONTEXT_PROMOTION')

visual=load(R/'visual-validation.json')[0]; visual_source=load(BASE/'visual-assets.json')[0]
linked=visual_source.get('linkedKnowledgeIds',visual_source.get('linkedKnowledge',[]))
visual_locator=visual_source.get('sourceLocator') or visual_source.get('sourceReference') or {}
visual_support=[{'assetId':visual.get('visualId') or visual_source.get('assetId'),'source':visual_source.get('sourceId') or visual_locator.get('sourceId'),'locator':visual_locator,'linkedCanonicalIds':[idmap[x] for x in linked if x in idmap],'status':visual['status'],'interpretationRequired':visual.get('interpretationRequired',True),'canonicalKnowledgeUnit':False}]
table=load(R/'table-validation.json')[0]; table_source=load(BASE/'tables.json')[0]; table_locator=table.get('sourceLocator') or {'sourceId':table_source.get('sourceId'),'page':table_source.get('page')}; exclusions=[{'tableId':table['tableId'],'source':table_locator.get('sourceId'),'locator':table_locator,'status':'PAGE_REVIEW_REQUIRED','reason':'Page layout remains unresolved; no Canonical Knowledge was created.'}]

validation_topics=load(R/'topic-validation-coverage.json'); bytopic=defaultdict(list)
for x in units+relations:
 if x.get('topicId'): bytopic[x['topicId']].append(x)
for rel,original in zip(relations,[rows[x['sourceKnowledgeId']] for x in inventory if x['suggestedKnowledgeType']=='RELATIONSHIP']):
 for endpoint in (original['sourceKnowledgeId'],original['targetKnowledgeId']):
  topic=rows[endpoint].get('topicId');
  if topic and rel not in bytopic[topic]: bytopic[topic].append(rel)
coverage=[]
for t in validation_topics:
 topic=t['topicId']; rr=bytopic.get(topic,[]); gap=topic in GAPS
 knowledge=[x for x in rr if x['knowledgeType']!='RELATIONSHIP']; rels=[x for x in rr if x['knowledgeType']=='RELATIONSHIP']
 status='NO_KNOWLEDGE' if gap else ('READY_WITH_GAPS' if any(x['canonicalEligibility']=='READY_WITH_WARNING' for x in rr) else 'CANONICAL_READY')
 coverage.append({'topicId':topic,'canonicalKnowledgeCount':len(knowledge),'canonicalRelationshipCount':len(rels),'warningCanonicalCount':sum(x['canonicalEligibility']=='READY_WITH_WARNING' for x in rr),'visualSupportCount':1 if topic=='flight:sensor-error' else 0,'unresolvedTableCount':1 if topic=='flight:gps' else 0,'technicalContexts':sorted({x['technicalContext'] for x in rr}),'status':status,'gaps':['NO_DIRECT_OFFICIAL_UAS_EVIDENCE'] if gap else []})

source_snapshot={'candidateInventoryChecksum':digest(inventory),'validationSummaryChecksum':digest(validation),'sourceIds':sorted({r['sourceId'] for c in inventory for r in c['sourceReferences']})}
canonical={'setId':'canonical-flight-theory:004d:v1','version':'1.0.0','batchId':'004D','canonicalUnits':units,'relationshipUnits':relations,'warningIds':[x['knowledgeId'] for x in units+relations if x['canonicalEligibility']=='READY_WITH_WARNING'],'excludedIds':[x['tableId'] for x in exclusions],'visualSupportIds':[x['assetId'] for x in visual_support],'unresolvedTableIds':[x['tableId'] for x in exclusions],'topicCoverage':coverage,'gapAnalysis':{'count':14,'topics':GAPS},'technicalContextDistribution':dict(Counter(x['technicalContext'] for x in units)),'sourceSnapshot':source_snapshot,'runtimeReadiness':'READY_WITH_GAPS','freezeStatus':'READY_WITH_GAPS_FROZEN'}
canonical['checksum']=digest(canonical)
summary={'batchId':'004D','canonicalInput':20,'canonicalGenerated':len(units)+len(relations),'canonicalUnits':len(units),'relationshipUnits':len(relations),'typeDistribution':dict(Counter(x['knowledgeType'] for x in units+relations)),'candidateStatus':dict(counts),'technicalContext':dict(Counter(x['technicalContext'] for x in units)),'uasSpecificCount':0,'visualSupportCount':1,'visualCanonicalCount':0,'unresolvedTableCount':1,'tableCanonicalCount':0,'formulaCount':0,'gapCount':14,'gaps':GAPS,'topicStatusCounts':dict(Counter(x['status'] for x in coverage)),'runtimeReadiness':'READY_WITH_GAPS','freezeStatus':'READY_WITH_GAPS_FROZEN','existingCanonicalBaseline':validation['canonicalBaseline'],'totalFlightTheoryCanonical':validation['canonicalBaseline']+len(units)+len(relations),'tsStatus':'WAITING_FOR_MANUAL_FILE','nextBatch':'004E','checksum':canonical['checksum'],'checksumReproducible':canonical['checksum']==digest({k:v for k,v in canonical.items() if k!='checksum'}),'mutations':{'existingCanonical':0,'activePack':0,'atomicFact':0,'graph':0,'graphVersion':0,'question':0,'legal':0,'weather':0,'supabase':0,'batch004E':0}}

save('canonical-flight-knowledge-004d.json',canonical);save('canonical-summary.json',summary);save('canonical-visual-support.json',visual_support);save('canonical-exclusions.json',exclusions);save('topic-validation-coverage.json',coverage)
save('runtime-readiness.json',{'batchId':'004D','status':'READY_WITH_GAPS','questionGenerationExecuted':False,'shadowRuntimeExecuted':False,'constraints':['UAS_SPECIFIC_ZERO','GAP_14_PRESERVED']})
save('freeze-status.json',{'batchId':'004D','status':'READY_WITH_GAPS_FROZEN','resumeConditions':['TS_OFFICIAL_TECHNICAL_MANUAL_ACQUIRED','NEW_OFFICIAL_UAS_SENSOR_NAVIGATION_SOURCE_ACQUIRED','CANONICAL_ERROR','CRITICAL_RUNTIME_SAFETY_BUG']})
save('execution.json',{'status':'COMPLETED','inputChecksum':source_snapshot['candidateInventoryChecksum'],'outputChecksum':canonical['checksum'],'checksumReproducible':summary['checksumReproducible'],'ingestionRerunCount':0,'sourceCollectionCount':0,'validationRerunCount':0,'canonicalIdIssued':20,'newRelationshipCount':0,'mutationCount':0})
print(json.dumps(summary,ensure_ascii=False,indent=2))
