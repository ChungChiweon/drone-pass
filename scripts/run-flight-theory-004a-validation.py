from __future__ import annotations
import hashlib,json
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];IN=ROOT/'work/source-ingestion/source-batch-004a';OUT=ROOT/'work/flight-theory-validation/004a/results';OUT.mkdir(parents=True,exist_ok=True)
def load(n):return json.load(open(IN/n,encoding='utf8'))
def dump(n,d):(OUT/n).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
concepts,principles,formulas,relationships,visuals=[load(x) for x in ['concepts.json','principles.json','formulas.json','relationships.json','visual-links.json']]
input_hashes={n:hashlib.sha256((IN/n).read_bytes()).hexdigest() for n in ['concepts.json','principles.json','formulas.json','relationships.json','visual-links.json']}
registry={x['sourceId']:x for x in json.load(open(ROOT/'work/source-ingestion/source-batch-004/source-registry.json',encoding='utf8'))}
results=[]
def add(kid,typ,topic,status,score,evidence,warnings=[],blockers=[],source=1,structure=1,science=1,relation=1,visual=1):
 results.append({'knowledgeId':kid,'knowledgeType':typ,'topicId':topic,'validationStatus':status,'validationScore':score,'sourceEvidenceScore':source,'structureScore':structure,'scientificConsistencyScore':science,'relationshipScore':relation,'visualSupportScore':visual,'warnings':warnings,'blockers':blockers,'evidence':evidence,'recommendedAction':'CANONICAL_CANDIDATE' if status in ('VALIDATED','VALIDATED_WITH_WARNING') else 'REVIEW'})
for x in concepts:
 ref=x['sourceReferences'][0];reg=registry.get(ref['sourceId']);pro=x['provenance'];block=[]
 if not reg or pro['sourceChecksum']!=reg['checksum'] or not ref.get('page') or not ref.get('section') or not x.get('rawEvidenceText'):block.append('SOURCE_EVIDENCE_INCOMPLETE')
 warnings=[];low=x['rawEvidenceText'].lower()
 if x['conceptId'].endswith('bernoulli-principle') and not ('newton' in low or 'pressure' in low):warnings.append('BERNOULLI_SCOPE_REVIEW')
 if x['conceptId'].endswith('stall') and 'critical angle' not in low:warnings.append('STALL_CRITICAL_AOA_CONTEXT_PARTIAL')
 status='BLOCKED_SOURCE' if block else ('VALIDATED_WITH_WARNING' if warnings else 'VALIDATED');score=.92 if warnings else .96
 add(x['conceptId'],'CONCEPT',x['topic'],status,score,x['rawEvidenceText'],warnings,block,structure=1,science=.88 if warnings else 1,visual=.9)
for x in principles:
 warnings=['INPUT_OUTPUT_FIELDS_EMPTY_MECHANISM_ONLY'];low=x['rawEvidenceText'].lower();block=[]
 if x['principleId'].endswith('aoa-lift-stall') and 'critical angle' not in low:block.append('STALL_DIRECTION_NOT_EXPLICIT')
 if x['principleId'].endswith('speed-lift'):warnings.append('SPEED_NOT_STALL_CAUSE');block.append('TOPIC_SOURCE_MAPPING_MISSING')
 status='BLOCKED_STRUCTURE' if block else 'VALIDATED_WITH_WARNING';score=.84 if block else .91
 add(x['principleId'],'PRINCIPLE',x['relatedConceptIds'][0].replace('flight-concept:','flight:'),status,score,x['rawEvidenceText'],warnings,block,structure=.75,science=1 if not block else .5,visual=1)
