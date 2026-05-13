import { createServerFn } from "@tanstack/react-start";
import type {
  DashboardService,
  ExecutionService,
  FlowService,
  MessageService,
  OTPService,
  SessionService,
  TemplateService,
} from "../contracts";
import {
  buildPreview,
  connectRealSession,
  disconnectRealSession,
  getDashboardMetrics,
  getDefaultClient,
  getExecutionLogs,
  getOtpManager,
  getRealSessionQr,
  listFlowTemplates,
  listOtpTemplates,
  listRealSessions,
  recordLatestOtpVerification,
  recordOtpExpiration,
  readFlows,
  readOtpState,
  reconnectRealSession,
  recordOtpSend,
  recordOtpVerification,
  setExecutionLogs,
  simulateFlowLogs,
  writeFlows,
} from "./state";
import type { Flow, OTPFlowConfig } from "@/types";
import { MOCK_LOGS } from "../mock/data";

const listFlowsFn = createServerFn({ method: "GET" }).handler(async () => readFlows());

const getFlowFn = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const flows = await readFlows();
    return flows.find((flow) => flow.id === data.id) ?? null;
  });

const createFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { input: Partial<Flow> & { name: string } }) => data)
  .handler(async ({ data }) => {
    const flows = await readFlows();
    const id = `flw_${Math.random().toString(36).slice(2, 8)}`;
    const base = flows[0];
    const nodes = data.input.nodes ?? base?.nodes ?? [];
    const flow: Flow = {
      ...base,
      ...data.input,
      id,
      status: "draft",
      slug: data.input.slug ?? data.input.name.toLowerCase().replace(/\s+/g, "-"),
      tags: data.input.tags ?? [],
      version: { version: 1 },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      nodes,
      edges: data.input.edges ?? base?.edges ?? [],
      nodeCount: nodes.length,
      type: data.input.type ?? "automation",
      channel: data.input.channel ?? "whatsapp",
      trigger: data.input.trigger ?? "On Message Received",
    };
    flows.unshift(flow);
    await writeFlows(flows);
    return flow;
  });

const updateFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; input: Partial<Flow> }) => data)
  .handler(async ({ data }) => {
    const flows = await readFlows();
    const next = flows.map((flow) =>
      flow.id === data.id
        ? {
            ...flow,
            ...data.input,
            updatedAt: new Date().toISOString(),
            nodeCount: (data.input.nodes ?? flow.nodes).length,
          }
        : flow,
    );
    await writeFlows(next);
    return next.find((flow) => flow.id === data.id)!;
  });

const publishFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const flows = await readFlows();
    const next = flows.map((flow) =>
      flow.id === data.id
        ? {
            ...flow,
            status: "active" as const,
            version: {
              version: flow.version.version + 1,
              publishedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          }
        : flow,
    );
    await writeFlows(next);
    return next.find((flow) => flow.id === data.id)!;
  });

const duplicateFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const flows = await readFlows();
    const source = flows.find((flow) => flow.id === data.id);
    if (!source) throw new Error("Fluxo nao encontrado.");
    const copy: Flow = {
      ...source,
      id: `flw_${Math.random().toString(36).slice(2, 8)}`,
      name: `${source.name} (copia)`,
      slug: `${source.slug}-copy`,
      status: "draft",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    flows.unshift(copy);
    await writeFlows(flows);
    return copy;
  });

const archiveFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const flows = await readFlows();
    const next = flows.map((flow) =>
      flow.id === data.id ? { ...flow, status: "archived" as const, updatedAt: new Date().toISOString() } : flow,
    );
    await writeFlows(next);
    return next.find((flow) => flow.id === data.id)!;
  });

const listSessionsFn = createServerFn({ method: "GET" }).handler(async () => listRealSessions());

const getSessionFn = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sessions = await listRealSessions();
    return sessions.find((session) => session.id === data.id) ?? null;
  });

const connectSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => connectRealSession(data.id));

const reconnectSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => reconnectRealSession(data.id));

const disconnectSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => disconnectRealSession(data.id));

const getSessionQrFn = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => getRealSessionQr(data.id));

const createLoginFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { config: OTPFlowConfig }) => data)
  .handler(async ({ data }) => {
    const state = await readOtpState();
    const id = `otpf_${Date.now()}`;
    state.flows.unshift({ id, createdAt: Date.now(), config: data.config });
    const { writeOtpState } = await import("./state");
    await writeOtpState(state);
    return { id };
  });

const sendLoginCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; payload: Partial<import("@/types").OTPFlowConfig> }) => data)
  .handler(async ({ data }) => {
    const manager = await getOtpManager(data.payload);
    const sent = await manager.sendLoginCode(data.to, {
      metadata: data.payload.metadata,
      userId: data.payload.metadata?.userId,
    });
    await recordOtpSend(sent.id, data.to);
    return {
      id: sent.id,
      mask: sent.code.replace(/\d(?=\d{2})/g, "•"),
    };
  });

const verifyLoginCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id?: string; to: string; code: string }) => data)
  .handler(async ({ data }) => {
    const manager = await getOtpManager();
    const result = await manager.verifyLoginCode(data.to, data.code);
    if (data.id) {
      await recordOtpVerification(data.id, result.valid);
    } else {
      await recordLatestOtpVerification(data.to, result.valid);
    }
    return { ok: result.valid };
  });

const cancelCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const manager = await getOtpManager();
    await manager.cancel(data.id);
  });

const expireCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await recordOtpExpiration(data.id);
  });

const getOtpMetricsFn = createServerFn({ method: "GET" }).handler(async () => {
  const state = await readOtpState();
  return {
    sentToday: state.sentToday,
    usageRate: state.usageRate,
    expirationRate: state.expirationRate,
  };
});

const listOtpTemplatesFn = createServerFn({ method: "GET" }).handler(async () => listOtpTemplates());

const sendTextFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; text: string }) => data)
  .handler(async ({ data }) => {
    const client = await getDefaultClient();
    await client.sendText?.(data.to, data.text);
  });

const sendButtonsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; payload: unknown }) => data)
  .handler(async ({ data }) => {
    const client = await getDefaultClient();
    await client.sendButtons?.(data.to, data.payload);
  });

const sendListFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; payload: unknown }) => data)
  .handler(async ({ data }) => {
    const client = await getDefaultClient();
    await client.sendList?.(data.to, data.payload);
  });

const sendCarouselFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; payload: unknown }) => data)
  .handler(async ({ data }) => {
    const client = await getDefaultClient();
    await client.sendCarousel?.(data.to, data.payload);
  });

const sendReactionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; emoji: string }) => data)
  .handler(async ({ data }) => {
    const client = await getDefaultClient();
    await client.sendReaction?.(data.to, data.emoji);
  });

const sendAiMessageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; prompt: string }) => data)
  .handler(async ({ data }) => {
    const client = await getDefaultClient();
    await client.sendMessage?.(data.to, { text: data.prompt, ai: true });
  });

const simulateFlowFn = createServerFn({ method: "POST" })
  .inputValidator((data: { flowId: string; input: { trigger: string; payload?: unknown } }) => data)
  .handler(async ({ data }) => {
    void data.input;
    return simulateFlowLogs(data.flowId);
  });

const getExecutionLogsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { flowId: string }) => data)
  .handler(async ({ data }) => {
    const logs = await getExecutionLogs(data.flowId);
    return logs.length ? logs : MOCK_LOGS.filter((entry) => entry.flowId === data.flowId);
  });

const getPreviewStateFn = createServerFn({ method: "GET" })
  .inputValidator((data: { flowId: string }) => data)
  .handler(async ({ data }) => buildPreview(data.flowId));

const getMetricsFn = createServerFn({ method: "GET" }).handler(async () => getDashboardMetrics());

const getRecentFlowsFn = createServerFn({ method: "GET" }).handler(async () => {
  const flows = await readFlows();
  return [...flows]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
});

const listTemplatesFn = createServerFn({ method: "GET" }).handler(async () => listFlowTemplates());

export const flowService: FlowService = {
  listFlows: () => listFlowsFn(),
  getFlow: (id) => getFlowFn({ data: { id } }),
  createFlow: (input) => createFlowFn({ data: { input } }),
  updateFlow: (id, input) => updateFlowFn({ data: { id, input } }),
  publishFlow: (id) => publishFlowFn({ data: { id } }),
  duplicateFlow: (id) => duplicateFlowFn({ data: { id } }),
  archiveFlow: (id) => archiveFlowFn({ data: { id } }),
};

export const sessionService: SessionService = {
  listSessions: () => listSessionsFn(),
  getSession: (id) => getSessionFn({ data: { id } }),
  connectSession: (id) => connectSessionFn({ data: { id } }),
  reconnectSession: (id) => reconnectSessionFn({ data: { id } }),
  disconnectSession: (id) => disconnectSessionFn({ data: { id } }),
  getSessionQr: (id) => getSessionQrFn({ data: { id } }),
};

export const otpService: OTPService = {
  createLoginFlow: (config) => createLoginFlowFn({ data: { config } }),
  sendLoginCode: (to, payload) => sendLoginCodeFn({ data: { to, payload } }),
  verifyLoginCode: async (to, code) => {
    const result = await verifyLoginCodeFn({ data: { to, code } });
    return result;
  },
  cancelCode: (id) => cancelCodeFn({ data: { id } }),
  expireCode: (id) => expireCodeFn({ data: { id } }),
  getOtpMetrics: () => getOtpMetricsFn(),
  listTemplates: () => listOtpTemplatesFn(),
};

export const messageService: MessageService = {
  sendText: (to, text) => sendTextFn({ data: { to, text } }),
  sendButtons: (to, payload) => sendButtonsFn({ data: { to, payload } }),
  sendList: (to, payload) => sendListFn({ data: { to, payload } }),
  sendCarousel: (to, payload) => sendCarouselFn({ data: { to, payload } }),
  sendReaction: (to, emoji) => sendReactionFn({ data: { to, emoji } }),
  sendAiMessage: (to, prompt) => sendAiMessageFn({ data: { to, prompt } }),
};

export const executionService: ExecutionService = {
  simulateFlow: (flowId, input) => simulateFlowFn({ data: { flowId, input } }),
  getExecutionLogs: (flowId) => getExecutionLogsFn({ data: { flowId } }),
  getPreviewState: (flowId) => getPreviewStateFn({ data: { flowId } }),
};

export const dashboardService: DashboardService = {
  getMetrics: () => getMetricsFn(),
  getRecentFlows: () => getRecentFlowsFn(),
};

export const templateService: TemplateService = {
  listTemplates: () => listTemplatesFn(),
};
