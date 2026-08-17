const OFFICIAL_HOSTS = new Set(["law.go.kr", "www.law.go.kr", "molit.go.kr", "www.molit.go.kr", "main.kotsa.or.kr"]);

export function isOfficialSourceUrl(value: string): boolean {
  try { return new URL(value).protocol === "https:" && OFFICIAL_HOSTS.has(new URL(value).hostname.toLowerCase()); }
  catch { return false; }
}

export function assertOfficialSourceUrl(value: string): void {
  if (!isOfficialSourceUrl(value)) throw new Error("UNOFFICIAL_SOURCE_URL");
}
