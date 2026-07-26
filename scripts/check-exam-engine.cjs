/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, "src", request.slice(2)), parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  }).outputText;

  module._compile(output, filename);
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const { getGeneratedQuestions } = require("../src/domain/exam-engine/delivery/question-delivery.ts");
const { analyzeIncrementalKnowledgePack, isIncrementalKnowledgePack, resolveIncrementalImportTarget, resolveIncrementalTargetPack } = require("../src/domain/exam-engine/import/incremental-knowledge-pack.ts");
const { createLocalKnowledgePackRepository } = require("../src/domain/exam-engine/import/local-knowledge-pack-repository.ts");
const { validateKnowledgePack } = require("../src/domain/exam-engine/import/knowledge-pack-validator.ts");
const { validateGeneratedQuestion } = require("../src/domain/exam-engine/validation/question-validator.ts");
const { sampleAtomicFacts } = require("../src/domain/exam-engine/samples/drone-law-sample.ts");

const sameSeedA = getGeneratedQuestions({ seed: "fixed-seed", limit: 5 });
const sameSeedB = getGeneratedQuestions({ seed: "fixed-seed", limit: 5 });
const otherSeed = getGeneratedQuestions({ seed: "other-seed", limit: 5 });

assert(sameSeedA.length > 0, "same seed should produce questions");
assert(JSON.stringify(sameSeedA.map((q) => q.choices.map((c) => c.id))) === JSON.stringify(sameSeedB.map((q) => q.choices.map((c) => c.id))), "same seed must reproduce choice order");
assert(JSON.stringify(sameSeedA.map((q) => q.choices.map((c) => c.id))) !== JSON.stringify(otherSeed.map((q) => q.choices.map((c) => c.id))), "different seed should change question or choice order");

for (const question of sameSeedA) {
  const validation = validateGeneratedQuestion(question);
  assert(validation.ok, `question should validate: ${question.id}`);
  assert(question.choices.length === 4, "question must have 4 choices");
  assert(question.choices.filter((choice) => choice.isCorrect).length === 1, "question must have exactly one correct choice");
  assert(new Set(question.choices.map((choice) => choice.id)).size === 4, "choice ids must be unique");
  assert(new Set(question.choices.map((choice) => choice.text)).size === 4, "choice text must be unique");
  assert(question.sourceReferences.length > 0, "question must keep source references");
  assert(question.validationStatus === "valid", "delivery must only return valid questions");
}

const unapprovedFact = { ...sampleAtomicFacts[0], id: "draft-fact", status: "draft" };
assert(unapprovedFact.status !== "approved", "fixture sanity check");
assert(!getGeneratedQuestions({ seed: "fixed-seed", limit: 20 }).some((question) => question.factIds.includes("draft-fact")), "unapproved facts must not be delivered");

const trueQuestions = getGeneratedQuestions({ seed: "true-seed", questionTypes: ["SELECT_TRUE"], limit: 3 });
const falseQuestions = getGeneratedQuestions({ seed: "false-seed", questionTypes: ["SELECT_FALSE"], limit: 3 });
assert(trueQuestions.length > 0 && trueQuestions.every((question) => question.trace.questionType === "SELECT_TRUE"), "SELECT_TRUE generation failed");
assert(falseQuestions.length > 0 && falseQuestions.every((question) => question.trace.questionType === "SELECT_FALSE"), "SELECT_FALSE generation failed");

const removedFiles = [
  "src/data/yacht-questions.ts",
  "src/data/general-questions.ts",
  "src/data/questions.ts",
  "src/data/categoryTree.ts",
  "src/data/theories.ts",
  "scripts/check-learning-core.cjs"
];

for (const relativePath of removedFiles) {
  assert(!fs.existsSync(path.join(root, relativePath)), `${relativePath} should be removed`);
}

