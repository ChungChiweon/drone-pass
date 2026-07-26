import { describe, expect, it, vi } from "vitest";
import { checkAdminAccess } from "./admin-access";

function client(role: string | null, user: { id: string; email?: string } | null = { id: "u1", email: "admin@example.com" }) {
  const maybeSingle = vi.fn(async () => ({ data: role ? { role } : null, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn(() => ({ select }))
  };
}

describe("checkAdminAccess", () => {
  it("allows only an authenticated profiles.role=admin user", async () => {
    await expect(checkAdminAccess(client("admin") as never)).resolves.toMatchObject({ status: "authenticated", userId: "u1" });
    await expect(checkAdminAccess(client("teacher") as never)).resolves.toMatchObject({ status: "forbidden" });
  });

  it("rejects an unauthenticated user", async () => {
    await expect(checkAdminAccess(client(null, null) as never)).resolves.toEqual({ status: "unauthenticated" });
  });
});
