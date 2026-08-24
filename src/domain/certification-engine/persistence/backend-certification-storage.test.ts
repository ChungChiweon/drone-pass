import { describe, expect, it } from "vitest";
import { BackendCertificationStorageAdapter } from "./backend-certification-storage-adapter";
import type { BackendCertificationStorageProvider, BackendRecordQuery, BackendStorageContext } from "./backend-certification-storage";
import type { CertificationStorageRecord } from "./certification-storage";
import { createStorageProvider } from "./certification-storage-provider-factory";
import { LocalCertificationStorageProvider } from "./local-certification-storage";
import { validateStorageAccess } from "./storage-access-control";
import { SupabaseCertificationStorageProvider } from "./supabase-certification-storage";

const adminContext: BackendStorageContext = {
  userId: "admin-1",
  domainId: "kr-drone-license",
  packId: "drone-pack",
  permissions: ["READ", "WRITE", "ADMIN"]
};

const userContext: BackendStorageContext = {
  userId: "user-1",
  domainId: "kr-drone-license",
  packId: "drone-pack",
  permissions: ["READ", "WRITE"]
};

function record(userId = "user-1"): CertificationStorageRecord<{ value: string }> {
  return {
    id: `certification.progress.${userId}.kr-drone-license.drone-pack`,
    entityType: "PROGRESS",
    domainId: "kr-drone-license",
    packId: "drone-pack",
    userId,
    payload: { value: "stored" },
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z"
  };
}

function backendProvider(): BackendCertificationStorageProvider {
  const records = new Map<string, CertificationStorageRecord>();
  return {
    async saveRecord(context, value) {
      const access = validateStorageAccess(context, "WRITE", value);
      if (!access.allowed) throw new Error(access.reason);
      records.set(value.id, value);
      return value;
    },
    async getRecord<TPayload>(context: BackendStorageContext, id: string): Promise<CertificationStorageRecord<TPayload> | null> {
      const value = records.get(id);
      if (!value) return null;
      const access = validateStorageAccess(context, "READ", value);
      if (!access.allowed) throw new Error(access.reason);
      return value as CertificationStorageRecord<TPayload>;
    },
    async listRecords<TPayload>(context: BackendStorageContext, query: BackendRecordQuery = {}): Promise<Array<CertificationStorageRecord<TPayload>>> {
      return Array.from(records.values()).filter((value) => {
        const access = validateStorageAccess(context, "READ", value);
        if (!access.allowed) return false;
        if (query.entityType && query.entityType !== value.entityType) return false;
        if (query.domainId && query.domainId !== value.domainId) return false;
        if (query.packId && query.packId !== value.packId) return false;
        if (query.userId && query.userId !== value.userId) return false;
        return true;
      }) as Array<CertificationStorageRecord<TPayload>>;
    },
    async deleteRecord(context, id) {
      const value = records.get(id);
      if (!value) return;
      const access = validateStorageAccess(context, "DELETE", value);
      if (!access.allowed) throw new Error(access.reason);
      records.delete(id);
    }
  };
}

describe("backend certification storage architecture", () => {
  it("validates user, domain, pack, and permission boundaries", () => {
    expect(validateStorageAccess(userContext, "READ", record()).allowed).toBe(true);
    expect(validateStorageAccess({ ...userContext, permissions: ["READ"] }, "WRITE", record()).allowed).toBe(false);
    expect(validateStorageAccess(userContext, "READ", { ...record(), userId: "user-2" }).reason).toBe("User mismatch");
    expect(validateStorageAccess(userContext, "READ", { ...record(), domainId: "boat-license" }).reason).toBe("Domain mismatch");
    expect(validateStorageAccess(userContext, "READ", { ...record(), packId: "boat-pack" }).reason).toBe("Pack mismatch");
    expect(validateStorageAccess(adminContext, "DELETE", record("user-2")).allowed).toBe(true);
  });

  it("supports backend adapter save, list, get, and delete contracts", async () => {
    const backend = backendProvider();
    await backend.saveRecord(adminContext, record());

    await expect(backend.getRecord(adminContext, record().id)).resolves.toMatchObject({ payload: { value: "stored" } });
    await expect(backend.listRecords(adminContext, { entityType: "PROGRESS" })).resolves.toHaveLength(1);
    await backend.deleteRecord(adminContext, record().id);
    await expect(backend.getRecord(adminContext, record().id)).resolves.toBeNull();
  });

  it("allows backend provider wrapping through the certification storage provider contract", () => {
    const provider = createStorageProvider("backend", {
      backendProvider: backendProvider(),
      backendContext: adminContext
    });

    expect(provider).toBeInstanceOf(BackendCertificationStorageAdapter);
  });

  it("keeps local provider as the default factory selection", () => {
    expect(createStorageProvider()).toBeInstanceOf(LocalCertificationStorageProvider);
  });

  it("exposes a Supabase provider stub without connecting the SDK", async () => {
    const provider = createStorageProvider("supabase");

    expect(provider).toBeInstanceOf(SupabaseCertificationStorageProvider);
    await expect(provider.getRuntimeContext("kr-drone-license", "drone-pack")).rejects.toThrow("stub");
  });
});
