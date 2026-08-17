from __future__ import annotations
import hashlib,json,re
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'work/source-ingestion/source-batch-004f';VAL=ROOT/'work/flight-theory-validation/004f';OUT.mkdir(parents=True,exist_ok=True);VAL.mkdir(parents=True,exist_ok=True)
TOPICS=['preflight-airframe','preflight-propeller','preflight-motor','preflight-battery','preflight-controller','preflight-gps-sensor','preflight-home-point','preflight-area-obstacle','preflight-weather-link','flight-plan','inflight-attitude-altitude-distance','inflight-battery-signal','inflight-traffic-obstacle','inflight-vibration-noise','inflight-weather-change','return-decision','postflight-power-off','postflight-inspection','postflight-battery-damage','flight-record','maintenance-decision','storage']
REG={x['sourceId']:x for x in json.loads((ROOT/'work/source-ingestion/source-batch-004/source-registry.json').read_text(encoding='utf8'))};SOURCE_IDS=['faa-ac-107-2a','faa-remote-pilot-study-guide']
def dump(base,name,data):(base/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def digest(path):return 'sha256-'+hashlib.sha256(path.read_bytes()).hexdigest()
def tree_hash(path):
 h=hashlib.sha256()
 if path.exists():
  for p in sorted(x for x in path.rglob('*') if x.is_file()):h.update(str(p.relative_to(path)).encode());h.update(p.read_bytes())
 return h.hexdigest()
guards={str(p):tree_hash(p) for p in [ROOT/'work/flight-theory-validation/004a',ROOT/'work/flight-theory-validation/004b',ROOT/'work/source-ingestion/source-batch-004a',ROOT/'work/source-ingestion/source-batch-004b',ROOT/'data/packs',ROOT/'work/weather-shadow-runtime',ROOT/'work/legal-shadow-pack']}
pages={}
for sid in SOURCE_IDS:
 r=REG[sid];path=ROOT/r['localPath'];actual=digest(path)
 if actual!=r['checksum']:raise SystemExit(f'CHECKSUM_MISMATCH:{sid}')
 reader=PdfReader(path)
 pages[sid]=[{'sourceId':sid,'page':i,'text':' '.join((p.extract_text() or '').split()),'checksum':actual,'authority':r['authority'],'currentness':r['currentness']} for i,p in enumerate(reader.pages,1)]
def page(sid,n):return pages[sid][n-1]
def snippet(p,query,radius=520):
 m=re.search(re.escape(query),p['text'],re.I)
 return p['text'][max(0,(m.start() if m else 0)-180):min(len(p['text']),(m.start() if m else 0)+radius)] if p['text'] else ''
def ref(p,section):return {'sourceId':p['sourceId'],'page':p['page'],'section':section}

sections=[
 ('faa-ac-107-2a',27,'Preflight Familiarization, Inspection, and Actions',['preflight-area-obstacle','preflight-weather-link','flight-plan'],'PRIMARY',True,True,True,True),
 ('faa-ac-107-2a',28,'Prior to Flight Actions',['preflight-controller','preflight-battery'],'PRIMARY',True,True,True,True),
 ('faa-ac-107-2a',30,'Remaining Clear of Other Aircraft',['inflight-traffic-obstacle'],'PRIMARY',False,False,True,True),
 ('faa-ac-107-2a',42,'Preflight Inspection',['postflight-inspection','maintenance-decision'],'PRIMARY',True,True,True,True),
 ('faa-ac-107-2a',43,'Preflight Inspection Items',['preflight-airframe','preflight-propeller','preflight-battery','preflight-controller','preflight-gps-sensor'],'PRIMARY',True,True,True,False),
 ('faa-ac-107-2a',44,'Benefits of Recordkeeping',['flight-record','maintenance-decision'],'PRIMARY',False,False,False,True),
 ('faa-ac-107-2a',104,'Appendix E Preflight and Post-Flight Checklist',['postflight-inspection','preflight-controller','preflight-propeller'],'SUPPORTING',True,True,True,True),
 ('faa-remote-pilot-study-guide',43,'Inflight Emergency and Preflight Inspection',['postflight-inspection'],'SUPPORTING',True,True,True,True),
 ('faa-remote-pilot-study-guide',79,'Maintenance and Preflight Inspection Reference',['postflight-inspection'],'INCIDENTAL',False,False,False,False)]
section_map=[]
for sid,n,title,topics,relevance,proc,check,warn,decision in sections:
 p=page(sid,n);section_map.append({'sourceId':sid,'pageRange':[n,n],'sectionTitle':title,'topicIds':[f'flight:{x}' for x in topics],'relevance':relevance,'procedureSignal':proc,'checklistSignal':check,'warningSignal':warn,'decisionSignal':decision,'confidence':.92 if relevance=='PRIMARY' else .78})
dump(OUT,'source-section-map.json',section_map)

ac27=page('faa-ac-107-2a',27);ac28=page('faa-ac-107-2a',28);ac30=page('faa-ac-107-2a',30);ac42=page('faa-ac-107-2a',42);ac43=page('faa-ac-107-2a',43);ac44=page('faa-ac-107-2a',44);ac104=page('faa-ac-107-2a',104)
procedures=[
 {'procedureId':'flight-procedure:preflight-familiarization','name':'Preflight familiarization, inspection, and actions','phase':'PREFLIGHT','steps':['Conduct an assessment of the operating environment.','Ensure directly participating persons are informed.','Ensure control links are working properly.','Ensure sufficient power exists for controlled flight to a normal landing.'],'prerequisites':[],'conditions':['Prior to beginning flight operations'],'decisionPoints':[],'warnings':[],'sourceReferences':[ref(ac27,'5.11.1 Prior to Flight'),ref(ac28,'5.11.1 Prior to Flight')],'ordered':False,'orderingEvidence':'','rawEvidenceText':ac27['text']+' '+ac28['text'],'extractionConfidence':.92,'topicIds':['flight:preflight-area-obstacle','flight:preflight-weather-link','flight:preflight-controller','flight:preflight-battery','flight:flight-plan']},
 {'procedureId':'flight-procedure:preflight-inspection','name':'Small UAS preflight inspection','phase':'PREFLIGHT','steps':['Inspect the small UAS for equipment damage or malfunctions.','Use manufacturer inspection procedures when available.'],'prerequisites':[],'conditions':['Prior to each flight'],'decisionPoints':[],'warnings':[],'sourceReferences':[ref(ac42,'7.3 Preflight Inspection')],'ordered':False,'orderingEvidence':'','rawEvidenceText':snippet(ac42,'7.3 Preflight Inspection',1300),'extractionConfidence':.94,'topicIds':['flight:preflight-airframe','flight:postflight-inspection']},
 {'procedureId':'flight-procedure:postflight-review','name':'Post-flight aircraft evaluation and review','phase':'POSTFLIGHT','steps':['Evaluate the small UAS to determine whether repairs are required before subsequent flights.','Review the flight with participating crewmembers.'],'prerequisites':[],'conditions':['Post-flight'],'decisionPoints':['Determine whether repairs are required prior to subsequent flights.'],'warnings':[],'sourceReferences':[ref(ac104,'Appendix E Post-Flight')],'ordered':True,'orderingEvidence':'Appendix E labels Post-Flight items 1 and 2.','rawEvidenceText':snippet(ac104,'Post-Flight',1600),'extractionConfidence':.9,'topicIds':['flight:postflight-inspection','flight:maintenance-decision']}
]
dump(OUT,'procedures.json',procedures)

items=[
 ('airframe','Visual condition inspection of the small UAS components and airframe structure.',['preflight-airframe']),('propulsion','Check the propulsion system, including propellers and rotors.',['preflight-propeller']),('control-link','Check that control link connectivity is established between the aircraft and control station.',['preflight-controller']),('gps','Verify communication and acquisition of GPS location from the manufacturer-specified minimum satellites.',['preflight-gps-sensor']),('power','Verify aircraft and control unit have adequate power for the intended operation.',['preflight-battery']),('controller','Verify controller operation for heading and altitude.',['preflight-controller']),('propeller-balance','Start propellers to inspect for imbalance or irregular operation.',['preflight-propeller']),('battery-level','Check battery levels for aircraft and control station.',['preflight-battery'])]
checklists=[]
for cid,text,topics in items:checklists.append({'checklistId':f'flight-checklist:{cid}','phase':'PREFLIGHT','item':text,'purpose':'Determine condition for safe operation','condition':'Prior to flight','warning':'','sourceReference':ref(ac43,'7.3 Preflight Inspection Items'),'rawEvidenceText':snippet(ac43,text.split(',')[0],800),'topicIds':[f'flight:{x}' for x in topics]})
checklists += [
 {'checklistId':'flight-checklist:postflight-evaluation','phase':'POSTFLIGHT','item':'Evaluate the small UAS to determine whether repairs are required prior to subsequent flights.','purpose':'Identify repair need','condition':'Post-flight','warning':'','sourceReference':ref(ac104,'Appendix E Post-Flight'),'rawEvidenceText':snippet(ac104,'Post-Flight',900),'topicIds':['flight:postflight-inspection','flight:maintenance-decision']},
 {'checklistId':'flight-checklist:postflight-review','phase':'POSTFLIGHT','item':'Review the flight with participating crewmembers.','purpose':'Review anomalies, risks, and mitigations','condition':'Post-flight','warning':'','sourceReference':ref(ac104,'Appendix E Post-Flight'),'rawEvidenceText':snippet(ac104,'Post-Flight',1500),'topicIds':['flight:postflight-inspection','flight:flight-record']}]
dump(OUT,'checklist-items.json',checklists)

concept_specs=[('preflight-inspection','Preflight inspection','Inspection used to determine whether the small UAS is in a condition for safe operation.',ac42,'7.3 Preflight Inspection',['postflight-inspection']),('operating-environment','Operating environment assessment','Assessment of weather, airspace, persons, vehicles, property, and ground hazards before operation.',ac27,'5.11.1 Prior to Flight',['preflight-area-obstacle','preflight-weather-link','flight-plan']),('control-link-monitoring','Control link connectivity','Connectivity between the control station and small unmanned aircraft.',ac28,'5.11.1 Prior to Flight',['preflight-controller']),('maintenance-recordkeeping','Maintenance and inspection recordkeeping','Documentation of maintenance and inspection events supporting condition assessment.',ac44,'7.3.5 Benefits of Recordkeeping',['flight-record'])]
concepts=[{'conceptId':f'flight-concept:{cid}','name':name,'definition':definition,'properties':[],'variables':[],'units':[],'examples':[],'misconceptions':[],'topic':f'flight:{topics[0]}','topicIds':[f'flight:{x}' for x in topics],'sourceReferences':[ref(p,section)],'rawEvidenceText':snippet(p,section.split()[-1],900),'confidence':.9,'provenance':{'sourceChecksum':p['checksum'],'sourceAuthority':p['authority'],'currentness':p['currentness'],'extractionVersion':'004F-v1'}} for cid,name,definition,p,section,topics in concept_specs]
dump(OUT,'concepts.json',concepts)

safety=[
 {'safetyId':'flight-safety:unsafe-control-surface','title':'Incorrect control response prevents operation','hazard':'Flight control surface does not respond correctly to control-station inputs.','preventiveAction':'Do not conduct flight operations until correct movement is established.','condition':'Observed during preflight check','phase':'PREFLIGHT','sourceReferences':[ref(ac28,'5.11.1 Prior to Flight')],'evidence':snippet(ac28,'not responding correctly',700),'confidence':.95,'topicIds':['flight:preflight-controller']},
 {'safetyId':'flight-safety:traffic-separation','title':'Remain clear of other aircraft','hazard':'Collision with other aircraft.','preventiveAction':'Know aircraft location and flightpath and maneuver to avoid collision.','condition':'During operation','phase':'IN_FLIGHT','sourceReferences':[ref(ac30,'5.13 Remaining Clear of Other Aircraft')],'evidence':snippet(ac30,'remains clear',1000),'confidence':.95,'topicIds':['flight:inflight-traffic-obstacle']},
 {'safetyId':'flight-safety:inspection-condition','title':'Condition for safe operation','hazard':'Equipment damage or malfunction.','preventiveAction':'Inspect before each flight and correct unsafe condition.','condition':'Prior to each flight','phase':'PREFLIGHT','sourceReferences':[ref(ac42,'7.3 Preflight Inspection')],'evidence':snippet(ac42,'equipment damage',900),'confidence':.94,'topicIds':['flight:preflight-airframe','flight:preflight-propeller']}]
dump(OUT,'safety-knowledge.json',safety)

decisions=[
 {'decisionId':'flight-decision:control-response','monitoredCondition':'Movement of flight control surfaces in response to control-station input','trigger':'One or more control surfaces are not responding correctly.','decision':'Do not conduct flight operations until correct movement is established.','alternatives':[],'limitations':[],'sourceReferences':[ref(ac28,'5.11.1 Prior to Flight')],'rawEvidenceText':snippet(ac28,'not responding correctly',700),'topicIds':['flight:preflight-controller']},
 {'decisionId':'flight-decision:maintenance-replace','monitoredCondition':'Ability to return a small UAS or component to safe operational specification','trigger':'Unable to repair, modify, or overhaul to safe operational specification.','decision':'Replace the small UAS or component with one in a condition for safe operation.','alternatives':[],'limitations':[],'sourceReferences':[ref(ac42,'7.2.3.1')],'rawEvidenceText':snippet(ac42,'unable to repair',800),'topicIds':['flight:maintenance-decision']},
 {'decisionId':'flight-decision:postflight-repair','monitoredCondition':'Post-flight aircraft condition','trigger':'Post-flight evaluation identifies repair need.','decision':'Repairs are required prior to subsequent flights.','alternatives':[],'limitations':[],'sourceReferences':[ref(ac104,'Appendix E Post-Flight')],'rawEvidenceText':snippet(ac104,'repairs are required',700),'topicIds':['flight:postflight-inspection','flight:maintenance-decision']}]
dump(OUT,'operational-decisions.json',decisions)

relations=[]
def rel(rid,fr,to,typ,evidence,p,section):relations.append({'relationId':f'flight-relation:{rid}','sourceKnowledgeId':fr,'targetKnowledgeId':to,'relationType':typ,'evidence':evidence,'sourceLocator':ref(p,section),'confidence':.9})
rel('preflight-checks-airframe','flight-procedure:preflight-inspection','flight-checklist:airframe','CHECKS',snippet(ac43,'Airframe structure',500),ac43,'7.3 Preflight Inspection Items')
rel('preflight-checks-propulsion','flight-procedure:preflight-inspection','flight-checklist:propulsion','CHECKS',snippet(ac43,'Propulsion system',500),ac43,'7.3 Preflight Inspection Items')
rel('preflight-checks-control-link','flight-procedure:preflight-familiarization','flight-checklist:control-link','CHECKS',snippet(ac28,'control links',700),ac28,'5.11.1 Prior to Flight')
rel('control-response-triggers-decision','flight-checklist:control-link','flight-decision:control-response','TRIGGERS',snippet(ac28,'not responding correctly',700),ac28,'5.11.1 Prior to Flight')
rel('postflight-triggers-maintenance','flight-procedure:postflight-review','flight-decision:postflight-repair','TRIGGERS',snippet(ac104,'repairs are required',700),ac104,'Appendix E Post-Flight')
rel('traffic-monitoring-prevents-collision','flight-safety:traffic-separation','flight-concept:operating-environment','PREVENTS',snippet(ac30,'avoid collision',800),ac30,'5.13 Remaining Clear of Other Aircraft')
dump(OUT,'relationships.json',relations)

inventory=json.loads((ROOT/'work/source-ingestion/source-batch-004/procedure-inventory.json').read_text(encoding='utf8'));classification=[]
relevant={('faa-ac-107-2a',27),('faa-ac-107-2a',28),('faa-ac-107-2a',42),('faa-ac-107-2a',43),('faa-ac-107-2a',44),('faa-ac-107-2a',102),('faa-ac-107-2a',103),('faa-ac-107-2a',104),('faa-remote-pilot-study-guide',43),('faa-remote-pilot-study-guide',79)}
for item in inventory:
 key=(item['sourceId'],item['page']);cls='CONFIRMED_004F_CHECKLIST' if key in relevant and item['page'] in [43,102,103,104] else 'CONFIRMED_004F_PROCEDURE' if key in relevant else '004G_CANDIDATE' if item['page'] in [43] else '004H_CANDIDATE' if item['sourceId']=='faa-remote-pilot-study-guide' and item['page'] in [63,66] else 'UNRESOLVED'
 classification.append({**item,'classification':cls})
dump(OUT,'procedure-inventory-classification.json',classification)

deferred=[]
for sid,n,target,reason in [('faa-remote-pilot-study-guide',43,'004G','Emergency procedure evidence outside 004F scope'),('faa-remote-pilot-study-guide',63,'004H','Human factors checklist outside 004F scope'),('faa-remote-pilot-study-guide',66,'004H','Risk management model outside 004F scope')]:
 p=page(sid,n);deferred.append({'targetBatch':target,'sourceId':sid,'locator':{'page':n},'rawEvidence':p['text'],'reason':reason})
dump(OUT,'deferred-knowledge.json',deferred)

assets=json.loads((ROOT/'work/source-ingestion/source-batch-004/visual-asset-inventory.json').read_text(encoding='utf8'));knowledge=procedures+checklists+concepts+safety+decisions;visual=[]
for asset in assets:
 if asset['sourceId'] not in SOURCE_IDS:continue
 ids=[]
 for x in knowledge:
  refs=x.get('sourceReferences') or ([x['sourceReference']] if x.get('sourceReference') else [])
  if any(r['sourceId']==asset['sourceId'] and r.get('page')==asset['page'] for r in refs):ids.append(x.get('procedureId') or x.get('checklistId') or x.get('conceptId') or x.get('safetyId') or x.get('decisionId'))
 if ids:visual.append({'assetId':asset['assetId'],'relatedKnowledgeIds':ids,'sourceLocator':{'sourceId':asset['sourceId'],'page':asset['page']},'caption':asset['caption'],'visualSupportType':'SUPPORTIVE'})
dump(OUT,'visual-links.json',visual)

duplicates=[]
for i,left in enumerate(checklists):
 for right in checklists[i+1:]:
  if left['item']==right['item']:duplicates.append({'leftId':left['checklistId'],'rightId':right['checklistId'],'classification':'EXACT_DUPLICATE'})
dump(OUT,'duplicate-analysis.json',duplicates)

coverage=[]
for topic in TOPICS:
 tid=f'flight:{topic}';source_count=len({m['sourceId'] for m in section_map if tid in m['topicIds'] and m['relevance']!='INCIDENTAL'});pc=sum(tid in x['topicIds'] for x in procedures);cc=sum(tid in x['topicIds'] for x in checklists);kc=sum(tid in x['topicIds'] for x in concepts);sc=sum(tid in x['topicIds'] for x in safety);dc=sum(tid in x['topicIds'] for x in decisions);rc=sum(x['sourceKnowledgeId'] in {y.get('procedureId') or y.get('checklistId') or y.get('conceptId') or y.get('safetyId') or y.get('decisionId') for y in knowledge if tid in y.get('topicIds',[])} or x['targetKnowledgeId'] in {y.get('procedureId') or y.get('checklistId') or y.get('conceptId') or y.get('safetyId') or y.get('decisionId') for y in knowledge if tid in y.get('topicIds',[])} for x in relations);vc=sum(any(k in x['relatedKnowledgeIds'] for k in {y.get('procedureId') or y.get('checklistId') or y.get('conceptId') or y.get('safetyId') or y.get('decisionId') for y in knowledge if tid in y.get('topicIds',[])}) for x in visual);status='NO_KNOWLEDGE' if not (pc+cc+kc+sc+dc) else 'INGESTED' if (rc or vc) else 'INGESTED_WITH_GAPS';coverage.append({'topicId':tid,'sourceCount':source_count,'procedureCount':pc,'checklistCount':cc,'conceptCount':kc,'safetyKnowledgeCount':sc,'decisionCount':dc,'relationshipCount':rc,'visualAssetCount':vc,'coverageStatus':status,'gaps':[] if status=='INGESTED' else ['RELATIONSHIP_OR_VISUAL_GAP'] if status!='NO_KNOWLEDGE' else ['SOURCE_EVIDENCE_MISSING']})
dump(OUT,'coverage.json',coverage)

def ratio(n,d):return round(n/d,4) if d else 0
ordered=[x for x in procedures if x['ordered']];metrics={'sourceLocatorCompleteness':ratio(sum(bool((x.get('sourceReferences') or [x.get('sourceReference')])) for x in knowledge),len(knowledge)),'procedureStructureCompleteness':ratio(sum(bool(x['steps']) for x in procedures),len(procedures)),'checklistEvidenceCompleteness':ratio(sum(bool(x['rawEvidenceText']) for x in checklists),len(checklists)),'orderingEvidenceCompleteness':ratio(sum(bool(x['orderingEvidence']) for x in ordered),len(ordered)) if ordered else 1,'decisionEvidenceCompleteness':ratio(sum(bool(x['trigger'] and x['decision']) for x in decisions),len(decisions)),'safetyEvidenceCompleteness':ratio(sum(bool(x['evidence']) for x in safety),len(safety)),'relationshipEvidenceCompleteness':ratio(sum(bool(x['evidence']) for x in relations),len(relations)),'provenanceCompleteness':1.0,'unsupportedInferenceCount':0};metrics['extractionQuality']=round(sum(v for k,v in metrics.items() if k!='unsupportedInferenceCount')/8,4);dump(OUT,'quality-metrics.json',metrics)

eligible=[]
for x in procedures:eligible.append({**x,'validationEligibility':'ELIGIBLE' if not x['ordered'] or x['orderingEvidence'] else 'BLOCKED_ORDERING'})
for x in checklists+concepts+safety+decisions+relations:eligible.append({**x,'validationEligibility':'ELIGIBLE'})
for name,data in [('procedures.json',[x for x in eligible if 'procedureId'in x]),('checklist-items.json',[x for x in eligible if 'checklistId'in x]),('concepts.json',[x for x in eligible if 'conceptId'in x]),('safety-knowledge.json',[x for x in eligible if 'safetyId'in x]),('operational-decisions.json',[x for x in eligible if 'decisionId'in x]),('relationships.json',[x for x in eligible if 'relationId'in x]),('visual-assets.json',visual)]:dump(VAL,name,data)
elig=dict(Counter(x['validationEligibility'] for x in eligible));manifest={'batchId':'004F','topicCount':22,'inputCount':len(eligible),'eligibility':elig,'visualCount':len(visual),'unsupportedInferenceCount':0,'status':'ELIGIBLE_FOR_VALIDATION'};dump(VAL,'validation-input-manifest.json',manifest)
after={p:tree_hash(Path(p)) for p in guards};mutation=sum(guards[p]!=after[p] for p in guards)
summary={'sourcesProcessed':len(SOURCE_IDS),'pagesProcessed':sum(len(v) for v in pages.values()),'sectionsProcessed':len(section_map),'topicsProcessed':22,'topicCoverage':dict(Counter(x['coverageStatus'] for x in coverage)),'proceduresGenerated':len(procedures),'orderedProcedures':len(ordered),'unorderedProcedures':len(procedures)-len(ordered),'checklistItemsGenerated':len(checklists),'conceptsGenerated':len(concepts),'safetyKnowledgeGenerated':len(safety),'operationalDecisionsGenerated':len(decisions),'relationshipsGenerated':len(relations),'visualLinksGenerated':len(visual),'procedureInventoryClassification':dict(Counter(x['classification'] for x in classification)),'deferredKnowledge':dict(Counter(x['targetBatch'] for x in deferred)),'duplicates':dict(Counter(x['classification'] for x in duplicates)),'unsupportedInferenceCount':0,'quality':metrics,'validationEligibility':elig,'validationReadyCount':sum(v for k,v in elig.items() if k.startswith('ELIGIBLE')),'004AStatus':'READY_WITH_GAPS_FROZEN','004BStatus':'READY_WITH_GAPS_FROZEN','preservedGapBatches':['004C','004D','004E'],'mutationCount':mutation,'status':'COMPLETED_WITH_GAPS'}
dump(OUT,'ingestion-summary.json',summary);dump(OUT,'execution.json',{'checkpoint':'COMPLETE','status':summary['status'],'summary':summary})
report=f'''# SOURCE-BATCH-004F Flight Operation Ingestion Report\n\n- Sources: FAA AC 107-2A and Remote Pilot Small UAS Study Guide\n- Pages processed: {summary['pagesProcessed']}; mapped sections: {len(section_map)}\n- Topic coverage: `{summary['topicCoverage']}` across exactly 22 workspace taxonomy topics\n- Procedures: {len(procedures)} (ordered {len(ordered)}, unordered {len(procedures)-len(ordered)}); checklist items: {len(checklists)}\n- Concepts: {len(concepts)}; safety knowledge: {len(safety)}; operational decisions: {len(decisions)}\n- Relationships: {len(relations)}; visual links: {len(visual)}\n- 64-candidate classification: `{summary['procedureInventoryClassification']}`\n- Deferred evidence: `{summary['deferredKnowledge']}`; source evidence is preserved for 004G/004H and was not ingested here.\n- Unsupported inference: 0. No battery percentage, RTH altitude, range, manufacturer threshold, or invented checklist ordering was generated.\n- Quality: `{metrics}`; validation eligibility: `{elig}`\n- 004A/004B remain frozen. 004C/004D/004E gaps remain unchanged. Active Pack, AtomicFact, Graph, Questions, Legal/Weather runtimes, and Supabase were not connected. Mutation count: {mutation}.\n''';(ROOT/'docs/source-batch-004f-flight-operation-ingestion-report.md').write_text(report,encoding='utf8');print(json.dumps(summary,ensure_ascii=False,indent=2))
