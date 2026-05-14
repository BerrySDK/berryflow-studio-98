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
const DATA_DIR = resolve(APP_ROOT, ".berryapi-data");
const LEGACY_DATA_DIR = resolve(APP_ROOT, ".berryflow-data");
const FLOWS_FILE = resolve(DATA_DIR, "flows.json");
const EXECUTIONS_FILE = resolve(DATA_DIR, "executions.json");
const OTP_STATE_FILE = resolve(DATA_DIR, "otp-state.json");
const SESSIONS_FILE = resolve(DATA_DIR, "sessions.json");

type RuntimeSessionState = {
  status: Session["status"];
  qrCode?: string;
  pairingCode?: string;
  updatedAt: string;
  error?: string;
};

type OTPMetricsState = {
  sentToday: number;
  usageRate: number;
  expirationRate: number;
  sends: Array<{ id: string; to: string; sessionId?: string; sentAt: number; used?: boolean; expired?: boolean }>;
  flows: Array<{ id: string; createdAt: number; sessionId?: string; config: OTPFlowConfig }>;
};

type SessionSnapshot = {
  sessionId: string;
  registered?: boolean;
  qr?: string;
  authMethod?: "link" | "qr" | "pairing_code";
  pairingCode?: string;
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
  connectWithPairingCode?: (
    phoneNumber: string,
    customPairingCode?: string,
  ) => Promise<void>;
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

type LocalSessionRecord = {
  id: string;
  name: string;
  connectionType: Session["connectionType"];
  phoneNumber?: string;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __berryapiRuntime:
    | {
        clients: Map<string, BerryClientLike>;
        sessionState: Map<string, RuntimeSessionState>;
        otpManagers: Map<string, ReturnType<NonNullable<BerryOTPModule["BerryOTP"]>["createLoginFlow"]>>;
      }
    | undefined;
}

const runtime = globalThis.__berryapiRuntime ?? {
  clients: new Map<string, BerryClientLike>(),
  sessionState: new Map<string, RuntimeSessionState>(),
  otpManagers: new Map<string, ReturnType<NonNullable<BerryOTPModule["BerryOTP"]>["createLoginFlow"]>>(),
};
globalThis.__berryapiRuntime = runtime;

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function ensureFile<T>(path: string, seed: T): Promise<void> {
  try {
    await stat(path);
  } catch {
    const legacyPath = path.replace(DATA_DIR, LEGACY_DATA_DIR);
    try {
      const legacyContent = await readFile(legacyPath, "utf8");
      await ensureDir(dirname(path));
      await writeFile(path, legacyContent, "utf8");
      return;
    } catch {
      // fall back to seed file creation
    }
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

async function readLocalSessions(): Promise<LocalSessionRecord[]> {
  return readJson(SESSIONS_FILE, []);
}

async function writeLocalSessions(sessions: LocalSessionRecord[]): Promise<void> {
  await writeJson(SESSIONS_FILE, sessions);
}

async function deleteSessionArtifacts(sessionId: string): Promise<void> {
  const { rm } = await import("node:fs/promises");
  await rm(resolve(BERRY_SESSIONS_DIR, sessionId), { recursive: true, force: true }).catch(() => undefined);

  try {
    const Database = require(resolve(BERRY_PROTOCOL_ROOT, "node_modules", "better-sqlite3"));
    const db = new Database(BERRY_PROTOCOL_DB);
    db.prepare("DELETE FROM auth_sessions WHERE session_id = ?").run(sessionId);
    db.close();
  } catch {
    // ignore cleanup errors from optional local runtime state
  }
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
        pairingCode: parsed.pairingCode,
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
  const localSessions = await readLocalSessions();
  const localMap = new Map(localSessions.map((session) => [session.id, session]));
  const sessionIds = [
    ...new Set([...dirIds, ...snapshotMap.keys(), ...runtime.sessionState.keys(), ...localMap.keys()]),
  ];

  const sessions = await Promise.all(
    sessionIds.map(async (sessionId) => {
      const creds = await readSessionCreds(sessionId);
      const snapshot = snapshotMap.get(sessionId);
      const local = localMap.get(sessionId);
      const runtimeState = runtime.sessionState.get(sessionId);

      return {
        id: sessionId,
        name: local?.name?.trim() || getSessionName(sessionId, creds ?? undefined),
        phoneNumber: normalizePhone(creds?.me?.id) ?? local?.phoneNumber,
        status: buildSessionStatus(sessionId, snapshot, creds),
        connectionType: local?.connectionType ?? buildSessionConnectionType(snapshot),
        lastActivityAt: runtimeState?.updatedAt ?? new Date().toISOString(),
        qrCode: runtimeState?.qrCode ?? snapshot?.qr,
        pairingCode: runtimeState?.pairingCode ?? snapshot?.pairingCode,
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

  client.on("auth.pairing_code", (payload) => {
    const pairingCode = (payload as { code?: string }).code;
    runtime.sessionState.set(sessionId, {
      status: "qr_pending",
      pairingCode,
      updatedAt: new Date().toISOString(),
    });
  });

  client.on("connection.open", () => {
    runtime.sessionState.set(sessionId, {
      status: "connected",
      updatedAt: new Date().toISOString(),
      qrCode: undefined,
      pairingCode: undefined,
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

export async function createRealSession(input: {
  id: string;
  name: string;
  connectionType: Session["connectionType"];
  phoneNumber?: string;
}): Promise<Session> {
  const localSessions = await readLocalSessions();
  const normalizedId = input.id.trim();
  if (!normalizedId) {
    throw new Error("Informe um identificador de sessao.");
  }

  if (localSessions.some((session) => session.id === normalizedId)) {
    throw new Error("Ja existe uma sessao com esse identificador.");
  }

  localSessions.unshift({
    id: normalizedId,
    name: input.name.trim() || normalizedId,
    connectionType: input.connectionType,
    phoneNumber: input.phoneNumber?.trim() || undefined,
    createdAt: new Date().toISOString(),
  });
  await writeLocalSessions(localSessions);

  return (await listRealSessions()).find((session) => session.id === normalizedId)!;
}

export async function updateRealSession(
  sessionId: string,
  input: {
    name?: string;
    connectionType?: Session["connectionType"];
    phoneNumber?: string;
  },
): Promise<Session> {
  const localSessions = await readLocalSessions();
  const index = localSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) {
    throw new Error("Sessao nao encontrada.");
  }

  const current = localSessions[index];
  localSessions[index] = {
    ...current,
    name: input.name?.trim() || current.name,
    connectionType: input.connectionType ?? current.connectionType,
    phoneNumber: input.phoneNumber?.trim() || undefined,
  };
  await writeLocalSessions(localSessions);
  return (await listRealSessions()).find((session) => session.id === sessionId)!;
}

async function getLocalSession(sessionId: string): Promise<LocalSessionRecord | undefined> {
  const localSessions = await readLocalSessions();
  return localSessions.find((session) => session.id === sessionId);
}

export async function connectRealSession(sessionId: string): Promise<Session> {
  const client = await getOrCreateClient(sessionId);
  const local = await getLocalSession(sessionId);
  if (local?.connectionType === "pairing-code" && !local.phoneNumber?.trim()) {
    throw new Error("Informe um numero para solicitar pairing code.");
  }
  runtime.sessionState.set(sessionId, {
    status: "connecting",
    updatedAt: new Date().toISOString(),
  });
  const connectPromise =
    local?.connectionType === "pairing-code"
      ? client.connectWithPairingCode?.((local.phoneNumber ?? "").replace(/\D/g, ""))
      : client.connectWithQr();
  void (connectPromise ?? Promise.reject(new Error("Nao foi possivel iniciar o pareamento."))).catch(() => {
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

export async function deleteRealSession(sessionId: string): Promise<void> {
  const client = runtime.clients.get(sessionId);
  if (client) {
    await client.disconnect().catch(() => undefined);
  }

  runtime.clients.delete(sessionId);
  runtime.sessionState.delete(sessionId);

  for (const key of [...runtime.otpManagers.keys()]) {
    if (key.startsWith(`${sessionId}:`)) {
      runtime.otpManagers.delete(key);
    }
  }

  const localSessions = await readLocalSessions();
  await writeLocalSessions(localSessions.filter((session) => session.id !== sessionId));
  await deleteSessionArtifacts(sessionId);
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

export async function getClientForSession(sessionId?: string): Promise<BerryClientLike> {
  const resolvedSessionId = sessionId ?? (await pickDefaultSessionId());
  return getOrCreateClient(resolvedSessionId);
}

export async function getOtpManager(sessionId?: string, config?: Partial<OTPFlowConfig>) {
  const resolvedSessionId = sessionId ?? (await pickDefaultSessionId());
  const key = `${resolvedSessionId}:${config?.issuer ?? "BerryProtocol"}`;
  const existing = runtime.otpManagers.get(key);
  if (existing) return existing;

  const otpModule = await loadBerryOTPModule();
  const BerryOTP = otpModule.BerryOTP;
  if (!BerryOTP) {
    throw new Error("Nao foi possivel carregar BerryOTP a partir do workspace local.");
  }

  const client = await getOrCreateClient(resolvedSessionId);
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

export async function recordOtpSend(id: string, to: string, sessionId?: string): Promise<void> {
  const state = await readOtpState();
  state.sends.unshift({ id, to, sessionId, sentAt: Date.now() });
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

export async function getDashboardMetrics(sessionId?: string): Promise<DashboardMetrics> {
  const flows = await readFlows();
  const sessions = await listRealSessions();
  const otpState = await readOtpState();
  const filteredFlows = sessionId ? flows.filter((flow) => !flow.sessionId || flow.sessionId === sessionId) : flows;
  const filteredSends = sessionId
    ? otpState.sends.filter((entry) => {
        const record = entry as typeof entry & { sessionId?: string };
        return !record.sessionId || record.sessionId === sessionId;
      })
    : otpState.sends;
  const totalOtp = filteredSends.length || 1;
  const usedOtp = filteredSends.filter((entry) => entry.used).length;
  const expiredOtp = filteredSends.filter((entry) => entry.expired).length;
  const selectedSessionConnected = sessionId
    ? sessions.some((session) => session.id === sessionId && session.status === "connected")
    : sessions.filter((session) => session.status === "connected").length;

  return {
    totalFlows: filteredFlows.length,
    activeFlows: filteredFlows.filter((flow) => flow.status === "active").length,
    draftFlows: filteredFlows.filter((flow) => flow.status === "draft").length,
    connectedSessions: typeof selectedSessionConnected === "number" ? selectedSessionConnected : selectedSessionConnected ? 1 : 0,
    otpsSentToday: sessionId ? filteredSends.length : otpState.sentToday,
    otpUsageRate: filteredSends.length ? usedOtp / totalOtp : otpState.usageRate,
    otpExpirationRate: filteredSends.length ? expiredOtp / totalOtp : otpState.expirationRate,
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

const DEFAULT_CAROUSEL_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80";

function orderedNodes(flow: Flow) {
  const outgoing = new Map<string, string[]>();
  const incoming = new Set<string>();

  for (const edge of flow.edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    incoming.add(edge.target);
  }

  const starters = flow.nodes.filter(
    (node) => node.data.kind === "start" || node.data.category === "event" || !incoming.has(node.id),
  );
  const visited = new Set<string>();
  const ordered: Flow["nodes"] = [];

  const walk = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = flow.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    ordered.push(node);
    for (const next of outgoing.get(nodeId) ?? []) {
      walk(next);
    }
  };

  for (const starter of starters) walk(starter.id);
  for (const node of flow.nodes) walk(node.id);

  return ordered;
}

export async function executeFlowLive(
  flowId: string,
  input: { to: string; sessionId?: string },
): Promise<ExecutionLog[]> {
  const flows = await readFlows();
  const flow = flows.find((entry) => entry.id === flowId);
  if (!flow) {
    throw new Error("Fluxo nao encontrado.");
  }

  const resolvedSessionId = input.sessionId ?? flow.sessionId ?? (await pickDefaultSessionId());
  const client = await getClientForSession(resolvedSessionId);
  const logs: ExecutionLog[] = [];

  for (const node of orderedNodes(flow)) {
    const startedAt = Date.now();
    const config = (node.data.config ?? {}) as Record<string, unknown>;
    try {
      if (node.data.category === "event" || node.data.kind === "start" || node.data.kind === "end") {
        logs.push({
          id: `${flowId}_${node.id}_${startedAt}`,
          flowId,
          nodeId: node.id,
          nodeLabel: node.data.label,
          status: "ok",
          durationMs: 0,
          ts: new Date().toISOString(),
          message: "Node de controle percorrido.",
        });
        continue;
      }

      switch (node.data.kind) {
        case "delay":
          await new Promise((resolve) => setTimeout(resolve, Number(config.ms ?? 1000)));
          break;
        case "send-text":
          await client.sendText?.(input.to, String(config.text ?? ""));
          break;
        case "ai-label-message":
          await client.sendMessage?.(input.to, {
            text: String(config.text ?? config.hint ?? node.data.label),
            ai: true,
          });
          break;
        case "send-buttons":
          await client.sendButtons?.(input.to, {
            text: String(config.text ?? "Escolha uma opcao"),
            footer: typeof config.footer === "string" ? config.footer : undefined,
            buttons: ((config.buttons as string[] | undefined) ?? ["Opcao 1"]).map((title, index) => ({
              id: `btn_${index + 1}`,
              title,
              kind: "quick_reply",
            })),
          });
          break;
        case "send-list":
          await client.sendList?.(input.to, {
            title: typeof config.title === "string" ? config.title : "Menu",
            text: String(config.text ?? "Escolha uma opcao"),
            footer: typeof config.footer === "string" ? config.footer : undefined,
            buttonText: typeof config.buttonText === "string" ? config.buttonText : "Abrir lista",
            sections: [
              {
                title: typeof config.sectionTitle === "string" ? config.sectionTitle : "Opcoes",
                rows: ((config.items as Array<{ id?: string; title?: string; description?: string }> | undefined) ?? [
                  { id: "op_1", title: "Opcao 1" },
                ]).map((item, index) => ({
                  id: item.id ?? `row_${index + 1}`,
                  title: item.title ?? `Opcao ${index + 1}`,
                  description: item.description,
                })),
              },
            ],
          });
          break;
        case "send-carousel":
          await client.sendCarousel?.(input.to, {
            text: String(config.text ?? "Confira as opcoes"),
            footer: typeof config.footer === "string" ? config.footer : undefined,
            carouselCardType:
              config.carouselCardType === "video" || config.carouselCardType === "mixed"
                ? config.carouselCardType
                : "image",
            cards: (
              (config.cards as Array<{ title?: string; body?: string; footer?: string; image?: string; button?: string }> | undefined) ?? [
                { title: "Card 1", body: "Descricao", button: "Abrir" },
              ]
            ).map((card, index) => ({
              title: card.title ?? `Card ${index + 1}`,
              body: card.body ?? "Descricao do card",
              footer: card.footer,
              image: { url: card.image ?? DEFAULT_CAROUSEL_IMAGE },
              buttons: [
                {
                  id: `card_${index + 1}`,
                  title: card.button ?? "Abrir",
                  kind: "quick_reply",
                },
              ],
            })),
          });
          break;
        case "generate-otp":
        case "send-otp":
        case "create-login-flow": {
          const manager = await getOtpManager(resolvedSessionId, {
            issuer: typeof config.issuer === "string" ? config.issuer : "BerryProtocol",
            ttlMs: typeof config.ttlMs === "number" ? config.ttlMs : 120000,
            mode:
              config.mode === "stable" || config.mode === "experimental-copy-code"
                ? config.mode
                : "copy-code",
            editOnExpire: config.editOnExpire !== false,
            autoReplyOnDenied: config.autoReplyOnDenied !== false,
            codeLength: typeof config.length === "number" ? config.length : 6,
          });
          const sent = await manager.sendLoginCode(input.to, {});
          await recordOtpSend(sent.id, input.to, resolvedSessionId);
          break;
        }
        default:
          logs.push({
            id: `${flowId}_${node.id}_${startedAt}`,
            flowId,
            nodeId: node.id,
            nodeLabel: node.data.label,
            status: "skipped",
            durationMs: 0,
            ts: new Date().toISOString(),
            message: `Node ${node.data.kind} ainda nao possui executor real.`,
          });
          continue;
      }

      logs.push({
        id: `${flowId}_${node.id}_${startedAt}`,
        flowId,
        nodeId: node.id,
        nodeLabel: node.data.label,
        status: "ok",
        durationMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
        message: `Executado via sessao ${resolvedSessionId}.`,
      });
    } catch (error) {
      logs.push({
        id: `${flowId}_${node.id}_${startedAt}`,
        flowId,
        nodeId: node.id,
        nodeLabel: node.data.label,
        status: "error",
        durationMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Falha ao executar node.",
      });
      break;
    }
  }

  await setExecutionLogs(flowId, logs);
  return logs;
}