function createValidKnowledgePack(overrides = {}) {
  const sourceDocument = {
    id: "doc-air-safety",
    title: "Aviation Safety Act Sample",
    publisher: "Drone Pass Team",
    note: "Validation fixture"
  };
  const sourceRevision = {
    id: "doc-air-safety-v1",
    documentId: sourceDocument.id,
    label: "v1",
    publishedAt: "2026-07-14"
  };
  const ref = [{ documentId: sourceDocument.id, revisionId: sourceRevision.id, locator: "fixture", note: "test" }];
  const baseFacts = [
    {
      id: "fact-alpha",
      conceptId: "concept-law",
      subject: "Alpha",
      predicate: "check",
      value: "alpha rule",
      statement: "Alpha flight requires preflight confirmation.",
      conditions: [],
      exceptions: [],
      sourceReferences: ref,
      version: "v1",
      status: "approved"
    },
    {
      id: "fact-beta",
      conceptId: "concept-law",
      subject: "Beta",
      predicate: "check",
      value: "beta rule",
      statement: "Beta flight requires weather confirmation.",
      conditions: [],
      exceptions: [],
      sourceReferences: ref,
      version: "v1",
      status: "approved"
    },
    {
      id: "fact-gamma",
      conceptId: "concept-law",
      subject: "Gamma",
      predicate: "check",
      value: "gamma rule",
      statement: "Gamma flight requires site confirmation.",
      conditions: [],
      exceptions: [],
      sourceReferences: ref,
      version: "v1",
      status: "approved"
    },
    {
      id: "fact-delta",
      conceptId: "concept-law",
      subject: "Delta",
      predicate: "check",
      value: "delta rule",
      statement: "Delta flight requires battery confirmation.",
      conditions: [],
      exceptions: [],
      sourceReferences: ref,
      version: "v1",
      status: "approved"
    }
  ];

  return {
    domainPack: {
      exams: [{ id: "exam-drone", title: "Drone Exam", countryCode: "KR", description: "Fixture", subjectIds: ["subject-law"] }],
      subjects: [{ id: "subject-law", examId: "exam-drone", title: "Law", description: "Fixture subject", categoryIds: ["category-law"] }],
      categories: [{ id: "category-law", subjectId: "subject-law", title: "Law Category" }]
    },
    sourceDocuments: [sourceDocument],
    sourceRevisions: [sourceRevision],
    concepts: [{ id: "concept-law", subjectId: "subject-law", categoryIds: ["category-law"], title: "Law Concept", summary: "Fixture concept" }],
    atomicFacts: baseFacts,
    questionTemplates: [
      { id: "template-true", questionType: "SELECT_TRUE", stemTemplate: "Choose true: {concept}", explanationTemplate: "{statement}", difficulty: "easy" }
    ],
    distractorRules: [
      { id: "rule-condition", mutationType: "CONDITION_OMISSION", description: "omit condition" },
      { id: "rule-authority", mutationType: "AUTHORITY_SWAP", description: "swap authority" },
      { id: "rule-unit", mutationType: "UNIT_SWAP", description: "swap unit" },
      { id: "rule-sibling", mutationType: "SIBLING_FACT_SWAP", description: "swap sibling fact" }
    ],
    ...overrides
  };
}

function expectPackError(pack, code) {
  const result = validateKnowledgePack(pack);
  assert(!result.valid, `${code} should fail validation`);
  assert(result.errors.some((issue) => issue.code === code), `${code} error should be present`);
}

