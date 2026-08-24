import type {LegalTemplateDefinition} from "./legal-template-types";
const families=(id:string,stems:Array<(s:string)=>string>)=>stems.map((stem,i)=>({id:`${id}-${i+1}`,contract:`${id} legal semantic contract`,requiredFields:["statement","sourceReferences"],stem:(f:{subject:string})=>stem(f.subject)}));
export const LEGAL_TEMPLATES:LegalTemplateDefinition[]=[
 {id:"CONDITION_SELECTION",required:f=>f.conditions.length>0,stemFamilies:families("COND",[s=>`${s} 규칙이 적용되는 조건으로 옳은 것은?`,s=>`다음 중 ${s}의 적용 조건을 올바르게 설명한 것은?`])},
 {id:"EXCEPTION_SELECTION",required:f=>f.exceptions.length>0,stemFamilies:families("EXC",[s=>`${s} 규정의 명시적 예외에 해당하는 것은?`,s=>`다음 중 ${s} 규칙이 적용되지 않는 경우는?`])},
 {id:"RANGE_COMPARISON",required:(f,c)=>typeof f.value==="number"&&Boolean(f.unit&&f.operator)&&c.siblings.some(x=>typeof x.value==="number"&&x.unit===f.unit&&x.id!==f.id),stemFamilies:families("RANGE",[s=>`${s}의 수치 경계를 올바르게 적용한 것은?`,s=>`다음 중 ${s} 기준 범위에 해당하는 것은?`])},
 {id:"CATEGORY_COMPARISON",required:(f,c)=>c.siblings.some(x=>x.conceptId===f.conceptId&&x.id!==f.id),stemFamilies:families("CAT",[s=>`${s}와 같은 분류 체계의 규칙을 비교한 것으로 옳은 것은?`])},
 {id:"PENALTY_MATCHING",required:f=>/벌금|과태료|징역|행정처분/.test(f.statement)&&Boolean(f.sourceReferences[0]?.locator),stemFamilies:families("PEN",[s=>`${s} 위반과 법적 제재를 올바르게 연결한 것은?`])},
 {id:"PROCEDURE_ORDER",required:f=>/순서|절차|먼저|이후|다음 단계/.test(f.statement)&&f.conditions.length>1,stemFamilies:families("PROC",[s=>`${s} 절차의 순서로 옳은 것은?`])},
 {id:"COMPOSITE_CASE",required:(f,c)=>c.compositeMemberIds.length>1&&f.exceptions.length===0,stemFamilies:families("COMP",[s=>`다음 사례에 ${s} 관련 복수 규칙을 적용한 판단으로 옳은 것은?`])},
 {id:"RULE_COMPARISON",required:(f,c)=>c.relationTypes.some(x=>["COMPARISON_PAIR","CONTRASTS_WITH","EXCEPTION_OF"].includes(x)),stemFamilies:families("RULE",[s=>`${s}와 관련 규칙의 차이를 올바르게 비교한 것은?`])}
];
