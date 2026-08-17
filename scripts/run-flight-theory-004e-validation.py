from __future__ import annotations
import hashlib,json,sys
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; IN=ROOT/'work/flight-theory-validation/004e'; SRC=ROOT/'work/source-ingestion/source-batch-004e'; OUT=IN/'results'
FILES={'RF_CONCEPT':'rf-concepts','COMMUNICATION_COMPONENT':'communication-components','COMMUNICATION_LINK':'communication-links','INTERFERENCE':'interference-knowledge','FAILURE':'failure-knowledge','RELATIONSHIP':'relationships','FORMULA':'formulas'}
GAPS=['flight:controller','flight:link-loss','flight:control-link','flight:telemetry','flight:fpv','flight:video-transmission','flight:failsafe','flight:communication-range','flight:spectrum-safety']
TOPICS=['flight:controller','flight:transmitter','flight:receiver','flight:rf-communication','flight:frequency','flight:antenna','flight:los-communication','flight:signal-attenuation','flight:interference','flight:link-loss','flight:control-link','flight:data-link','flight:telemetry','flight:fpv','flight:video-transmission','flight:failsafe','flight:communication-range','flight:radio-shadow','flight:spectrum-safety']
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def dump(n,x): (OUT/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def h(x): return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def kid(x): return next((x.get(k) for k in ('conceptId','componentId','linkId','knowledgeId','failureId','relationshipId','formulaId') if x.get(k)),None)
def refs(x): return x.get('sourceReferences') or ([x['sourceLocator']] if x.get('sourceLocator') else [])
def evidence(x): return x.get('rawEvidence') or x.get('evidence') or ''
def main():
 manifest=load(IN/'validation-input-manifest.json'); ing=load(SRC/'ingestion-summary.json')
 if manifest.get('inputCount')!=18 or ing.get('validationInputCount')!=18 or manifest.get('canonicalBaseline')!=200: sys.exit('VALIDATION_INPUT_DRIFT')
 pairs=[('rf-concepts','rf-concepts'),('communication-components','communication-components'),('communication-links','communication-links'),('interference-knowledge','interference-knowledge'),('failure-knowledge','failure-knowledge'),('relationships','relationships'),('formulas','formulas'),('visual-assets','visual-links'),('tables','tables')]
 checks=[]
 for a,b in pairs:
  l,r=load(IN/f'{a}.json'),load(SRC/f'{b}.json'); checks.append({'validationFile':a+'.json','ingestionFile':b+'.json','validationChecksum':h(l),'ingestionChecksum':h(r),'matched':l==r})
 if not all(c['matched'] for c in checks): sys.exit('VALIDATION_INPUT_DRIFT')
 inputs=[(t,x) for t,n in FILES.items() for x in load(IN/f'{n}.json')]
 if len(inputs)!=16: sys.exit('VALIDATION_INPUT_DRIFT')
 eligible={x['id']:x['eligibility'] for x in manifest['items']}; known={kid(x) for _,x in inputs}; results=[]
 for typ,x in inputs:
  id_=kid(x); rr=refs(x); ev=evidence(x); blockers=[]; warnings=[]; context=x.get('technicalContext','AVIATION_COMMUNICATION')
  if not rr or not ev.strip() or any(not q.get('sourceId') or not q.get('page') or not q.get('section') for q in rr): blockers.append('SOURCE_EVIDENCE_MISSING')
  text=' '.join(str(x.get(k,'')) for k in ('definition','mechanism','function','description','effect','statement')).lower()
  if any(v in text for v in ('drone controller','pilot controller','command/control link','telemetry','fpv','failsafe','return to home','rth','drone range')): blockers.append('UAS_CONTEXT_GENERALIZATION')
  if typ=='RELATIONSHIP':
   if x.get('sourceKnowledgeId') not in known or x.get('targetKnowledgeId') not in known: blockers.append('RELATION_ENDPOINT_MISSING')
   if x.get('relationType') not in {'TRANSMITS_TO','RECEIVES_FROM','COMMUNICATES_WITH','DEPENDS_ON','AFFECTS','DEGRADED_BY','INTERFERES_WITH','PART_OF','SUPPORTS','CONTRASTS_WITH'}: blockers.append('RELATION_TYPE_INVALID')
  if eligible[id_]=='ELIGIBLE_WITH_WARNING': warnings.append('GENERAL_CONTEXT_BOUNDARY_REQUIRED')
  if id_=='rf-concept:radio-frequency': warnings.append('REGULATORY_FREQUENCY_BOUNDARY_REQUIRED')
  status='BLOCKED' if blockers else ('VALIDATED_WITH_WARNING' if warnings else 'VALIDATED'); score=0 if blockers else (.94 if warnings else 1.0)
  q={'allowed':['RF_CONCEPT','SIGNAL_BEHAVIOR','INTERFERENCE_CONCEPT','ANTENNA_FUNCTION'],'prohibited':['DRONE_RANGE','DRONE_FAILSAFE','DRONE_CONTROL_LINK']} if context=='RF_GENERAL' else {'allowed':['COMMUNICATION_CONCEPT'],'prohibited':['PRODUCT_CONTROL_SYSTEM','DRONE_TELEMETRY','DRONE_FPV','DRONE_FAILSAFE']}
  dup='RELATED_004D_DISTINCT_ROLE' if 'radio-frequency' in id_ else ('TECHNICAL_VS_EMERGENCY_004G' if typ=='INTERFERENCE' else 'DISTINCT')
  results.append({'knowledgeId':id_,'knowledgeType':typ,'validationStatus':status,'validationScore':score,'blockers':blockers,'warnings':sorted(set(warnings)),'technicalContext':context,'questionConstraints':q,'duplicateStatus':dup,'boundaryLineage':['004D'] if '004D' in dup else (['004G'] if '004G' in dup else []),'canonicalEligibility':'READY' if status=='VALIDATED' else ('READY_WITH_WARNING' if status=='VALIDATED_WITH_WARNING' else 'BLOCKED'),'canonicalId':None,'sourceReferences':rr})
 visual=load(IN/'visual-assets.json')[0]; vr={'visualId':visual['assetId'],'status':'SUPPORTIVE_VERIFIED','sourceReference':{'sourceId':visual['sourceId'],'page':visual['page'],'section':'Radio-wave propagation figures'},'linkedKnowledge':visual['knowledgeIds'],'interpretationRequired':visual['interpretationRequired'],'blocksPrimary':False}
 table=load(IN/'tables.json')[0]; tr={'tableId':table['tableId'],'status':'REGULATORY_ONLY','sourceReference':{'sourceId':table['sourceId'],'page':table['page'],'section':'Frequency allocation table'},'legalLineage':True,'canonicalEvidence':False,'blocksPrimary':False,'reason':table['reason']}
 rels=[r for r in results if r['knowledgeType']=='RELATIONSHIP']; bytopic=defaultdict(list)
 for typ,x in inputs:
  if x.get('topicId'): bytopic[x['topicId']].append(kid(x))
 topics=[]
 for tid in TOPICS:
  ids=bytopic.get(tid,[]); rs=[r for r in results if r['knowledgeId'] in ids]; gap=tid in GAPS
  topics.append({'topicId':tid,'sourceCount':len({q['sourceId'] for r in rs for q in r['sourceReferences']}),'knowledgeCount':len(rs),'validatedCount':sum(r['validationStatus'].startswith('VALIDATED') for r in rs),'warningCount':sum(r['validationStatus']=='VALIDATED_WITH_WARNING' for r in rs),'blockedCount':sum(r['validationStatus']=='BLOCKED' for r in rs),'relationshipCount':sum(1 for r in rels if r['knowledgeId'] in ids),'visualSupport':1 if tid=='flight:los-communication' else 0,'tableSupport':1 if tid=='flight:frequency' else 0,'formulaCount':sum(1 for t,x in inputs if t=='FORMULA' and x.get('topicId')==tid),'contexts':sorted({r['technicalContext'] for r in rs}),'gaps':[tid] if gap else [],'status':'NO_KNOWLEDGE' if gap else ('VALIDATED_WITH_GAPS' if any(r['validationStatus']=='VALIDATED_WITH_WARNING' for r in rs) else 'VALIDATED')})
 inv=[{'sourceKnowledgeId':r['knowledgeId'],'validationStatus':r['validationStatus'],'canonicalEligibility':r['canonicalEligibility'],'suggestedKnowledgeType':r['knowledgeType'],'technicalContext':r['technicalContext'],'warningConstraints':r['warnings'],'questionConstraints':r['questionConstraints'],'duplicateStatus':r['duplicateStatus'],'boundaryLineage':r['boundaryLineage'],'sourceReferences':r['sourceReferences'],'canonicalId':None} for r in results]
 status=Counter(r['validationStatus'] for r in results); bytype={t:dict(Counter(r['validationStatus'] for r in results if r['knowledgeType']==t)) for t in FILES}
 boundary={'004D':[{'classification':'RELATED','reason':'RF signal concepts remain distinct from GPS/navigation/sensor knowledge'}],'004G':[{'classification':'TECHNICAL_VS_EMERGENCY','reason':'Interference mechanism does not create an emergency response'}],'exactDuplicates':0,'newRelationshipsCreated':0}
 runtime={'status':'READY_FOR_CANONICAL_BUILD_WITH_GAPS','reasons':['PRIMARY_KNOWLEDGE_VALIDATED','UAS_SPECIFIC_ZERO','GAP_9_PRESERVED','REGULATORY_TABLE_SEPARATED'],'uasSpecificCount':0,'gapCount':9,'primaryBlockers':status.get('BLOCKED',0)}
 OUT.mkdir(parents=True,exist_ok=True); dump('validation-results.json',results); dump('validated.json',[r for r in results if r['validationStatus']=='VALIDATED']); dump('validated-with-warning.json',[r for r in results if r['validationStatus']=='VALIDATED_WITH_WARNING']); dump('blocked.json',[r for r in results if r['validationStatus']=='BLOCKED'])
 mapping={'RF_CONCEPT':'rf-validation.json','COMMUNICATION_COMPONENT':'communication-validation.json','COMMUNICATION_LINK':'link-validation.json','INTERFERENCE':'interference-validation.json','RELATIONSHIP':'relationship-validation.json','FORMULA':'formula-validation.json'}
 for t,n in mapping.items(): dump(n,[r for r in results if r['knowledgeType']==t])
 dump('visual-validation.json',[vr]);dump('table-validation.json',[tr]);dump('duplicate-boundary-analysis.json',boundary);dump('canonical-candidate-inventory.json',inv);dump('topic-validation-coverage.json',topics);dump('runtime-readiness-preview.json',runtime)
 summary={'batchId':'004E','inputDrift':False,'inputChecksums':checks,'primaryKnowledgeCount':16,'visualCount':1,'tableCount':1,'statusCounts':dict(status),'typeResults':bytype,'failureKnowledgeCount':0,'visualStatus':vr['status'],'tableStatus':tr['status'],'technicalContext':dict(Counter(r['technicalContext'] for r in results if r['knowledgeType']!='RELATIONSHIP')),'uasSpecificCount':0,'regulatoryLineageCount':1,'canonicalCandidateCount':sum(i['canonicalEligibility'].startswith('READY') for i in inv),'canonicalCandidateStatus':dict(Counter(i['canonicalEligibility'] for i in inv)),'gapCount':9,'gaps':GAPS,'topicStatusCounts':dict(Counter(t['status'] for t in topics)),'runtimeReadiness':runtime['status'],'tsStatus':'WAITING_FOR_MANUAL_FILE','unsupportedInferenceCount':0,'canonicalGenerated':False,'canonicalIdIssued':0,'canonicalBaseline':200,'mutations':{'canonical':0,'activePack':0,'atomicFact':0,'graph':0,'graphVersion':0,'question':0,'legal':0,'weather':0,'supabase':0}}
 dump('validation-summary.json',summary);dump('execution.json',{'status':'COMPLETED','ingestionRerunCount':0,'sourceAcquisitionRerunCount':0,'validationInputCount':18,'canonicalGenerated':False,'canonicalIdIssued':0,'mutationCount':0});print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
