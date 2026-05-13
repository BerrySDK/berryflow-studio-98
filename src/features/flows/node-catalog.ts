import type { FlowNodeKind, NodeCategory } from "@/types";
import {
  Play, Square, Timer, GitBranch, Tag, Variable, Webhook, Globe,
  Shuffle, StickyNote,
  MessageSquare, Image as ImageIcon, MousePointerClick, List, GalleryHorizontal,
  Contact, MapPin, Smile, Pencil, Sparkles,
  Inbox, MousePointer, ListChecks, Reply, ShieldX, ShieldCheck, ShieldAlert,
  GitFork, Search, FileText, Regex, Clock, Gauge, Split,
  KeyRound, Send, BadgeCheck, TimerReset, X, CircleCheck, Lock, LogIn,
  type LucideIcon,
} from "lucide-react";

export interface NodeDef {
  kind: FlowNodeKind;
  label: string;
  category: NodeCategory;
  icon: LucideIcon;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export const NODE_CATEGORIES: { key: NodeCategory; label: string; description: string }[] = [
  { key: "core", label: "Básicos", description: "Lógica essencial do fluxo" },
  { key: "message", label: "Mensagem · BerryProtocol", description: "Envio de mensagens WhatsApp" },
  { key: "event", label: "Eventos · Entrada", description: "Disparadores e respostas" },
  { key: "logic", label: "Lógica", description: "Decisão e roteamento" },
  { key: "otp", label: "BerryOTP", description: "Códigos e autenticação" },
];

export const NODES: NodeDef[] = [
  // core
  { kind: "start", label: "Start", category: "core", icon: Play, description: "Início do fluxo" },
  { kind: "end", label: "End", category: "core", icon: Square, description: "Encerra o fluxo" },
  { kind: "delay", label: "Delay", category: "core", icon: Timer, description: "Aguarda N ms", defaultConfig: { ms: 1000 } },
  { kind: "condition", label: "Condition", category: "core", icon: GitBranch, description: "Condição genérica" },
  { kind: "tag", label: "Tag", category: "core", icon: Tag, description: "Marca o contato" },
  { kind: "set-variable", label: "Set Variable", category: "core", icon: Variable, description: "Define variável" },
  { kind: "webhook", label: "Webhook", category: "core", icon: Webhook, description: "Recebe via HTTP" },
  { kind: "http-request", label: "HTTP Request", category: "core", icon: Globe, description: "Chama API externa" },
  { kind: "switch", label: "Switch", category: "core", icon: Shuffle, description: "Roteamento múltiplo" },
  { kind: "note", label: "Note", category: "core", icon: StickyNote, description: "Anotação visual" },
  // message
  { kind: "send-text", label: "Send Text", category: "message", icon: MessageSquare, description: "Envia mensagem de texto", defaultConfig: { text: "" } },
  { kind: "send-media", label: "Send Media", category: "message", icon: ImageIcon, description: "Imagem, vídeo, áudio ou doc" },
  { kind: "send-buttons", label: "Send Buttons", category: "message", icon: MousePointerClick, description: "Mensagem com botões", defaultConfig: { text: "", buttons: ["Sim","Não"] } },
  { kind: "send-list", label: "Send List", category: "message", icon: List, description: "Lista interativa" },
  { kind: "send-carousel", label: "Send Carousel", category: "message", icon: GalleryHorizontal, description: "Carousel de cards" },
  { kind: "send-contact", label: "Send Contact", category: "message", icon: Contact, description: "Compartilhar contato" },
  { kind: "send-location", label: "Send Location", category: "message", icon: MapPin, description: "Compartilhar localização" },
  { kind: "send-reaction", label: "Send Reaction", category: "message", icon: Smile, description: "Reage a uma mensagem" },
  { kind: "edit-message", label: "Edit Message", category: "message", icon: Pencil, description: "Edita mensagem enviada" },
  { kind: "ai-label-message", label: "AI Label Message", category: "message", icon: Sparkles, description: "Marca como IA (apenas chat privado)" },
  // event
  { kind: "on-message-received", label: "On Message Received", category: "event", icon: Inbox, description: "Quando recebe mensagem" },
  { kind: "on-button-click", label: "On Button Click", category: "event", icon: MousePointer, description: "Clique em botão" },
  { kind: "on-list-reply", label: "On List Reply", category: "event", icon: ListChecks, description: "Resposta de lista" },
  { kind: "on-interactive-reply", label: "On Interactive Reply", category: "event", icon: Reply, description: "Resposta interativa" },
  { kind: "on-otp-denied", label: "On OTP Denied", category: "event", icon: ShieldX, description: "Código negado" },
  { kind: "on-otp-used", label: "On OTP Used", category: "event", icon: ShieldCheck, description: "Código usado com sucesso" },
  { kind: "on-otp-expired", label: "On OTP Expired", category: "event", icon: ShieldAlert, description: "Código expirou" },
  // logic
  { kind: "if-else", label: "If / Else", category: "logic", icon: GitFork, description: "Decisão binária" },
  { kind: "match-text", label: "Match Text", category: "logic", icon: Search, description: "Compara texto" },
  { kind: "contains", label: "Contains", category: "logic", icon: FileText, description: "Verifica substring" },
  { kind: "regex", label: "Regex", category: "logic", icon: Regex, description: "Combina por regex" },
  { kind: "time-window", label: "Time Window", category: "logic", icon: Clock, description: "Janela de horário" },
  { kind: "rate-limit", label: "Rate Limit", category: "logic", icon: Gauge, description: "Limita disparos" },
  { kind: "branch-by-variable", label: "Branch by Variable", category: "logic", icon: Split, description: "Roteia por variável" },
  // otp
  { kind: "generate-otp", label: "Generate OTP", category: "otp", icon: KeyRound, description: "Gera código OTP", defaultConfig: { length: 6, ttlMs: 120000 } },
  { kind: "send-otp", label: "Send OTP", category: "otp", icon: Send, description: "Envia código via WhatsApp", defaultConfig: { mode: "copy-code" } },
  { kind: "verify-otp", label: "Verify OTP", category: "otp", icon: BadgeCheck, description: "Verifica código informado" },
  { kind: "expire-otp", label: "Expire OTP", category: "otp", icon: TimerReset, description: "Expira manualmente" },
  { kind: "cancel-otp", label: "Cancel OTP", category: "otp", icon: X, description: "Cancela código ativo" },
  { kind: "otp-result", label: "OTP Result", category: "otp", icon: CircleCheck, description: "Saída final do OTP" },
  { kind: "otp-guard", label: "OTP Guard", category: "otp", icon: Lock, description: "Protege seção do fluxo" },
  { kind: "create-login-flow", label: "Create Login Flow", category: "otp", icon: LogIn, description: "Sub-fluxo completo de login" },
];

export const NODE_BY_KIND: Record<FlowNodeKind, NodeDef> =
  Object.fromEntries(NODES.map(n => [n.kind, n])) as Record<FlowNodeKind, NodeDef>;

export const CATEGORY_TONE: Record<NodeCategory, { ring: string; bg: string; text: string }> = {
  core:    { ring: "ring-1 ring-border", bg: "bg-card", text: "text-foreground" },
  message: { ring: "ring-1 ring-primary/30", bg: "bg-primary/10", text: "text-primary-glow" },
  event:   { ring: "ring-1 ring-warning/40", bg: "bg-warning/10", text: "text-warning" },
  logic:   { ring: "ring-1 ring-accent/40", bg: "bg-accent/15", text: "text-accent-foreground" },
  otp:     { ring: "ring-1 ring-success/40", bg: "bg-success/10", text: "text-success" },
};
