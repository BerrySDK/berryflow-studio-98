import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { otpService } from "@/services";
import { KeyRound, ShieldCheck, ShieldAlert, Send, Sparkles } from "lucide-react";
import type { OTPTemplate } from "@/types";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "BerryOTP - BerryAPI" }] }),
  component: OtpPage,
});

const CATEGORY_LABEL = {
  login: "Login",
  verification: "Verificacao",
  recovery: "Recuperacao",
  approval: "Aprovacao",
} as const;

function OtpPage() {
  const templates = useQuery({ queryKey: ["otp-templates"], queryFn: () => otpService.listTemplates() });
  const metrics = useQuery({ queryKey: ["otp-metrics"], queryFn: () => otpService.getOtpMetrics() });
  const [active, setActive] = useState<OTPTemplate | null>(null);
  const selected = active ?? templates.data?.[0] ?? null;

  return (
    <AppShell>
      <PageHeader
        title="BerryOTP"
        description="Templates, configuracao avancada e preview do payload OTP."
        actions={<Button className="bg-gradient-primary shadow-glow"><Sparkles className="mr-1.5 h-4 w-4" /> Criar fluxo OTP</Button>}
      />
      <div className="space-y-6 p-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <Mini icon={Send} label="OTPs hoje" value={metrics.data?.sentToday.toLocaleString() ?? "-"} />
          <Mini icon={ShieldCheck} label="Taxa de uso" value={metrics.data ? `${Math.round(metrics.data.usageRate * 100)}%` : "-"} tone="success" />
          <Mini icon={ShieldAlert} label="Taxa de expiracao" value={metrics.data ? `${Math.round(metrics.data.expirationRate * 100)}%` : "-"} tone="warning" />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-gradient-surface p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Templates prontos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(templates.data ?? []).map((t) => {
                const isActive = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActive(t)}
                    className={`rounded-xl border bg-card/40 p-4 text-left transition-all ${isActive ? "border-primary/60 bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary-glow" />
                      <p className="font-semibold">{t.name}</p>
                      <Badge variant="outline" className="ml-auto text-[10px]">{CATEGORY_LABEL[t.category]}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
                    <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      <span>mode: {t.config.mode}</span>
                      <span>- ttl: {t.config.ttlMs / 1000}s</span>
                      <span>- {t.config.codeLength} digitos</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {selected && (
            <Card className="bg-gradient-surface p-6">
              <h2 className="text-lg font-semibold">Preview do payload</h2>
              <p className="text-xs text-muted-foreground">Como o BerryProtocol vai entregar:</p>

              <div className="mt-4 rounded-2xl border border-primary/30 bg-card p-4 shadow-card">
                <p className="text-xs text-muted-foreground">{selected.config.texts.header}</p>
                <p className="mt-2 text-sm">{selected.config.texts.body}</p>
                <p className="mt-3 text-3xl font-mono tracking-[0.3em] text-primary-glow">{selected.config.mask}</p>
                {selected.config.texts.footer ? (
                  <p className="mt-3 text-[11px] italic text-muted-foreground">{selected.config.texts.footer}</p>
                ) : null}
                <div className="mt-3 grid gap-1.5">
                  {selected.config.buttons.map((b) => (
                    <button key={b.label} className="rounded-md border border-primary/40 bg-primary/20 px-2 py-1.5 text-xs hover:bg-primary/30">
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>mode: {selected.config.mode}</span>
                  <span>expira em {selected.config.ttlMs / 1000}s</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <Info label="issuer" value={selected.config.issuer} />
                <Info label="appId" value={selected.config.appId} />
                <Info label="tenantId" value={selected.config.tenantId} />
                <Info label="userId" value={selected.config.userIdSource} />
                <Info label="editOnExpire" value={String(selected.config.editOnExpire)} />
                <Info label="autoReplyOnDenied" value={String(selected.config.autoReplyOnDenied)} />
              </div>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Mini({ icon: Icon, label, value, tone }: { icon: typeof KeyRound; label: string; value: React.ReactNode; tone?: "success" | "warning" }) {
  const cls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary-glow";
  return (
    <Card className="bg-gradient-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${cls}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${cls}`}>{value}</p>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/50 px-2 py-1.5 font-mono">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
