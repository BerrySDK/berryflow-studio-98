import { Badge } from "@/components/ui/badge";
import type { FlowStatus, SessionStatus } from "@/types";
import { cn } from "@/lib/utils";

const FLOW: Record<FlowStatus, { label: string; cls: string }> = {
  active:   { label: "Ativo",     cls: "bg-success/15 text-success border-success/30" },
  draft:    { label: "Rascunho",  cls: "bg-muted text-muted-foreground border-border" },
  archived: { label: "Arquivado", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  paused:   { label: "Pausado",   cls: "bg-warning/15 text-warning border-warning/30" },
};

export function FlowStatusBadge({ status }: { status: FlowStatus }) {
  const s = FLOW[status];
  return <Badge variant="outline" className={cn("border", s.cls)}>{s.label}</Badge>;
}

const SESSION: Record<SessionStatus, { label: string; cls: string; dot: string }> = {
  connected:    { label: "Conectado",   cls: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  connecting:   { label: "Conectando",  cls: "bg-warning/15 text-warning border-warning/30", dot: "bg-warning animate-pulse" },
  disconnected: { label: "Desconectado",cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  qr_pending:   { label: "Aguardando QR", cls: "bg-primary/15 text-primary-glow border-primary/40", dot: "bg-primary-glow animate-pulse" },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const s = SESSION[status];
  return (
    <Badge variant="outline" className={cn("border gap-1.5", s.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} /> {s.label}
    </Badge>
  );
}
