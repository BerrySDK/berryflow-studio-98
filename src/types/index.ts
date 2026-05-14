// Core domain types for BerryAPI.
// These are the contracts the UI depends on. Mocks and (future) real
// adapters must conform to these shapes.

export type FlowStatus = "active" | "draft" | "archived" | "paused";
export type FlowChannel = "whatsapp" | "internal";
export type FlowType = "automation" | "otp" | "ai" | "campaign";

export type NodeCategory =
  | "core"
  | "message"
  | "event"
  | "logic"
  | "otp";

export type FlowNodeKind =
  // core
  | "start" | "end" | "delay" | "condition" | "tag" | "set-variable"
  | "webhook" | "http-request" | "switch" | "note"
  // message (BerryProtocol)
  | "send-text" | "send-media" | "send-buttons" | "send-list"
  | "send-carousel" | "send-contact" | "send-location" | "send-reaction"
  | "edit-message" | "ai-label-message"
  // event
  | "on-message-received" | "on-button-click" | "on-list-reply"
  | "on-interactive-reply" | "on-otp-denied" | "on-otp-used" | "on-otp-expired"
  // logic
  | "if-else" | "match-text" | "contains" | "regex"
  | "time-window" | "rate-limit" | "branch-by-variable"
  // otp
  | "generate-otp" | "send-otp" | "verify-otp" | "expire-otp"
  | "cancel-otp" | "otp-result" | "otp-guard" | "create-login-flow";

export interface FlowNodeData {
  label: string;
  kind: FlowNodeKind;
  category: NodeCategory;
  config?: Record<string, unknown>;
  errors?: string[];
}

export interface FlowNode {
  id: string;
  type: "berry";
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface FlowVersion {
  version: number;
  publishedAt?: string;
  notes?: string;
}

export interface Flow {
  id: string;
  sessionId?: string;
  name: string;
  slug: string;
  description?: string;
  status: FlowStatus;
  type: FlowType;
  channel: FlowChannel;
  trigger: string;
  tags: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  version: FlowVersion;
  updatedAt: string;
  createdAt: string;
  nodeCount: number;
}

export type SessionStatus = "connected" | "connecting" | "disconnected" | "qr_pending";

export interface Session {
  id: string;
  name: string;
  phoneNumber?: string;
  status: SessionStatus;
  connectionType: "qr" | "pairing-code";
  lastActivityAt: string;
  qrCode?: string;
  pairingCode?: string;
}

export type OtpMode = "stable" | "copy-code" | "experimental-copy-code";

export interface OTPFlowConfig {
  issuer: string;
  ttlMs: number;
  mode: OtpMode;
  editOnExpire: boolean;
  autoReplyOnDenied: boolean;
  codeLength: number;
  mask: string;
  texts: { header: string; body: string; footer?: string };
  buttons: { label: string; action: string }[];
  metadata?: Record<string, string>;
  userIdSource: "phone" | "email" | "external_id";
  tenantId: string;
  appId: string;
}

export interface OTPTemplate {
  id: string;
  name: string;
  description: string;
  config: OTPFlowConfig;
  category: "login" | "verification" | "recovery" | "approval";
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: "text" | "buttons" | "list" | "carousel" | "media";
  payload: Record<string, unknown>;
}

export interface ExecutionLog {
  id: string;
  flowId: string;
  nodeId: string;
  nodeLabel: string;
  status: "ok" | "error" | "running" | "skipped";
  durationMs: number;
  ts: string;
  message?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  tags: string[];
}

export interface ConversationMessage {
  id: string;
  from: "user" | "bot";
  type: "text" | "buttons" | "list" | "image" | "otp";
  content: string;
  ts: string;
  meta?: Record<string, unknown>;
}

export interface ConversationPreview {
  contact: Contact;
  messages: ConversationMessage[];
}

export interface DashboardMetrics {
  totalFlows: number;
  activeFlows: number;
  draftFlows: number;
  connectedSessions: number;
  otpsSentToday: number;
  otpUsageRate: number;
  otpExpirationRate: number;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: "support" | "menu" | "catalog" | "campaign" | "lead" | "otp" | "ai";
  preview: string;
  flow: Pick<Flow, "nodes" | "edges" | "type" | "trigger" | "tags">;
}
