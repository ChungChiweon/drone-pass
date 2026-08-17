/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node artifact builder */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const repo = path.resolve(__dirname, "..");
const root = path.join(repo, "data/sources/drone-license/official-law");
const records = [
  ["official-aviation-safety-act", "aviation-safety-act", "항공안전법", "LAW", "281945", "법률 제21268호", "2025-12-30", "2026-07-01", 114],
  ["official-aviation-safety-act-enforcement-decree", "aviation-safety-act-enforcement-decree", "항공안전법 시행령", "ENFORCEMENT_DECREE", "287495", "대통령령 제36476호", "2026-06-30", "2026-07-09", 19],
  ["official-aviation-safety-act-enforcement-rule", "aviation-safety-act-enforcement-rule", "항공안전법 시행규칙", "ENFORCEMENT_RULE", "287951", "국토교통부령 제1601호", "2026-07-01", "2026-07-01", 132],
  ["official-aviation-business-act", "aviation-business-act", "항공사업법", "LAW", "280131", "법률 제21189호", "2025-12-02", "2026-06-03", 41],
  ["official-aviation-business-act-enforcement-decree", "aviation-business-act-enforcement-decree", "항공사업법 시행령", "ENFORCEMENT_DECREE", "286173", "대통령령 제36354호", "2026-05-26", "2026-06-03", 14],
  ["official-aviation-business-act-enforcement-rule", "aviation-business-act-enforcement-rule", "항공사업법 시행규칙", "ENFORCEMENT_RULE", "282207", "국토교통부령 제1548호", "2025-12-30", "2025-12-30", 29],
];

const metadata = records.map(([sourceId, slug, title, sourceType, lawId, promulgationNumber, promulgationDate, effectiveDate, pageCount]) => {
  const base = path.join(root, slug);
  const pdf = path.join(base, "original/current-full-text.pdf");
  const html = path.join(base, "original/current-full-text.html");
  const officialPage = path.join(base, "original/official-page.html");
  const checksum = `sha256-${crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex")}`;
  const value = {
    sourceId, canonicalTitle: title, sourceType, issuingOrganization: sourceType === "LAW" ? "국회" : "국토교통부", authority: "OFFICIAL_LAW", lawId,
    promulgationNumber, promulgationDate, effectiveDate, revisionType: "일부개정", versionStatus: "CURRENT_EFFECTIVE",
    officialPageUrl: `https://www.law.go.kr/법령/${encodeURIComponent(title)}`,
    downloadUrls: [`https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=${lawId}`, `https://www.law.go.kr/LSW/lsPdfPrint.do?lsiSeq=${lawId}`],
    localFiles: [rel(officialPage), rel(html), rel(pdf)], attachments: [], retrievedAt: "2026-08-05T06:50:00+09:00", checksum,
    contentLength: fs.statSync(pdf).size, pageCount, currentnessVerified: true,
    verificationMethod: "국가법령정보센터 현재 시행법령 wrapper, 시행일 header, PDF signature와 page count 확인",
    extractionStatus: "READY_FOR_EXTRACTION", validationStatus: "READY",
    notes: ["별표 포함 공식 전체 PDF(bylChaChk=Y) 확보", "개별 별표·서식 다운로드 링크는 별도 수동 점검 대상"],
  };
  writeJson(path.join(base, "metadata/source-metadata.json"), value);
  return value;
});

const registry = {
  batchId: "SOURCE-BATCH-001", generatedAt: new Date().toISOString(), targetDate: "2026-08-05", timezone: "Asia/Seoul",
  currentEffectiveSources: metadata,
  futureEffectiveSources: [{ sourceId: "official-aviation-safety-act", lawId: "286951", effectiveDate: "2026-12-17", status: "FUTURE_EFFECTIVE", eligibleForQuestionEvidence: false, verificationStatus: "OFFICIAL_PAGE_IDENTIFIED" }],
  historicalVersions: [],
  administrativeRules: [{ sourceId: "pilot-certification-administrative-rules", status: "MANUAL_ACQUISITION_REQUIRED" }, { sourceId: "uas-pilot-certificate-operating-guideline", status: "MANUAL_ACQUISITION_REQUIRED" }],
};
writeJson(path.join(root, "manifests/metadata/official-source-registry.json"), registry);

