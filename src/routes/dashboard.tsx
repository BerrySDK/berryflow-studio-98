import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { dashboardService } from "@/services";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlowStatusBadge } from "@/components/StatusBadge";
import {
  Workflow,
  KeyRound,
  FileDown,
  Smartphone,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import { useSelectedSession } from "@/features/session/session-context";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - BerryFlow" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { selectedSessionId } = useSelectedSession();
  const metrics = useQuery({
    queryKey: ["metrics", selectedSessionId],
    queryFn: () => dashboardService.getMetrics(selectedSessionId ?? undefined),
  });
  const recent = useQuery({
    queryKey: ["recent-flows", selectedSessionId],
    queryFn: () => dashboardService.getRecentFlows(selectedSessionId ?? undefined),
  });

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description={
          selectedSessionId
            ? `Visao geral da sessao ${selectedSessionId}, metricas de OTP e fluxos recentes.`
            : "Selecione uma sessao na lateral para ver o dashboard filtrado."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/templates">Importar template</Link>
            </Button>
            <Button asChild className="bg-gradient-primary shadow-glow">
              <Link to="/flows/new">Criar fluxo</Link>
            </Button>
          </>
        }
      />
      <div className="space-y-8 p-8">
        {!selectedSessionId ? (
          <Card className="bg-gradient-surface p-6">
            <p className="text-sm text-muted-foreground">
              Escolha uma sessao no seletor lateral para trabalhar com dashboard, fluxos e OTP por sessao.
            </p>
          </Card>
        ) : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="Total de fluxos" value={metrics.data?.totalFlows ?? "-"} icon={Workflow} />
          <Metric label="Ativos" value={metrics.data?.activeFlows ?? "-"} icon={Activity} tone="success" />
          <Metric label="Rascunhos" value={metrics.data?.draftFlows ?? "-"} icon={FileDown} />
          <Metric label="Sessao ativa" value={metrics.data?.connectedSessions ?? "-"} icon={Smartphone} />
          <Metric label="OTPs hoje" value={metrics.data?.otpsSentToday.toLocaleString() ?? "-"} icon={KeyRound} tone="primary" />
          <Metric
            label="Uso / Expira"
            value={
              metrics.data
                ? `${Math.round(metrics.data.otpUsageRate * 100)}% / ${Math.round(metrics.data.otpExpirationRate * 100)}%`
                : "-"
            }
            icon={ShieldCheck}
            tone="success"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-gradient-surface p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fluxos recentes</h2>
                <p className="text-xs text-muted-foreground">Ultimas atualizacoes da sessao selecionada.</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/flows">
                  Ver todos <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {(recent.data ?? []).map((flow) => (
                <Link
                  key={flow.id}
                  to="/flows/$id"
                  params={{ id: flow.id }}
                  className="-mx-2 flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-card/40"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30">
                    <Workflow className="h-4 w-4 text-primary-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{flow.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {flow.trigger} · {flow.nodeCount} nos
                    </p>
                  </div>
                  <FlowStatusBadge status={flow.status} />
                </Link>
              ))}
              {recent.isLoading ? <p className="py-6 text-sm text-muted-foreground">Carregando...</p> : null}
            </div>
          </Card>

          <Card className="space-y-3 bg-gradient-surface p-6">
            <h2 className="text-lg font-semibold">Acoes rapidas</h2>
            <Quick to="/flows/new" icon={Workflow} title="Criar fluxo" desc="Comece em branco no builder." />
            <Quick to="/otp" icon={KeyRound} title="Criar fluxo OTP" desc="Login, verificacao e recuperacao." />
            <Quick to="/templates" icon={FileDown} title="Importar template" desc="Galeria de fluxos prontos." />
            <Quick to="/sessions" icon={Smartphone} title="Conectar sessao" desc="Pareie um numero WhatsApp." />
          </Card>
        </section>

        <Card className="bg-gradient-surface p-6">
          <div className="mb-3 flex items-center gap-3">
            <TimerReset className="h-4 w-4 text-primary-glow" />
            <h2 className="text-lg font-semibold">Saude do BerryOTP</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Bar label="Taxa de uso" value={metrics.data?.otpUsageRate ?? 0} />
            <Bar label="Taxa de expiracao" value={metrics.data?.otpExpirationRate ?? 0} tone="warning" />
            <Bar label="Saude geral" value={1 - (metrics.data?.otpExpirationRate ?? 0)} tone="success" />
          </div>
        </Card>
      </div>
    </AppShell>
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
    <Card className="bg-gradient-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneCls}`}>{value}</p>
    </Card>
  );
}

function Quick({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-glow"
    >
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/30">
        <Icon className="h-4 w-4 text-primary-glow" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
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