const validPack = createValidKnowledgePack();
assert(validateKnowledgePack(validPack).valid, "valid Knowledge Pack should pass");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], conceptId: "missing" }, ...validPack.atomicFacts.slice(1)] }, "MISSING_CONCEPT");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], sourceReferences: [{ documentId: "missing", locator: "x" }] }, ...validPack.atomicFacts.slice(1)] }, "MISSING_SOURCE_DOCUMENT");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], appliesTo: ["missing"] }, ...validPack.atomicFacts.slice(1)] }, "MISSING_APPLIES_TO_FACT");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], derivedFrom: ["missing"] }, ...validPack.atomicFacts.slice(1)] }, "MISSING_DERIVED_FROM_FACT");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], crossReferences: ["missing"] }, ...validPack.atomicFacts.slice(1)] }, "MISSING_CROSS_REFERENCE_FACT");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], factType: "COMPOSITE_FACT", groupId: "group-a" }, ...validPack.atomicFacts.slice(1)] }, "MISSING_GROUP_OPERATOR");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], factType: "COMPOSITE_FACT", groupId: "group-a", groupOperator: "AND" }, ...validPack.atomicFacts.slice(1)] }, "COMPOSITE_GROUP_TOO_SMALL");
expectPackError({ ...validPack, atomicFacts: [{ ...validPack.atomicFacts[0], confidence: 2 }, ...validPack.atomicFacts.slice(1)] }, "INVALID_CONFIDENCE");

const standaloneBlockedPack = createValidKnowledgePack({
  atomicFacts: [{ ...validPack.atomicFacts[0], standaloneQuestionAllowed: false }, ...validPack.atomicFacts.slice(1)]
});
assert(!getGeneratedQuestions({ knowledgePack: standaloneBlockedPack, seed: "blocked", limit: 20 }).some((question) => question.factIds.includes("fact-alpha")), "standaloneQuestionAllowed=false must block standalone delivery");

const conditionRulePack = createValidKnowledgePack({
  atomicFacts: [
    ...validPack.atomicFacts,
    {
      ...validPack.atomicFacts[0],
      id: "condition-rule-alpha",
      factType: "CONDITION_RULE",
      appliesTo: ["fact-alpha"],
      statement: "Only when the aircraft is being prepared."
    }
  ]
});
const conditionRuleQuestions = getGeneratedQuestions({ knowledgePack: conditionRulePack, seed: "condition-rule", limit: 20 });
assert(!conditionRuleQuestions.some((question) => question.factIds.includes("condition-rule-alpha")), "CONDITION_RULE must not be delivered standalone");
assert(conditionRuleQuestions.some((question) => question.factIds.includes("fact-alpha")), "CONDITION_RULE target fact should remain eligible");

const compositePack = createValidKnowledgePack({
  atomicFacts: [
    { ...validPack.atomicFacts[0], factType: "COMPOSITE_FACT", groupId: "group-and", groupOperator: "AND" },
    { ...validPack.atomicFacts[1], factType: "COMPOSITE_FACT", groupId: "group-and", groupOperator: "AND" },
    ...validPack.atomicFacts.slice(2)
  ]
});
const compositeQuestions = getGeneratedQuestions({ knowledgePack: compositePack, seed: "composite", limit: 20 });
assert(compositeQuestions.some((question) => question.factIds.includes("fact-alpha")), "AND composite group facts should be eligible");
assert(compositeQuestions.some((question) => question.factIds.includes("fact-beta")), "AND composite group facts should be eligible together");

function createMockStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

global.window = { localStorage: createMockStorage() };
const repository = createLocalKnowledgePackRepository();
const stored = repository.save(validPack, "Fixture Pack");
assert(repository.list().length === 1, "repository should persist saved pack");
assert(repository.getActive()?.id === stored.id, "saved pack should become active");
assert(getGeneratedQuestions({ seed: "active-pack", limit: 3 }).every((question) => question.examId === "exam-drone"), "active pack should be reflected in delivery");

