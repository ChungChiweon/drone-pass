from __future__ import annotations
import hashlib,json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1];INPUT=ROOT/'work/flight-theory-validation/004b';ING=ROOT/'work/source-ingestion/source-batch-004b';OUT=INPUT/'results';OUT.mkdir(parents=True,exist_ok=True)
TOPICS=['multicopter','fixed-wing','rotorcraft','helicopter','unmanned-airship','vtol','frame','arm','landing-gear','fuselage','wing','rotor','main-rotor','tail-rotor','propeller','rotor-direction','attitude-control','pitch','roll','yaw','throttle','differential-thrust','coaxial-quad-hexa-octa']
def load(path):return json.loads(path.read_text(encoding='utf8'))
def dump(name,data):(OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def sha(path):return 'sha256-'+hashlib.sha256(path.read_bytes()).hexdigest()
def tree_hash(path):
 h=hashlib.sha256()
 if path.exists():
  for p in sorted(x for x in path.rglob('*') if x.is_file()):h.update(str(p.relative_to(path)).encode());h.update(p.read_bytes())
 return h.hexdigest()
guards={str(p):tree_hash(p) for p in [ROOT/'work/source-ingestion/source-batch-004a',ROOT/'work/flight-theory-validation/004a',ROOT/'data/packs',ROOT/'work/weather-shadow-runtime',ROOT/'work/legal-shadow-pack']}
files=['components.json','systems.json','concepts.json','relationships.json','visual-assets.json'];checksums={name:sha(INPUT/name) for name in files}
components=load(INPUT/'components.json');systems=load(INPUT/'systems.json');concepts=load(INPUT/'concepts.json');relationships=load(INPUT/'relationships.json');visuals=load(INPUT/'visual-assets.json');coverage_in=load(ING/'coverage.json')
known={x['componentId'] for x in components}|{x['systemId'] for x in systems}|{x['conceptId'] for x in concepts}

def result(kid,kind,topic,refs,evidence,structure,clarity,relation=1,visual=1,warnings=None,blockers=None):
 warnings=warnings or [];blockers=blockers or [];source=1 if refs and evidence.strip() else 0
 if not source:blockers.append('SOURCE_EVIDENCE_MISSING')
 score=round(source*.35+structure*.25+clarity*.2+relation*.1+visual*.1,3)
 if blockers:status='BLOCKED_RELATIONSHIP' if kind=='RELATIONSHIP' else 'BLOCKED_VISUAL' if kind=='VISUAL' else 'BLOCKED_SOURCE' if not source else 'BLOCKED_STRUCTURE'
 elif score>=.95:status='VALIDATED_WITH_WARNING' if warnings else 'VALIDATED'
 elif score>=.90:status='VALIDATED_WITH_WARNING'
 else:status='BLOCKED_STRUCTURE'
 return {'knowledgeId':kid,'knowledgeType':kind,'topicId':topic,'validationStatus':status,'validationScore':score,'sourceEvidenceScore':source,'structureCompletenessScore':structure,'conceptClarityScore':clarity,'relationshipEvidenceScore':relation,'visualSupportScore':visual,'warnings':warnings,'blockers':blockers,'evidence':evidence,'recommendedAction':'CANONICAL_CANDIDATE' if status.startswith('VALIDATED') else 'REVIEW'}

results=[]
for x in components:
 warnings=[] if x.get('function','').strip() else ['FUNCTION_NOT_EXPLICIT_IN_SOURCE']
 results.append(result(x['componentId'],'COMPONENT',x['topicId'],x['sourceReferences'],x['rawEvidenceText'],1,.75,warnings=warnings))
for x in systems:
 warnings=[] if x.get('purpose','').strip() else ['SYSTEM_PURPOSE_NOT_EXPLICIT']
 blockers=[] if x.get('components') else ['SYSTEM_COMPONENT_MAPPING_INCOMPLETE']
 results.append(result(x['systemId'],'SYSTEM',(x.get('topicIds') or ['flight:aircraft-system'])[0],x['sourceReferences'],x['rawEvidenceText'],1 if x.get('components') else .75,.75,warnings=warnings,blockers=blockers))
definition_cues=[' is ',' are ',' motion ',' controlled ',' consists ',' force ',' attached ',' axis ']
for x in concepts:
 clear=any(cue in (' '+x['definition'].lower()+' ') for cue in definition_cues);warnings=[] if clear else ['CONTEXTUAL_MENTION_NOT_FULL_DEFINITION']
 results.append(result(x['conceptId'],'CONCEPT',x['topic'],x['sourceReferences'],x['rawEvidenceText'],1,1 if clear else .75,warnings=warnings))
for x in relationships:
 blockers=[]
 if x['fromId'] not in known or x['toId'] not in known:blockers.append('KNOWLEDGE_REFERENCE_MISSING')
 if x['fromId']==x['toId']:blockers.append('SELF_RELATIONSHIP')
 warnings=['PART_OF_EVIDENCE_IS_CONTEXTUAL'] if x['relationType']=='PART_OF' else []
 results.append(result(x['relationId'],'RELATIONSHIP',next((c['topic'] for c in concepts if c['conceptId']==x['fromId']),'flight:relationship'),x['sourceReferences'],x['evidence'],1,1,1,warnings=warnings,blockers=blockers))
visual_results=[]
for x in visuals:
 refs=[x['sourceLocator']];missing=[kid for kid in x['knowledgeIds'] if kid not in known];blockers=['KNOWLEDGE_REFERENCE_MISSING'] if missing else []
 visual_results.append(result(x['assetId'],'VISUAL',next((c['topic'] for c in concepts if c['conceptId'] in x['knowledgeIds']),'flight:visual'),refs,x.get('caption',''),1,.75,visual=.75,warnings=['VISUAL_NOT_AUTOMATICALLY_INTERPRETED'],blockers=blockers))
all_results=results+visual_results;validated=[x for x in all_results if x['validationStatus']=='VALIDATED'];warning=[x for x in all_results if x['validationStatus']=='VALIDATED_WITH_WARNING'];blocked=[x for x in all_results if x['validationStatus'].startswith('BLOCKED')]

relationship_ids={x['knowledgeId'] for x in results if x['knowledgeType']=='RELATIONSHIP' and x['validationStatus'].startswith('VALIDATED')};visual_by_knowledge={kid:[v['knowledgeId'] for v in visual_results if v['validationStatus'].startswith('VALIDATED') and kid in next((raw['knowledgeIds'] for raw in visuals if raw['assetId']==v['knowledgeId']),[])] for kid in known}
raw_by_id={x.get('componentId') or x.get('systemId') or x.get('conceptId') or x.get('relationId'):x for x in components+systems+concepts+relationships}
units=[]
for vr in results:
 if not vr['validationStatus'].startswith('VALIDATED'):continue
 raw=raw_by_id[vr['knowledgeId']];kind=vr['knowledgeType'];topic=vr['topicId'];definition=raw.get('function') or raw.get('purpose') or raw.get('definition') or raw.get('evidence') or raw.get('structure') or ''
 rels=[r['relationId'] for r in relationships if r['fromId']==vr['knowledgeId'] or r['toId']==vr['knowledgeId']]
 eligibility='STANDALONE' if kind=='CONCEPT' and vr['validationStatus']=='VALIDATED' else 'RELATIONSHIP_REQUIRED' if rels else 'NOT_QUESTION_ELIGIBLE'
 units.append({'knowledgeId':vr['knowledgeId'],'knowledgeType':kind,'title':raw.get('name') or raw.get('relationId'),'definition':definition,'structure':raw.get('structure',''),'components':raw.get('components',[]),'relationships':rels,'sourceReferences':raw.get('sourceReferences',[]),'topic':topic,'supportedQuestionTypes':[],'questionEligibility':eligibility,'warnings':vr['warnings'],'qualityScore':vr['validationScore'],'visualAssetIds':visual_by_knowledge.get(vr['knowledgeId'],[])})

topic_coverage=[]
for topic in TOPICS:
 tid=f'flight:{topic}';source=next(x['sourceCount'] for x in coverage_in if x['topicId']==tid);topic_results=[x for x in results if x['topicId']==tid];canonical_count=sum(x['topic']==tid for x in units);rc=sum(x['knowledgeType']=='RELATIONSHIP' for x in topic_results);vc=sum(x['topicId']==tid for x in visual_results)
 status='NO_KNOWLEDGE' if source==0 else 'VALIDATED' if canonical_count and (rc or vc) else 'VALIDATED_WITH_GAPS'
 gap='MISSING_OFFICIAL_DRONE_SOURCE' if topic in ['multicopter','vtol','differential-thrust','rotor-direction','coaxial-quad-hexa-octa'] and source==0 else 'MISSING_SOURCE' if source==0 else 'RELATIONSHIP_OR_VISUAL_GAP' if status!='VALIDATED' else None
 topic_coverage.append({'topicId':tid,'sourceCount':source,'knowledgeCount':len(topic_results),'canonicalCount':canonical_count,'relationshipCount':rc,'visualCount':vc,'status':status,'gaps':[gap] if gap else []})

core={'setId':'canonical-flight-theory:004b:v1','version':'1.0.0','batchId':'004B','sourceSnapshotId':'004b-'+hashlib.sha256(''.join(checksums.values()).encode()).hexdigest()[:16],'componentIds':[x['componentId'] for x in components if any(u['knowledgeId']==x['componentId'] for u in units)],'systemIds':[x['systemId'] for x in systems if any(u['knowledgeId']==x['systemId'] for u in units)],'conceptIds':[x['conceptId'] for x in concepts if any(u['knowledgeId']==x['conceptId'] for u in units)],'principleIds':[],'formulaIds':[],'relationshipIds':sorted(relationship_ids),'blockedIds':[x['knowledgeId'] for x in blocked if x['knowledgeType']!='VISUAL'],'warningIds':[x['knowledgeId'] for x in warning if x['knowledgeType']!='VISUAL'],'topicCoverage':topic_coverage,'generatedAt':'2026-08-10T00:00:00Z','units':units}
canonical={**core,'checksum':'sha256-'+hashlib.sha256(json.dumps(core,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()}
duplicates=load(ING/'duplicate-analysis.json');readiness='READY_WITH_GAPS' if any(x['status']!='VALIDATED' for x in topic_coverage) else 'READY_FOR_SHADOW_RUNTIME'
runtime={'readiness':readiness,'componentCount':sum(u['knowledgeType']=='COMPONENT' for u in units),'conceptCount':sum(u['knowledgeType']=='CONCEPT' for u in units),'relationshipCount':sum(u['knowledgeType']=='RELATIONSHIP' for u in units),'provenanceComplete':all(u['sourceReferences'] for u in units),'activeRuntimeMutation':0}
after={p:tree_hash(Path(p)) for p in guards};mutation=sum(guards[p]!=after[p] for p in guards)
status_counts=dict(Counter(x['validationStatus'] for x in all_results));by_type={kind:dict(Counter(x['validationStatus'] for x in all_results if x['knowledgeType']==kind)) for kind in ['COMPONENT','SYSTEM','CONCEPT','RELATIONSHIP','VISUAL']};coverage_counts=dict(Counter(x['status'] for x in topic_coverage))
summary={'input':{'components':len(components),'systems':len(systems),'concepts':len(concepts),'relationships':len(relationships),'visuals':len(visuals)},'inputChecksums':checksums,'status':status_counts,'byType':by_type,'canonical':{'total':len(units),'components':sum(u['knowledgeType']=='COMPONENT' for u in units),'systems':sum(u['knowledgeType']=='SYSTEM' for u in units),'concepts':sum(u['knowledgeType']=='CONCEPT' for u in units),'relationships':sum(u['knowledgeType']=='RELATIONSHIP' for u in units),'checksum':canonical['checksum']},'topicCoverage':coverage_counts,'multicopterGap':[x for x in topic_coverage if x['topicId'] in ['flight:multicopter','flight:vtol','flight:differential-thrust','flight:rotor-direction','flight:coaxial-quad-hexa-octa']],'readiness':readiness,'nextReadyBatches':['004F','004G','004H'],'blockedBatches':['004C','004D','004E'],'004AStatus':'READY_WITH_GAPS_FROZEN','mutationCount':mutation}
for name,data in [('validation-results.json',all_results),('validated.json',validated),('warning.json',warning),('blocked.json',blocked),('relationship-validation.json',[x for x in all_results if x['knowledgeType']=='RELATIONSHIP']),('visual-validation.json',visual_results),('duplicate-analysis.json',duplicates),('canonical-flight-knowledge-004b.json',canonical),('topic-coverage.json',topic_coverage),('runtime-readiness.json',runtime),('summary.json',summary)]:dump(name,data)
report=f'''# FLIGHT-THEORY-004B Validation Report\n\n- Input: components {len(components)}, systems {len(systems)}, concepts {len(concepts)}, relationships {len(relationships)}, visuals {len(visuals)}\n- Status: `{status_counts}`; by type: `{by_type}`\n- Canonical 004B: {len(units)} units (components {summary['canonical']['components']}, systems {summary['canonical']['systems']}, concepts {summary['canonical']['concepts']}, relationships {summary['canonical']['relationships']})\n- Canonical checksum: `{canonical['checksum']}`\n- Topic coverage: `{coverage_counts}`\n- Multicopter-specific gaps remain `MISSING_OFFICIAL_DRONE_SOURCE`; no general-knowledge supplementation was performed.\n- Runtime readiness: `{readiness}`; this is an assessment only and no shadow/active runtime was changed.\n- Next READY source batches: 004F, 004G, 004H. 004C/004D/004E gaps remain unchanged.\n- 004A remains `READY_WITH_GAPS` and frozen. Active Pack, AtomicFact, Graph, Questions, Legal/Weather runtimes, and Supabase were not connected. Mutation count: {mutation}.\n'''
(ROOT/'docs/flight-theory-004b-validation-report.md').write_text(report,encoding='utf8');print(json.dumps(summary,ensure_ascii=False,indent=2))
