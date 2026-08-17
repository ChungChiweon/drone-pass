export function extractLegalAttachmentReferences(text:string){
  const matches=[...text.matchAll(/(?:\uBCC4\uD45C\s*\uC81C?\d+\uD638?|\uBCC4\uC9C0\s*\uC81C?\d+\uD638\uC11C\uC2DD|\uBCC4\uC9C0\uC11C\uC2DD)/g)].map((match)=>match[0].replace(/\s+/g," "));
  return [...new Set(matches)].map((title,index)=>({attachmentReferenceId:`ATTACHMENT-REF-${index+1}`,title,status:"REFERENCE_ONLY" as const,extractionStatus:"BLOCKED_MISSING_ATTACHMENT" as const}));
}
