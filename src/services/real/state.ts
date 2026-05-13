import "@tanstack/react-start/server-only";

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import {
  MOCK_FLOWS,
  MOCK_LOGS,
  MOCK_METRICS,
  MOCK_OTP_TEMPLATES,
  MOCK_PREVIEW,
  MOCK_TEMPLATES,
} from "../mock/data";
import type {
  ConversationPreview,
  DashboardMetrics,
  ExecutionLog,
  Flow,
  FlowTemplate,
  OTPFlowConfig,
  OTPTemplate,
  Session,
} from "@/types";

const require = createRequire(import.meta.url);

const APP_ROOT = process.cwd();
const BERRY_PROTOCOL_ROOT = resolve(APP_ROOT, "..", "BerryProtocol");
const BERRY_PROTOCOL_DB = resolve(BERRY_PROTOCOL_ROOT, "berrysdk.db");
const BERRY_SESSIONS_DIR = resolve(BERRY_PROTOCOL_ROOT, ".berry-sessions");
const DATA_DIR = resolve(APP_ROOT, ".berryflow-data");
const FLOWS_FILE = resolve(DATA_DIR, "flows.json");
const EXECUTIONS_FILE = resolve(DATA_DIR, "executions.json");
const OTP_STATE_FILE = resolve(DATA_DIR, "otp-state.json");

type RuntimeSessionState = {
  status: Session["status"];
  qrCode?: string;
  updatedAt: string;
  error?: string;
};

type OTPMetricsState = {
  sentToday: number;
  usageRate: number;
  expirationRate: number;
  sends: Array<{ id: string; to: string; sentAt: number; used?: boolean; expired?: boolean }>;
  flows: Array<{ id: string; createdAt: number; config: OTPFlowConfig }>;
};

type SessionSnapshot = {
  sessionId: string;
  registered?: boolean;
  qr?: string;
  authMethod?: "link" | "qr" | "pairing_code";
};

type SessionCreds = {
  registered?: boolean;
  me?: { id?: string; name?: string; lid?: string };
};

type DbRow = {
  session_id: string;
  payload: string;
  updated_at: string;
};

type BerryClientLike = {
  on: (event: string, listener: (payload: unknown) => void) => unknown;
  connectWithQr: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  getQrCode?: () => string | undefined;
  sendText?: (to: string, text: string) => Promise<unknown>;
  sendButtons?: (to: string, payload: unknown) => Promise<unknown>;
  sendList?: (to: string, payload: unknown) => Promise<unknown>;
  sendCarousel?: (to: string, payload: unknown) => Promise<unknown>;
  sendReaction?: (to: string, emoji: string, targetMessageId?: string) => Promise<unknown>;
  sendMessage?: (to: string, content: Record<string, unknown>) => Promise<unknown>;
};

type BerryOTPModule = {
  BerryOTP?: {
    createLoginFlow: (client: BerryClientLike, options?: Partial<OTPFlowConfig>) => {
      sendLoginCode: (
        to: string,
        options?: { metadata?: Record<string, string>; userId?: string },
      ) => Promise<{ id: string; code: string }>;
      verifyLoginCode: (to: string, code: string) => Promise<{ valid: boolean }>;
      cancel: (id: string) => Promise<void>;
      dispose?: () => void;
    };
  };
};

declare global {
  // eslint-disable-next-line no-var
  var __berryflowRuntime:
    | {
        clients: Map<string, BerryClientLike>;
        sessionState: Map<string, RuntimeSessionState>;
        otpManagers: Map<string, ReturnType<NonNullable<BerryOTPModule["BerryOTP"]>["createLoginFlow"]>>;
      }
    | undefined;
}

