import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Workflow, KeyRound, Smartphone, LayoutTemplate, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/flows", label: "Fluxos", icon: Workflow },
  { to: "/otp", label: "BerryOTP", icon: KeyRound },
  { to: "/sessions", label: "Sessões", icon: Smartphone },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar/70 backdrop-blur flex flex-col">
        <div className="px-4 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">BerryFlow</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">by BerrySDK</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/dashboard" && path.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary-glow")} />
                <span>{label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-glow shadow-glow" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-lg p-3 bg-gradient-surface border border-border">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Workspace</p>
            <p className="text-sm font-semibold mt-0.5">Berry Studio</p>
            <p className="text-[11px] text-muted-foreground">Plano Pro · 4 fluxos</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="px-8 py-6 border-b border-border bg-glow">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
