import { createCertificationServices } from "@/domain/certification-engine/services/certification-service-factory";
import type { CertificationServiceContext } from "@/domain/certification-engine/services/certification-service-context";
import { handleCertificationRequest } from "./certification-controller";
import type { CertificationController } from "./certification-controller-types";

export function createCertificationController(serviceContext: CertificationServiceContext): CertificationController {
  const services = createCertificationServices(serviceContext);
  return {
    handle(request) {
      return handleCertificationRequest(request, services);
    }
  };
}