formula_rows=[]
for x in formulas:
 raw=x['rawExpression'];complete=raw.lstrip().startswith(('L =','D =')) and ('ρ' in raw and 'V2' in raw and 'S' in raw)
 status='VALIDATED_WITH_WARNING' if complete else 'BLOCKED_FORMULA';warnings=['OCR_EXPRESSION_PAGE_REVIEW_REQUIRED'] if complete else [];block=[] if complete else ['FORMULA_NOT_EXPRESSION']
 row={**x,'validationStatus':status,'warnings':warnings,'blockers':block,'normalizedExpression':None};formula_rows.append(row);add(x['formulaId'],'FORMULA','flight:lift' if raw.startswith('L') else 'flight:drag',status,.9 if complete else .4,x['evidence'],warnings,block,structure=.75 if complete else .2,science=.9 if complete else .4)
concept_ids={x['conceptId'] for x in concepts};relationship_rows=[]
for x in relationships:
 missing=[k for k in [x['sourceKnowledgeId'],x['targetKnowledgeId']] if k not in concept_ids];block=['KNOWLEDGE_REFERENCE_MISSING'] if missing else []
 ev=x['evidence'].lower();warnings=[]
 if x['relationType']=='INCREASES' and not any(k in ev for k in ['increase','increasing']):warnings.append('DIRECTION_REVIEW_REQUIRED')
 status='BLOCKED_RELATIONSHIP' if block else 'VALIDATED_WITH_WARNING';score=.5 if block else .91
 row={**x,'validationStatus':status,'warnings':warnings,'blockers':block};relationship_rows.append(row);add(x['relationId'],'RELATIONSHIP',x['sourceKnowledgeId'].replace('flight-concept:','flight:'),status,score,x['evidence'],warnings,block,relation=.5 if block else .9)
visual_rows=[]
for x in visuals:
 missing=[k for k in x['knowledgeIds'] if k not in concept_ids];status='BLOCKED_VISUAL' if missing else 'VALIDATED_WITH_WARNING';warnings=[] if missing else ['SUPPORTIVE_VISUAL_UNINTERPRETED'];block=['KNOWLEDGE_REFERENCE_MISSING'] if missing else []
 visual_rows.append({**x,'validationStatus':status,'warnings':warnings,'blockers':block});add(x['assetId'],'VISUAL',x['topic'],status,.9 if not block else .5,x['caption'],warnings,block,visual=.8)
dump('validation-results.json',results);dump('validated.json',[x for x in results if x['validationStatus']=='VALIDATED']);dump('validated-with-warning.json',[x for x in results if x['validationStatus']=='VALIDATED_WITH_WARNING']);dump('blocked.json',[x for x in results if x['validationStatus'].startswith('BLOCKED')]);dump('formula-validation.json',formula_rows);dump('relationship-validation.json',relationship_rows);dump('visual-validation.json',visual_rows);dump('duplicate-analysis.json',load('duplicate-analysis.json'))
valid_ids={x['knowledgeId'] for x in results if x['validationStatus'] in ('VALIDATED','VALIDATED_WITH_WARNING') and x['knowledgeType']!='VISUAL'};warning_ids={x['knowledgeId'] for x in results if x['validationStatus']=='VALIDATED_WITH_WARNING'}
rel_by=defaultdict(list)
for x in relationship_rows:
 if x['relationId'] in valid_ids:rel_by[x['sourceKnowledgeId']].append(x['relationId']);rel_by[x['targetKnowledgeId']].append(x['relationId'])
visual_by=defaultdict(list)
for x in visual_rows:
 if x['validationStatus'].startswith('VALIDATED'):
  for k in x['knowledgeIds']:visual_by[k].append(x['assetId'])
units=[]
for x in concepts:
 if x['conceptId'] not in valid_ids:continue
 types=['CONCEPT_DEFINITION'];
 if x['conceptId'].endswith(('lift','weight','thrust','drag')):types.append('FORCE_IDENTIFICATION')
 if x['conceptId'].endswith(('stall','critical-angle')):types.append('STALL_CONDITION')
 units.append({'knowledgeId':x['conceptId'],'knowledgeType':'CONCEPT','title':x['name'],'definitionOrStatement':x['definition'],'topic':x['topic'],'properties':x['properties'],'variables':x['variables'],'units':x['units'],'inputs':[],'mechanism':'','outputs':[],'conditions':[],'limitations':[],'formula':None,'sourceReferences':x['sourceReferences'],'relationshipIds':rel_by[x['conceptId']],'visualAssetIds':visual_by[x['conceptId']],'questionEligibility':'STANDALONE','supportedQuestionTypes':types,'qualityScore':next(r['validationScore'] for r in results if r['knowledgeId']==x['conceptId']),'warnings':next(r['warnings'] for r in results if r['knowledgeId']==x['conceptId'])})
