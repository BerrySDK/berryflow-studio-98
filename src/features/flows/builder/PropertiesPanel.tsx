import { useBuilderStore } from "../builder-store";
import { NODE_BY_KIND } from "../node-catalog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function PropertiesPanel() {
  const flow = useBuilderStore(s => s.flow);
  const id = useBuilderStore(s => s.selectedNodeId);
  const update = useBuilderStore(s => s.updateNodeConfig);
  const node = flow?.nodes.find(n => n.id === id) ?? null;

  if (!node) {
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-sidebar/60 backdrop-blur p-4">
        <p className="text-sm text-muted-foreground">Selecione um nó para editar suas propriedades.</p>
      </aside>
    );
  }

  const def = NODE_BY_KIND[node.data.kind];
  const cfg = (node.data.config ?? {}) as Record<string, unknown>;

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-sidebar/60 backdrop-blur flex flex-col">
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px]">{node.data.category}</Badge>
          <p className="text-xs text-muted-foreground">{node.id}</p>
        </div>
        <h3 className="text-base font-semibold">{node.data.label}</h3>
        <p className="text-xs text-muted-foreground">{def?.description}</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {node.data.kind === "send-text" && (
            <Field label="Texto da mensagem">
              <Textarea rows={4} value={(cfg.text as string) ?? ""} onChange={(e) => update(node.id, { text: e.target.value })} />
            </Field>
          )}
          {node.data.kind === "send-buttons" && (
            <>
              <Field label="Texto"><Textarea rows={3} value={(cfg.text as string) ?? ""} onChange={(e) => update(node.id, { text: e.target.value })} /></Field>
              <Field label="Botões (vírgula)">
                <Input value={((cfg.buttons as string[]) ?? []).join(", ")}
                  onChange={(e) => update(node.id, { buttons: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
              </Field>
            </>
          )}
          {node.data.kind === "delay" && (
            <Field label="Aguardar (ms)">
              <Input type="number" value={(cfg.ms as number) ?? 1000} onChange={(e) => update(node.id, { ms: Number(e.target.value) })} />
            </Field>
          )}
          {node.data.kind === "match-text" && (
            <Field label="Padrão"><Input value={(cfg.match as string) ?? ""} onChange={(e) => update(node.id, { match: e.target.value })} /></Field>
          )}

          {/* OTP-specific */}
          {(node.data.kind === "generate-otp" || node.data.kind === "send-otp" || node.data.kind === "create-login-flow") && (
            <>
              <Field label="Issuer"><Input value={(cfg.issuer as string) ?? "BerryProtocol"} onChange={(e) => update(node.id, { issuer: e.target.value })} /></Field>
              <Field label="Tamanho do código">
                <Input type="number" min={4} max={10} value={(cfg.length as number) ?? 6} onChange={(e) => update(node.id, { length: Number(e.target.value) })} />
              </Field>
              <Field label="TTL (ms)">
                <Input type="number" value={(cfg.ttlMs as number) ?? 120000} onChange={(e) => update(node.id, { ttlMs: Number(e.target.value) })} />
              </Field>
              <Field label="Modo">
                <Select value={(cfg.mode as string) ?? "copy-code"} onValueChange={(v) => update(node.id, { mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">stable</SelectItem>
                    <SelectItem value="copy-code">copy-code</SelectItem>
                    <SelectItem value="experimental-copy-code">experimental-copy-code</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Máscara visual"><Input value={(cfg.mask as string) ?? "•••-•••"} onChange={(e) => update(node.id, { mask: e.target.value })} /></Field>
              <Field label="Editar mensagem ao expirar" inline>
                <Switch checked={Boolean(cfg.editOnExpire ?? true)} onCheckedChange={(v) => update(node.id, { editOnExpire: v })} />
              </Field>
              <Field label="Auto-resposta em denied" inline>
                <Switch checked={Boolean(cfg.autoReplyOnDenied ?? true)} onCheckedChange={(v) => update(node.id, { autoReplyOnDenied: v })} />
              </Field>
              <Field label="userId source">
                <Select value={(cfg.userIdSource as string) ?? "phone"} onValueChange={(v) => update(node.id, { userIdSource: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">phone</SelectItem>
                    <SelectItem value="email">email</SelectItem>
                    <SelectItem value="external_id">external_id</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="tenantId"><Input value={(cfg.tenantId as string) ?? "tnt_default"} onChange={(e) => update(node.id, { tenantId: e.target.value })} /></Field>
              <Field label="appId"><Input value={(cfg.appId as string) ?? "app_berryflow"} onChange={(e) => update(node.id, { appId: e.target.value })} /></Field>
            </>
          )}

          {node.data.kind === "ai-label-message" && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary-glow">
              AI label aplica-se apenas em conversas de chat privado.
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function Field({ label, children, inline }: { label: string; children: React.ReactNode; inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {children}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
