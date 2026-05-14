import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Workflow,
  KeyRound,
  Smartphone,
  LayoutTemplate,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionService } from "@/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedSession } from "@/features/session/session-context";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/flows", label: "Fluxos", icon: Workflow },
  { to: "/otp", label: "BerryOTP", icon: KeyRound },
  { to: "/sessions", label: "Sessoes", icon: Smartphone },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { selectedSessionId, setSelectedSessionId, hydrated } = useSelectedSession();
  const { user, logout } = useAuth();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => sessionService.listSessions() });

  const currentSession =
    sessions.data?.find((session) => session.id === selectedSessionId) ?? sessions.data?.[0] ?? null;

  useEffect(() => {
    if (hydrated && !selectedSessionId && currentSession) {
      setSelectedSessionId(currentSession.id);
    }
  }, [currentSession, hydrated, selectedSessionId, setSelectedSessionId]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">BerryFlow</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">by BerrySDK</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/dashboard" && path.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary-glow")} />
                <span>{label}</span>
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-glow shadow-glow" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg border border-border bg-gradient-surface p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sessao ativa</p>
            <div className="mt-2 space-y-2">
              <Select
                value={currentSession?.id ?? ""}
                onValueChange={(value) => setSelectedSessionId(value || null)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione uma sessao" />
                </SelectTrigger>
                <SelectContent>
                  {(sessions.data ?? []).map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {currentSession
                  ? `${currentSession.connectionType} · ${currentSession.status}`
                  : "Nenhuma sessao selecionada"}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-gradient-surface p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Conta</p>
            <p className="mt-1 text-sm font-semibold">{user?.name ?? "Berry User"}</p>
            <p className="text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-glow px-8 py-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