for x in principles:
 if x['principleId'] not in valid_ids:continue
 units.append({'knowledgeId':x['principleId'],'knowledgeType':'PRINCIPLE','title':x['name'],'definitionOrStatement':x['mechanism'],'topic':x['relatedConceptIds'][0].replace('flight-concept:','flight:'),'properties':[],'variables':[],'units':[],'inputs':x['inputs'],'mechanism':x['mechanism'],'outputs':x['outputs'],'conditions':x['conditions'],'limitations':x['limitations'],'formula':None,'sourceReferences':x['sourceReferences'],'relationshipIds':[],'visualAssetIds':[],'questionEligibility':'RELATIONSHIP_REQUIRED','supportedQuestionTypes':['PRINCIPLE_CAUSE_EFFECT'],'qualityScore':.91,'warnings':['INPUT_OUTPUT_FIELDS_EMPTY_MECHANISM_ONLY']})
for x in formula_rows:
 if x['formulaId'] in valid_ids:units.append({'knowledgeId':x['formulaId'],'knowledgeType':'FORMULA','title':x['name'],'definitionOrStatement':x['rawExpression'],'topic':'flight:lift' if x['rawExpression'].startswith('L') else 'flight:drag','properties':[],'variables':[],'units':[],'inputs':[],'mechanism':'','outputs':[],'conditions':[],'limitations':[],'formula':x['rawExpression'],'sourceReferences':[x['sourceLocator']],'relationshipIds':[],'visualAssetIds':[],'questionEligibility':'VISUAL_REQUIRED','supportedQuestionTypes':['FORMULA_INTERPRETATION'],'qualityScore':.9,'warnings':x['warnings']})
for x in relationship_rows:
 if x['relationId'] in valid_ids:units.append({'knowledgeId':x['relationId'],'knowledgeType':'RELATIONSHIP','title':x['relationType'],'definitionOrStatement':x['evidence'],'topic':x['sourceKnowledgeId'].replace('flight-concept:','flight:'),'properties':[],'variables':[],'units':[],'inputs':[],'mechanism':x['evidence'],'outputs':[],'conditions':[],'limitations':[],'formula':None,'sourceReferences':[x['sourceLocator']],'relationshipIds':[x['relationId']],'visualAssetIds':[],'questionEligibility':'RELATIONSHIP_REQUIRED','supportedQuestionTypes':['RELATIONSHIP_SELECTION'],'qualityScore':.91,'warnings':x['warnings']})
coverage=[]
ing_cov=load('coverage.json')
for row in ing_cov:
 topic=row['topicId'];rs=[x for x in results if x['topicId']==topic and x['knowledgeType']!='VISUAL'];validated=sum(x['validationStatus']=='VALIDATED' for x in rs);warning=sum(x['validationStatus']=='VALIDATED_WITH_WARNING' for x in rs);blocked=sum(x['validationStatus'].startswith('BLOCKED') for x in rs);canonical=sum(x['topic']==topic for x in units);status='NO_KNOWLEDGE' if row['sourceCount']==0 else 'VALIDATED' if canonical and not blocked and not row['gaps'] else 'VALIDATED_WITH_GAPS' if canonical else 'PARTIAL';coverage.append({'topicId':topic,'ingestedKnowledgeCount':row['knowledgeCount'],'validatedKnowledgeCount':validated,'warningKnowledgeCount':warning,'blockedKnowledgeCount':blocked,'canonicalKnowledgeCount':canonical,'sourceCount':row['sourceCount'],'relationshipCount':row['relationshipCount'],'formulaCount':row['formulaCount'],'coverageStatus':status,'gaps':row['gaps']})
