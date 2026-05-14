import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Archive,
  Edit3,
  FileDown,
  KeyRound,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TimerReset,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { FlowStatusBadge, SessionStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedSession } from "@/features/session/session-context";
import { dashboardService, flowService, sessionService } from "@/services";
import type { Flow, Session } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - BerryFlow" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const queryClient = useQueryClient();
  const { selectedSessionId, setSelectedSessionId } = useSelectedSession();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<"create" | "edit">("create");
  const [sessionId, setSessionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [connectionType, setConnectionType] = useState<Session["connectionType"]>("qr");
  const [phoneNumber, setPhoneNumber] = useState("");

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionService.listSessions(),
  });
  const metrics = useQuery({
    queryKey: ["metrics", selectedSessionId],
    queryFn: () => dashboardService.getMetrics(selectedSessionId ?? undefined),
  });
  const recent = useQuery({
    queryKey: ["recent-flows", selectedSessionId],
    queryFn: () => dashboardService.getRecentFlows(selectedSessionId ?? undefined),
  });
  const flows = useQuery({
    queryKey: ["flows", selectedSessionId],
    queryFn: () => flowService.listFlows(selectedSessionId ?? undefined),
  });

  const selectedSession =
    (sessions.data ?? []).find((session) => session.id === selectedSessionId) ?? null;

  const openCreateSession = () => {
    setSessionMode("create");
    setSessionId("");
    setSessionName("");
    setConnectionType("qr");
    setPhoneNumber("");
    setSessionDialogOpen(true);
  };

  const openEditSession = (session: Session) => {
    setSessionMode("edit");
    setSessionId(session.id);
    setSessionName(session.name);
    setConnectionType(session.connectionType);
    setPhoneNumber(session.phoneNumber?.replace(/^\+/, "") ?? "");
    setSessionDialogOpen(true);
  };

  const createSession = useMutation({
    mutationFn: async () => {
      const created = await sessionService.createSession({
        id: sessionId.trim(),
        name: sessionName.trim() || sessionId.trim(),
        connectionType,
        phoneNumber: connectionType === "pairing-code" ? phoneNumber.trim() : undefined,
      });
      return created;
    },
    onSuccess: (created) => {
      toast.success(`Sessao ${created.name} criada`);
      setSelectedSessionId(created.id);
      setSessionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao criar sessao");
    },
  });

  const updateSession = useMutation({
    mutationFn: async () =>
      sessionService.updateSession(sessionId, {
        name: sessionName.trim(),
        connectionType,
        phoneNumber: connectionType === "pairing-code" ? phoneNumber.trim() : undefined,
      }),
    onSuccess: (updated) => {
      toast.success(`Sessao ${updated.name} atualizada`);
      setSessionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar sessao");
    },
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => sessionService.deleteSession(id),
    onSuccess: (_, id) => {
      toast.success("Sessao removida");
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const connectSession = useMutation({
    mutationFn: (id: string) => sessionService.connectSession(id),
    onSuccess: () => {
      toast.success("Pareamento iniciado");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const reconnectSession = useMutation({
    mutationFn: (id: string) => sessionService.reconnectSession(id),
    onSuccess: () => {
      toast.success("Reconexao iniciada");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const disconnectSession = useMutation({
    mutationFn: (id: string) => sessionService.disconnectSession(id),
    onSuccess: () => {
      toast.success("Sessao desconectada");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const setFlowStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Flow["status"] }) =>
      flowService.setFlowStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(`Fluxo atualizado para ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      queryClient.invalidateQueries({ queryKey: ["recent-flows"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });

  const activeFlows = (flows.data ?? []).filter((flow) => flow.status === "active").length;
  const pausedFlows = (flows.data ?? []).filter((flow) => flow.status === "paused").length;
  const onlineSessions = (sessions.data ?? []).filter((session) => session.status === "connected").length;

  const topSessions = useMemo(() => (sessions.data ?? []).slice(0, 4), [sessions.data]);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description={
          selectedSession
            ? `Painel operacional da sessao ${selectedSession.name}.`
            : "Crie ou selecione uma sessao para operar o runtime e os fluxos."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/templates">Importar template</Link>
            </Button>
            <Button onClick={openCreateSession} className="bg-gradient-primary shadow-glow">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova sessao
            </Button>
          </>
        }
      />

      <div className="space-y-8 p-8">
        <section className="hero-grid magic-panel rounded-[2rem] p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-primary-glow">
                BerryStudio command center
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-bold tracking-tight text-shimmer">
                  {selectedSession ? "Operacao da sessao em tempo real." : "Crie uma sessao para comecar a operar."}
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  Controle o runtime, acompanhe metricas e ligue ou pause fluxos sem sair da dashboard.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <HeroStat label="Sessoes" value={sessions.data?.length ?? "-"} hint="Cadastradas no studio" />
              <HeroStat label="Online" value={onlineSessions} hint="Conectadas agora" />
              <HeroStat label="Fluxos ativos" value={activeFlows} hint="Disponiveis para execucao" />
              <HeroStat label="Pausados" value={pausedFlows} hint="Em espera para retomar" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className="magic-panel rounded-[1.75rem] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Controle de sessao</h2>
                <p className="text-xs text-muted-foreground">
                  Criar, editar, remover e parear sessoes diretamente por aqui.
                </p>
              </div>
              {selectedSession ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditSession(selectedSession)}>
                    <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSession.mutate(selectedSession.id)}
                    disabled={deleteSession.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              ) : null}
            </div>

            {selectedSession ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.5rem] border border-primary/15 bg-card/45 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold">{selectedSession.name}</p>
                      <SessionStatusBadge status={selectedSession.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sessao: <span className="font-mono">{selectedSession.id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Conexao: {selectedSession.connectionType}
                      {selectedSession.phoneNumber ? ` - ${selectedSession.phoneNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.status === "disconnected" ? (
                      <Button
                        size="sm"
                        className="bg-gradient-primary"
                        onClick={() => connectSession.mutate(selectedSession.id)}
                        disabled={connectSession.isPending}
                      >
                        <Power className="mr-1.5 h-3.5 w-3.5" />
                        Conectar
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reconnectSession.mutate(selectedSession.id)}
                          disabled={reconnectSession.isPending}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Reconectar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disconnectSession.mutate(selectedSession.id)}
                          disabled={disconnectSession.isPending}
                        >
                          <Power className="mr-1.5 h-3.5 w-3.5" />
                          Desconectar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Total de fluxos" value={metrics.data?.totalFlows ?? "-"} icon={Workflow} />
                  <Metric label="Fluxos ativos" value={metrics.data?.activeFlows ?? "-"} icon={Activity} tone="success" />
                  <Metric label="Rascunhos" value={metrics.data?.draftFlows ?? "-"} icon={FileDown} />
                  <Metric label="OTPs hoje" value={metrics.data?.otpsSentToday.toLocaleString() ?? "-"} icon={KeyRound} tone="primary" />
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-card/25 p-5 text-sm text-muted-foreground">
                Nenhuma sessao selecionada. Crie uma nova ou escolha uma das sessoes abaixo.
              </div>
            )}
          </Card>

          <Card className="magic-panel rounded-[1.75rem] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Sessoes disponiveis</h2>
                <p className="text-xs text-muted-foreground">Selecao rapida do workspace.</p>
              </div>
              <Button size="sm" variant="outline" onClick={openCreateSession}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Criar
              </Button>
            </div>
            <div className="space-y-3">
              {topSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`flex w-full items-center gap-3 rounded-[1.25rem] border p-3 text-left transition-all ${
                    selectedSessionId === session.id
                      ? "border-primary/35 bg-primary/10 shadow-glow"
                      : "border-border bg-card/35 hover:border-primary/20 hover:bg-card/55"
                  }`}
                >
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                    <Smartphone className="h-4 w-4 text-primary-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{session.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{session.id}</p>
                  </div>
                  <SessionStatusBadge status={session.status} />
                </button>
              ))}
              {!topSessions.length ? (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-card/25 p-4 text-sm text-muted-foreground">
                  Nenhuma sessao cadastrada.
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="magic-panel rounded-[1.75rem] p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fluxos da sessao</h2>
                <p className="text-xs text-muted-foreground">
                  Ative, pause ou arquive sem sair da operacao.
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/flows">
                  Ver todos <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              {(flows.data ?? []).map((flow) => (
                <div
                  key={flow.id}
                  className="flex flex-wrap items-center gap-3 rounded-[1.25rem] border border-border bg-card/35 p-4"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                    <Workflow className="h-4 w-4 text-primary-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to="/flows/$id" params={{ id: flow.id }} className="text-sm font-semibold hover:text-primary-glow">
                      {flow.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {flow.trigger} - {flow.nodeCount} nos - v{flow.version.version}
                    </p>
                  </div>
                  <FlowStatusBadge status={flow.status} />
                  <div className="flex flex-wrap gap-2">
                    {flow.status !== "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlowStatus.mutate({ id: flow.id, status: "active" })}
                        disabled={setFlowStatus.isPending}
                      >
                        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                        Ativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlowStatus.mutate({ id: flow.id, status: "paused" })}
                        disabled={setFlowStatus.isPending}
                      >
                        <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                        Pausar
                      </Button>
                    )}
                    {flow.status !== "archived" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlowStatus.mutate({ id: flow.id, status: "archived" })}
                        disabled={setFlowStatus.isPending}
                      >
                        <Archive className="mr-1.5 h-3.5 w-3.5" />
                        Arquivar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}

              {!flows.isLoading && !(flows.data ?? []).length ? (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-card/25 p-4 text-sm text-muted-foreground">
                  Nenhum fluxo encontrado para a sessao atual.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="magic-panel rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold">Visao rapida</h2>
            <div className="mt-4 space-y-3">
              {(recent.data ?? []).map((flow) => (
                <Link
                  key={flow.id}
                  to="/flows/$id"
                  params={{ id: flow.id }}
                  className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-card/35 p-3 transition-all hover:border-primary/25 hover:bg-card/60"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                    <Workflow className="h-4 w-4 text-primary-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{flow.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {new Date(flow.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-3">
                <TimerReset className="h-4 w-4 text-primary-glow" />
                <h3 className="text-sm font-semibold">Saude do BerryOTP</h3>
              </div>
              <div className="grid gap-4">
                <Bar label="Taxa de uso" value={metrics.data?.otpUsageRate ?? 0} />
                <Bar label="Taxa de expiracao" value={metrics.data?.otpExpirationRate ?? 0} tone="warning" />
                <Bar label="Saude geral" value={1 - (metrics.data?.otpExpirationRate ?? 0)} tone="success" />
                <Metric label="Uso / Expira" value={metrics.data ? `${Math.round(metrics.data.otpUsageRate * 100)}% / ${Math.round(metrics.data.otpExpirationRate * 100)}%` : "-"} icon={ShieldCheck} tone="success" />
              </div>
            </div>
          </Card>
        </section>
      </div>

      <SessionEditorDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        mode={sessionMode}
        sessionId={sessionId}
        setSessionId={setSessionId}
        sessionName={sessionName}
        setSessionName={setSessionName}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        onSubmit={() => (sessionMode === "create" ? createSession.mutate() : updateSession.mutate())}
        loading={createSession.isPending || updateSession.isPending}
      />
    </AppShell>
  );
}

function SessionEditorDialog({
  open,
  onOpenChange,
  mode,
  sessionId,
  setSessionId,
  sessionName,
  setSessionName,
  connectionType,
  setConnectionType,
  phoneNumber,
  setPhoneNumber,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sessionId: string;
  setSessionId: (value: string) => void;
  sessionName: string;
  setSessionName: (value: string) => void;
  connectionType: Session["connectionType"];
  setConnectionType: (value: Session["connectionType"]) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Criar sessao" : "Editar sessao"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Defina o identificador do runtime BerryProtocol."
              : "Atualize nome, metodo de conexao e numero usado no pareamento."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="session-id">Identificador</Label>
            <Input
              id="session-id"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              disabled={mode === "edit"}
              placeholder="ex: loja-sp-01"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-name">Nome visivel</Label>
            <Input
              id="session-name"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              placeholder="ex: Loja Sao Paulo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Metodo de conexao</Label>
            <Select
              value={connectionType}
              onValueChange={(value) => setConnectionType(value as Session["connectionType"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qr">QR code</SelectItem>
                <SelectItem value="pairing-code">Pairing code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {connectionType === "pairing-code" ? (
            <div className="space-y-1.5">
              <Label htmlFor="phone-number">Numero do WhatsApp</Label>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="5511999999999"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || !sessionName.trim() || !sessionId.trim()}
            className="bg-gradient-primary shadow-glow"
          >
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Criar" : "Salvar alteracoes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success";
}) {
  const toneCls =
    tone === "primary" ? "text-primary-glow" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card className="magic-panel rounded-[1.5rem] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneCls}`}>{value}</p>
    </Card>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone?: "warning" | "success" }) {
  const pct = Math.round(value * 100);
  const cls = tone === "warning" ? "bg-warning" : tone === "success" ? "bg-success" : "bg-gradient-primary";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="rounded-[1.5rem] border border-primary/15 bg-card/45 p-4 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-shimmer">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
