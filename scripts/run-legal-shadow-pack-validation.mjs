import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, resolve: { alias: { "@": resolve(root, "src") } }, server: { middlewareMode: true }, appType: "custom" });
try { await server.ssrLoadModule("/scripts/run-legal-shadow-pack-validation.ts"); }
finally { await server.close(); }