const incrementalPack = {
  targetPackId: stored.id,
  mode: "merge",
  categories: [{ id: "category-extra", subjectId: "subject-law", title: "Extra Category" }],
  sourceDocuments: [],
  sourceRevisions: [],
  concepts: [{ id: "concept-extra", subjectId: "subject-law", categoryIds: ["category-extra"], title: "Extra Concept", summary: "Extra summary" }],
  atomicFacts: [
    {
      id: "fact-extra",
      conceptId: "concept-extra",
      subject: "Extra",
      predicate: "check",
      value: "extra rule",
      statement: "Extra flight requires additional confirmation.",
      conditions: [],
      exceptions: [],
      crossReferences: ["fact-alpha"],
      sourceReferences: [{ documentId: "doc-air-safety", revisionId: "doc-air-safety-v1", locator: "incremental", note: "test" }],
      version: "v1",
      status: "approved"
    }
  ]
};
const exactTarget = resolveIncrementalTargetPack(incrementalPack, stored, repository.list(), false);
assert(exactTarget.status === "resolved" && exactTarget.canAnalyze, "exact targetPackId should resolve active pack");
assert(exactTarget.resolvedTargetPackId === stored.id && exactTarget.usedActiveAlias === false, "exact targetPackId should keep the active pack id");
assert(exactTarget.requiresConfirmation === true, "exact targetPackId should still require user confirmation before merge");
const exactTargetConfirmed = resolveIncrementalTargetPack(incrementalPack, stored, repository.list(), true);
assert(exactTargetConfirmed.status === "resolved" && exactTargetConfirmed.requiresConfirmation === false, "exact targetPackId should be executable after confirmation");
const incrementalAnalysis = analyzeIncrementalKnowledgePack(stored.pack, incrementalPack, false);
assert(incrementalAnalysis.summary.canSave, "valid incremental pack should be saveable");
assert(incrementalAnalysis.summary.added.atomicFacts.includes("fact-extra"), "incremental preview should show added fact");
assert(incrementalAnalysis.summary.crossReferences.some((item) => item.from === "fact-extra" && item.to === "fact-alpha"), "incremental preview should show new-to-existing crossReference");
assert(incrementalAnalysis.merged.questionTemplates.length === stored.pack.questionTemplates.length, "missing incremental templates should keep existing templates");
assert(incrementalAnalysis.merged.distractorRules.length === stored.pack.distractorRules.length, "missing incremental rules should keep existing rules");
repository.update(stored.id, incrementalAnalysis.merged);
assert(repository.getActive()?.pack.atomicFacts.some((fact) => fact.id === "fact-extra"), "repository update should persist merged fact");
assert(getGeneratedQuestions({ seed: "incremental-active", limit: 20 }).some((question) => question.factIds.includes("fact-extra")), "merged active pack should be reflected in study delivery");

const activeAliasPack = { ...incrementalPack, targetPackId: "**ACTIVE**", atomicFacts: [{ ...incrementalPack.atomicFacts[0], id: "fact-active-alias", statement: "Active alias incremental fact." }] };
const activeAliasTarget = resolveIncrementalTargetPack(activeAliasPack, repository.getActive(), repository.list(), false);
assert(activeAliasTarget.status === "resolved" && activeAliasTarget.usedActiveAlias, "**ACTIVE** should resolve current active pack");
assert(activeAliasTarget.resolvedTargetPackId === repository.getActive().id, "**ACTIVE** must resolve to the real active pack id");
assert(activeAliasTarget.inputTargetPackId === "**ACTIVE**", "**ACTIVE** should remain visible as input target");
assert(analyzeIncrementalKnowledgePack(repository.getActive().pack, activeAliasPack, false).summary.canSave, "**ACTIVE** incremental merge should be valid");

const wrongTargetPack = { ...incrementalPack, targetPackId: "wrong-pack-id" };
const wrongTarget = resolveIncrementalTargetPack(wrongTargetPack, repository.getActive(), repository.list(), false);
assert(wrongTarget.status === "blocked" && wrongTarget.reason === "target-pack-not-found" && !wrongTarget.canAnalyze, "wrong targetPackId should be blocked");

