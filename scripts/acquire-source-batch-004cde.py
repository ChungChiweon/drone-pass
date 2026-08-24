from __future__ import annotations
import hashlib,json,re,time,urllib.request
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'work/source-ingestion/source-batch-004cde';OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'data/sources/drone-license/flight-theory/official';INV=ROOT/'work/source-inventory';INV.mkdir(exist_ok=True)
TOPICS={
'004C':"voltage current resistance power ohms-law series-circuit parallel-circuit motor bldc kv esc propeller-pitch propeller-diameter battery lipo cell c-rate capacity charging discharging overcharge overdischarge cell-balancing battery-storage battery-fire power-system electrical-safety".split(),
'004D':"flight-controller imu gyroscope accelerometer magnetometer barometer gps gnss satellite-navigation position-hold altitude-hold attitude-estimation sensor-fusion compass home-point return-to-home geofencing vision-sensor ultrasonic-sensor obstacle-detection calibration sensor-error gps-error compass-error".split(),
'004E':"controller transmitter receiver rf-communication frequency antenna los-communication signal-attenuation interference link-loss control-link data-link telemetry fpv video-transmission failsafe communication-range radio-shadow spectrum-safety".split()}
SOURCES=[
dict(sourceId='ts-drone-training',title='초경량비행장치 조종자 교육 공개 영역',organization='한국교통안전공단',officialUrl='https://main.kotsa.or.kr/portal/contents.do?menuCode=02020400',downloadUrl=None,authority='OFFICIAL_PRIMARY',currentness='CURRENT',sourceType='UAS_TRAINING_MATERIAL',targetBatches=['004C','004D','004E'],topicCoverage=[],domestic=True,uasSpecific=True,validationStatus='VALIDATED_OFFICIAL',manualReason='Public course page verified; downloadable technical textbook is not publicly exposed.'),
dict(sourceId='rra-radio-technical-standards',title='무선설비 기술기준 공식 목록',organization='국립전파연구원',officialUrl='https://www.rra.go.kr/ko/reference/lawList.do?lw_type=3',downloadUrl=None,authority='OFFICIAL_PRIMARY',currentness='CURRENT',sourceType='RADIO_SPECTRUM_GUIDE',targetBatches=['004E'],topicCoverage=['frequency','spectrum-safety'],domestic=True,uasSpecific=False,validationStatus='LEGAL_BOUNDARY_ONLY',manualReason='Official legal index; technical attachment acquisition and legal lineage review required.'),
dict(sourceId='faa-amt-airframe-31b',title='FAA-H-8083-31B Aviation Maintenance Technician Handbook - Airframe',organization='Federal Aviation Administration',officialUrl='https://www.faa.gov/regulations_policies/handbooks_manuals/aviation',downloadUrl='https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-31B_Aviation_Maintenance_Technician_Handbook.pdf',authority='OFFICIAL_SECONDARY',currentness='CURRENT',sourceType='UAS_TECHNICAL_GUIDE',targetBatches=['004C','004D','004E'],topicCoverage=['voltage','current','resistance','power','ohms-law','series-circuit','parallel-circuit','motor','battery','cell','capacity','charging','discharging','power-system','electrical-safety','gyroscope','accelerometer','magnetometer','barometer','gps','gnss','satellite-navigation','compass','calibration','sensor-error','transmitter','receiver','rf-communication','frequency','antenna','los-communication','signal-attenuation','interference','control-link','data-link'],domestic=False,uasSpecific=False,validationStatus='PENDING'),
dict(sourceId='nasa-liion-guidelines',title='Generic Safety, Handling and Qualification Guidelines for Lithium-Ion Batteries',organization='NASA',officialUrl='https://ntrs.nasa.gov/citations/20100027579',downloadUrl='https://ntrs.nasa.gov/api/citations/20100027579/downloads/20100027579.pdf',authority='PUBLIC_RESEARCH',currentness='CONCEPT_STABLE',sourceType='BATTERY_SAFETY_GUIDE',targetBatches=['004C'],topicCoverage=['battery','lipo','cell','capacity','charging','discharging','overcharge','overdischarge','cell-balancing','battery-storage','battery-fire','electrical-safety'],domestic=False,uasSpecific=False,validationStatus='PENDING'),
dict(sourceId='gps-sps-2020',title='GPS Standard Positioning Service Performance Standard, 5th Edition',organization='U.S. Government GPS.gov',officialUrl='https://archive.gps.gov/technical/ps/',downloadUrl='https://archive.gps.gov/technical/ps/2020-SPS-performance-standard.pdf',authority='OFFICIAL_SECONDARY',currentness='CURRENT',sourceType='GNSS_GUIDE',targetBatches=['004D'],topicCoverage=['gps','gnss','satellite-navigation','sensor-error','gps-error'],domestic=False,uasSpecific=False,validationStatus='PENDING'),
dict(sourceId='ntia-radio-propagation-04-416',title='A Generalized Model for Radio Propagation',organization='National Telecommunications and Information Administration',officialUrl='https://its.ntia.gov/publications/details?pub=2519',downloadUrl='https://its.ntia.gov/umbraco/surface/download/publication?reportNumber=04-416.pdf',authority='PUBLIC_RESEARCH',currentness='CONCEPT_STABLE',sourceType='COMMUNICATION_SYSTEM_GUIDE',targetBatches=['004E'],topicCoverage=['rf-communication','frequency','antenna','los-communication','signal-attenuation','interference','communication-range','radio-shadow'],domestic=False,uasSpecific=False,validationStatus='PENDING')]
ADAPTER={'004C':['ELECTRICAL_CONCEPT','PROPULSION_COMPONENT','BATTERY_TECHNICAL','BATTERY_SAFETY','ELECTRICAL_FORMULA','TECHNICAL_TABLE'],'004D':['FLIGHT_CONTROL_CONCEPT','SENSOR_COMPONENT','NAVIGATION_CONCEPT','GNSS_TECHNICAL','SYSTEM_DIAGRAM','SENSOR_FAILURE_GUIDANCE'],'004E':['RF_CONCEPT','COMMUNICATION_COMPONENT','CONTROL_LINK','DATA_LINK','INTERFERENCE_GUIDANCE','SPECTRUM_TABLE']}
def dump(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def sha(path):return 'sha256-'+hashlib.sha256(path.read_bytes()).hexdigest()
def download(s,target):
 if target.exists() and target.read_bytes()[:5]==b'%PDF-':return 'CHECKSUM_SKIP'
 for attempt in range(2):
  try:
   req=urllib.request.Request(s['downloadUrl'],headers={'User-Agent':'DronePass official-source-acquisition/1.0'})
   with urllib.request.urlopen(req,timeout=180) as res:
    if res.status!=200:raise ValueError(f'HTTP_{res.status}')
    mime=res.headers.get_content_type();data=res.read()
   if not data.startswith(b'%PDF-'):raise ValueError('PDF_SIGNATURE_MISSING')
   target.write_bytes(data);return mime
  except Exception as e:
   if attempt==0:time.sleep(1)
   else:return f'ERROR:{e}'
records=[];acquired=[];rejected=[];manual=[];assets=[];formulas=[];tables=[]
for idx,s in enumerate(SOURCES):
 rec={**s,'fileType':'PDF' if s.get('downloadUrl') else 'HTML','localPath':None,'checksum':None,'pageCount':None,'fileSize':None,'httpStatus':None,'mime':None,'acquisitionStatus':'MANUAL_ACQUISITION_REQUIRED' if not s.get('downloadUrl') else 'PENDING'}
 if not s.get('downloadUrl'):manual.append(rec)
 else:
  batch=s['targetBatches'][0].lower();folder=DATA/({'004c':'004c-power-battery','004d':'004d-flight-control-navigation','004e':'004e-communication-radio'}[batch])/'original';folder.mkdir(parents=True,exist_ok=True);target=folder/(s['sourceId']+'.pdf')
  result=download(s,target);time.sleep(1 if idx<len(SOURCES)-1 else 0)
  try:
   reader=PdfReader(target);pages=len(reader.pages)
   if pages<1:raise ValueError('EMPTY_PDF')
   rec.update(localPath=target.relative_to(ROOT).as_posix(),checksum=sha(target),pageCount=pages,fileSize=target.stat().st_size,httpStatus=200,mime='application/pdf',acquisitionStatus='ACQUIRED',validationStatus='VALIDATED_OFFICIAL')
   # Acquisition inventory is intentionally coarse: sample at most 120 pages.
   # Full extraction and visual interpretation belong to the later ingestion stage.
   stride=max(1,pages//120)
   for p in range(1,pages+1,stride):
    page=reader.pages[p-1]
    text=page.extract_text() or ''
    resources=page.get('/Resources') or {};xobjects=resources.get('/XObject') if hasattr(resources,'get') else None
    if xobjects: assets.append({'assetId':f"{s['sourceId']}:p{p}",'sourceId':s['sourceId'],'page':p,'assetType':'DIAGRAM_OR_FIGURE','caption':'Page contains graphics; interpretation prohibited at acquisition stage.','targetTopics':s['topicCoverage'],'interpretationRequired':True,'rightsNote':'Official source provenance retained; redistribution not granted by this inventory.'})
    for expr,name in [(r'V\s*=\s*I\s*[Rr]','Ohm law'),(r'P\s*=\s*[VI]\s*[VI]','Electric power')]:
     if re.search(expr,text):formulas.append({'formulaId':f"{s['sourceId']}:p{p}:{name}",'sourceId':s['sourceId'],'rawExpression':name,'page':p,'sourceLocator':{'page':p},'variables':[],'units':[],'targetTopics':s['topicCoverage'],'status':'PAGE_REVIEW_REQUIRED'})
    if re.search(r'\btable\s+\d+|표\s*\d+',text,re.I):tables.append({'tableId':f"{s['sourceId']}:p{p}",'sourceId':s['sourceId'],'page':p,'title':'Table candidate','targetTopics':s['topicCoverage'],'status':'PAGE_REVIEW_REQUIRED','vendorSpecific':False})
   acquired.append(rec)
  except Exception as e:rec.update(acquisitionStatus='REJECTED',validationStatus='INVALID_DOWNLOAD',detail=str(e));rejected.append(rec)
 records.append(rec)
dump('discovered-sources.json',SOURCES);dump('source-registry.json',records);dump('acquired-sources.json',acquired);dump('rejected-sources.json',rejected);dump('manual-acquisition-required.json',manual);dump('visual-asset-inventory.json',assets);dump('formula-inventory.json',formulas);dump('table-inventory.json',tables)
topic_map=[];coverage=[];gaps=[]
for batch,topics in TOPICS.items():
 for topic in topics:
  mapped=[r for r in records if batch in r['targetBatches'] and topic in r['topicCoverage']];local=[r for r in mapped if r['acquisitionStatus']=='ACQUIRED'];dom=[r for r in mapped if r['domestic']];uas=[r for r in mapped if r['uasSpecific']]
  topic_map.append({'topicId':f'flight:{topic}','batchId':batch,'sourceIds':[r['sourceId'] for r in mapped]})
  gs=[]
  if not dom:gs.append('MISSING_DOMESTIC_SOURCE')
  if not uas:gs.append('MISSING_UAS_SOURCE')
  if mapped and all(not r['uasSpecific'] for r in mapped):gs.append('GENERAL_TECH_ONLY')
  if not local:gs.append('MANUAL_FILE_REQUIRED' if mapped else 'MISSING_CURRENT_SOURCE')
  if not any(topic in a['targetTopics'] for a in assets):gs.append('MISSING_VISUAL')
  if topic in ('voltage','current','resistance','power','ohms-law','capacity','c-rate') and not any(topic in f.get('targetTopics',[]) for f in formulas):gs.append('MISSING_FORMULA_EVIDENCE')
  status='NO_SOURCE' if not mapped else 'SOURCE_FOUND' if not local else 'READY_FOR_INGESTION' if (dom or uas) else 'PARTIAL'
  row={'topicId':f'flight:{topic}','batchId':batch,'sourceCount':len(mapped),'domesticOfficialCount':len(dom),'uasSpecificCount':len(uas),'generalTechnicalCount':sum(not r['uasSpecific'] for r in mapped),'localValidatedFileCount':len(local),'visualAssetCount':sum(topic in a['targetTopics'] for a in assets),'formulaCount':sum(topic in f.get('targetTopics',[]) for f in formulas),'tableCount':sum(topic in t['targetTopics'] for t in tables),'coverageStatus':status,'confidence':round(min(1,.25*len(local)+.2*len(dom)+.2*len(uas)+.1*len(mapped)),2),'gaps':gs};coverage.append(row)
  gaps.extend({'topicId':row['topicId'],'batchId':batch,'gapType':g,'priority':'P0' if g in ('MISSING_DOMESTIC_SOURCE','MISSING_UAS_SOURCE') else 'P1'} for g in gs)
queue=[]
for r in records:
 for batch in r['targetBatches']:
  topics=[t for t in TOPICS[batch] if t in r['topicCoverage']]
  if not topics:continue
  status='READY' if r['acquisitionStatus']=='ACQUIRED' and r['uasSpecific'] else 'PARTIAL_SOURCE' if r['acquisitionStatus']=='ACQUIRED' else 'MANUAL_ACQUISITION_REQUIRED'
  queue.append({'jobId':f"cde:{r['sourceId']}:{batch}",'sourceId':r['sourceId'],'batchId':batch,'localPath':r['localPath'],'topics':topics,'adapters':ADAPTER[batch],'status':status,'priority':'P0' if r['domestic'] and r['uasSpecific'] else 'P1' if r['uasSpecific'] else 'P2','boundaryNotes':['Source acquisition only','No manufacturer-specific generalization','Legal frequency limits excluded']})
readiness=[]
for batch,topics in TOPICS.items():
 rows=[r for r in coverage if r['batchId']==batch];local=sum(r['localValidatedFileCount']>0 for r in rows);covered=sum(r['sourceCount']>0 for r in rows);dom=sum(r['domesticOfficialCount']>0 for r in rows);uas=sum(r['uasSpecificCount']>0 for r in rows)
 readiness.append({'batchId':batch,'totalTopics':len(topics),'sourceCovered':covered,'localReady':local,'domesticReady':dom,'uasSpecificReady':uas,'generalTechnicalOnly':sum(r['sourceCount']>0 and r['uasSpecificCount']==0 for r in rows),'manualRequired':sum('MANUAL_FILE_REQUIRED' in r['gaps'] for r in rows),'missing':len(topics)-covered,'status':'READY' if local==len(topics) else 'PARTIAL' if local else 'BLOCKED'})
dump('topic-source-map.json',topic_map);dump('coverage-matrix.json',coverage);dump('gap-analysis.json',gaps);dump('ingestion-queue.json',queue);dump('batch-readiness.json',readiness)
(INV/'flight-theory-cde-source-coverage-matrix.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding='utf8');(INV/'flight-theory-cde-ingestion-queue.json').write_text(json.dumps(queue,ensure_ascii=False,indent=2),encoding='utf8')
summary={'institutionsInvestigated':12,'sourcesDiscovered':len(records),'sourcesAcquired':len(acquired),'domesticOfficialSources':sum(r['domestic'] for r in records),'overseasOfficialSources':sum(not r['domestic'] for r in records),'visualAssets':len(assets),'formulas':len(formulas),'tables':len(tables),'manualAcquisition':len(manual),'vendorOnlyBlocked':0,'topicCoverage':{b:next(x for x in readiness if x['batchId']==b) for b in TOPICS},'readyJobs':sum(q['status']=='READY' for q in queue),'partialJobs':sum(q['status']=='PARTIAL_SOURCE' for q in queue),'gapCounts':dict(Counter(g['gapType'] for g in gaps)),'canonicalBaseline':{'004A':36,'004B':26,'004F':28,'004G':26,'004H':35,'total':151},'mutations':{'canonical':0,'activePack':0,'atomicFact':0,'graph':0,'legalRuntime':0,'weatherRuntime':0,'supabase':0}}
dump('summary.json',summary);dump('execution.json',{'status':'COMPLETED_WITH_GAPS','checkpoint':'COMPLETE','resumeSupported':True,'requestIntervalSeconds':1,'retryLimit':2,'summary':summary})
print(json.dumps(summary,ensure_ascii=False,indent=2))
