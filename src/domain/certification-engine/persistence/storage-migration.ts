import type { CertificationStorageEntityType } from "./certification-storage";

export type StorageMigrationPlan = {
  source: "localStorage" | "memory" | "supabase";
  target: "localStorage" | "memory" | "supabase";
  entityType: CertificationStorageEntityType;
  version: string;
};

export function createStorageMigrationPlan(input: StorageMigrationPlan): StorageMigrationPlan {
  return { ...input };
}
