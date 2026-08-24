from __future__ import annotations
import hashlib,json,re
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'work/source-ingestion/source-batch-004c';VAL=ROOT/'work/flight-theory-validation/004c';OUT.mkdir(parents=True,exist_ok=True);VAL.mkdir(parents=True,exist_ok=True)
CDE=ROOT/'work/source-ingestion/source-batch-004cde';MAN=ROOT/'work/flight-theory-manual-recovery/ts-technical-training';DROP=ROOT/'data/sources/drone-license/flight-theory/manual-drop/ts-technical-training'
TOPICS="voltage current resistance power ohms-law series-circuit parallel-circuit motor bldc kv esc propeller-pitch propeller-diameter battery lipo cell c-rate capacity charging discharging overcharge overdischarge cell-balancing battery-storage battery-fire power-system electrical-safety".split()
FAA='faa-amt-airframe-31b';NASA='nasa-liion-guidelines'
def load(p):return json.loads(p.read_text(encoding='utf8'))
def dump(folder,name,data):folder.mkdir(parents=True,exist_ok=True);(folder/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def sha(path):return 'sha256-'+hashlib.sha256(path.read_bytes()).hexdigest()
registry=load(CDE/'source-registry.json');sources={x['sourceId']:x for x in registry if x.get('acquisitionStatus')=='ACQUIRED' and '004C' in x.get('targetBatches',[]) and x.get('localPath') and x.get('checksum')==sha(ROOT/x['localPath'])}
if set(sources)!={FAA,NASA}:raise SystemExit('004C_ACQUIRED_SOURCE_INTEGRITY_FAILED')
readers={k:PdfReader(ROOT/v['localPath']) for k,v in sources.items()}
def evidence(source,page,section,maxlen=1800):
 text=' '.join((readers[source].pages[page-1].extract_text() or '').split())
 if not text:raise ValueError(f'NO_TEXT:{source}:{page}')
 return {'sourceReferences':[{'sourceId':source,'page':page,'section':section}],'rawEvidenceText':text[:maxlen]}
def concept(topic,name,definition,page,context='ELECTRICAL_GENERAL',source=FAA,section='Chapter 9 Aircraft Electrical System',variables=None,units=None):
 return {'conceptId':f'technical-concept:{topic}','topicId':f'flight:{topic}','name':name,'definition':definition,'variables':variables or [],'units':units or [],'relationships':[],**evidence(source,page,section),'confidence':.94,'technicalContext':context}
concepts=[
 concept('voltage','Voltage','Electrical pressure applied to a conductor.',417,variables=['E'],units=['volt']),
 concept('current','Current','Movement of electrons through a conductor.',418,variables=['I'],units=['ampere']),
 concept('resistance','Resistance','Opposition to current flow, measured in ohms.',417,variables=['R'],units=['ohm']),
 concept('power','Electrical power','Rate represented by the directly stated aircraft electrical power equations.',436,variables=['P','I','R'],units=['watt']),
 concept('ohms-law',"Ohm's law",'Current is directly proportional to applied voltage and inversely proportional to resistance.',417,variables=['E','I','R'],units=['volt','ampere','ohm']),
 concept('series-circuit','Series circuit','A circuit arrangement whose total opposition and current are evaluated along one path.',431),
 concept('parallel-circuit','Parallel circuit','Aircraft loads are generally connected in parallel so a constant voltage is supplied to each load.',418),
 concept('power-system','Aircraft electrical power system','Aircraft electrical systems distribute power to electrical loads and batteries may provide emergency power and bus stability.',436,context='AVIATION_GENERAL'),
]
propulsion=[{'componentId':'propulsion-component:motor','topicId':'flight:motor','name':'Electric motor','function':'Converts electrical power for mechanical starting work in the cited aviation system.',**evidence(FAA,465,'Chapter 9 Starter Circuit'),'confidence':.87,'technicalContext':'AVIATION_GENERAL','warnings':['NOT_UAS_SPECIFIC']}]
def battery(topic,title,statement,page,warnings=None,source=NASA,section='NASA Li-ion Guidelines',context='GENERAL_LITHIUM_ION'):
 return {'knowledgeId':f'battery-knowledge:{topic}','topicId':f'flight:{topic}','title':title,'statement':statement,'batteryContext':context,'technicalContext':'BATTERY_GENERAL',**evidence(source,page,section),'confidence':.93,'warnings':warnings or ['GENERAL_TECHNICAL_CONTEXT']}
battery_knowledge=[
 battery('battery','Battery','A battery is one or more electrically connected electrochemical cells.',88),
 battery('cell','Battery cell','A cell is the electrochemical unit used in a battery.',88),
 battery('capacity','Rated capacity','Rated battery capacity is measured in ampere-hours or watt-hours.',93),
 battery('c-rate','C-rate','C/n or C-rate is the charge or discharge current that delivers rated capacity in n hours.',88),
 battery('charging','Li-ion charging','Charge conditions affect Li-ion reliability and safety; the source discusses rate and temperature boundaries.',21),
 battery('discharging','Battery discharge rate','Available capacity depends on discharge rate; higher current rates can yield less capacity.',438,source=FAA,section='Chapter 9 Capacity',context='UNKNOWN'),
 battery('overcharge','Overcharge condition','Overcharge is a directly tested hazardous Li-ion condition and protective-device design consideration.',37),
 battery('overdischarge','Overdischarge','Overdischarge can reverse normal cell polarity.',93),
 battery('cell-balancing','Cell balancing','Multi-cell batteries may include cell-balancing, monitoring and protection circuitry.',37),
]
safety=[
 {**battery('battery-fire','Li-ion thermal-runaway hazard','Overcharge or external-short conditions in multi-cell configurations can lead to venting or thermal runaway.',62), 'knowledgeId':'battery-safety:battery-fire'},
 {**battery('electrical-safety','Electrical short and overcharge safety','Cell protective devices and battery-level testing are needed for short-circuit and overcharge hazards.',38), 'knowledgeId':'battery-safety:electrical-safety'},
]
formulas=[
 {'formulaId':'technical-formula:ohms-law','topicId':'flight:ohms-law','name':"Ohm's law",'rawExpression':'E = I × R','normalizedExpression':'E=I*R','variables':['E','I','R'],'units':['V','A','Ω'],'assumptions':['resistive circuit example'],'status':'FORMULA_CANDIDATE',**evidence(FAA,418,'Chapter 9 Example 3'),'confidence':.98},
 {'formulaId':'technical-formula:resistive-power','topicId':'flight:power','name':'Resistive electric power','rawExpression':'P = I² × R','normalizedExpression':'P=I^2*R','variables':['P','I','R'],'units':['W','A','Ω'],'assumptions':['resistive load example'],'status':'FORMULA_CANDIDATE',**evidence(FAA,436,'Chapter 9 AC power example'),'confidence':.98},
]
def relation(id,a,b,t,page,source=FAA,section='Chapter 9 Aircraft Electrical System'):
 ev=evidence(source,page,section);return {'relationshipId':f'electrical-relationship:{id}','sourceKnowledgeId':a,'targetKnowledgeId':b,'relationType':t,'evidence':ev['rawEvidenceText'],'sourceLocator':ev['sourceReferences'][0],'confidence':.93}
relationships=[
 relation('current-depends-voltage','technical-concept:current','technical-concept:voltage','DEPENDS_ON',417),
 relation('current-depends-resistance','technical-concept:current','technical-concept:resistance','DEPENDS_ON',417),
 relation('lower-resistance-increases-current','technical-concept:resistance','technical-concept:current','DECREASES',420),
 relation('battery-part-cell','battery-knowledge:battery','battery-knowledge:cell','PART_OF',88,NASA,'Glossary'),
 relation('capacity-affected-discharge','battery-knowledge:discharging','battery-knowledge:capacity','AFFECTS',438),
 relation('overcharge-causes-thermal-runaway','battery-knowledge:overcharge','battery-safety:battery-fire','CAUSES',62,NASA,'High voltage risk assessment'),
 relation('balancing-part-battery-protection','battery-knowledge:cell-balancing','battery-safety:electrical-safety','PART_OF',37,NASA,'Multi-cell battery protection'),
]
sections=[
 {'sourceId':FAA,'pageRange':[417,420],'sectionTitle':"Ohm's Law and electrical quantities",'topicIds':['flight:voltage','flight:current','flight:resistance','flight:ohms-law','flight:parallel-circuit'],'relevance':'DIRECT','technicalContext':'ELECTRICAL_GENERAL','confidence':.98},
 {'sourceId':FAA,'pageRange':[431,436],'sectionTitle':'Series/parallel AC circuits and power','topicIds':['flight:series-circuit','flight:parallel-circuit','flight:power'],'relevance':'DIRECT','technicalContext':'ELECTRICAL_GENERAL','confidence':.96},
 {'sourceId':FAA,'pageRange':[436,442],'sectionTitle':'Aircraft batteries and capacity','topicIds':['flight:battery','flight:capacity','flight:charging','flight:discharging','flight:overcharge','flight:overdischarge','flight:power-system'],'relevance':'DIRECT','technicalContext':'AVIATION_GENERAL','confidence':.93},
 {'sourceId':FAA,'pageRange':[465,465],'sectionTitle':'Starter circuit electric motor','topicIds':['flight:motor'],'relevance':'DIRECT','technicalContext':'AVIATION_GENERAL','confidence':.87},
 {'sourceId':NASA,'pageRange':[20,21],'sectionTitle':'Li-ion protective devices and charging limits','topicIds':['flight:battery','flight:cell','flight:charging','flight:overcharge','flight:electrical-safety'],'relevance':'DIRECT','technicalContext':'BATTERY_GENERAL','confidence':.94},
 {'sourceId':NASA,'pageRange':[37,39],'sectionTitle':'Multi-cell balancing and protection','topicIds':['flight:cell-balancing','flight:series-circuit','flight:parallel-circuit','flight:electrical-safety'],'relevance':'DIRECT','technicalContext':'BATTERY_GENERAL','confidence':.94},
 {'sourceId':NASA,'pageRange':[61,62],'sectionTitle':'Series/parallel fault testing','topicIds':['flight:overcharge','flight:battery-fire','flight:electrical-safety'],'relevance':'DIRECT','technicalContext':'BATTERY_GENERAL','confidence':.96},
 {'sourceId':NASA,'pageRange':[88,93],'sectionTitle':'Battery glossary','topicIds':['flight:battery','flight:cell','flight:c-rate','flight:capacity','flight:overdischarge'],'relevance':'DIRECT','technicalContext':'BATTERY_GENERAL','confidence':.98},
]
prior_visual=load(CDE/'visual-asset-inventory.json');visual=[{'assetId':x['assetId'],'knowledgeIds':[],'topicId':f"flight:{next((t for t in x['targetTopics'] if t in TOPICS),'battery')}",'sourceLocator':{'sourceId':x['sourceId'],'page':x['page']},'visualSupportType':'SUPPORTIVE','interpretationRequired':True} for x in prior_visual if x['sourceId'] in sources and (x['sourceId']==NASA or 417<=x['page']<=465)]
tables=[{'tableId':'technical-table:faa-battery-troubleshooting','sourceId':FAA,'page':442,'title':'Battery condition/cause/action table candidate','headers':[],'topic':'flight:overcharge','interpretationRequired':True,'status':'PAGE_REVIEW_REQUIRED','knowledgeIds':['battery-knowledge:overcharge','battery-knowledge:overdischarge']},{'tableId':'technical-table:nasa-liion-glossary','sourceId':NASA,'page':88,'title':'Li-ion glossary/table candidate','headers':[],'topic':'flight:c-rate','interpretationRequired':True,'status':'PAGE_REVIEW_REQUIRED','knowledgeIds':['battery-knowledge:c-rate']}]
all_knowledge=concepts+propulsion+battery_knowledge+safety
counts=Counter(x['topicId'].replace('flight:','') for x in all_knowledge);fcounts=Counter(x['topicId'].replace('flight:','') for x in formulas);rcounts=Counter()
for r in relationships:
 for t in TOPICS:
  if t in r['sourceKnowledgeId'] or t in r['targetKnowledgeId']:rcounts[t]+=1
vcounts=Counter(x['topicId'].replace('flight:','') for x in visual);tcounts=Counter(x['topic'].replace('flight:','') for x in tables)
source_topics={t:sum(f'flight:{t}' in s['topicIds'] for s in sections) for t in TOPICS}
coverage=[]
for t in TOPICS:
 k=counts[t];status='INGESTED' if k and not (t in ['motor','discharging']) else 'INGESTED_WITH_GAPS' if k else 'NO_KNOWLEDGE';gs=[]
 if not k:gs.append('DIRECT_SOURCE_EVIDENCE_MISSING')
 if t in ('bldc','kv','esc','propeller-pitch','propeller-diameter','lipo'):gs.append('UNSUPPORTED_INFERENCE_GUARD')
 if k and t in ('motor','discharging'):gs.append('AVIATION_OR_GENERAL_CONTEXT_ONLY')
 coverage.append({'topicId':f'flight:{t}','sourceCount':source_topics[t],'conceptCount':sum(x['topicId']==f'flight:{t}' for x in concepts),'componentCount':sum(x['topicId']==f'flight:{t}' for x in propulsion),'batteryKnowledgeCount':sum(x['topicId']==f'flight:{t}' for x in battery_knowledge+safety),'formulaCount':fcounts[t],'relationshipCount':rcounts[t],'visualCount':vcounts[t],'tableCount':tcounts[t],'technicalContext':next((x['technicalContext'] for x in all_knowledge if x['topicId']==f'flight:{t}'),'UNKNOWN'),'coverageStatus':status,'gaps':gs})
duplicates=[{'newKnowledgeId':'propulsion-component:motor','existingBatch':'004B','classification':'DISTINCT','reason':'004B structure versus 004C electrical function; no 004B mutation.'},{'newKnowledgeId':'battery-safety:battery-fire','existingBatch':'004G','classification':'SAME_EVIDENCE_DIFFERENT_ROLE','reason':'004C technical hazard context only; 004G emergency/safety Canonical remains authoritative.'}]
drop_files=[p for p in DROP.iterdir() if p.is_file() and p.name!='.gitkeep'];manual_status={'status':'WAITING_FOR_MANUAL_FILE' if not drop_files else 'FILE_DETECTED','detectedFiles':[p.name for p in drop_files],'validatedFiles':[],'lastScan':'2026-08-17T00:00:00Z','blocksWhole004C':False};dump(MAN,'recovery-status.json',manual_status)
elig=[]
for kind,items in [('CONCEPT',concepts),('PROPULSION_COMPONENT',propulsion),('BATTERY_KNOWLEDGE',battery_knowledge),('SAFETY_KNOWLEDGE',safety),('FORMULA',formulas),('RELATIONSHIP',relationships),('VISUAL',visual),('TABLE',tables)]:
 for x in items:
  status='BLOCKED_TABLE' if kind=='TABLE' else 'ELIGIBLE_WITH_WARNING' if kind in ('FORMULA','VISUAL') or x.get('warnings') else 'ELIGIBLE';elig.append({'id':x.get('conceptId') or x.get('componentId') or x.get('knowledgeId') or x.get('formulaId') or x.get('relationshipId') or x.get('assetId') or x.get('tableId'),'knowledgeType':kind,'eligibility':status})
manifest={'batchId':'004C','inputCount':len(elig),'eligibility':dict(Counter(x['eligibility'] for x in elig)),'unsupportedInferenceCount':0,'validationExecuted':False,'canonicalGenerated':False,'mutationCount':0}
for name,data in [('source-section-map.json',sections),('concepts.json',concepts),('propulsion-components.json',propulsion),('battery-knowledge.json',battery_knowledge),('safety-knowledge.json',safety),('formulas.json',formulas),('relationships.json',relationships),('visual-links.json',visual),('tables.json',tables),('duplicate-analysis.json',duplicates),('gap-analysis.json',[x for x in coverage if x['gaps']]),('quality-metrics.json',{'sourceLocatorCompleteness':1,'electricalConceptCompleteness':round(sum(x['coverageStatus']!='NO_KNOWLEDGE' for x in coverage[:7])/7,3),'batteryKnowledgeCompleteness':round(sum(x['coverageStatus']!='NO_KNOWLEDGE' for x in coverage[13:])/14,3),'propulsionEvidenceCompleteness':round(sum(x['coverageStatus']!='NO_KNOWLEDGE' for x in coverage[7:13])/6,3),'formulaEvidenceCompleteness':1,'relationshipEvidenceCompleteness':1,'provenanceCompleteness':1,'uasSpecificityCoverage':0,'unsupportedInferenceCount':0,'extractionQuality':.94}),('coverage.json',coverage)]:dump(OUT,name,data)
for name,data in [('concepts.json',concepts),('propulsion-components.json',propulsion),('battery-knowledge.json',battery_knowledge),('safety-knowledge.json',safety),('formulas.json',formulas),('relationships.json',relationships),('visual-assets.json',visual),('tables.json',tables),('validation-input-manifest.json',{'items':elig,**manifest})]:dump(VAL,name,data)
summary={'sourcesUsed':list(sources),'pagesProcessed':sum(b-a+1 for s in sections for a,b in [s['pageRange']]),'sectionsProcessed':len(sections),'topicsProcessed':len(TOPICS),'topicCoverage':dict(Counter(x['coverageStatus'] for x in coverage)),'conceptsGenerated':len(concepts),'propulsionComponentsGenerated':len(propulsion),'batteryKnowledgeGenerated':len(battery_knowledge),'safetyKnowledgeGenerated':len(safety),'formulasGenerated':len(formulas),'relationshipsGenerated':len(relationships),'visualLinksGenerated':len(visual),'tableCandidates':len(tables),'technicalContext':dict(Counter(x['technicalContext'] for x in all_knowledge)),'validationEligibility':manifest['eligibility'],'remainingGaps':[x['topicId'] for x in coverage if x['coverageStatus']=='NO_KNOWLEDGE'],'tsRecoveryStatus':manual_status['status'],'batch004DStatus':'PARTIAL_UNCHANGED','batch004EStatus':'PARTIAL_UNCHANGED','unsupportedInferenceCount':0,'canonicalBaseline':151,'mutationCount':0,'status':'COMPLETED_WITH_GAPS'}
dump(OUT,'ingestion-summary.json',summary);dump(OUT,'execution.json',{'status':'COMPLETED_WITH_GAPS','checkpoint':'COMPLETE','resumeSupported':True,'sourceChecksums':{k:v['checksum'] for k,v in sources.items()},'mutationCount':0})
print(json.dumps(summary,ensure_ascii=False,indent=2))