const runtime = globalThis.__berryflowRuntime ?? {
  clients: new Map<string, BerryClientLike>(),
  sessionState: new Map<string, RuntimeSessionState>(),
  otpManagers: new Map<string, ReturnType<NonNullable<BerryOTPModule["BerryOTP"]>["createLoginFlow"]>>(),
};
globalThis.__berryflowRuntime = runtime;

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function ensureFile<T>(path: string, seed: T): Promise<void> {
  try {
    await stat(path);
  } catch {
    await ensureDir(dirname(path));
    await writeFile(path, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  await ensureFile(path, fallback);
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}

async function writeJson<T>(path: string, value: T): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

export async function readFlows(): Promise<Flow[]> {
  return readJson(FLOWS_FILE, MOCK_FLOWS);
}

export async function writeFlows(flows: Flow[]): Promise<void> {
  await writeJson(FLOWS_FILE, flows);
}

async function readExecutionStore(): Promise<Record<string, ExecutionLog[]>> {
  return readJson(EXECUTIONS_FILE, {});
}

async function writeExecutionStore(store: Record<string, ExecutionLog[]>): Promise<void> {
  await writeJson(EXECUTIONS_FILE, store);
}

export async function getExecutionLogs(flowId: string): Promise<ExecutionLog[]> {
  const store = await readExecutionStore();
  return store[flowId] ?? [];
}

export async function setExecutionLogs(flowId: string, logs: ExecutionLog[]): Promise<void> {
  const store = await readExecutionStore();
  store[flowId] = logs;
  await writeExecutionStore(store);
}

export async function readOtpState(): Promise<OTPMetricsState> {
  return readJson(OTP_STATE_FILE, {
    sentToday: MOCK_METRICS.otpsSentToday,
    usageRate: MOCK_METRICS.otpUsageRate,
    expirationRate: MOCK_METRICS.otpExpirationRate,
    sends: [],
    flows: [],
  } satisfies OTPMetricsState);
}

export async function writeOtpState(state: OTPMetricsState): Promise<void> {
  await writeJson(OTP_STATE_FILE, state);
}

async function loadBerryClientCtor(): Promise<new (options: Record<string, unknown>) => BerryClientLike> {
  const corePath = pathToFileURL(
    resolve(BERRY_PROTOCOL_ROOT, "packages", "core", "dist", "index.js"),
  ).href;
  const mod = (await import(corePath)) as Record<string, unknown>;
  const ctor =
    (mod.BerryProtocol as (new (options: Record<string, unknown>) => BerryClientLike) | undefined) ??
    (mod.BerryClient as (new (options: Record<string, unknown>) => BerryClientLike) | undefined) ??
    (mod.default as (new (options: Record<string, unknown>) => BerryClientLike) | undefined);

  if (!ctor) {
    throw new Error("Nao foi possivel carregar BerryProtocol a partir do workspace local.");
  }

  return ctor;
}

async function loadBerryOTPModule(): Promise<BerryOTPModule> {
  const otpPath = pathToFileURL(
    resolve(BERRY_PROTOCOL_ROOT, "packages", "berry-otp", "dist", "index.js"),
  ).href;
  return (await import(otpPath)) as BerryOTPModule;
}

function getDatabase() {
  const Database = require(resolve(BERRY_PROTOCOL_ROOT, "node_modules", "better-sqlite3"));
  return new Database(BERRY_PROTOCOL_DB, { readonly: true });
}

function normalizePhone(value?: string): string | undefined {
  if (!value) return undefined;
  const digits = value.split(":")[0]?.replace(/\D/g, "");
  return digits ? `+${digits}` : undefined;
}

function getSessionName(sessionId: string, creds?: SessionCreds): string {
  if (creds?.me?.name?.trim()) return creds.me.name.trim();
  return sessionId;
}

async function readSessionCreds(sessionId: string): Promise<SessionCreds | null> {
  try {
    const path = resolve(BERRY_SESSIONS_DIR, sessionId, "creds.json");
    const content = await readFile(path, "utf8");
    return JSON.parse(content) as SessionCreds;
  } catch {
    return null;
  }
}

function readSessionSnapshots(): SessionSnapshot[] {
  try {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT session_id, payload FROM auth_sessions ORDER BY updated_at DESC")
      .all() as DbRow[];
    db.close();
    return rows.map((row) => {
      const parsed = JSON.parse(row.payload) as SessionSnapshot;
      return {
        sessionId: row.session_id,
        registered: parsed.registered,
        qr: parsed.qr,
        authMethod: parsed.authMethod,
      };
    });
  } catch {
    return [];
  }
}

function buildSessionStatus(
  sessionId: string,
  snapshot?: SessionSnapshot,
  creds?: SessionCreds | null,
): Session["status"] {
  const runtimeState = runtime.sessionState.get(sessionId);
  if (runtimeState) return runtimeState.status;
  if (snapshot?.qr) return "qr_pending";
  if (snapshot?.registered || creds?.me?.id) return "disconnected";
  return "disconnected";
}

function buildSessionConnectionType(snapshot?: SessionSnapshot): Session["connectionType"] {
  return snapshot?.authMethod === "pairing_code" ? "pairing-code" : "qr";
}

export async function listRealSessions(): Promise<Session[]> {
  const dirEntries = await readdir(BERRY_SESSIONS_DIR, { withFileTypes: true }).catch(() => []);
  const dirIds = dirEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const snapshots = readSessionSnapshots();
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.sessionId, snapshot]));
  const sessionIds = [...new Set([...dirIds, ...snapshotMap.keys(), ...runtime.sessionState.keys()])];

  const sessions = await Promise.all(
    sessionIds.map(async (sessionId) => {
      const creds = await readSessionCreds(sessionId);
      const snapshot = snapshotMap.get(sessionId);
      const runtimeState = runtime.sessionState.get(sessionId);

      return {
        id: sessionId,
        name: getSessionName(sessionId, creds ?? undefined),
        phoneNumber: normalizePhone(creds?.me?.id),
        status: buildSessionStatus(sessionId, snapshot, creds),
        connectionType: buildSessionConnectionType(snapshot),
        lastActivityAt: runtimeState?.updatedAt ?? new Date().toISOString(),
        qrCode: runtimeState?.qrCode ?? snapshot?.qr,
      } satisfies Session;
    }),
  );

  return sessions.sort((left, right) => left.name.localeCompare(right.name));
}

