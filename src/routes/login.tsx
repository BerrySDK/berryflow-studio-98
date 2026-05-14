import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md space-y-5 bg-gradient-surface p-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-glow">BerrySDK</p>
          <h1 className="text-3xl font-bold tracking-tight">BerryFlow</h1>
          <p className="text-sm text-muted-foreground">
            Entre para gerenciar fluxos, sessoes e OTPs por sessao.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button
          className="w-full bg-gradient-primary shadow-glow"
          onClick={() => auth.mutate()}
          disabled={auth.isPending || !email.trim() || !password.trim()}
        >
          {auth.isPending ? "Entrando..." : "Entrar"}
        </Button>

        <div className="rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Acesso inicial</p>
          <p>Email: <span className="font-mono">admin@berrysdk.local</span></p>
          <p>Senha: <span className="font-mono">berryflow123</span></p>
        </div>
      </Card>
    </div>
  );
}
