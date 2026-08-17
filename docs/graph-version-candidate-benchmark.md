# Graph Version Candidate Benchmark

Generated at: 2026-07-30T00:00:00.000Z

## Candidate Version

- versionId: kg-candidate-kr-drone-license:mrm0omvd-20260730000000000
- packId: kr-drone-license:mrm0omvd
- status: draft
- relationCount: 11
- contentHash: fnv1a-3cac6cec
- active alias changed: no

## Included Relations

| Relation ID |
| --- |
| KG-CONFUSED_WITH-AF-223-AF-277 |
| KG-CONFUSED_WITH-AF-224-AF-278 |
| KG-CONFUSED_WITH-AF-224-AF-298 |
| KG-CONFUSED_WITH-AF-224-AF-312 |
| KG-CONFUSED_WITH-AF-277-AF-297 |
| KG-CONFUSED_WITH-AF-278-AF-298 |
| KG-CONFUSED_WITH-AF-278-AF-319 |
| KG-CONFUSED_WITH-AF-297-AF-311 |
| KG-CONFUSED_WITH-AF-298-AF-312 |
| KG-CONFUSED_WITH-AF-298-AF-319 |
| KG-CONFUSED_WITH-AF-312-AF-319 |

## Excluded Relations

- KG-CONFUSED_WITH-AF-176-AF-178: held, excluded from candidate
- All remaining draft/review candidate relations: excluded

## Integrity Check

- validation ok: true
- checksum recomputable: true
- held relation found in source graph: true
- held relation included: false
- duplicate relation count: 0
- relationCount=11: true

## Classic vs Graph-aware

| Metric | Classic | Graph-aware |
| --- | --- | --- |
| Generated count | 17 | 17 |
| Average QuestionQualityScore | 0.68 | 0.68 |
| Average GraphUsageScore | - | 0.00 |
| Graph-backed distractor count | - | 0 |
| Duplicate distractors | - | 0 |
| Unique-answer failures | - | 0 |

## Category Quality

| Category | Approved facts | Classic avg | Graph-aware avg |
| --- | --- | --- | --- |
| cat-report-target-exemption | 3 | 0.71 | 0.71 |
| cat-report-change-transfer-cancel | 4 | 0.68 | 0.68 |
| cat-ultralight-use-business | 1 | 0.68 | 0.68 |
| cat-aviation-insurance | 1 | 0.62 | 0.62 |
| cat-aviation-leisure-sports-business | 4 | 0.68 | 0.68 |
| cat-aviation-business-common-rules | 4 | 0.69 | 0.69 |

## Relation Usage

| Relation ID | Pair | Used | Question count | Target facts | Contribution |
| --- | --- | --- | --- | --- | --- |
| KG-CONFUSED_WITH-AF-223-AF-277 | AF-223 -> AF-277 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-224-AF-278 | AF-224 -> AF-278 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-224-AF-298 | AF-224 -> AF-298 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-224-AF-312 | AF-224 -> AF-312 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-277-AF-297 | AF-277 -> AF-297 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-278-AF-298 | AF-278 -> AF-298 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-278-AF-319 | AF-278 -> AF-319 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-297-AF-311 | AF-297 -> AF-311 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-298-AF-312 | AF-298 -> AF-312 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-298-AF-319 | AF-298 -> AF-319 | no | 0 | - | not selected by current templates/distractor constraints |
| KG-CONFUSED_WITH-AF-312-AF-319 | AF-312 -> AF-319 | no | 0 | - | not selected by current templates/distractor constraints |

## Activation Criteria

- Classic 대비 평균 품질 하락 없음: true
- 정답 유일성 실패 0: true
- 오답 중복 0: true
- unsafe distractor 0: true
- 실제 활용 relation 존재: false
- graph-backed distractor 최소 1개: false
- 기존 17개 문제 생성 성공률 유지: true

## Final Verdict: NEEDS_REVIEW

## Expected Impact If Activated

- Graph-aware generation can use the 11 reviewed CONFUSED_WITH relations as higher-trust distractor sources.
- Production behavior remains unchanged until a human explicitly activates a graph version.

## Remaining Risks

- The approved graph is still small, so many approved AtomicFacts may not receive graph-backed distractors.
- Question templates can still reject otherwise useful graph relations when fact status or template constraints do not line up.
