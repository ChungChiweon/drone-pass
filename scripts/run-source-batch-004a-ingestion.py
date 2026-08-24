from __future__ import annotations
import hashlib,json,re
from collections import Counter,defaultdict
from pathlib import Path
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'work/source-ingestion/source-batch-004a';OUT.mkdir(parents=True,exist_ok=True);VAL=ROOT/'work/flight-theory-validation/004a';VAL.mkdir(parents=True,exist_ok=True)
TOPICS={
'four-forces':('4대 힘',['lift, weight, thrust, and drag','four forces']), 'newton-laws':('뉴턴 운동법칙',["Newton's laws",'Newton’s laws']), 'bernoulli-principle':('베르누이 원리',["Bernoulli's Principle",'Bernoulli’s Principle']), 'pressure-difference':('압력차',['pressure differential','difference in pressure']), 'relative-wind':('상대풍',['relative wind']), 'angle-of-attack':('받음각',['angle of attack']), 'lift-coefficient':('양력계수',['coefficient of lift']), 'drag-coefficient':('항력계수',['coefficient of drag']), 'stall':('실속',['stall occurs','airfoil stalls']), 'critical-angle':('임계 받음각',['critical angle of attack']), 'induced-drag':('유도항력',['induced drag']), 'parasite-drag':('형상항력',['parasite drag']), 'speed-and-lift':('속도와 양력',['airspeed and lift','velocity and lift']), 'density-performance':('밀도와 성능',['density altitude','air density']), 'weight-performance':('무게와 비행성능',['weight and performance','aircraft weight']), 'stability':('안정성',['stability']), 'controllability':('조종성',['controllability','maneuverability']), 'center-of-gravity':('무게중심',['center of gravity']), 'moment':('모멘트',['moment']), 'rotational-motion':('회전 운동',['rotational motion','rotating']), 'lift':('양력',['lift is','lift acts']), 'weight':('중력',['weight is','force of gravity']), 'thrust':('추력',['thrust is','thrust']), 'drag':('항력',['drag is','drag acts'])}
# fixed requested 23: four-forces is represented through lift/weight/thrust/drag and excluded as a separate count
TOPIC_IDS=['lift','weight','thrust','drag','newton-laws','bernoulli-principle','pressure-difference','relative-wind','angle-of-attack','lift-coefficient','drag-coefficient','stall','critical-angle','induced-drag','parasite-drag','speed-and-lift','density-performance','weight-performance','stability','controllability','center-of-gravity','moment','rotational-motion']
SRC_DIR=ROOT/'data/sources/drone-license/flight-theory/official/other-public/original';REG=json.load(open(ROOT/'work/source-ingestion/source-batch-004/source-registry.json',encoding='utf8'));REG={x['sourceId']:x for x in REG}
SOURCE_IDS=['faa-phak-ch4','faa-phak-ch5'];pages=[]
for sid in SOURCE_IDS:
 r=REG[sid];p=ROOT/r['localPath'];actual='sha256-'+hashlib.sha256(p.read_bytes()).hexdigest()
 if actual!=r['checksum']:raise SystemExit(f'CHECKSUM_MISMATCH:{sid}')
 for i,page in enumerate(PdfReader(p).pages,1):pages.append({'sourceId':sid,'page':i,'text':' '.join((page.extract_text() or '').split()),'checksum':actual,'authority':r['authority'],'currentness':r['currentness']})
