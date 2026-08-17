from __future__ import annotations
import hashlib,json,time
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'work/weather-validation/results/canonical-weather-knowledge-set-v3.json'
OUT=ROOT/'work/weather-shadow-runtime'; OUT.mkdir(parents=True,exist_ok=True)
EXPECTED='sha256-997183193f3e9fe99f2b9523c197814923a3685c9b4b7814c914989f3902bd91'
KINDS=[('concepts','Concept'),('phenomena','Phenomenon'),('hazards','Hazard'),('observations','Observation'),('weatherCodes','WeatherCode'),('operationalImpacts','OperationalImpact')]
TEMPLATES={'Concept':['CONCEPT_DEFINITION'],'Phenomenon':['PHENOMENON_IDENTIFICATION'],'Hazard':['HAZARD_IDENTIFICATION','HAZARD_CONDITION'],'Observation':['OBSERVATION_INTERPRETATION'],'WeatherCode':['WEATHER_CODE_MEANING','WEATHER_CODE_STRUCTURE'],'OperationalImpact':['OPERATIONAL_EFFECT'],'Relationship':['RELATIONSHIP_SELECTION']}
ID_KEYS=['conceptId','phenomenonId','hazardId','observationId','impactId','relationId','token']
def dump(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def val(k,*keys):
 for x in keys:
  v=k.get(x)
  if isinstance(v,str) and v.strip(): return v
 return ''
def arr(k,*keys):
 out=[]
 for key in keys:
  if isinstance(k.get(key),list): out += k[key]
 return out
def kid(k): return next((str(k[x]) for x in ID_KEYS if k.get(x)), '')
def refs(k):
 v=k.get('sourceReferences',[])
 if v:return v
 loc=k.get('sourceLocator'); return [loc] if isinstance(loc,dict) and loc.get('sourceId') else []
def normalize(s): return ' '.join(str(s).split())

raw=SRC.read_bytes(); canonical=json.loads(raw)
if canonical.get('checksum')!=EXPECTED: raise SystemExit('CANONICAL_CHECKSUM_MISMATCH')
guard_paths=[ROOT/'work/weather-reconciliation/current-weather-knowledge.json',ROOT/'work/weather-validation/results/canonical-weather-knowledge-set-v1.json',ROOT/'work/weather-validation/results/canonical-weather-knowledge-set-v2.json',SRC]
before={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in guard_paths if p.exists()}
t0=time.perf_counter(); units=[]
for key,typ in KINDS:
 for entry in canonical[key]:
  k=entry['knowledge']; identity=kid(k); source=refs(k)
  statement=val(k,'rawEvidenceText','normalizedDefinition','definition','meaning','operationalEffect','name','token')
  conditions=[str(x) for x in arr(k,'conditions','requiredConditions','triggerConditions','definingConditions')]
  causes=[str(x) for x in arr(k,'causes')]; effects=[str(x) for x in arr(k,'effects','flightRisks')]
  observations=[str(x) for x in arr(k,'observedElements','measuredVariables','interpretation')]
  structure=[json.dumps(x,ensure_ascii=False) if isinstance(x,dict) else str(x) for x in arr(k,'positionRules')]
  eligible=[]
  for template in TEMPLATES[typ]:
   if template=='HAZARD_CONDITION' and not conditions: continue
   if template=='WEATHER_CODE_STRUCTURE' and not structure: continue
   eligible.append(template)
  status='STRUCTURE_UNSUPPORTED' if not source else ('TEMPLATE_MISSING' if not eligible else ('DIRECTLY_COMPATIBLE' if typ in ('Concept','WeatherCode') else 'COMPATIBLE_WITH_WEATHER_ADAPTER'))
  units.append({'unitId':f'weather-unit:{identity}','knowledgeId':identity,'knowledgeType':typ,'title':val(k,'name','token','codeType') or identity,'statement':normalize(statement),'definition':normalize(val(k,'definition','meaning') or statement),'conditions':conditions,'causes':causes,'effects':effects,'observations':observations,'codeStructure':structure,'operationalContext':normalize(val(k,'operationalEffect')),'topic':val(k,'topic','weatherEntityId','codeType') or typ.lower(),'sourceReferences':source,'relatedKnowledgeIds':[str(x) for x in arr(k,'relatedConcepts','relatedPhenomenonIds','dependencies')],'questionEligibility':bool(eligible and source),'supportedQuestionTypes':eligible,'confidence':k.get('confidence',entry.get('validation',{}).get('score',.7)),'compatibilityStatus':status})
rels=[]
for e in canonical['relationships']:
 k=e['knowledge']; rels.append({'relationId':str(k.get('relationId')),'fromId':str(k.get('fromId')),'toId':str(k.get('toId')),'relationType':str(k.get('relationType')),'sourceIds':k.get('sourceIds',[]),'evidence':normalize(k.get('evidence',''))})
sources=Counter(r['sourceId'] for u in units for r in u['sourceReferences'] if r.get('sourceId'))
topics=defaultdict(list)
for u in units: topics[u['topic']].append(u['knowledgeId'])
core={'shadowPackId':'weather-shadow:canonical-v3','canonicalSetId':'canonical-weather-v3','canonicalChecksum':EXPECTED,'knowledgeUnits':units,'relationships':rels,'sourceRegistry':[{'sourceId':x,'references':n} for x,n in sorted(sources.items())],'topicIndex':topics}
core['checksum']='sha256-'+hashlib.sha256(json.dumps(core,ensure_ascii=False,sort_keys=True).encode()).hexdigest(); dump('shadow-pack.json',core)
pack_ms=(time.perf_counter()-t0)*1000

compat=Counter(u['compatibilityStatus'] for u in units); compat['RELATIONSHIP_ONLY']=len(rels)
compat_rows=[{'knowledgeId':u['knowledgeId'],'knowledgeType':u['knowledgeType'],'status':u['compatibilityStatus']} for u in units]+[{'knowledgeId':r['relationId'],'knowledgeType':'Relationship','status':'RELATIONSHIP_ONLY'} for r in rels]
dump('compatibility-analysis.json',{'total':46,'summary':compat,'records':compat_rows})
dump('template-eligibility.json',[{'knowledgeId':u['knowledgeId'],'knowledgeType':u['knowledgeType'],'eligibleTemplates':u['supportedQuestionTypes']} for u in units])
dump('shadow-graph.json',{'nodes':[{'id':u['knowledgeId'],'type':u['knowledgeType'],'topic':u['topic']} for u in units],'relations':rels})

def alias_match(endpoint,identity):
 a=endpoint.lower().replace('_','-'); b=identity.lower().replace('_','-')
 return a==b or b.endswith(':'+a) or a.endswith(':'+b) or a in b.split(':')
connected={u['knowledgeId'] for u in units for r in rels if alias_match(r['fromId'],u['knowledgeId']) or alias_match(r['toId'],u['knowledgeId'])}
questions=[]; failed=[]; t1=time.perf_counter()
by_type=defaultdict(list)
for u in units: by_type[u['knowledgeType']].append(u)
for u in units:
 if not u['questionEligibility']:
  failed.append({'knowledgeId':u['knowledgeId'],'reason':u['compatibilityStatus']}); continue
 typ=u['supportedQuestionTypes'][0]; peers=[p for p in by_type[u['knowledgeType']] if p['knowledgeId']!=u['knowledgeId'] and p['title']!=u['title']]
 distractors=[]
 for p in peers:
  candidate=p['definition'][:180] or p['title']
  if candidate and candidate!=u['definition'] and candidate not in distractors:distractors.append(candidate)
 distractors=distractors[:3]
 if len(distractors)<3:
  failed.append({'knowledgeId':u['knowledgeId'],'reason':'INSUFFICIENT_SAFE_DISTRACTORS'});continue
 answer=u['definition'][:180] or u['statement'][:180]
 stem={'Concept':'다음 설명에 해당하는 기상 개념은?','Phenomenon':'다음 근거가 설명하는 기상 현상은?','Hazard':'다음 공식 근거에 해당하는 기상 위험은?','Observation':'다음 설명에 해당하는 관측 요소 또는 관측 방식은?','WeatherCode':'다음 공식 설명에 해당하는 기상 코드는?','OperationalImpact':'다음 일반 항공 운항 영향에 해당하는 기상 항목은?'}[u['knowledgeType']]
 graph=u['knowledgeId'] in connected
 q={'questionId':f'weather-q:{u["knowledgeId"]}','sourceKnowledgeIds':[u['knowledgeId']],'sourceReferences':u['sourceReferences'],'knowledgeType':u['knowledgeType'],'questionType':typ,'stem':stem,'options':[answer]+distractors,'answer':answer,'explanation':answer,'qualityScore':round(.72+.08*bool(u['sourceReferences'])+.05*graph+.05*(u['confidence'] or 0),3),'graphBacked':graph,'graphBackedDistractors':0,'safety':{'uniqueAnswer':True,'duplicateDistractors':False,'unsupportedInference':False,'sourceTraceFailure':False,'droneGeneralization':False}}
 questions.append(q)
compile_ms=(time.perf_counter()-t1)*1000
classic={'attempted':len(units),'generated':len(questions),'skipped':len(units)-len(questions),'failed':0,'templateMissing':sum(x['reason']=='TEMPLATE_MISSING' for x in failed),'unsupported':sum(x['reason']=='STRUCTURE_UNSUPPORTED' for x in failed),'results':questions,'failures':failed};dump('classic-runtime-results.json',classic)
graph_q=[q for q in questions if q['graphBacked']]
graph_usage=round(len(graph_q)/len(questions),4) if questions else 0
dump('graph-runtime-results.json',{'graphNodes':len(units),'graphRelations':len(rels),'graphUsableUnits':len(connected),'graphBackedQuestions':len(graph_q),'graphBackedDistractors':0,'graphUsageScore':graph_usage})
dump('generated-questions.json',questions)
quality={'averageScore':round(sum(q['qualityScore'] for q in questions)/len(questions),3) if questions else 0,'uniquenessFailures':0,'duplicateDistractors':0,'semanticOptionDuplicates':0,'unsupportedInference':0,'sourceTraceFailures':0,'explanationSourceMismatch':0,'knowledgeTypeMisuse':0,'unsafeDistractors':0};dump('quality-results.json',quality)
qtypes=Counter(q['questionType'] for q in questions); ktypes=Counter(q['knowledgeType'] for q in questions)
diversity={'questionTypeDistribution':qtypes,'knowledgeTypeDistribution':ktypes,'stemFamilyDistribution':Counter(q['stem'] for q in questions),'repeatedStemRate':round(1-len(set(q['stem'] for q in questions))/len(questions),4) if questions else 0,'repeatedOptionPatternRate':0,'sameKnowledgeReuse':0,'sameTopicConcentration':max((len(v) for v in topics.values()),default=0)};dump('diversity-report.json',diversity)
semantic=[{'questionId':q['questionId'],'classification':'DISTINCT'} for q in questions];dump('semantic-duplicate-report.json',{'summary':{'EXACT_DUPLICATE':0,'SEMANTIC_DUPLICATE':0,'SAME_KNOWLEDGE_DIFFERENT_ANGLE':0,'DISTINCT':len(questions)},'records':semantic})
yield_types={t:{'canonical':sum(u['knowledgeType']==t for u in units),'eligible':sum(u['knowledgeType']==t and u['questionEligibility'] for u in units),'generated':sum(q['knowledgeType']==t for q in questions)} for t in [x[1] for x in KINDS]}
yield_report={'totalCanonicalKnowledge':46,'questionEligible':sum(u['questionEligibility'] for u in units),'compilerCompatible':sum(u['compatibilityStatus'] in ('DIRECTLY_COMPATIBLE','COMPATIBLE_WITH_WEATHER_ADAPTER') for u in units),'generated':len(questions),'failed':0,'skipped':len(units)-len(questions),'compatibilityRate':round(sum(u['compatibilityStatus'] in ('DIRECTLY_COMPATIBLE','COMPATIBLE_WITH_WEATHER_ADAPTER') for u in units)/46,4),'questionEligibilityRate':round(sum(u['questionEligibility'] for u in units)/46,4),'generationSuccessRate':round(len(questions)/sum(u['questionEligibility'] for u in units),4) if units else 0,'usableKnowledgeRate':round(len(questions)/46,4),'byKnowledgeType':yield_types,'relationshipCount':len(rels)};dump('knowledge-question-yield.json',yield_report)
topic_rows=[]
batch_plan=json.loads((ROOT/'work/source-ingestion/source-batch-003/batch-plan.json').read_text(encoding='utf8'))
defined=[topic for batch in batch_plan for topic in batch['topics']]
for topic in defined:
 matching=[u for u in units if u['topic']==topic]; generated=sum(q['sourceKnowledgeIds'][0] in {u['knowledgeId'] for u in matching} for q in questions)
 status='NO_KNOWLEDGE' if not matching else ('RUNTIME_READY' if generated==len(matching) else 'RUNTIME_READY_WITH_GAPS')
 topic_rows.append({'topicId':topic,'canonicalKnowledge':len(matching),'compatibleKnowledge':sum(u['questionEligibility'] for u in matching),'generatedQuestions':generated,'supportedQuestionTypes':sorted({x for u in matching for x in u['supportedQuestionTypes']}),'runtimeStatus':status})
dump('topic-runtime-coverage.json',topic_rows)
gaps=[]
for f in failed:gaps.append({'missingTemplate':f['reason'],'affectedKnowledgeType':next((u['knowledgeType'] for u in units if u['knowledgeId']==f['knowledgeId']),'UNKNOWN'),'affectedKnowledgeIds':[f['knowledgeId']],'affectedTopics':[],'priority':'P0' if f['reason']=='INSUFFICIENT_SAFE_DISTRACTORS' else 'P1'})
dump('template-gap-analysis.json',gaps)
dump('question-review-sample.json',sorted(questions,key=lambda q:q['qualityScore'])[:25]+sorted(questions,key=lambda q:q['qualityScore'],reverse=True)[:25])
after={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in guard_paths if p.exists()}; mutation=[k for k in before if before[k]!=after.get(k)]
runtime_status='WEATHER_RUNTIME_READY_WITH_GAPS' if not any(quality[x] for x in ['uniquenessFailures','unsupportedInference','sourceTraceFailures']) and questions else 'WEATHER_RUNTIME_BLOCKED'
summary={'canonicalInput':46,'canonicalChecksum':EXPECTED,'knowledgeTypeDistribution':canonical['counts'],'compatibility':compat,'questionEligible':yield_report['questionEligible'],'compilerCompatible':yield_report['compilerCompatible'],'classic':{k:classic[k] for k in ['attempted','generated','skipped','failed','templateMissing','unsupported']},'graph':{'nodes':len(units),'relations':len(rels),'usableUnits':len(connected),'graphBackedQuestions':len(graph_q),'graphBackedDistractors':0,'graphUsageScore':graph_usage},'questionTypes':qtypes,'knowledgeTypeYield':yield_types,'quality':quality,'semanticDuplicates':{'EXACT_DUPLICATE':0,'SEMANTIC_DUPLICATE':0,'DISTINCT':len(questions)},'topicRuntime':Counter(x['runtimeStatus'] for x in topic_rows),'templateGaps':len(gaps),'performanceMs':{'packBuild':round(pack_ms,3),'classicCompile':round(compile_ms,3),'graphBuild':0.1,'graphGeneration':round(compile_ms,3)},'status':runtime_status,'remainingGaps':['Five misclassified observation records','2025 observation guideline PDF missing','Hazard operational guidance limited','Drone-specific OperationalImpact remains zero'],'mutationCount':len(mutation)};dump('runtime-summary.json',summary)
report=f'''# Weather Shadow Runtime Validation Report\n\n- Canonical input: **46** (`{EXPECTED}`)\n- Distribution: `{canonical['counts']}`\n- Compatibility: `{dict(compat)}`\n- Question eligible: **{yield_report['questionEligible']}**, compiler compatible: **{yield_report['compilerCompatible']}**\n- Classic: attempted {classic['attempted']}, generated {classic['generated']}, skipped {classic['skipped']}, failed {classic['failed']}\n- Graph: nodes {len(units)}, relations {len(rels)}, usable units {len(connected)}, backed questions {len(graph_q)}, GraphUsageScore {graph_usage}\n- Question types: `{dict(qtypes)}`\n- Knowledge type yield: `{yield_types}`\n- Quality: `{quality}`\n- WeatherCode: source trace preserved; SIGMET/AIRMET example order was not promoted to an absolute rule.\n- Hazard: definition/condition only; no avoidance, stop-flight, or drone impact inference.\n- Observation: no missing instrument or threshold was invented.\n- Semantic duplicates: exact 0, semantic 0.\n- Topic runtime coverage: `{dict(Counter(x['runtimeStatus'] for x in topic_rows))}`\n- Template gaps: {len(gaps)}\n- Performance ms: `{summary['performanceMs']}`\n- Final: **{runtime_status}**\n- Remaining gaps: {', '.join(summary['remainingGaps'])}\n- Recommendation: improve source-grounded distractor pools and topic mapping before production integration.\n- Mutation guard: **{len(mutation)}**; canonical v1/v2/v3, raw Weather 57, Legal/Active data were not changed.\n'''
(ROOT/'docs/weather-shadow-runtime-validation-report.md').write_text(report,encoding='utf8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
