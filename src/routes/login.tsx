import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Workflow, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { useAuth } from "@/features/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login - BerryFlow" }] }),
});

function LoginPage() {
  const { hydrated, user, login } = useAuth();
  const [email, setEmail] = useState("admin@berrysdk.local");
  const [password, setPassword] = useState("berryflow123");

  const auth = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: (result) => {
      login(result);
      toast.success(`Bem-vindo, ${result.name}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao autenticar");
    },
  });

  if (!hydrated) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Carregando...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="hero-orb hero-orb-primary left-12 top-16 h-64 w-64" />
      <div className="hero-orb hero-orb-secondary bottom-8 right-12 h-72 w-72" />
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr,0.85fr]">
        <section className="hero-grid magic-panel hidden min-h-[640px] rounded-[2rem] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              BerrySDK Studio
            </div>
            <div className="max-w-2xl space-y-4">
              <h1 className="text-5xl font-bold tracking-tight text-shimmer">
                Construa jornadas de WhatsApp com cara de produto premium.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                BerryFlow organiza sessoes, fluxos, AI label e BerryOTP em um unico cockpit visual.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeaturePill
              icon={Workflow}
              title="Fluxos por sessao"
              description="Cada ambiente com dashboard, execucao e builder isolados."
            />
            <FeaturePill
              icon={ShieldCheck}
              title="BerryOTP embutido"
              description="Templates de login e verificacao prontos para virar runtime real."
            />
            <FeaturePill
              icon={Sparkles}
              title="UX estilo Magic UI"
              description="Gradientes, glow e superficies com aparencia de SaaS moderno."
            />
          </div>
        </section>

        <Card className="magic-panel w-full max-w-xl justify-self-center rounded-[2rem] p-8">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-glow">BerrySDK</p>
            <h1 className="text-4xl font-bold tracking-tight text-shimmer">BerryFlow</h1>
            <p className="text-sm text-muted-foreground">
              Entre para gerenciar fluxos, sessoes e OTPs por sessao.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-2xl"
              />
            </div>

            <Button
              className="h-12 w-full rounded-2xl bg-gradient-primary shadow-glow"
              onClick={() => auth.mutate()}
              disabled={auth.isPending || !email.trim() || !password.trim()}
            >
              {auth.isPending ? "Entrando..." : "Entrar no studio"}
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Acesso inicial</p>
            <p>Email: <span className="font-mono">admin@berrysdk.local</span></p>
            <p>Senha: <span className="font-mono">berryflow123</span></p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FeaturePill({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Workflow;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-primary/15 bg-card/45 p-4 backdrop-blur">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
        <Icon className="h-4 w-4 text-primary-glow" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