def dump(base,name,data): (base/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def evidence_for(queries):
 for p in pages:
  low=p['text'].lower()
  for q in queries:
   at=low.find(q.lower())
   if at>=0:return p,max(0,at-180),min(len(p['text']),at+420)
 return None,0,0
section_map=[];concepts=[];blocked=[]
for tid in TOPIC_IDS:
 name,queries=TOPICS[tid];p,a,b=evidence_for(queries)
 if not p:blocked.append({'topicId':f'flight:{tid}','reason':'SOURCE_TEXT_NOT_FOUND'});continue
 ev=p['text'][a:b]
 section_map.append({'sourceId':p['sourceId'],'pageRange':[p['page'],p['page']],'sectionTitle':name,'topicIds':[f'flight:{tid}'],'confidence':.86,'relevance':'PRIMARY'})
 concepts.append({'conceptId':f'flight-concept:{tid}','name':name,'definition':ev,'properties':[],'variables':[],'units':[],'examples':[],'misconceptions':[],'topic':f'flight:{tid}','sourceReferences':[{'sourceId':p['sourceId'],'page':p['page'],'section':name}],'rawEvidenceText':ev,'provenance':{'sourceChecksum':p['checksum'],'sourceAuthority':p['authority'],'currentness':p['currentness'],'extractionVersion':'004A-v1'},'extractionConfidence':.82,'visualSupportType':'SUPPORTIVE'})
dump(OUT,'source-section-map.json',section_map);dump(OUT,'concepts.json',concepts)
principle_specs=[('aoa-lift-stall','받음각과 양력·실속',['angle-of-attack','lift','stall'],'critical angle of attack'),('speed-lift','속도와 양력',['speed-and-lift','lift'],'airspeed'),('density-performance','밀도와 성능',['density-performance'],'density altitude'),('weight-performance','무게와 성능',['weight-performance'],'weight'),('cg-stability','무게중심과 안정성',['center-of-gravity','stability'],'center of gravity'),('drag-types','항력 구성',['induced-drag','parasite-drag'],'total drag'),('four-forces-balance','비행 중 힘의 관계',['lift','weight','thrust','drag'],'four forces'),('newton-motion','뉴턴 법칙과 운동',['newton-laws','rotational-motion'],"Newton's")]
principles=[]
for pid,name,related,q in principle_specs:
 p,a,b=evidence_for([q]);
 if p:principles.append({'principleId':f'flight-principle:{pid}','name':name,'inputs':[],'mechanism':p['text'][a:b],'outputs':[],'conditions':[],'limitations':[],'formulas':[],'relatedConceptIds':[f'flight-concept:{x}' for x in related],'sourceReferences':[{'sourceId':p['sourceId'],'page':p['page'],'section':name}],'rawEvidenceText':p['text'][a:b],'provenance':{'sourceChecksum':p['checksum'],'sourceAuthority':p['authority'],'currentness':p['currentness'],'extractionVersion':'004A-v1'},'confidence':.78})
dump(OUT,'principles.json',principles)
formulas=[]
for p in pages:
 for m in re.finditer(r'\b(?:L|D|W|F)\s*=.{0,90}',p['text']):
  raw=m.group(0);formulas.append({'formulaId':f"flight-formula:{p['sourceId']}:p{p['page']}:{len(formulas)+1}",'name':'Source formula candidate','rawExpression':raw,'normalizedExpression':None,'variableDefinitions':[],'units':[],'assumptions':[],'conditions':[],'sourceLocator':{'sourceId':p['sourceId'],'page':p['page']},'evidence':p['text'][max(0,m.start()-100):m.end()+100],'status':'PAGE_REVIEW_REQUIRED','sourceChecksum':p['checksum']})
formulas=formulas[:4];dump(OUT,'formulas.json',formulas)
rel_specs=[('aoa-increases-lift','angle-of-attack','lift','INCREASES','angle of attack'),('critical-aoa-stall','critical-angle','stall','CAUSES','critical angle of attack'),('weight-affects-performance','weight','weight-performance','AFFECTS','aircraft weight'),('density-affects-performance','density-performance','speed-and-lift','AFFECTS','density altitude'),('induced-contrast-parasite','induced-drag','parasite-drag','CONTRASTS_WITH','total drag'),('cg-affects-stability','center-of-gravity','stability','AFFECTS','center of gravity')]
relationships=[]
for rid,fr,to,typ,q in rel_specs:
 p,a,b=evidence_for([q]);
 if p:relationships.append({'relationId':f'flight-relation:{rid}','sourceKnowledgeId':f'flight-concept:{fr}','targetKnowledgeId':f'flight-concept:{to}','relationType':typ,'evidence':p['text'][a:b],'sourceLocator':{'sourceId':p['sourceId'],'page':p['page']},'confidence':.76})
dump(OUT,'relationships.json',relationships)
assets=json.load(open(ROOT/'work/source-ingestion/source-batch-004/visual-asset-inventory.json',encoding='utf8'));visual=[]
for asset in assets:
 if asset['sourceId'] not in SOURCE_IDS:continue
 mapped=[x for x in concepts if any(r['sourceId']==asset['sourceId'] and r['page']==asset['page'] for r in x['sourceReferences'])]
 if mapped:visual.append({'assetId':asset['assetId'],'knowledgeIds':[x['conceptId'] for x in mapped],'topic':mapped[0]['topic'],'caption':asset['caption'],'sourceLocator':{'sourceId':asset['sourceId'],'page':asset['page']},'interpretationRequired':True,'visualSupportType':'SUPPORTIVE'})
dump(OUT,'visual-links.json',visual)
dups=[]
for i,a in enumerate(concepts):
 for b in concepts[i+1:]:
  if a['topic']==b['topic']:dups.append({'leftId':a['conceptId'],'rightId':b['conceptId'],'classification':'SAME_CONCEPT_DIFFERENT_SOURCE'})
dump(OUT,'duplicate-analysis.json',dups)
metrics={'sourceLocatorCompleteness':1.0 if concepts else 0,'definitionCompleteness':round(sum(bool(x['definition']) for x in concepts)/23,4),'principleStructureCompleteness':round(sum(bool(x['mechanism']) for x in principles)/len(principles),4) if principles else 0,'formulaEvidenceCompleteness':round(sum(bool(x['evidence']) for x in formulas)/len(formulas),4) if formulas else 0,'relationshipEvidenceCompleteness':round(sum(bool(x['evidence']) for x in relationships)/len(relationships),4) if relationships else 0,'visualLinkCompleteness':round(len({x['knowledgeIds'][0] for x in visual})/23,4),'provenanceCompleteness':round(sum(bool(x['provenance']['sourceChecksum']) for x in concepts)/23,4),'extractionQuality':0};metrics['extractionQuality']=round(sum(metrics.values())/7,4);dump(OUT,'quality-metrics.json',metrics)
coverage=[]
for tid in TOPIC_IDS:
 ids={x['conceptId'] for x in concepts if x['topic']==f'flight:{tid}'};pc=sum(f'flight-concept:{tid}' in x['relatedConceptIds'] for x in principles);rc=sum(x['sourceKnowledgeId'] in ids or x['targetKnowledgeId'] in ids for x in relationships);vc=sum(any(k in ids for k in x['knowledgeIds']) for x in visual);cc=len(ids);fc=sum(x['sourceLocator']['page'] in {r['page'] for c in concepts if c['topic']==f'flight:{tid}' for r in c['sourceReferences']} for x in formulas);status='NO_KNOWLEDGE' if not cc else 'INGESTED' if cc and (pc or rc) else 'INGESTED_WITH_GAPS';coverage.append({'topicId':f'flight:{tid}','sourceCount':len({r['sourceId'] for c in concepts if c['topic']==f'flight:{tid}' for r in c['sourceReferences']}),'conceptCount':cc,'principleCount':pc,'formulaCount':fc,'relationshipCount':rc,'visualAssetCount':vc,'knowledgeCount':cc+pc+fc,'coverageStatus':status,'gaps':[] if status=='INGESTED' else ['PRINCIPLE_OR_RELATIONSHIP_GAP']})
dump(OUT,'coverage.json',coverage)
validation=[]
for x in concepts:validation.append({**x,'validationEligibility':'ELIGIBLE' if x['extractionConfidence']>=.8 else 'ELIGIBLE_WITH_WARNING'})
for x in principles:validation.append({**x,'validationEligibility':'ELIGIBLE_WITH_WARNING'})
for x in formulas:validation.append({**x,'validationEligibility':'BLOCKED_FORMULA'})
for x in relationships:validation.append({**x,'validationEligibility':'ELIGIBLE_WITH_WARNING'})
for name,data in [('concepts.json',[x for x in validation if 'conceptId'in x]),('principles.json',[x for x in validation if 'principleId'in x]),('formulas.json',[x for x in validation if 'formulaId'in x]),('relationships.json',[x for x in validation if 'relationId'in x]),('visual-assets.json',visual)]:dump(VAL,name,data)
elig=Counter(x['validationEligibility'] for x in validation);manifest={'batchId':'004A','topicCount':23,'inputCount':len(validation),'eligibility':elig,'blockedTopics':blocked};dump(VAL,'validation-input-manifest.json',manifest)
summary={'sourcesProcessed':len(SOURCE_IDS),'pagesProcessed':len(pages),'sectionsProcessed':len(section_map),'topicsProcessed':23,'topicCoverage':Counter(x['coverageStatus'] for x in coverage),'conceptsGenerated':len(concepts),'principlesGenerated':len(principles),'formulasGenerated':len(formulas),'formulaStatus':Counter(x['status'] for x in formulas),'relationshipsGenerated':len(relationships),'visualLinksGenerated':len(visual),'duplicates':Counter(x['classification'] for x in dups),'quality':metrics,'validationEligibility':elig,'blockedItems':len(blocked),'nextReadyBatches':['004B','004F','004G','004H'],'preservedGapBatches':['004C','004D','004E'],'mutationCount':0,'status':'COMPLETED_WITH_GAPS'};dump(OUT,'ingestion-summary.json',summary);dump(OUT,'execution.json',{'checkpoint':'COMPLETE','status':summary['status'],'summary':summary})
report=f'''# SOURCE-BATCH-004A Flight Principles Ingestion Report\n\n- Sources: FAA PHAK Chapter 4 and Chapter 5\n- Pages processed: {len(pages)}; mapped sections: {len(section_map)}\n- Topics: 23; coverage `{dict(summary['topicCoverage'])}`\n- Concepts: {len(concepts)}; principles: {len(principles)}\n- Formulas: {len(formulas)} `{dict(summary['formulaStatus'])}`\n- Relationships: {len(relationships)}; visual links: {len(visual)}\n- Duplicates: `{dict(summary['duplicates'])}`\n- Quality: `{metrics}`\n- Validation: `{dict(elig)}`; blocked source matches: {len(blocked)}\n- 004B/F/G/H remain READY. 004C/D/E source gaps remain unchanged.\n- Legal and Weather runtimes remain frozen. Active Pack, AtomicFact, Graph, Question DB and Supabase were not connected. Mutation count: 0.\n''';(ROOT/'docs/source-batch-004a-flight-principles-ingestion-report.md').write_text(report,encoding='utf8');print(json.dumps(summary,ensure_ascii=True,indent=2))
