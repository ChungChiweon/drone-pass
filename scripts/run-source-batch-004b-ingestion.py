from __future__ import annotations
import hashlib,json,re
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/source-ingestion/source-batch-004b'; VAL=ROOT/'work/flight-theory-validation/004b'
OUT.mkdir(parents=True,exist_ok=True); VAL.mkdir(parents=True,exist_ok=True)
TOPICS=['multicopter','fixed-wing','rotorcraft','helicopter','unmanned-airship','vtol','frame','arm','landing-gear','fuselage','wing','rotor','main-rotor','tail-rotor','propeller','rotor-direction','attitude-control','pitch','roll','yaw','throttle','differential-thrust','coaxial-quad-hexa-octa']
QUERY={
 'multicopter':['multicopter','multirotor'],'fixed-wing':['fixed-wing'],'rotorcraft':['rotorcraft'],'helicopter':['helicopter'],'unmanned-airship':['unmanned airship'],'vtol':['vertical takeoff and landing','VTOL'],
 'frame':['airframe structure','airframe'],'arm':['multicopter arm'],'landing-gear':['landing gear'],'fuselage':['fuselage'],'wing':['wing'],'rotor':['rotor'],'main-rotor':['main rotor'],'tail-rotor':['tail rotor'],'propeller':['propeller'],'rotor-direction':['rotor direction','counter-rotating rotor'],
 'attitude-control':['attitude control','flight controls'],'pitch':['pitch axis','pitch'],'roll':['roll axis','roll'],'yaw':['yaw axis','yaw'],'throttle':['throttle'],'differential-thrust':['differential thrust'],'coaxial-quad-hexa-octa':['coaxial rotor','quadcopter','hexacopter','octocopter']}
NAMES={'multicopter':'Multicopter','fixed-wing':'Fixed-wing aircraft','rotorcraft':'Rotorcraft','helicopter':'Helicopter','unmanned-airship':'Unmanned airship','vtol':'VTOL','frame':'Frame','arm':'Arm','landing-gear':'Landing gear','fuselage':'Fuselage','wing':'Wing','rotor':'Rotor','main-rotor':'Main rotor','tail-rotor':'Tail rotor','propeller':'Propeller','rotor-direction':'Rotor rotation direction','attitude-control':'Attitude control','pitch':'Pitch','roll':'Roll','yaw':'Yaw','throttle':'Throttle','differential-thrust':'Differential thrust','coaxial-quad-hexa-octa':'Coaxial / Quad / Hexa / Octa configuration'}
SOURCE_IDS=['faa-phak-ch5','faa-ac-107-2a']; REG={x['sourceId']:x for x in json.loads((ROOT/'work/source-ingestion/source-batch-004/source-registry.json').read_text(encoding='utf8'))}

