import { BackendCertificationStorageAdapter } from "./backend-certification-storage-adapter";
import type { BackendCertificationStorageProvider, BackendStorageContext } from "./backend-certification-storage";
import type { CertificationStorageProvider } from "./certification-storage";
import { LocalCertificationStorageProvider } from "./local-certification-storage";
import { SupabaseCertificationStorageProvider } from "./supabase-certification-storage";

export type CertificationStorageProviderType = "local" | "backend" | "supabase";

export type CertificationStorageProviderFactoryOptions = {
  backendProvider?: BackendCertificationStorageProvider;
  backendContext?: BackendStorageContext;
};

export function createStorageProvider(
  type: CertificationStorageProviderType = "local",
  options: CertificationStorageProviderFactoryOptions = {}
): CertificationStorageProvider {
  if (type === "supabase") {
    return new SupabaseCertificationStorageProvider();
  }
  if (type === "backend") {
    if (!options.backendProvider || !options.backendContext) {
      throw new Error("backendProvider and backendContext are required for backend certification storage");
    }
    return new BackendCertificationStorageAdapter(options.backendProvider, options.backendContext);
  }
  return new LocalCertificationStorageProvider();
}
