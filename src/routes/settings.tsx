import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — BerryFlow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <PageHeader title="Settings" description="Workspace, integrações e BerrySDK." />
      <div className="p-8 max-w-3xl space-y-6">
        <Card className="p-6 bg-gradient-surface space-y-4">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome"><Input defaultValue="Berry Studio" /></Field>
            <Field label="Slug"><Input defaultValue="berry-studio" className="font-mono" /></Field>
            <Field label="Tenant ID"><Input defaultValue="tnt_default" className="font-mono" /></Field>
            <Field label="App ID"><Input defaultValue="app_berryflow" className="font-mono" /></Field>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-surface space-y-4">
          <h2 className="text-lg font-semibold">BerrySDK</h2>
          <Field label="Base URL"><Input defaultValue="https://api.berrysdk.com" className="font-mono" /></Field>
          <Field label="API Key"><Input placeholder="brry_••••••••" className="font-mono" /></Field>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">Modo Sandbox</p>
              <p className="text-xs text-muted-foreground">Usar adapters mock no frontend</p>
            </div>
            <Switch defaultChecked />
          </div>
        </Card>

        <div className="flex justify-end"><Button className="bg-gradient-primary shadow-glow">Salvar alterações</Button></div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
