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
  head: () => ({ meta: [{ title: "BerryOTP — BerryFlow" }] }),
  component: OtpPage,
});

const CATEGORY_LABEL = {
  login: "Login",
  verification: "Verificação",
  recovery: "Recuperação",
  approval: "Aprovação",
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
        description="Templates, configuração avançada e preview do payload OTP."
        actions={<Button className="bg-gradient-primary shadow-glow"><Sparkles className="h-4 w-4 mr-1.5" /> Criar fluxo OTP</Button>}
      />
      <div className="p-8 space-y-6">
        <section className="grid sm:grid-cols-3 gap-3">
          <Mini icon={Send} label="OTPs hoje" value={metrics.data?.sentToday.toLocaleString() ?? "—"} />
          <Mini icon={ShieldCheck} label="Taxa de uso" value={metrics.data ? `${Math.round(metrics.data.usageRate*100)}%` : "—"} tone="success" />
          <Mini icon={ShieldAlert} label="Taxa de expiração" value={metrics.data ? `${Math.round(metrics.data.expirationRate*100)}%` : "—"} tone="warning" />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-gradient-surface">
            <h2 className="text-lg font-semibold mb-4">Templates prontos</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(templates.data ?? []).map(t => {
                const isActive = selected?.id === t.id;
                return (
                  <button key={t.id} onClick={() => setActive(t)}
                    className={`text-left p-4 rounded-xl border bg-card/40 transition-all ${isActive ? "border-primary/60 shadow-glow bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary-glow" />
                      <p className="font-semibold">{t.name}</p>
                      <Badge variant="outline" className="ml-auto text-[10px]">{CATEGORY_LABEL[t.category]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{t.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span>mode: {t.config.mode}</span>
                      <span>· ttl: {t.config.ttlMs / 1000}s</span>
                      <span>· {t.config.codeLength} dígitos</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {selected && (
            <Card className="p-6 bg-gradient-surface">
              <h2 className="text-lg font-semibold">Preview do payload</h2>
              <p className="text-xs text-muted-foreground">Como o BerryProtocol vai entregar:</p>

              <div className="mt-4 rounded-2xl border border-primary/30 bg-card p-4 shadow-card">
                <p className="text-xs text-muted-foreground">{selected.config.texts.header}</p>
                <p className="mt-2 text-sm">{selected.config.texts.body}</p>
                <p className="mt-3 text-3xl font-mono tracking-[0.3em] text-primary-glow">{selected.config.mask}</p>
                {selected.config.texts.footer && <p className="text-[11px] text-muted-foreground mt-3 italic">{selected.config.texts.footer}</p>}
                <div className="mt-3 grid gap-1.5">
                  {selected.config.buttons.map(b => (
                    <button key={b.label} className="rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 px-2 py-1.5 text-xs">
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
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
    <Card className="p-4 bg-gradient-surface">
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
    <div className="rounded-md bg-card/50 border border-border px-2 py-1.5 font-mono">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
