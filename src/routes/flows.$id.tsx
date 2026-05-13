import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { flowService, executionService } from "@/services";
import { useBuilderStore } from "@/features/flows/builder-store";
import { NodePalette } from "@/features/flows/builder/NodePalette";
import { FlowCanvas } from "@/features/flows/builder/FlowCanvas";
import { PropertiesPanel } from "@/features/flows/builder/PropertiesPanel";
import { WhatsAppPreview } from "@/features/flows/preview/WhatsAppPreview";
import { FlowStatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Save, Send, Play, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/flows/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Builder — BerryFlow" }] }),
  component: FlowBuilderPage,
});

function FlowBuilderPage() {
  const { id } = useParams({ from: "/flows/$id" });
  const qc = useQueryClient();
  const setFlow = useBuilderStore(s => s.setFlow);
  const flowState = useBuilderStore(s => s.flow);
  const validate = useBuilderStore(s => s.validate);
  const [showPreview, setShowPreview] = useState(false);

  const flow = useQuery({ queryKey: ["flow", id], queryFn: () => flowService.getFlow(id) });
  const preview = useQuery({ queryKey: ["preview", id], queryFn: () => executionService.getPreviewState(id), enabled: showPreview });
  const logs = useQuery({ queryKey: ["logs", id], queryFn: () => executionService.getExecutionLogs(id) });

  useEffect(() => { if (flow.data) setFlow(flow.data); }, [flow.data, setFlow]);

  const save = useMutation({
    mutationFn: () => flowService.updateFlow(id, { nodes: flowState!.nodes, edges: flowState!.edges }),
    onSuccess: () => { toast.success("Rascunho salvo"); qc.invalidateQueries({ queryKey: ["flows"] }); },
  });
  const publish = useMutation({
    mutationFn: () => flowService.publishFlow(id),
    onSuccess: () => { toast.success("Fluxo publicado"); qc.invalidateQueries({ queryKey: ["flows"] }); qc.invalidateQueries({ queryKey: ["flow", id] }); },
  });
  const simulate = useMutation({
    mutationFn: () => executionService.simulateFlow(id, { trigger: "On Message Received" }),
    onSuccess: () => { toast.success("Simulação concluída"); qc.invalidateQueries({ queryKey: ["logs", id] }); },
  });

  if (!flowState) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando builder…</div>;
  }

  const errors = validate();

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="px-5 py-3 border-b border-border flex items-center gap-3 bg-card/40 backdrop-blur">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8"><Link to="/flows"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight truncate">{flowState.name}</h1>
              <FlowStatusBadge status={flowState.status} />
              <Badge variant="outline" className="text-[10px] font-mono">v{flowState.version.version}</Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">/{flowState.slug}</span>
              <span>· {flowState.trigger}</span>
              {flowState.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          </div>
          {errors.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> {errors.length} aviso{errors.length > 1 ? "s" : ""}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Fluxo válido
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(v => !v)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> {showPreview ? "Ocultar" : "Preview"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => simulate.mutate()} disabled={simulate.isPending}>
              <Play className="h-3.5 w-3.5 mr-1.5" /> Testar
            </Button>
            <Button variant="outline" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
            </Button>
            <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending} className="bg-gradient-primary shadow-glow">
              <Send className="h-3.5 w-3.5 mr-1.5" /> Publicar
            </Button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <NodePalette onAdd={(k) => useBuilderStore.getState().addNode(k, { x: 220 + Math.random()*200, y: 140 + Math.random()*120 })} />
          <div className="flex-1 flex flex-col min-w-0">
            <FlowCanvas />
            {errors.length > 0 && (
              <div className="border-t border-border bg-warning/5 px-4 py-2 text-xs text-warning flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errors.join(" · ")}
              </div>
            )}
          </div>
          {showPreview ? (
            <aside className="w-96 shrink-0 border-l border-border bg-sidebar/60 backdrop-blur flex flex-col">
              <Tabs defaultValue="conv" className="flex-1 flex flex-col">
                <TabsList className="m-3 grid grid-cols-2">
                  <TabsTrigger value="conv">Conversa</TabsTrigger>
                  <TabsTrigger value="logs">Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="conv" className="flex-1 px-4 pb-4 overflow-y-auto">
                  {preview.data && <WhatsAppPreview preview={preview.data} />}
                </TabsContent>
                <TabsContent value="logs" className="flex-1 px-4 pb-4 overflow-y-auto space-y-2">
                  {(logs.data ?? []).map(l => (
                    <div key={l.id} className="p-3 rounded-lg border border-border bg-card/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{l.nodeLabel}</span>
                        <Badge variant="outline" className={l.status === "ok" ? "text-success border-success/30" : "text-destructive border-destructive/30"}>
                          {l.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{l.durationMs} ms · {new Date(l.ts).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </aside>
          ) : (
            <PropertiesPanel />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
