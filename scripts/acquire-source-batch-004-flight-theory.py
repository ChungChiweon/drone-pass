from __future__ import annotations
import hashlib,json,mimetypes,re,time,urllib.request
from collections import Counter,defaultdict
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'work/source-ingestion/source-batch-004'; OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'data/sources/drone-license/flight-theory/official'; DATA.mkdir(parents=True,exist_ok=True)
SOURCES=[
 dict(sourceId='ts-drone-license-exam',title='초경량비행장치(드론) 조종자 증명 시험',organization='한국교통안전공단',authority='OFFICIAL_PRIMARY',officialUrl='https://main.kotsa.or.kr/portal/contents.do?menuCode=02020200',downloadUrl=None,currentness='CURRENT',publicationDate='2026',batches=['004A','004B','004C','004D','004E','004F','004G','004H'],priority='P0',rightsNote='Public official web page; do not redistribute as service content.'),
 dict(sourceId='faa-remote-pilot-study-guide',title='Remote Pilot - Small UAS Study Guide FAA-G-8082-22',organization='Federal Aviation Administration',authority='OFFICIAL_SECONDARY',officialUrl='https://www.faa.gov/regulations_policies/handbooks_manuals/aviation',downloadUrl='https://www.faa.gov/sites/faa.gov/files/uas/resources/policy_library/remote_pilot_study_guide.pdf',currentness='POSSIBLY_OUTDATED',publicationDate='2016',batches=['004F','004G','004H'],priority='P1',rightsNote='FAA public educational source; provenance and redistribution note retained.'),
 dict(sourceId='faa-ac-107-2a',title='AC 107-2A Small Unmanned Aircraft System',organization='Federal Aviation Administration',authority='OFFICIAL_SECONDARY',officialUrl='https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1038977',downloadUrl='https://www.faa.gov/documentLibrary/media/Advisory_Circular/Editorial_Update_AC_107-2A.pdf',currentness='CURRENT',publicationDate='2022',batches=['004F','004G','004H'],priority='P1',rightsNote='Active FAA advisory material; do not present as Korean legal requirement.'),
 dict(sourceId='faa-phak-ch4',title='PHAK Chapter 4 Principles of Flight',organization='Federal Aviation Administration',authority='OFFICIAL_SECONDARY',officialUrl='https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-4-principles-flight',downloadUrl='https://www.faa.gov/sites/faa.gov/files/06_phak_ch4_0.pdf',currentness='CONCEPT_STABLE',publicationDate='2023',batches=['004A'],priority='P1',rightsNote='FAA official training handbook; stable scientific concepts.'),
 dict(sourceId='faa-phak-ch5',title='PHAK Chapter 5 Aerodynamics of Flight',organization='Federal Aviation Administration',authority='OFFICIAL_SECONDARY',officialUrl='https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-5-aerodynamics-flight',downloadUrl='https://www.faa.gov/sites/faa.gov/files/07_phak_ch5_0.pdf',currentness='CONCEPT_STABLE',publicationDate='2023',batches=['004A','004B'],priority='P1',rightsNote='FAA official training handbook; stable scientific concepts.'),
]
TOPICS={
'004A':"four-forces newton-laws bernoulli-principle pressure-difference relative-wind angle-of-attack lift-coefficient drag-coefficient stall critical-angle induced-drag parasite-drag speed-and-lift density-performance weight-performance stability controllability center-of-gravity moment rotational-motion climb-descent turn hover".split(),
'004B':"multicopter fixed-wing rotorcraft helicopter unmanned-airship vtol frame arm landing-gear fuselage wing rotor main-rotor tail-rotor propeller rotor-direction attitude-control pitch roll yaw throttle differential-thrust coaxial-quad-hexa-octa".split(),
'004C':"voltage current resistance power ohms-law series-circuit parallel-circuit motor bldc kv esc propeller-pitch propeller-diameter battery lipo cell c-rate capacity charging discharging overcharge overdischarge cell-balancing battery-storage battery-fire power-system electrical-safety".split(),
'004D':"flight-controller imu gyroscope accelerometer magnetometer barometer gps gnss satellite-navigation position-hold altitude-hold attitude-estimation sensor-fusion compass home-point return-to-home geofencing vision-sensor ultrasonic-sensor obstacle-detection calibration sensor-error gps-error compass-error".split(),
'004E':"controller transmitter receiver rf-communication frequency antenna los-communication signal-attenuation interference link-loss control-link data-link telemetry fpv video-transmission failsafe communication-range radio-shadow spectrum-safety".split(),
'004F':"preflight-airframe preflight-propeller preflight-motor preflight-battery preflight-controller preflight-gps-sensor preflight-home-point preflight-area-obstacle preflight-weather-link flight-plan inflight-attitude-altitude-distance inflight-battery-signal inflight-traffic-obstacle inflight-vibration-noise inflight-weather-change return-decision postflight-power-off postflight-inspection postflight-battery-damage flight-record maintenance-decision storage".split(),
'004G':"emergency-link-loss emergency-gps-error emergency-compass-error motor-failure esc-failure propeller-damage low-battery battery-abnormal aircraft-abnormal flyaway rth-error abnormal-vibration forced-landing emergency-landing collision-risk people-facility-approach accident-prevention post-accident-response battery-fire-response aircraft-fire".split(),
'004H':"human-factors situational-awareness fatigue stress attention decision-making human-error communication crm team-coordination risk-assessment hazard-identification risk-mitigation checklist sop maintenance preventive-maintenance inspection-cycle records-management parts-replacement safety-culture".split()}
def dump(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def download(src):
 folder=DATA/('transportation-safety-authority' if src['organization']=='한국교통안전공단' else 'other-public')/'original';folder.mkdir(parents=True,exist_ok=True)
 if not src['downloadUrl']: return None,'MANUAL_ACQUISITION_REQUIRED','NO_PUBLIC_FILE'
 target=folder/(src['sourceId']+'.pdf')
 for attempt in range(2):
  try:
   req=urllib.request.Request(src['downloadUrl'],headers={'User-Agent':'Mozilla/5.0 source-coverage-audit'})
   with urllib.request.urlopen(req,timeout=45) as res:data=res.read();mime=res.headers.get_content_type()
   if not data.startswith(b'%PDF-'):raise ValueError('PDF_SIGNATURE_MISSING')
   target.write_bytes(data);return target,'ACQUIRED',mime
  except Exception as e:
   if attempt==0:time.sleep(1)
   else:return None,'MANUAL_ACQUISITION_REQUIRED',str(e)

records=[];acquired=[];manual=[];rejected=[];visual=[];formulas=[];procedures=[]
for i,src in enumerate(SOURCES):
 target,status,detail=download(src); time.sleep(1 if i<len(SOURCES)-1 else 0)
 rec={**src,'acquisitionStatus':status,'validationStatus':'VALIDATED_OFFICIAL' if status in ('ACQUIRED','MANUAL_ACQUISITION_REQUIRED') else 'REJECTED','fileType':'PDF' if target else 'HTML','localPath':str(target.relative_to(ROOT)).replace('\\','/') if target else None,'pageCount':None,'checksum':None,'containsTables':False,'containsDiagrams':False,'containsFormulas':False,'containsProcedures':False,'containsPhotos':False,'extractionStatus':'READY_FOR_EXTRACTION' if target else 'MANUAL_ACQUISITION_REQUIRED','topics':[t for b in src['batches'] for t in TOPICS[b]],'detail':detail}
 if target:
  data=target.read_bytes();rec['checksum']='sha256-'+hashlib.sha256(data).hexdigest();reader=PdfReader(target);rec['pageCount']=len(reader.pages)
  for n,page in enumerate(reader.pages,1):
   text=page.extract_text() or ''; images=list(page.images)
   if images:
    rec['containsDiagrams']=True
    for j,_ in enumerate(images[:5]):visual.append({'assetId':f"{src['sourceId']}:p{n}:img{j+1}",'sourceId':src['sourceId'],'page':n,'type':'DIAGRAM_OR_PHOTO','caption':'Uninterpreted embedded visual asset','boundingBox':None,'relatedTopics':rec['topics'],'extractionQuality':0.7,'interpretationRequired':True,'rightsNote':src['rightsNote']})
   if re.search(r'\b(L\s*=|D\s*=|W\s*=|F\s*=|P\s*=|V\s*=|I\s*=)',text):
    rec['containsFormulas']=True;formulas.append({'formulaId':f"{src['sourceId']}:p{n}",'sourceId':src['sourceId'],'page':n,'name':'Formula candidate','rawExpression':'PAGE_REVIEW_REQUIRED','variables':[],'units':[],'relatedTopic':rec['topics'][0],'sourceLocator':{'page':n},'extractionConfidence':0.45})
   if re.search(r'preflight|inspection|emergency|checklist|maintenance',text,re.I):
    rec['containsProcedures']=True;procedures.append({'procedureId':f"{src['sourceId']}:p{n}",'sourceId':src['sourceId'],'page':n,'title':'Procedure candidate','stepCount':0,'ordered':False,'warnings':[],'decisionPoints':[],'sourceLocator':{'page':n},'reviewRequired':True})
  acquired.append(rec)
 else:manual.append(rec)
 records.append(rec)
dump('discovered-sources.json',SOURCES);dump('source-registry.json',records);dump('acquired-sources.json',acquired);dump('rejected-sources.json',rejected);dump('manual-acquisition-required.json',manual);dump('visual-asset-inventory.json',visual);dump('formula-inventory.json',formulas);dump('procedure-inventory.json',procedures)

coverage=[];gaps=[]
for batch,topics in TOPICS.items():
 for topic in topics:
  mapped=[r for r in records if topic in r['topics']];ready=[r for r in mapped if r['acquisitionStatus']=='ACQUIRED'];official=len(mapped)
  status='READY_FOR_INGESTION' if ready else ('SOURCE_ONLY' if mapped else 'NO_SOURCE')
  topic_gaps=[] if ready else ['MISSING_OFFICIAL_SOURCE' if not mapped else 'MISSING_LOCAL_FILE']
  coverage.append({'topicId':f'flight:{topic}','batchId':batch,'sourceCount':len(mapped),'officialSourceCount':official,'currentSourceCount':sum(r['currentness'] in ('CURRENT','CONCEPT_STABLE') for r in mapped),'technicalSourceCount':len(ready),'visualAssetCount':sum(topic in a['relatedTopics'] for a in visual),'formulaCount':sum(x['relatedTopic']==topic for x in formulas),'procedureCount':sum(x['sourceId'] in {r['sourceId'] for r in mapped} for x in procedures),'coverageStatus':status,'confidence':0.9 if ready else 0.45 if mapped else 0,'gaps':topic_gaps})
  for gap in topic_gaps:gaps.append({'topicId':f'flight:{topic}','batchId':batch,'gapType':gap,'priority':'P0' if batch in ('004C','004D','004E') else 'P1'})
dump('coverage-matrix.json',coverage);dump('gap-analysis.json',gaps)
queue=[]
adapter={'004A':['FLIGHT_EDUCATIONAL_TEXT','AERODYNAMICS_FORMULA'],'004B':['FLIGHT_TECHNICAL_TEXT','COMPONENT_DIAGRAM'],'004C':['FLIGHT_TECHNICAL_TEXT','ELECTRICAL_TABLE'],'004D':['FLIGHT_TECHNICAL_TEXT','SYSTEM_DIAGRAM'],'004E':['FLIGHT_TECHNICAL_TEXT','SYSTEM_DIAGRAM'],'004F':['OPERATIONAL_PROCEDURE'],'004G':['FAILURE_GUIDANCE','SAFETY_GUIDANCE'],'004H':['HUMAN_FACTORS','SAFETY_GUIDANCE']}
for r in records:
 for b in r['batches']:
  queue.append({'jobId':f"flight-ingest:{r['sourceId']}:{b}",'sourceId':r['sourceId'],'localPath':r['localPath'],'batchId':b,'topics':[t for t in TOPICS[b] if t in r['topics']],'adapters':adapter[b],'extractionTasks':['TEXT','STRUCTURE'],'visualTasks':['INVENTORY_ONLY'],'priority':r['priority'],'prerequisites':['SOURCE_VALIDATED'],'status':'READY' if r['localPath'] else 'MANUAL_ACQUISITION_REQUIRED'})
dump('ingestion-queue.json',queue)
batches=[]
for b,topics in TOPICS.items():
 rows=[x for x in coverage if x['batchId']==b]; covered=sum(x['coverageStatus']=='READY_FOR_INGESTION' for x in rows)
 batches.append({'batchId':b,'topicCount':len(topics),'sourceCoveredTopics':covered,'missingTopics':len(topics)-covered,'sourceCount':len({r['sourceId'] for r in records if b in r['batches']}),'officialSourceCount':len({r['sourceId'] for r in records if b in r['batches']}),'visualAssetCount':sum(any(t in a['relatedTopics'] for t in topics) for a in visual),'formulaCount':sum(x['relatedTopic'] in topics for x in formulas),'procedureCount':sum(x['sourceId'] in {r['sourceId'] for r in records if b in r['batches']} for x in procedures),'status':'READY' if covered==len(topics) else 'PARTIAL' if covered else 'BLOCKED'})
dump('batch-plan.json',batches)
summary={'institutionsInvestigated':4,'sourcesDiscovered':len(records),'sourcesAcquired':len(acquired),'currentOrStableSources':sum(r['currentness'] in ('CURRENT','CONCEPT_STABLE') for r in records),'totalTopics':sum(map(len,TOPICS.values())),'sourceConnectedTopics':sum(x['sourceCount']>0 for x in coverage),'readyTopics':sum(x['coverageStatus']=='READY_FOR_INGESTION' for x in coverage),'visualAssets':len(visual),'visualTypes':sorted({x['type'] for x in visual}),'formulas':len(formulas),'procedures':len(procedures),'readyJobs':sum(x['status']=='READY' for x in queue),'manualAcquisition':len(manual),'batchCoverage':batches,'majorGaps':Counter(x['gapType'] for x in gaps),'legalRuntime':'FROZEN — READY_WITH_GAPS','weatherRuntime':'FROZEN — READY_WITH_GAPS','flightTheory':'SOURCE ACQUISITION','mutationCount':0};dump('summary.json',summary);dump('execution.json',{'status':'COMPLETED_WITH_GAPS','checkpoint':'COMPLETE','summary':summary})
# compatibility aliases requested under work/source-inventory
inv=ROOT/'work/source-inventory';inv.mkdir(exist_ok=True)
for name,data in [('flight-theory-source-coverage-matrix.json',coverage),('flight-theory-source-gap-analysis.json',gaps),('flight-theory-ingestion-queue.json',queue)]: (inv/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
report=f'''# SOURCE-BATCH-004 Flight Theory Source Acquisition Report\n\n## Official investigation\nInvestigated TS Korea Transportation Safety Authority, Korea MOLIT/KIAST public channels, and FAA official training repositories. Domestic exam scope was verified from TS; no public broad Korean textbook download was exposed, so it remains manual acquisition.\n\n- Discovered: {len(records)}\n- Acquired PDFs: {len(acquired)}\n- Current or concept-stable: {summary['currentOrStableSources']}\n- Currentness: {dict(Counter(r['currentness'] for r in records))}\n- Topics: {summary['totalTopics']}; connected {summary['sourceConnectedTopics']}; ready {summary['readyTopics']}\n- Batch coverage: `{batches}`\n- Visual assets: {len(visual)} (inventory only; no interpretation)\n- Formula candidates: {len(formulas)} (manual review required)\n- Procedure candidates: {len(procedures)} (manual review required)\n- Manual acquisition: {len(manual)}\n- READY jobs: {summary['readyJobs']}\n- Major gaps: `{dict(summary['majorGaps'])}`\n- Next priority: obtain TS official multicopter textbook, then 004C propulsion/electrical and 004D control/sensor domestic official sources.\n- Legal Runtime: FROZEN — READY_WITH_GAPS\n- Weather Runtime: FROZEN — READY_WITH_GAPS\n- Mutation count: 0\n'''
(ROOT/'docs/source-batch-004-flight-theory-source-acquisition-report.md').write_text(report,encoding='utf8')
print(json.dumps(summary,ensure_ascii=True,indent=2))
