export type AuditIdGenerator = {
  generateAuditId(): string;
};

function createFallbackAuditId() {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "");
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `KGAUD-${timestamp}-${randomSuffix}`;
}

export function generateAuditId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `KGAUD-${crypto.randomUUID()}`;
  }
  return createFallbackAuditId();
}

export function createAuditIdGenerator(seed: () => string = generateAuditId): AuditIdGenerator {
  return {
    generateAuditId: seed
  };
}