function attachClientRuntime(sessionId: string, client: BerryClientLike): void {
  client.on("auth.qr", (payload) => {
    const qr = (payload as { value?: string }).value;
    runtime.sessionState.set(sessionId, {
      status: "qr_pending",
      qrCode: qr,
      updatedAt: new Date().toISOString(),
    });
  });

  client.on("connection.open", () => {
    runtime.sessionState.set(sessionId, {
      status: "connected",
      updatedAt: new Date().toISOString(),
    });
  });

  client.on("connection.close", () => {
    runtime.sessionState.set(sessionId, {
      status: "disconnected",
      updatedAt: new Date().toISOString(),
    });
  });

  client.on("protocol.error", (payload) => {
    runtime.sessionState.set(sessionId, {
      status: "disconnected",
      updatedAt: new Date().toISOString(),
      error: (payload as { error?: string }).error,
    });
  });
}

export async function getOrCreateClient(sessionId: string): Promise<BerryClientLike> {
  const existing = runtime.clients.get(sessionId);
  if (existing) return existing;

  const BerryClientCtor = await loadBerryClientCtor();
  const client = new BerryClientCtor({
    sessionId,
    authFolder: BERRY_SESSIONS_DIR,
    databasePath: BERRY_PROTOCOL_DB,
    printQrInTerminal: false,
    qrSmall: true,
  });
  attachClientRuntime(sessionId, client);
  runtime.clients.set(sessionId, client);
  return client;
}

