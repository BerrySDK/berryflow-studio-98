import type {
  Flow, Session, ExecutionLog, ConversationPreview,
  OTPTemplate, FlowTemplate, DashboardMetrics,
} from "@/types";

const now = () => new Date().toISOString();

const baseFlow = (over: Partial<Flow> & { id: string; name: string }): Flow => ({
  id: over.id,
  name: over.name,
  slug: over.slug ?? over.name.toLowerCase().replace(/\s+/g, "-"),
  description: over.description ?? "",
  status: over.status ?? "draft",
  type: over.type ?? "automation",
  channel: over.channel ?? "whatsapp",
  trigger: over.trigger ?? "On Message Received",
  tags: over.tags ?? [],
  nodes: over.nodes ?? [
    { id: "n1", type: "berry", position: { x: 80, y: 120 }, data: { label: "Start", kind: "start", category: "core" } },
    { id: "n2", type: "berry", position: { x: 360, y: 120 }, data: { label: "Send Text", kind: "send-text", category: "message", config: { text: "Olá! Como posso ajudar?" } } },
    { id: "n3", type: "berry", position: { x: 640, y: 120 }, data: { label: "End", kind: "end", category: "core" } },
  ],
  edges: over.edges ?? [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
  ],
  version: over.version ?? { version: 1, publishedAt: undefined },
  updatedAt: over.updatedAt ?? now(),
  createdAt: over.createdAt ?? now(),
  nodeCount: (over.nodes ?? []).length || 3,
});

