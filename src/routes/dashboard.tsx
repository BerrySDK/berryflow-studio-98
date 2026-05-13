import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { dashboardService } from "@/services";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlowStatusBadge } from "@/components/StatusBadge";
import { Workflow, KeyRound, FileDown, Smartphone, ArrowUpRight, Activity, ShieldCheck, TimerReset, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BerryFlow" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => dashboardService.getMetrics() });
  const recent = useQuery({ queryKey: ["recent-flows"], queryFn: () => dashboardService.getRecentFlows() });

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Visão geral do workspace, métricas de OTP e fluxos recentes."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/templates">Importar template</Link></Button>
            <Button asChild className="bg-gradient-primary shadow-glow"><Link to="/flows/new">Criar fluxo</Link></Button>
          </>
        }
      />
      <div className="p-8 space-y-8">
        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <Metric label="Total de fluxos" value={metrics.data?.totalFlows ?? "—"} icon={Workflow} />
          <Metric label="Ativos" value={metrics.data?.activeFlows ?? "—"} icon={Activity} tone="success" />
          <Metric label="Rascunhos" value={metrics.data?.draftFlows ?? "—"} icon={FileDown} />
          <Metric label="Sessões" value={metrics.data?.connectedSessions ?? "—"} icon={Smartphone} />
          <Metric label="OTPs hoje" value={metrics.data?.otpsSentToday.toLocaleString() ?? "—"} icon={KeyRound} tone="primary" />
          <Metric
            label="Uso / Expira"
            value={metrics.data ? `${Math.round(metrics.data.otpUsageRate*100)}% / ${Math.round(metrics.data.otpExpirationRate*100)}%` : "—"}
            icon={ShieldCheck}
            tone="success"
          />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-gradient-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Fluxos recentes</h2>
                <p className="text-xs text-muted-foreground">Últimas atualizações no workspace.</p>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/flows">Ver todos <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
            </div>
            <div className="divide-y divide-border">
              {(recent.data ?? []).map(f => (
                <Link key={f.id} to="/flows/$id" params={{ id: f.id }} className="flex items-center gap-4 py-3 hover:bg-card/40 -mx-2 px-2 rounded-md transition-colors">
                  <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center ring-1 ring-primary/30">
                    <Workflow className="h-4 w-4 text-primary-glow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{f.trigger} · {f.nodeCount} nós</p>
                  </div>
                  <FlowStatusBadge status={f.status} />
                </Link>
              ))}
              {recent.isLoading && <p className="py-6 text-sm text-muted-foreground">Carregando…</p>}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-surface space-y-3">
            <h2 className="text-lg font-semibold">Ações rápidas</h2>
            <Quick to="/flows/new" icon={Workflow} title="Criar fluxo" desc="Comece em branco no builder." />
            <Quick to="/otp" icon={KeyRound} title="Criar fluxo OTP" desc="Login, verificação e recuperação." />
            <Quick to="/templates" icon={FileDown} title="Importar template" desc="Galeria de fluxos prontos." />
            <Quick to="/sessions" icon={Smartphone} title="Conectar sessão" desc="Pareie um número WhatsApp." />
          </Card>
        </section>

        <Card className="p-6 bg-gradient-surface">
          <div className="flex items-center gap-3 mb-3">
            <TimerReset className="h-4 w-4 text-primary-glow" />
            <h2 className="text-lg font-semibold">Saúde do BerryOTP</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Bar label="Taxa de uso" value={metrics.data?.otpUsageRate ?? 0} />
            <Bar label="Taxa de expiração" value={metrics.data?.otpExpirationRate ?? 0} tone="warning" />
            <Bar label="Saúde geral" value={1 - (metrics.data?.otpExpirationRate ?? 0)} tone="success" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: React.ReactNode; icon: LucideIcon; tone?: "primary" | "success" }) {
  const toneCls = tone === "primary" ? "text-primary-glow" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card className="p-4 bg-gradient-surface">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneCls}`}>{value}</p>
    </Card>
  );
}

function Quick({ to, icon: Icon, title, desc }: { to: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40 hover:bg-card hover:border-primary/40 hover:shadow-glow transition-all">
      <div className="h-9 w-9 rounded-md bg-primary/15 grid place-items-center ring-1 ring-primary/30">
        <Icon className="h-4 w-4 text-primary-glow" />
      </div>
      <div className="flex-1 min-w-0">
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