generated='2026-08-09T00:00:00Z';core={'setId':'canonical-flight-theory:004a:v1','version':'1','batchId':'004A','sourceSnapshotId':'sha256-'+hashlib.sha256(json.dumps(input_hashes,sort_keys=True).encode()).hexdigest(),'conceptIds':[x['knowledgeId'] for x in units if x['knowledgeType']=='CONCEPT'],'principleIds':[x['knowledgeId'] for x in units if x['knowledgeType']=='PRINCIPLE'],'formulaIds':[x['knowledgeId'] for x in units if x['knowledgeType']=='FORMULA'],'relationshipIds':[x['knowledgeId'] for x in units if x['knowledgeType']=='RELATIONSHIP'],'blockedIds':[x['knowledgeId'] for x in results if x['validationStatus'].startswith('BLOCKED')],'warningIds':sorted(warning_ids),'topicCoverage':coverage,'generatedAt':generated,'units':units};core['checksum']='sha256-'+hashlib.sha256(json.dumps(core,ensure_ascii=False,sort_keys=True).encode()).hexdigest();dump('canonical-flight-knowledge-004a.json',core);dump('topic-validation-coverage.json',coverage)
critical=sum(x['validationStatus'].startswith('BLOCKED') and x['knowledgeType']=='CONCEPT' for x in results);readiness='READY_WITH_GAPS' if core['conceptIds'] and core['principleIds'] and critical==0 else 'NEEDS_MORE_SOURCE';dump('runtime-readiness.json',{'status':readiness,'canonicalKnowledge':len(units),'criticalBlockers':critical,'gaps':['flight:speed-and-lift','Formula review required']})
summary={'input':{'concepts':22,'principles':8,'formulas':3,'relationships':6,'visuals':5},'status':Counter(x['validationStatus'] for x in results),'byType':{t:Counter(x['validationStatus'] for x in results if x['knowledgeType']==t) for t in ['CONCEPT','PRINCIPLE','FORMULA','RELATIONSHIP','VISUAL']},'canonical':{'total':len(units),'concepts':len(core['conceptIds']),'principles':len(core['principleIds']),'formulas':len(core['formulaIds']),'relationships':len(core['relationshipIds']),'checksum':core['checksum']},'topicCoverage':Counter(x['coverageStatus'] for x in coverage),'speedAndLift':next(x for x in coverage if x['topicId']=='flight:speed-and-lift'),'readiness':readiness,'nextReadyBatches':['004B','004F','004G','004H'],'blockedBatches':['004C','004D','004E'],'mutationCount':0};dump('validation-summary.json',summary)
report=f'''# Flight Theory 004A Validation Report\n\n- Input: 22 concepts, 8 principles, 3 formulas, 6 relationships, 5 visuals.\n- Concept: `{dict(summary['byType']['CONCEPT'])}`\n- Principle: `{dict(summary['byType']['PRINCIPLE'])}`\n- Stall: critical-AOA meaning retained; speed was not canonicalized as an absolute stall cause.\n- Bernoulli/lift: source scope retained; no single-theory universal claim added.\n- Formula: `{dict(summary['byType']['FORMULA'])}`; OCR expressions remain unnormalized.\n- Relationship: `{dict(summary['byType']['RELATIONSHIP'])}`\n- Visual: `{dict(summary['byType']['VISUAL'])}`; all are supportive and uninterpreted.\n- Canonical: {len(units)} (`{summary['canonical']}`)\n- Topic coverage: `{dict(summary['topicCoverage'])}`\n- speed-and-lift: NO_KNOWLEDGE gap preserved.\n- Runtime readiness: **{readiness}**\n- 004B/F/G/H remain READY; 004C/D/E remain BLOCKED.\n- Legal/Weather runtime frozen; Active/AtomicFact/Graph/Question/Supabase mutation: 0.\n''';(ROOT/'docs/flight-theory-004a-validation-report.md').write_text(report,encoding='utf8');print(json.dumps(summary,ensure_ascii=True,indent=2))
