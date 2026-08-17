import { describe, expect, it } from "vitest";
import { locateParentAttachment, parseAttachmentReferences, resolveOfficialAttachmentDownload, validateParentVersionAttachment, type ParentResolvedAttachment } from "../source-acquisition/attachments";
import { buildAttachmentReferenceGraph, resolveConditionScopes, resolveMergedCellSemantics, resolveMultiLevelHeaders, resolveTableContinuation, validateTableVisual, type PrecisionCell } from ".";

const attachment: ParentResolvedAttachment = { parentSourceId:"law-a",parentVersionId:"v1",attachmentId:"a1",attachmentType:"ANNEX",attachmentNumber:"1",canonicalTitle:"별표 1",officialPageUrl:"https://www.law.go.kr/LSW/lsInfoP.do",downloadUrl:"https://www.law.go.kr/LSW/flDownload.do?flSeq=1&bylClsCd=110201",fileType:"hwp",versionStatus:"CURRENT_EFFECTIVE",effectiveDate:"2026-01-01",resolutionConfidence:1,validationStatus:"VALID",warnings:[] };

describe("SOURCE-BATCH-002A parent-aware attachment and precision tables", () => {
  it("keeps same attachment number isolated by parent and version", () => {
    const refs=parseAttachmentReferences({ parentSourceId:"law-a",parentVersionId:"v1",sourceLocator:"제1조",effectiveDate:"2026-01-01",text:"별표 1에 따른다" });
    expect(locateParentAttachment(refs[0],[attachment,{...attachment,attachmentId:"b1",parentSourceId:"law-b"}])?.attachmentId).toBe("a1");
    expect(locateParentAttachment({...refs[0],parentSourceId:"law-b"},[attachment])).toBeUndefined();
  });
  it("separates current/future and validates official endpoint",()=>{
    expect(validateParentVersionAttachment({...attachment,versionStatus:"FUTURE"},attachment)).toContain("NON_CURRENT_ATTACHMENT");
    expect(resolveOfficialAttachmentDownload("https://www.law.go.kr/LSW/","flDownload.do?flSeq=1&bylClsCd=110201")).toContain("law.go.kr");
    expect(resolveOfficialAttachmentDownload("https://evil.invalid/","/download?flSeq=1")).toBeUndefined();
  });
  it("resolves multi-level headers, merged cells, conditions and continuation",()=>{
    const cells:PrecisionCell[]=[{cellId:"h",rowIndex:0,columnIndex:0,rowSpan:1,colSpan:2,rawText:"구분",normalizedText:"구분",inheritedRowHeaders:[],inheritedColumnHeaders:[],applicableFootnotes:[],applicableConditions:[],confidence:1},{cellId:"v",rowIndex:1,columnIndex:1,rowSpan:1,colSpan:1,rawText:"25kg 이하인 경우",normalizedText:"25kg 이하인 경우",inheritedRowHeaders:[],inheritedColumnHeaders:[],applicableFootnotes:[],applicableConditions:[],confidence:1}];
    expect(resolveMultiLevelHeaders(cells,[0])[1].inheritedColumnHeaders).toEqual(["h"]);
    expect(resolveMergedCellSemantics(cells)[0].status).toBe("RESOLVED_EXACT");
    expect(resolveConditionScopes(cells)[0].scope).toBe("CELL");
    expect(resolveTableContinuation([{tableId:"1",title:"A"},{tableId:"2",title:"A"}])[1].continuedFromTableId).toBe("1");
  });
  it("flags low visual matches and preserves evidence on graph edges",()=>{
    expect(validateTableVisual({tableId:"t",renderedPages:0,cells:[{}],unresolvedMerged:1,unresolvedFootnotes:1}).flaggedRegions).toContain("VISUAL_REVIEW_REQUIRED");
    expect(buildAttachmentReferenceGraph([{edgeId:"e",fromNodeId:"article",toNodeId:"annex",relationType:"CRITERIA_DEFINED_IN",sourceLocator:"제1조",evidenceText:"별표 1"}]).edges).toHaveLength(1);
    expect(buildAttachmentReferenceGraph([{edgeId:"e",fromNodeId:"article",toNodeId:"annex",relationType:"CRITERIA_DEFINED_IN",sourceLocator:"",evidenceText:""}]).edges).toHaveLength(0);
  });
});
