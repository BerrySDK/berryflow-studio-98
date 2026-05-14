import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings - BerryAPI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <PageHeader title="Settings" description="Workspace, integracoes, credenciais e BerrySDK." />
      <div className="max-w-3xl space-y-6 p-8">
        <Card className="space-y-4 bg-gradient-surface p-6">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><Input defaultValue="BerryAPI" /></Field>
            <Field label="Slug"><Input defaultValue="berry-api" className="font-mono" /></Field>
            <Field label="Tenant ID"><Input defaultValue="tnt_default" className="font-mono" /></Field>
            <Field label="App ID"><Input defaultValue="app_berryapi" className="font-mono" /></Field>
          </div>
        </Card>

        <Card className="space-y-4 bg-gradient-surface p-6">
          <h2 className="text-lg font-semibold">BerrySDK</h2>
          <Field label="Base URL"><Input defaultValue="https://api.berrysdk.com" className="font-mono" /></Field>
          <Field label="API Key"><Input placeholder="brry_xxxxxxxxxx" className="font-mono" /></Field>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">Modo Sandbox</p>
              <p className="text-xs text-muted-foreground">Usar adapters mock no frontend</p>
            </div>
            <Switch defaultChecked />
          </div>
        </Card>

        <div className="flex justify-end"><Button className="bg-gradient-primary shadow-glow">Salvar alteracoes</Button></div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