export const MOCK_FLOWS: Flow[] = [
  baseFlow({
    id: "flw_001",
    name: "Atendimento Inicial",
    slug: "atendimento-inicial",
    description: "Recepciona o cliente e roteia para o time correto",
    status: "active",
    type: "automation",
    trigger: "On Message Received",
    tags: ["suporte", "produção"],
    nodes: [
      { id: "n1", type: "berry", position: { x: 60, y: 140 }, data: { label: "On Message Received", kind: "on-message-received", category: "event" } },
      { id: "n2", type: "berry", position: { x: 320, y: 60 }, data: { label: "Match Text", kind: "match-text", category: "logic", config: { match: "oi|olá|menu" } } },
      { id: "n3", type: "berry", position: { x: 600, y: 40 }, data: { label: "Send Buttons", kind: "send-buttons", category: "message", config: { text: "Como posso te ajudar?", buttons: ["Suporte","Comercial","Financeiro"] } } },
      { id: "n4", type: "berry", position: { x: 600, y: 200 }, data: { label: "Send Text", kind: "send-text", category: "message", config: { text: "Não entendi 🤔, pode reformular?" } } },
      { id: "n5", type: "berry", position: { x: 880, y: 120 }, data: { label: "End", kind: "end", category: "core" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3", label: "match" },
      { id: "e3", source: "n2", target: "n4", label: "no match" },
      { id: "e4", source: "n3", target: "n5" },
      { id: "e5", source: "n4", target: "n5" },
    ],
  }),
  baseFlow({
    id: "flw_002",
    name: "Login com BerryOTP",
    slug: "login-otp",
    description: "Fluxo de autenticação por código",
    status: "active",
    type: "otp",
    trigger: "Webhook /login",
    tags: ["otp","auth"],
    nodes: [
      { id: "n1", type: "berry", position: { x: 60, y: 140 }, data: { label: "Webhook", kind: "webhook", category: "core" } },
      { id: "n2", type: "berry", position: { x: 320, y: 140 }, data: { label: "Generate OTP", kind: "generate-otp", category: "otp", config: { length: 6, ttlMs: 120000 } } },
      { id: "n3", type: "berry", position: { x: 580, y: 140 }, data: { label: "Send OTP", kind: "send-otp", category: "otp", config: { mode: "copy-code" } } },
      { id: "n4", type: "berry", position: { x: 840, y: 60 }, data: { label: "On OTP Used", kind: "on-otp-used", category: "event" } },
      { id: "n5", type: "berry", position: { x: 840, y: 220 }, data: { label: "On OTP Expired", kind: "on-otp-expired", category: "event" } },
      { id: "n6", type: "berry", position: { x: 1100, y: 140 }, data: { label: "OTP Result", kind: "otp-result", category: "otp" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
      { id: "e4", source: "n3", target: "n5" },
      { id: "e5", source: "n4", target: "n6", label: "success" },
      { id: "e6", source: "n5", target: "n6", label: "expired" },
    ],
  }),
  baseFlow({
    id: "flw_003",
    name: "Recuperação de Conta",
    slug: "account-recovery",
    description: "Reset de senha via OTP",
    status: "draft",
    type: "otp",
    trigger: "Webhook /recover",
    tags: ["otp","recovery"],
  }),
  baseFlow({
    id: "flw_004",
    name: "Catálogo com Carousel",
    slug: "catalog-carousel",
    description: "Apresenta produtos via carousel BerryProtocol",
    status: "active",
    type: "campaign",
    trigger: "On Message Received",
    tags: ["catalog","campanha"],
    nodes: [
      { id: "n1", type: "berry", position: { x: 60, y: 140 }, data: { label: "On Message Received", kind: "on-message-received", category: "event" } },
      { id: "n2", type: "berry", position: { x: 340, y: 140 }, data: { label: "Send Carousel", kind: "send-carousel", category: "message", config: { cards: [{title:"Plano Pro",media:"",button:"Assinar"},{title:"Plano Plus",media:"",button:"Assinar"}] } } },
      { id: "n3", type: "berry", position: { x: 620, y: 140 }, data: { label: "On Button Click", kind: "on-button-click", category: "event" } },
      { id: "n4", type: "berry", position: { x: 900, y: 140 }, data: { label: "AI Label Message", kind: "ai-label-message", category: "message", config: { hint: "Funciona apenas em chat privado" } } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  }),
];

export const MOCK_SESSIONS: Session[] = [
  { id: "sess_01", name: "Suporte BR", phoneNumber: "+55 11 99999-0001", status: "connected", connectionType: "qr", lastActivityAt: now() },
  { id: "sess_02", name: "Vendas", phoneNumber: "+55 11 99999-0002", status: "connecting", connectionType: "pairing-code", lastActivityAt: now() },
  { id: "sess_03", name: "Sandbox Dev", status: "disconnected", connectionType: "qr", lastActivityAt: now() },
];

export const MOCK_OTP_TEMPLATES: OTPTemplate[] = [
  {
    id: "otpt_login", name: "Login com OTP", category: "login",
    description: "Fluxo padrão de autenticação por código de 6 dígitos.",
    config: defaultOtp("Login"),
  },
  {
    id: "otpt_verify", name: "Verificação de identidade", category: "verification",
    description: "Confirme a identidade antes de operações sensíveis.",
    config: defaultOtp("Verificação"),
  },
  {
    id: "otpt_recover", name: "Recuperação de conta", category: "recovery",
    description: "Reset de senha via código enviado por WhatsApp.",
    config: defaultOtp("Recuperação"),
  },
  {
    id: "otpt_approval", name: "Aprovação por código", category: "approval",
    description: "Aprovação de transações sensíveis com OTP.",
    config: defaultOtp("Aprovação"),
  },
];

function defaultOtp(label: string) {
  return {
    issuer: "BerryProtocol",
    ttlMs: 120_000,
    mode: "copy-code" as const,
    editOnExpire: true,
    autoReplyOnDenied: true,
    codeLength: 6,
    mask: "•••-•••",
    texts: { header: `${label} BerryFlow`, body: "Use o código abaixo para continuar.", footer: "Não compartilhe este código." },
    buttons: [{ label: "Copiar código", action: "copy" }],
    userIdSource: "phone" as const,
    tenantId: "tnt_default",
    appId: "app_berryflow",
  };
}

export const MOCK_LOGS: ExecutionLog[] = [
  { id: "l1", flowId: "flw_001", nodeId: "n1", nodeLabel: "On Message Received", status: "ok", durationMs: 12, ts: now() },
  { id: "l2", flowId: "flw_001", nodeId: "n2", nodeLabel: "Match Text", status: "ok", durationMs: 4, ts: now() },
  { id: "l3", flowId: "flw_001", nodeId: "n3", nodeLabel: "Send Buttons", status: "ok", durationMs: 220, ts: now() },
  { id: "l4", flowId: "flw_002", nodeId: "n2", nodeLabel: "Generate OTP", status: "ok", durationMs: 18, ts: now() },
  { id: "l5", flowId: "flw_002", nodeId: "n3", nodeLabel: "Send OTP", status: "ok", durationMs: 310, ts: now() },
  { id: "l6", flowId: "flw_002", nodeId: "n4", nodeLabel: "On OTP Used", status: "ok", durationMs: 90, ts: now() },
];

export const MOCK_PREVIEW: ConversationPreview = {
  contact: { id: "c1", name: "Mariana Silva", phone: "+55 11 90000-0000", tags: ["vip"] },
  messages: [
    { id: "m1", from: "user", type: "text", content: "oi", ts: now() },
    { id: "m2", from: "bot", type: "buttons", content: "Como posso te ajudar?", ts: now(), meta: { buttons: ["Suporte","Comercial","Financeiro"] } },
    { id: "m3", from: "user", type: "text", content: "Suporte", ts: now() },
    { id: "m4", from: "bot", type: "text", content: "Perfeito! Vou te conectar com um atendente.", ts: now() },
    { id: "m5", from: "bot", type: "otp", content: "812-394", ts: now(), meta: { mode: "copy-code", ttl: 120 } },
  ],
};

export const MOCK_METRICS: DashboardMetrics = {
  totalFlows: 4,
  activeFlows: 3,
  draftFlows: 1,
  connectedSessions: 1,
  otpsSentToday: 1284,
  otpUsageRate: 0.78,
  otpExpirationRate: 0.12,
};

export const MOCK_TEMPLATES: FlowTemplate[] = [
  { id: "tpl_simple", name: "Atendimento simples", category: "support", preview: "Recebe mensagem e responde com menu de texto.", description: "Fluxo enxuto de boas-vindas.", flow: extractFlow(MOCK_FLOWS[0]) },
  { id: "tpl_menu", name: "Menu com botões", category: "menu", preview: "Mensagem de boas-vindas com 3 botões.", description: "Roteamento por botões.", flow: extractFlow(MOCK_FLOWS[0]) },
  { id: "tpl_list", name: "Lista de produtos", category: "catalog", preview: "Lista interativa do BerryProtocol.", description: "Use Send List para mostrar opções.", flow: extractFlow(MOCK_FLOWS[3]) },
  { id: "tpl_carousel", name: "Campanha com carousel", category: "campaign", preview: "Carousel com cards e CTA.", description: "Campanha promocional com cards.", flow: extractFlow(MOCK_FLOWS[3]) },
  { id: "tpl_lead", name: "Captura de lead", category: "lead", preview: "Solicita dados e marca o contato.", description: "Pergunta nome, email e tag.", flow: extractFlow(MOCK_FLOWS[0]) },
  { id: "tpl_otp_login", name: "Login com BerryOTP", category: "otp", preview: "Geração + envio + verificação.", description: "Pronto para autenticação.", flow: extractFlow(MOCK_FLOWS[1]) },
  { id: "tpl_otp_recover", name: "Recuperação de conta", category: "otp", preview: "Reset de senha via OTP.", description: "Use para 'esqueci minha senha'.", flow: extractFlow(MOCK_FLOWS[2]) },
  { id: "tpl_ai", name: "Fluxo com AI label", category: "ai", preview: "Mensagens marcadas como AI.", description: "Apenas em chat privado.", flow: extractFlow(MOCK_FLOWS[3]) },
];

function extractFlow(f: Flow) {
  return { nodes: f.nodes, edges: f.edges, type: f.type, trigger: f.trigger, tags: f.tags };
}
