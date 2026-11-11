// src/index.ts
import { readFileSync } from "node:fs";
import os from "node:os";
var MOTION = ["auto", "full", "gentle"];
var QUALITY = ["auto", "high", "low"];
function choice(value, options) {
  return options.find((option) => option === value) ?? options[0];
}
var DEFAULT_WELCOME = "Welcome to\nDeepSeek Harness !";
var PLACEHOLDER = '"__LINK_START_SETTINGS__"';
var LOCALE_PLUGIN = "@deepseek-ai/dsh-client-locale";
function text(value, limit, lines = 1) {
  if (typeof value !== "string") return void 0;
  const kept = value.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const joined = [...kept.slice(0, lines - 1), kept.slice(lines - 1).join(" ")].filter(Boolean).join("\n");
  return joined ? [...joined].slice(0, limit).join("") : void 0;
}
function count(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : void 0;
}
function osAccount() {
  try {
    return text(os.userInfo().username, 24);
  } catch {
    return void 0;
  }
}
function snapshot(ctx) {
  const out = {};
  const read = (key, get) => {
    try {
      const value = get();
      if (value !== void 0) out[key] = value;
    } catch {
    }
  };
  const entries = () => [...ctx.get("loader")?.entries() ?? []];
  const workspaces = () => {
    const list = ctx.get("workspaceRegistry")?.list();
    return Array.isArray(list) ? list : [];
  };
  read("profile", () => text(ctx.get("profileContext")?.name, 24));
  read("model", () => text(ctx.get("agentDefaultModel")?.currentSelection()?.model, 40));
  read("plugins", () => count(entries().filter((entry) => entry.fiber && !entry.options?.group && !entry.disabled).length));
  read("locale", () => {
    const entry = entries().find((item) => item.options?.name === LOCALE_PLUGIN && !item.disabled);
    return text(entry?.fiber?.config?.preference ?? entry?.options?.config?.preference, 16);
  });
  read("workspaces", () => count(workspaces().length));
  read("sessions", () => count(workspaces().reduce((sum, item) => sum + (item.sessionIds?.length ?? 0), 0)));
  read("workspace", () => {
    const latest = workspaces().filter((item) => typeof item.updatedAt === "string").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return text(latest?.title, 32);
  });
  return out;
}
function apply(ctx, config = {}) {
  const css = readFileSync(new URL("../assets/link-start.css", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../assets/link-start.js", import.meta.url), "utf8");
  if (!runtime.includes(PLACEHOLDER)) throw new Error("dsh-link-start: overlay runtime is missing its settings placeholder");
  const base = {
    account: text(config.account, 24) ?? osAccount() ?? "Player",
    welcome: text(config.welcome, 60, 3) ?? DEFAULT_WELCOME,
    everyReload: config.everyReload === true,
    motion: choice(config.motion, MOTION),
    quality: choice(config.quality, QUALITY)
  };
  ctx.on("webserver/index-inject", (table) => {
    const settings = { ...base, dsh: snapshot(ctx) };
    const script = runtime.replace(PLACEHOLDER, () => JSON.stringify(settings).replace(/</g, "\\u003c"));
    table.push({ kind: "style", text: css }, { kind: "script", placement: "body", text: script });
  });
}
export {
  apply
};