export async function connectRealSession(sessionId: string): Promise<Session> {
  const client = await getOrCreateClient(sessionId);
  runtime.sessionState.set(sessionId, {
    status: "connecting",
    updatedAt: new Date().toISOString(),
  });
  void client.connectWithQr().catch(() => {
    runtime.sessionState.set(sessionId, {
      status: "disconnected",
      updatedAt: new Date().toISOString(),
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  return (await listRealSessions()).find((session) => session.id === sessionId)!;
}

export async function reconnectRealSession(sessionId: string): Promise<Session> {
  const client = await getOrCreateClient(sessionId);
  runtime.sessionState.set(sessionId, {
    status: "connecting",
    updatedAt: new Date().toISOString(),
  });
  void client.reconnect().catch(() => {
    runtime.sessionState.set(sessionId, {
      status: "disconnected",
      updatedAt: new Date().toISOString(),
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  return (await listRealSessions()).find((session) => session.id === sessionId)!;
}

export async function disconnectRealSession(sessionId: string): Promise<Session> {
  const client = runtime.clients.get(sessionId);
  if (client) {
    await client.disconnect().catch(() => undefined);
  }
  runtime.sessionState.set(sessionId, {
    status: "disconnected",
    updatedAt: new Date().toISOString(),
  });
  return (await listRealSessions()).find((session) => session.id === sessionId)!;
}

export async function getRealSessionQr(sessionId: string): Promise<string> {
  const session = (await listRealSessions()).find((entry) => entry.id === sessionId);
  return session?.qrCode ?? "";
}

export async function pickDefaultSessionId(): Promise<string> {
  const sessions = await listRealSessions();
  const preferred =
    sessions.find((session) => session.status === "connected") ??
    sessions.find((session) => session.status === "connecting" || session.status === "qr_pending") ??
    sessions[0];

  if (!preferred) {
    throw new Error("Nenhuma sessao BerryProtocol foi encontrada no workspace local.");
  }

  return preferred.id;
}

export async function getDefaultClient(): Promise<BerryClientLike> {
  const sessionId = await pickDefaultSessionId();
  return getOrCreateClient(sessionId);
}

export async function getOtpManager(config?: Partial<OTPFlowConfig>) {
  const sessionId = await pickDefaultSessionId();
  const key = `${sessionId}:${config?.issuer ?? "BerryProtocol"}`;
  const existing = runtime.otpManagers.get(key);
  if (existing) return existing;

  const otpModule = await loadBerryOTPModule();
  const BerryOTP = otpModule.BerryOTP;
  if (!BerryOTP) {
    throw new Error("Nao foi possivel carregar BerryOTP a partir do workspace local.");
  }

  const client = await getOrCreateClient(sessionId);
  const manager = BerryOTP.createLoginFlow(client, {
    issuer: config?.issuer,
    ttlMs: config?.ttlMs,
    mode: config?.mode,
    editOnExpire: config?.editOnExpire,
    autoReplyOnDenied: config?.autoReplyOnDenied,
    codeLength: config?.codeLength,
  });
  runtime.otpManagers.set(key, manager);
  return manager;
}

export async function recordOtpSend(id: string, to: string): Promise<void> {
  const state = await readOtpState();
  state.sends.unshift({ id, to, sentAt: Date.now() });
  state.sentToday = state.sends.filter((item) => {
    const date = new Date(item.sentAt);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;
  await writeOtpState(state);
}

export async function recordOtpVerification(id: string, valid: boolean): Promise<void> {
  const state = await readOtpState();
  const item = state.sends.find((entry) => entry.id === id);
  if (item) {
    item.used = valid;
  }
  const total = state.sends.length || 1;
  const used = state.sends.filter((entry) => entry.used).length;
  const expired = state.sends.filter((entry) => entry.expired).length;
  state.usageRate = used / total;
  state.expirationRate = expired / total;
  await writeOtpState(state);
}

export async function recordLatestOtpVerification(to: string, valid: boolean): Promise<void> {
  const state = await readOtpState();
  const item = state.sends.find((entry) => entry.to === to && !entry.used && !entry.expired);
  if (item) {
    item.used = valid;
  }
  const total = state.sends.length || 1;
  const used = state.sends.filter((entry) => entry.used).length;
  const expired = state.sends.filter((entry) => entry.expired).length;
  state.usageRate = used / total;
  state.expirationRate = expired / total;
  await writeOtpState(state);
}

export async function recordOtpExpiration(id: string): Promise<void> {
  const state = await readOtpState();
  const item = state.sends.find((entry) => entry.id === id);
  if (item) {
    item.expired = true;
  }
  const total = state.sends.length || 1;
  const expired = state.sends.filter((entry) => entry.expired).length;
  state.expirationRate = expired / total;
  await writeOtpState(state);
}

export function listOtpTemplates(): OTPTemplate[] {
  return MOCK_OTP_TEMPLATES;
}

export function listFlowTemplates(): FlowTemplate[] {
  return MOCK_TEMPLATES;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const flows = await readFlows();
  const sessions = await listRealSessions();
  const otpState = await readOtpState();

  return {
    totalFlows: flows.length,
    activeFlows: flows.filter((flow) => flow.status === "active").length,
    draftFlows: flows.filter((flow) => flow.status === "draft").length,
    connectedSessions: sessions.filter((session) => session.status === "connected").length,
    otpsSentToday: otpState.sentToday,
    otpUsageRate: otpState.usageRate,
    otpExpirationRate: otpState.expirationRate,
  };
}

export async function buildPreview(flowId: string): Promise<ConversationPreview> {
  const flows = await readFlows();
  const flow = flows.find((item) => item.id === flowId);

  if (!flow) return MOCK_PREVIEW;

  const messages = flow.nodes
    .filter((node) => node.data.category === "message")
    .slice(0, 6)
    .map((node, index) => {
      const config = (node.data.config ?? {}) as Record<string, unknown>;
      const text =
        typeof config.text === "string"
          ? config.text
          : typeof config.body === "string"
            ? config.body
            : node.data.label;

      return {
        id: `preview_${flow.id}_${node.id}`,
        from: "bot" as const,
        type:
          node.data.kind === "send-buttons"
            ? "buttons"
            : node.data.kind === "send-list"
              ? "list"
              : node.data.kind === "send-media"
                ? "image"
                : node.data.kind === "send-otp"
                  ? "otp"
                  : "text",
        content: text,
        ts: new Date(Date.now() + index * 1000).toISOString(),
        meta: config,
      };
    });

  return {
    ...MOCK_PREVIEW,
    messages: messages.length ? messages : MOCK_PREVIEW.messages,
  };
}

export async function simulateFlowLogs(flowId: string): Promise<ExecutionLog[]> {
  const flows = await readFlows();
  const flow = flows.find((item) => item.id === flowId);

  if (!flow) return MOCK_LOGS;

  const logs = flow.nodes.map((node, index) => ({
    id: `${flowId}_${node.id}_${index}`,
    flowId,
    nodeId: node.id,
    nodeLabel: node.data.label,
    status: "ok" as const,
    durationMs: 15 + index * 17,
    ts: new Date(Date.now() + index * 250).toISOString(),
    message: node.data.kind,
  }));

  await setExecutionLogs(flowId, logs);
  return logs;
}