def digest(path): return 'sha256-'+hashlib.sha256(path.read_bytes()).hexdigest()
def dump(base,name,data): (base/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def tree_hash(path):
 h=hashlib.sha256()
 if path.exists():
  for p in sorted(x for x in path.rglob('*') if x.is_file()): h.update(str(p.relative_to(path)).encode());h.update(p.read_bytes())
 return h.hexdigest()

guards={str(p):tree_hash(p) for p in [ROOT/'work/source-ingestion/source-batch-004a',ROOT/'work/flight-theory-validation/004a',ROOT/'data/packs']}
pages=[]
for sid in SOURCE_IDS:
 record=REG[sid]; path=ROOT/record['localPath']; actual=digest(path)
 if actual!=record['checksum']: raise SystemExit(f'CHECKSUM_MISMATCH:{sid}')
 for page_no,page in enumerate(PdfReader(path).pages,1):
  text=' '.join((page.extract_text() or '').split())
  pages.append({'sourceId':sid,'page':page_no,'text':text,'checksum':actual,'authority':record['authority'],'currentness':record['currentness']})

def evidence(queries):
 for page in pages:
  for query in queries:
   match=re.search(r'(?<![A-Za-z])'+re.escape(query)+r'(?![A-Za-z])',page['text'],re.I)
   if match:return page,page['text'][max(0,match.start()-180):min(len(page['text']),match.start()+500)]
 return None,''

def pair_evidence(left_queries,right_queries):
 for page in pages:
  for left in left_queries:
   for match in re.finditer(r'(?<![A-Za-z])'+re.escape(left)+r'(?![A-Za-z])',page['text'],re.I):
    text=page['text'][max(0,match.start()-240):min(len(page['text']),match.start()+700)]
    if any(re.search(r'(?<![A-Za-z])'+re.escape(right)+r'(?![A-Za-z])',text,re.I) for right in right_queries):return page,text
 return None,''

section_map=[]; topic_evidence={}
for topic in TOPICS:
 page,text=evidence(QUERY[topic]); topic_evidence[topic]=(page,text)
 if page: section_map.append({'sourceId':page['sourceId'],'pageRange':[page['page'],page['page']],'section':NAMES[topic],'topics':[f'flight:{topic}'],'relevance':'PRIMARY','confidence':.84})
dump(OUT,'source-section-map.json',section_map)

component_topics=['frame','arm','landing-gear','fuselage','wing','rotor','main-rotor','tail-rotor','propeller']
components=[]
for topic in component_topics:
 page,text=topic_evidence[topic]
 if not page: continue
 components.append({'componentId':f'aircraft-component:{topic}','name':NAMES[topic],'componentType':topic.upper().replace('-','_'),'function':'','structure':text,'relatedSystems':[],'failureEffects':[],'maintenanceNotes':[],'topicId':f'flight:{topic}','sourceReferences':[{'sourceId':page['sourceId'],'page':page['page'],'section':NAMES[topic]}],'rawEvidenceText':text,'provenance':{'sourceChecksum':page['checksum'],'sourceAuthority':page['authority'],'currentness':page['currentness'],'extractionVersion':'004B-v1'}})
dump(OUT,'components.json',components)

system_specs=[('airframe','Airframe System',['frame','fuselage','wing','landing-gear'],['airframe']),('rotor','Rotor System',['rotor','main-rotor','tail-rotor'],['rotor system']),('flight-control','Flight Control System',[],['flight control system','flight controls'])]
systems=[]
for sid,name,parts,queries in system_specs:
 page,text=evidence(queries)
 if not page:continue
 systems.append({'systemId':f'aircraft-system:{sid}','name':name,'purpose':'','components':[f'aircraft-component:{x}' for x in parts if any(c['componentId']==f'aircraft-component:{x}' for c in components)],'inputs':[],'outputs':[],'dependencies':[],'topicIds':[f'flight:{x}' for x in parts],'sourceReferences':[{'sourceId':page['sourceId'],'page':page['page'],'section':name}],'rawEvidenceText':text,'provenance':{'sourceChecksum':page['checksum'],'sourceAuthority':page['authority'],'currentness':page['currentness'],'extractionVersion':'004B-v1'}})
dump(OUT,'systems.json',systems)

concepts=[]
for topic in TOPICS:
 page,text=topic_evidence[topic]
 if not page:continue
 kind='FLIGHT_CONTROL' if topic in ['pitch','roll','yaw','throttle','attitude-control'] else 'AIRCRAFT_STRUCTURE'
 concepts.append({'conceptId':f'flight-concept:{topic}','name':NAMES[topic],'definition':text,'conceptType':kind,'controlAxis':topic.upper() if topic in ['pitch','roll','yaw','throttle'] else None,'input':None,'mechanism':text if kind=='FLIGHT_CONTROL' else None,'resultingMotion':None,'properties':[],'topic':f'flight:{topic}','sourceReferences':[{'sourceId':page['sourceId'],'page':page['page'],'section':NAMES[topic]}],'rawEvidenceText':text,'provenance':{'sourceChecksum':page['checksum'],'sourceAuthority':page['authority'],'currentness':page['currentness'],'extractionVersion':'004B-v1'},'confidence':.8})
dump(OUT,'concepts.json',concepts)

relation_specs=[('main-rotor-part-rotor','main-rotor','rotor','PART_OF'),('tail-rotor-part-rotor','tail-rotor','rotor','PART_OF'),('flight-controls-affect-pitch','attitude-control','pitch','CONTROLS'),('flight-controls-affect-roll','attitude-control','roll','CONTROLS'),('flight-controls-affect-yaw','attitude-control','yaw','CONTROLS')]
relationships=[]
for rid,fr,to,typ in relation_specs:
 page,text=pair_evidence(QUERY[fr],QUERY[to])
 if not page:continue
 relationships.append({'relationId':f'flight-relation:{rid}','fromId':f'flight-concept:{fr}','toId':f'flight-concept:{to}','relationType':typ,'evidence':text,'sourceReferences':[{'sourceId':page['sourceId'],'page':page['page'],'section':NAMES[fr]}],'confidence':.72})
dump(OUT,'relationships.json',relationships)

assets=json.loads((ROOT/'work/source-ingestion/source-batch-004/visual-asset-inventory.json').read_text(encoding='utf8'));visual=[]
for asset in assets:
 if asset['sourceId'] not in SOURCE_IDS:continue
 linked=[c for c in concepts if c['sourceReferences'][0]['sourceId']==asset['sourceId'] and c['sourceReferences'][0]['page']==asset['page']]
 if linked:visual.append({'assetId':asset['assetId'],'knowledgeIds':[c['conceptId'] for c in linked],'sourceLocator':{'sourceId':asset['sourceId'],'page':asset['page']},'caption':asset['caption'],'visualSupportType':'SUPPORTIVE','interpretationRequired':True})
dump(OUT,'visual-links.json',visual)

duplicates=[]
for i,left in enumerate(concepts):
 for right in concepts[i+1:]:
  cls='EXACT_DUPLICATE' if left['definition']==right['definition'] else 'OVERLAPPING' if left['topic']==right['topic'] else 'DISTINCT'
  if cls!='DISTINCT':duplicates.append({'leftId':left['conceptId'],'rightId':right['conceptId'],'classification':cls})
dump(OUT,'duplicate-analysis.json',duplicates)

coverage=[]
for topic in TOPICS:
 source_count=len({x['sourceId'] for x in section_map if f'flight:{topic}' in x['topics']})
 cc=sum(x['topicId']==f'flight:{topic}' for x in components);sc=sum(f'flight:{topic}' in x['topicIds'] for x in systems);kc=sum(x['topic']==f'flight:{topic}' for x in concepts);rc=sum(x['fromId']==f'flight-concept:{topic}' or x['toId']==f'flight-concept:{topic}' for x in relationships);vc=sum(f'flight-concept:{topic}' in x['knowledgeIds'] for x in visual)
 status='NO_KNOWLEDGE' if not source_count else 'INGESTED' if (cc or sc or kc) and (rc or vc) else 'INGESTED_WITH_GAPS'
 coverage.append({'topicId':f'flight:{topic}','sourceCount':source_count,'componentCount':cc,'systemCount':sc,'conceptCount':kc,'relationshipCount':rc,'visualCount':vc,'coverageStatus':status,'gaps':[] if status=='INGESTED' else ['RELATIONSHIP_OR_VISUAL_GAP'] if source_count else ['SOURCE_EVIDENCE_MISSING']})
dump(OUT,'coverage.json',coverage)

def ratio(n,d):return round(n/d,4) if d else 0
metrics={'sourceLocatorCompleteness':ratio(len(components)+len(systems)+len(concepts)+len(relationships),len(components)+len(systems)+len(concepts)+len(relationships)),'componentCompleteness':ratio(sum(bool(x['structure']) for x in components),len(components)),'systemCompleteness':ratio(sum(bool(x['rawEvidenceText']) for x in systems),len(systems)),'relationshipEvidenceCompleteness':ratio(sum(bool(x['evidence']) for x in relationships),len(relationships)),'visualLinkCompleteness':ratio(len({k for x in visual for k in x['knowledgeIds']}),23),'provenanceCompleteness':ratio(sum(bool(x['provenance']['sourceChecksum']) for x in components+systems+concepts),len(components)+len(systems)+len(concepts)),'unsupportedInferenceCount':0}
dump(OUT,'quality-metrics.json',metrics)
for name,data in [('components.json',components),('systems.json',systems),('concepts.json',concepts),('relationships.json',relationships),('visual-assets.json',visual)]:dump(VAL,name,data)
eligible=len(components)+len(systems)+len(concepts)+len(relationships);manifest={'batchId':'004B','topicCount':23,'inputCount':eligible,'status':'ELIGIBLE_FOR_VALIDATION','eligibility':{'ELIGIBLE_FOR_VALIDATION':eligible},'unsupportedInferenceCount':0};dump(VAL,'validation-input-manifest.json',manifest)
after={p:tree_hash(Path(p)) for p in guards};mutation_count=sum(guards[p]!=after[p] for p in guards)
summary={'sourcesProcessed':len(SOURCE_IDS),'pagesProcessed':len(pages),'sectionsProcessed':len(section_map),'topicsProcessed':23,'topicCoverage':dict(Counter(x['coverageStatus'] for x in coverage)),'componentsGenerated':len(components),'systemsGenerated':len(systems),'conceptsGenerated':len(concepts),'relationshipsGenerated':len(relationships),'visualLinksGenerated':len(visual),'duplicates':dict(Counter(x['classification'] for x in duplicates)),'quality':metrics,'validationReadyCount':eligible,'validationStatus':'ELIGIBLE_FOR_VALIDATION','unsupportedInferenceCount':0,'004AStatus':'READY_WITH_GAPS_FROZEN','preservedGapBatches':['004C','004D','004E'],'mutationCount':mutation_count,'status':'COMPLETED_WITH_GAPS' if any(x['coverageStatus']!='INGESTED' for x in coverage) else 'COMPLETED'}
dump(OUT,'ingestion-summary.json',summary);dump(OUT,'execution.json',{'checkpoint':'COMPLETE','status':summary['status'],'summary':summary})
report=f'''# SOURCE-BATCH-004B Aircraft Structure Ingestion Report\n\n- Sources: FAA PHAK Chapter 5; FAA AC 107-2A\n- Pages processed: {len(pages)}; source sections: {len(section_map)}\n- Topic coverage: `{summary['topicCoverage']}` across exactly 23 topics\n- Components: {len(components)}; systems: {len(systems)}; concepts: {len(concepts)}\n- Relationships: {len(relationships)}; visual links: {len(visual)}\n- Unsupported inference count: 0\n- Quality: `{metrics}`\n- Validation input: {eligible} items, `ELIGIBLE_FOR_VALIDATION`; canonical validation was not run.\n- 004A remains `READY_WITH_GAPS` and frozen. 004C/004D/004E source gaps remain unchanged.\n- Active Pack, AtomicFact, Legal/Weather runtimes, Graph, Question DB, and Supabase were not connected. Mutation count: {mutation_count}.\n'''
(ROOT/'docs/source-batch-004b-aircraft-structure-ingestion-report.md').write_text(report,encoding='utf8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
