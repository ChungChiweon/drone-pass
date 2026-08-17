const OFFICIAL_HOSTS = new Set(["law.go.kr", "www.law.go.kr"]);
export function resolveOfficialAttachmentDownload(baseUrl: string, href: string): string | undefined {
  const url = new URL(href, baseUrl);
  if (!OFFICIAL_HOSTS.has(url.hostname) || url.pathname !== "/LSW/flDownload.do") return undefined;
  if (!url.searchParams.get("flSeq") || !url.searchParams.get("bylClsCd")) return undefined;
  return url.toString();
}
