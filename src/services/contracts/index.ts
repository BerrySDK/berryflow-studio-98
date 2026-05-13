import type {
  Flow, Session, OTPFlowConfig, OTPTemplate,
  ExecutionLog, DashboardMetrics, ConversationPreview,
  FlowTemplate,
} from "@/types";

export interface FlowService {
  listFlows(): Promise<Flow[]>;
  getFlow(id: string): Promise<Flow | null>;
  createFlow(input: Partial<Flow> & { name: string }): Promise<Flow>;
  updateFlow(id: string, input: Partial<Flow>): Promise<Flow>;
  publishFlow(id: string): Promise<Flow>;
  duplicateFlow(id: string): Promise<Flow>;
  archiveFlow(id: string): Promise<Flow>;
}

export interface SessionService {
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  connectSession(id: string): Promise<Session>;
  reconnectSession(id: string): Promise<Session>;
  disconnectSession(id: string): Promise<Session>;
  getSessionQr(id: string): Promise<string>;
}

export interface OTPService {
  createLoginFlow(config: OTPFlowConfig): Promise<{ id: string }>;
  sendLoginCode(to: string, payload: Partial<OTPFlowConfig>): Promise<{ id: string; mask: string }>;
  verifyLoginCode(to: string, code: string): Promise<{ ok: boolean }>;
  cancelCode(id: string): Promise<void>;
  expireCode(id: string): Promise<void>;
  getOtpMetrics(): Promise<{ sentToday: number; usageRate: number; expirationRate: number }>;
  listTemplates(): Promise<OTPTemplate[]>;
}

export interface MessageService {
  sendText(to: string, text: string): Promise<void>;
  sendButtons(to: string, payload: unknown): Promise<void>;
  sendList(to: string, payload: unknown): Promise<void>;
  sendCarousel(to: string, payload: unknown): Promise<void>;
  sendReaction(to: string, emoji: string): Promise<void>;
  sendAiMessage(to: string, prompt: string): Promise<void>;
}

export interface ExecutionService {
  simulateFlow(flowId: string, input: { trigger: string; payload?: unknown }): Promise<ExecutionLog[]>;
  getExecutionLogs(flowId: string): Promise<ExecutionLog[]>;
  getPreviewState(flowId: string): Promise<ConversationPreview>;
}

export interface DashboardService {
  getMetrics(): Promise<DashboardMetrics>;
  getRecentFlows(): Promise<Flow[]>;
}

export interface TemplateService {
  listTemplates(): Promise<FlowTemplate[]>;
}
