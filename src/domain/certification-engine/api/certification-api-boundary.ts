export type CertificationApiRequest<TPayload = unknown> = {
  userId: string;
  domainId: string;
  packId: string;
  action: string;
  payload: TPayload;
};

export type CertificationApiResponse<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: string;
};

export function createCertificationApiResponse<TData>(data: TData): CertificationApiResponse<TData> {
  return { success: true, data };
}

export function createCertificationApiError(error: string): CertificationApiResponse<never> {
  return { success: false, error };
}