const omittedTargetPack = { ...incrementalPack };
delete omittedTargetPack.targetPackId;
assert(isIncrementalKnowledgePack(omittedTargetPack), "omitted targetPackId should still be treated as incremental import");
const omittedBeforeConfirm = resolveIncrementalTargetPack(omittedTargetPack, repository.getActive(), repository.list(), false);
assert(omittedBeforeConfirm.status === "resolved" && omittedBeforeConfirm.requiresConfirmation === true, "omitted targetPackId should require confirmation with one stored pack");
const omittedAfterConfirm = resolveIncrementalTargetPack(omittedTargetPack, repository.getActive(), repository.list(), true);
assert(omittedAfterConfirm.status === "resolved" && omittedAfterConfirm.requiresConfirmation === false && omittedAfterConfirm.canAnalyze, "omitted targetPackId should resolve after user confirmation");
assert(analyzeIncrementalKnowledgePack(repository.getActive().pack, omittedTargetPack, false).summary.canSave, "confirmed omitted target incremental merge should be valid");

const noActiveTarget = resolveIncrementalTargetPack(activeAliasPack, null, [], false);
assert(noActiveTarget.status === "blocked" && noActiveTarget.reason === "no-active-pack" && !noActiveTarget.canAnalyze, "incremental import should be blocked when no active pack exists");

const inactivePack = { ...stored, id: "pack-inactive", active: false };
const inactiveTarget = resolveIncrementalTargetPack({ ...incrementalPack, targetPackId: inactivePack.id }, stored, [stored, inactivePack], false);
assert(inactiveTarget.status === "blocked" && inactiveTarget.reason === "target-pack-not-active", "inactive pack id should be blocked and not replaced with active pack");

const multipleStoredButSingleActive = resolveIncrementalTargetPack(omittedTargetPack, stored, [stored, inactivePack], false);
assert(multipleStoredButSingleActive.status === "resolved" && multipleStoredButSingleActive.requiresConfirmation, "current repository supports one active pack, so omitted target should resolve to the single active pack with confirmation");
const secondActivePack = { ...stored, id: "pack-active-2", active: true };
const multipleActiveResolution = resolveIncrementalImportTarget({ inputTargetPackId: undefined, activePacks: [stored, secondActivePack], allPacks: [stored, secondActivePack] });
assert(multipleActiveResolution.status === "selection-required" && !multipleActiveResolution.canAnalyze, "multiple active packs should require explicit selection");

const conflictPack = {
  ...incrementalPack,
  atomicFacts: [{ ...validPack.atomicFacts[0], statement: "Changed statement should conflict." }]
};
const conflictAnalysis = analyzeIncrementalKnowledgePack(stored.pack, conflictPack, false);
assert(!conflictAnalysis.summary.canSave, "same id different content should block save");
assert(conflictAnalysis.summary.conflicts.atomicFacts.includes("fact-alpha"), "conflict preview should include conflicting fact id");
const replaceAnalysis = analyzeIncrementalKnowledgePack(stored.pack, conflictPack, true);
assert(replaceAnalysis.summary.canSave, "replace should allow conflicting incremental merge");
assert(replaceAnalysis.merged.atomicFacts.find((fact) => fact.id === "fact-alpha").statement === "Changed statement should conflict.", "replace should update conflicting fact");

const brokenIncrementalPack = {
  ...incrementalPack,
  atomicFacts: [{ ...incrementalPack.atomicFacts[0], id: "fact-broken", conceptId: "missing-concept" }]
};
const brokenAnalysis = analyzeIncrementalKnowledgePack(stored.pack, brokenIncrementalPack, false);
assert(!brokenAnalysis.summary.canSave, "broken references should block incremental save");
assert(brokenAnalysis.summary.brokenReferences.some((issue) => issue.code === "MISSING_CONCEPT"), "broken reference preview should include missing concept");

repository.remove(stored.id);
assert(repository.list().length === 0, "repository should remove saved pack");
delete global.window;
assert(getGeneratedQuestions({ seed: "fallback-pack", limit: 3 }).length > 0, "delivery should fallback to sample pack when no active pack exists");

console.log("Exam engine check passed: seeded generation, validation, delivery filtering, and legacy file removal verified.");
