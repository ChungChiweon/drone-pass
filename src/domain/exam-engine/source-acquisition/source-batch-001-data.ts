import type { OfficialSourceMetadata } from "./official-source-metadata";

const root = "data/sources/drone-license/official-law";
const retrievedAt = "2026-08-04T21:50:00.000Z";

export const SOURCE_BATCH_001_METADATA: OfficialSourceMetadata[] = [
  current("official-aviation-safety-act", "\uD56D\uACF5\uC548\uC804\uBC95", "LAW", "281945", "\uBC95\uB960 \uC81C21268\uD638", "2025-12-30", "2026-07-01", "aviation-safety-act", 463972, 114, "sha256-c6beda30d177d6256718992cd68293332bb5dc5e4e7f1a31a67cf1bffb7319ad"),
  current("official-aviation-safety-act-enforcement-decree", "\uD56D\uACF5\uC548\uC804\uBC95 \uC2DC\uD589\uB839", "ENFORCEMENT_DECREE", "287495", "\uB300\uD1B5\uB839 \uC81C36476\uD638", "2026-06-30", "2026-07-09", "aviation-safety-act-enforcement-decree", 172316, 19, "sha256-b712c7309695cd11e586afbfa36a02199ac671f49d731d4a26a6b06a18bfc8aa"),
  current("official-aviation-safety-act-enforcement-rule", "\uD56D\uACF5\uC548\uC804\uBC95 \uC2DC\uD589\uADDC\uCE59", "ENFORCEMENT_RULE", "287951", "\uAD6D\uD1A0\uAD50\uD1B5\uBD80\uB839 \uC81C1601\uD638", "2026-07-01", "2026-07-01", "aviation-safety-act-enforcement-rule", 585208, 132, "sha256-0fc2a71eb22156711b2d87de3b649d327de8b57019ba572fe8276a6b5ac2d202"),
  current("official-aviation-business-act", "\uD56D\uACF5\uC0AC\uC5C5\uBC95", "LAW", "280131", "\uBC95\uB960 \uC81C21189\uD638", "2025-12-02", "2026-06-03", "aviation-business-act", 240339, 41, "sha256-d65600c540a7bbbffa84a70452f6ebf2f23a33926702623d42ca9e59ef3dc358"),
  current("official-aviation-business-act-enforcement-decree", "\uD56D\uACF5\uC0AC\uC5C5\uBC95 \uC2DC\uD589\uB839", "ENFORCEMENT_DECREE", "286173", "\uB300\uD1B5\uB839 \uC81C36354\uD638", "2026-05-26", "2026-06-03", "aviation-business-act-enforcement-decree", 150828, 14, "sha256-13043cefba7f1e541823dde7f1e53f952bfc2c5db6cd9c12e0bac1eff4ede573"),
  current("official-aviation-business-act-enforcement-rule", "\uD56D\uACF5\uC0AC\uC5C5\uBC95 \uC2DC\uD589\uADDC\uCE59", "ENFORCEMENT_RULE", "282207", "\uAD6D\uD1A0\uAD50\uD1B5\uBD80\uB839 \uC81C1548\uD638", "2025-12-30", "2025-12-30", "aviation-business-act-enforcement-rule", 205443, 29, "sha256-af3d9b5eb4fa7c206014cfea493382b143951f002bbfb0d884f2fd6443682a2d"),
];

function current(sourceId: string, title: string, sourceType: OfficialSourceMetadata["sourceType"], lawId: string, promulgationNumber: string, promulgationDate: string, effectiveDate: string, slug: string, contentLength: number, pageCount: number, checksum: string): OfficialSourceMetadata {
  const officialPageUrl = `https://www.law.go.kr/\uBC95\uB839/${encodeURIComponent(title)}`;
  return { sourceId, canonicalTitle: title, sourceType, issuingOrganization: sourceType === "LAW" ? "\uAD6D\uD68C" : "\uAD6D\uD1A0\uAD50\uD1B5\uBD80", authority: "OFFICIAL_LAW", lawId, promulgationNumber, promulgationDate, effectiveDate, revisionType: "\uC77C\uBD80\uAC1C\uC815", versionStatus: "CURRENT_EFFECTIVE", officialPageUrl, downloadUrls: [`https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=${lawId}`], localFiles: [`${root}/${slug}/original/official-page.html`, `${root}/${slug}/original/current-full-text.html`, `${root}/${slug}/original/current-full-text.pdf`], attachments: [], retrievedAt, checksum, contentLength, pageCount, currentnessVerified: true, verificationMethod: "Official current-law wrapper and effective-date header checked on 2026-08-05 KST", extractionStatus: "READY_FOR_EXTRACTION", validationStatus: "READY", notes: ["Full-text official PDF includes appendices (bylChaChk=Y). Separate attachment links remain subject to resolver/manual verification."] };
}

export const SOURCE_BATCH_001_FUTURE_VERSIONS = [
  { sourceId: "official-aviation-safety-act", lawId: "286951", effectiveDate: "2026-12-17", versionStatus: "FUTURE_EFFECTIVE" as const, eligibleForQuestionEvidence: false },
];
