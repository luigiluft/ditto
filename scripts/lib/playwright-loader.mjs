import { createRequire } from "node:module";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

// Portable Playwright resolution. Order:
// 1. `playwright` resolvable from the clone project (best: `npm i -D playwright`).
// 2. npm global root.
// 3. Any playwright vendored in the npx cache (this is where the connected
//    @playwright/mcp server keeps it on Windows — reused so we need no install).
function npxCacheCandidates() {
  const base = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : join(process.env.HOME || process.env.USERPROFILE || ".", ".npm", "_npx");
  if (!existsSync(base)) return [];
  try {
    return readdirSync(base)
      .map((h) => join(base, h, "node_modules", "playwright"))
      .filter((p) => existsSync(p));
  } catch {
    return [];
  }
}

export function loadPlaywright() {
  const globalRoot = process.env.APPDATA
    ? join(process.env.APPDATA, "npm", "node_modules", "playwright")
    : null;
  const candidates = [
    "playwright",
    globalRoot,
    ...npxCacheCandidates(),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(
    "Playwright not found. Run `npm install -D playwright` in the clone project, " +
      "or ensure the connected Playwright MCP server has cached it under npm-cache/_npx.",
  );
}

export async function launchChromium(chromium) {
  // The machine keeps browsers in the ms-playwright cache; point Playwright at it
  // if it isn't already set, so a cache-only install still finds a binary.
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.LOCALAPPDATA) {
    const ms = join(process.env.LOCALAPPDATA, "ms-playwright");
    if (existsSync(ms)) process.env.PLAYWRIGHT_BROWSERS_PATH = ms;
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (firstError) {
    try {
      return await chromium.launch({ headless: true, channel: "chrome" });
    } catch {
      throw firstError;
    }
  }
}
