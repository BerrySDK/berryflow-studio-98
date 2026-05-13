import type {
  FlowService, SessionService, OTPService, MessageService,
  ExecutionService, DashboardService, TemplateService,
} from "../contracts";
import {
  MOCK_FLOWS, MOCK_SESSIONS, MOCK_OTP_TEMPLATES,
  MOCK_LOGS, MOCK_PREVIEW, MOCK_METRICS, MOCK_TEMPLATES,
} from "./data";
import type { Flow } from "@/types";

const delay = (ms = 250) => new Promise<void>(r => setTimeout(r, ms));

// In-memory store so create/update/duplicate persist within session
let flows: Flow[] = [...MOCK_FLOWS];
let sessions = [...MOCK_SESSIONS];

export const flowService: FlowService = {
  async listFlows() { await delay(); return flows; },
  async getFlow(id) { await delay(150); return flows.find(f => f.id === id) ?? null; },
  async createFlow(input) {
    await delay();
    const id = `flw_${Math.random().toString(36).slice(2, 8)}`;
    const f: Flow = {
      ...MOCK_FLOWS[0], ...input,
      id, status: "draft",
      slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-"),
      tags: input.tags ?? [],
      version: { version: 1 },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      nodes: input.nodes ?? MOCK_FLOWS[0].nodes,
      edges: input.edges ?? MOCK_FLOWS[0].edges,
      nodeCount: (input.nodes ?? MOCK_FLOWS[0].nodes).length,
    };
    flows = [f, ...flows];
    return f;
  },
  async updateFlow(id, input) {
    await delay(150);
    flows = flows.map(f => f.id === id
      ? { ...f, ...input, updatedAt: new Date().toISOString(), nodeCount: (input.nodes ?? f.nodes).length }
      : f);
    return flows.find(f => f.id === id)!;
  },
  async publishFlow(id) {
    await delay();
    flows = flows.map(f => f.id === id
      ? { ...f, status: "active", version: { version: f.version.version + 1, publishedAt: new Date().toISOString() } }
      : f);
    return flows.find(f => f.id === id)!;
  },
  async duplicateFlow(id) {
    await delay();
    const src = flows.find(f => f.id === id);
    if (!src) throw new Error("not found");
    const copy: Flow = { ...src, id: `flw_${Math.random().toString(36).slice(2, 8)}`, name: `${src.name} (cópia)`, status: "draft" };
    flows = [copy, ...flows];
    return copy;
  },
  async archiveFlow(id) {
    await delay();
    flows = flows.map(f => f.id === id ? { ...f, status: "archived" } : f);
    return flows.find(f => f.id === id)!;
  },
};

export const sessionService: SessionService = {
  async listSessions() { await delay(); return sessions; },
  async getSession(id) { await delay(100); return sessions.find(s => s.id === id) ?? null; },
  async connectSession(id) {
    await delay();
    sessions = sessions.map(s => s.id === id ? { ...s, status: "qr_pending" } : s);
    return sessions.find(s => s.id === id)!;
  },
  async reconnectSession(id) {
    await delay();
    sessions = sessions.map(s => s.id === id ? { ...s, status: "connecting" } : s);
    return sessions.find(s => s.id === id)!;
  },
  async disconnectSession(id) {
    await delay();
    sessions = sessions.map(s => s.id === id ? { ...s, status: "disconnected" } : s);
    return sessions.find(s => s.id === id)!;
  },
  async getSessionQr(id) {
    await delay(100);
    return `BERRY-QR-${id}-${Date.now()}`;
  },
};

export const otpService: OTPService = {
  async createLoginFlow() { await delay(); return { id: `otpf_${Date.now()}` }; },
  async sendLoginCode(_to, payload) { await delay(); return { id: `otp_${Date.now()}`, mask: payload.mask ?? "•••-•••" }; },
  async verifyLoginCode(_to, code) { await delay(200); return { ok: code.length >= 4 }; },
  async cancelCode() { await delay(); },
  async expireCode() { await delay(); },
  async getOtpMetrics() { await delay(); return { sentToday: MOCK_METRICS.otpsSentToday, usageRate: MOCK_METRICS.otpUsageRate, expirationRate: MOCK_METRICS.otpExpirationRate }; },
  async listTemplates() { await delay(); return MOCK_OTP_TEMPLATES; },
};

export const messageService: MessageService = {
  async sendText() { await delay(); },
  async sendButtons() { await delay(); },
  async sendList() { await delay(); },
  async sendCarousel() { await delay(); },
  async sendReaction() { await delay(); },
  async sendAiMessage() { await delay(); },
};

export const executionService: ExecutionService = {
  async simulateFlow() { await delay(400); return MOCK_LOGS; },
  async getExecutionLogs() { await delay(200); return MOCK_LOGS; },
  async getPreviewState() { await delay(150); return MOCK_PREVIEW; },
};

export const dashboardService: DashboardService = {
  async getMetrics() { await delay(); return MOCK_METRICS; },
  async getRecentFlows() { await delay(); return flows.slice(0, 4); },
};

export const templateService: TemplateService = {
  async listTemplates() { await delay(); return MOCK_TEMPLATES; },
};
