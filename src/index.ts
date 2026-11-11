import { readFileSync } from 'node:fs';
import os from 'node:os';

/** Optional bundle config; anything missing or malformed falls back to the defaults. */
type Options = { account?: unknown; welcome?: unknown; everyReload?: unknown; motion?: unknown; quality?: unknown };

/** First entry is the default. */
const MOTION = ['auto', 'full', 'gentle'] as const;
const QUALITY = ['auto', 'high', 'low'] as const;

function choice<T extends string>(value: unknown, options: readonly T[]): T {
  return options.find(option => option === value) ?? options[0];
}

/** What this DSH is running, shown inside the scenes. Every field is optional. */
type Snapshot = {
  profile?: string;
  plugins?: number;
  model?: string;
  workspaces?: number;
  sessions?: number;
  workspace?: string;
  locale?: string;
};

const DEFAULT_WELCOME = 'Welcome to\nDeepSeek Harness !';
const PLACEHOLDER = '"__LINK_START_SETTINGS__"';
const LOCALE_PLUGIN = '@deepseek-ai/dsh-client-locale';

/** Collapse whitespace and cap length; `lines` keeps up to that many line breaks for the welcome title. */
function text(value: unknown, limit: number, lines = 1) {
  if (typeof value !== 'string') return undefined;
  const kept = value.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const joined = [...kept.slice(0, lines - 1), kept.slice(lines - 1).join(' ')].filter(Boolean).join('\n');
  return joined ? [...joined].slice(0, limit).join('') : undefined;
}

function count(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function osAccount() {
  try { return text(os.userInfo().username, 24); } catch { return undefined; }
}

/**
 * Best-effort read of the running DSH: profile, loaded plugins, default model, workspaces,
 * sessions and the UI language preference. These are cosmetic, so a service that is
 * missing, not ready yet, or shaped differently in another DSH build just drops its field.
 */
function snapshot(ctx: any): Snapshot {
  const out: Snapshot = {};
  const read = <K extends keyof Snapshot>(key: K, get: () => Snapshot[K]) => {
    try {
      const value = get();
      if (value !== undefined) out[key] = value;
    } catch { /* detail unavailable in this build */ }
  };
  const entries = (): any[] => [...(ctx.get('loader')?.entries() ?? [])];
  const workspaces = (): any[] => {
    const list = ctx.get('workspaceRegistry')?.list();
    return Array.isArray(list) ? list : [];
  };

  read('profile', () => text(ctx.get('profileContext')?.name, 24));
  read('model', () => text(ctx.get('agentDefaultModel')?.currentSelection()?.model, 40));
  read('plugins', () => count(entries().filter(entry => entry.fiber && !entry.options?.group && !entry.disabled).length));
  read('locale', () => {
    const entry = entries().find(item => item.options?.name === LOCALE_PLUGIN && !item.disabled);
    return text(entry?.fiber?.config?.preference ?? entry?.options?.config?.preference, 16);
  });
  read('workspaces', () => count(workspaces().length));
  read('sessions', () => count(workspaces().reduce((sum, item) => sum + (item.sessionIds?.length ?? 0), 0)));
  read('workspace', () => {
    const latest = workspaces()
      .filter(item => typeof item.updatedAt === 'string')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return text(latest?.title, 32);
  });
  return out;
}

/**
 * Push the splash overlay into every index render. Index injections run before the
 * React shell mounts — in Desktop they ride the boot payload, on the Web they are
 * rendered into index.html — so the overlay covers the stock startup screen.
 */
export function apply(ctx: any, config: Options = {}) {
  const css = readFileSync(new URL('../assets/link-start.css', import.meta.url), 'utf8');
  const runtime = readFileSync(new URL('../assets/link-start.js', import.meta.url), 'utf8');
  if (!runtime.includes(PLACEHOLDER)) throw new Error('dsh-link-start: overlay runtime is missing its settings placeholder');
  const base = {
    account: text(config.account, 24) ?? osAccount() ?? 'Player',
    welcome: text(config.welcome, 60, 3) ?? DEFAULT_WELCOME,
    everyReload: config.everyReload === true,
    motion: choice(config.motion, MOTION),
    quality: choice(config.quality, QUALITY),
  };
  ctx.on('webserver/index-inject', (table: unknown[]) => {
    // Read at render time, when the other plugins have finished loading.
    const settings = { ...base, dsh: snapshot(ctx) };
    // The served index inlines this text inside <script>; escaping "<" keeps any config string inert there.
    const script = runtime.replace(PLACEHOLDER, () => JSON.stringify(settings).replace(/</g, '\\u003c'));
    table.push({ kind: 'style', text: css }, { kind: 'script', placement: 'body', text: script });
  });
}