const hierarchy = [
  edge("official-aviation-safety-act", "official-aviation-safety-act-enforcement-decree"),
  edge("official-aviation-safety-act-enforcement-decree", "official-aviation-safety-act-enforcement-rule"),
  edge("official-aviation-business-act", "official-aviation-business-act-enforcement-decree"),
  edge("official-aviation-business-act-enforcement-decree", "official-aviation-business-act-enforcement-rule"),
];
writeJson(path.join(repo, "work/source-inventory/legal-source-hierarchy.json"), hierarchy);

const officialManifest = metadata.map((item, index) => ({ sourceId: item.sourceId, expectedTitle: item.canonicalTitle, organization: item.issuingOrganization, subject: "AVIATION_LAW", topics: topics(item.sourceType), authority: "OFFICIAL_LAW", requiredCurrentness: "CURRENT_EFFECTIVE", acquisitionStatus: "ALREADY_AVAILABLE", sourceUrl: item.officialPageUrl, localPath: item.localFiles[2], licenseOrUsageNote: "공식 법령 원문; 재배포/이용조건은 국가법령정보센터 정책 준수", ingestionPriority: index + 1, extractionAdapter: "LEGAL_TEXT", verificationRequired: false, sourceState: "SOURCE_ONLY" }));
mergeBySource(path.join(repo, "work/source-inventory/drone-source-acquisition-manifest.json"), officialManifest);

const queue = metadata.flatMap((item, index) => [
  job(item, index, "text", "LEGAL_TEXT", "READY"),
  job(item, index, "table", "LEGAL_TABLE", "READY"),
  job(item, index, "attachment", "LEGAL_ATTACHMENT", item.attachments.length ? "READY" : "BLOCKED_MISSING_ATTACHMENT"),
  job(item, index, "version-comparison", "LEGAL_VERSION_COMPARISON", "READY"),
]);
mergeByJob(path.join(repo, "work/source-inventory/drone-source-ingestion-queue.json"), queue);

const coveragePath = path.join(repo, "work/source-inventory/drone-source-coverage-matrix.json");
const coverage = readJson(coveragePath, []);
const coveragePayload = Array.isArray(coverage) ? { existingCoverage: coverage, officialSourceMappings: metadata.map((item) => ({ sourceId: item.sourceId, topicIds: topics(item.sourceType), state: "SOURCE_ONLY", inferredFromMetadataOnly: true })) } : { ...coverage, officialSourceMappings: metadata.map((item) => ({ sourceId: item.sourceId, topicIds: topics(item.sourceType), state: "SOURCE_ONLY", inferredFromMetadataOnly: true })) };
writeJson(coveragePath, coveragePayload);

function topics(type) { return type === "LAW" ? ["law-system", "penalties", "administrative-disposition"] : type === "ENFORCEMENT_DECREE" ? ["device-definition", "legal-tables", "business-registration"] : ["pilot-certification", "device-report", "safety-certification", "flight-approval", "legal-forms"]; }
function edge(parentSourceId, childSourceId) { return { parentSourceId, childSourceId, relationType: "IMPLEMENTED_BY", referencedArticle: null, verificationStatus: "STRUCTURE_VERIFIED_ARTICLE_UNSPECIFIED" }; }
function job(item, index, suffix, adapter, status) { return { jobId: `ingest:${item.sourceId}:${suffix}`, sourceId: item.sourceId, localPath: item.localFiles[2], subject: "AVIATION_LAW", adapter, priority: index + 1, prerequisites: ["SOURCE_FILE_AVAILABLE", "CURRENT_VERSION_VERIFIED"], extractionTasks: suffix === "text" ? ["TEXT_EXTRACTION", "LEGAL_STRUCTURE"] : suffix === "table" ? ["TABLE_EXTRACTION", "NUMERIC_PRESERVATION"] : suffix === "attachment" ? ["ATTACHMENT_INVENTORY"] : ["CURRENT_FUTURE_DIFF"], validationTasks: ["CHECKSUM", "SOURCE_LOCATOR", "REVISION", "TRUNCATION"], outputPaths: [`work/source-inventory/extracted/${item.sourceId}-${suffix}.json`], status }; }
function mergeBySource(file, additions) { const prior = readJson(file, []); const list = Array.isArray(prior) ? prior : prior.items ?? []; writeJson(file, [...list.filter((x) => !additions.some((a) => a.sourceId === x.sourceId)), ...additions]); }
function mergeByJob(file, additions) { const prior = readJson(file, []); const list = Array.isArray(prior) ? prior : prior.jobs ?? []; writeJson(file, [...list.filter((x) => !additions.some((a) => a.jobId === x.jobId)), ...additions]); }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); } catch { return fallback; } }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function rel(file) { return path.relative(repo, file).split(path.sep).join("/"); }
