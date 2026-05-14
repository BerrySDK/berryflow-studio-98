import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Play,
  Save,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlowStatusBadge } from "@/components/StatusBadge";
import { NodePalette } from "@/features/flows/builder/NodePalette";
import { FlowCanvas } from "@/features/flows/builder/FlowCanvas";
import { PropertiesPanel } from "@/features/flows/builder/PropertiesPanel";
import { useBuilderStore } from "@/features/flows/builder-store";
import { WhatsAppPreview } from "@/features/flows/preview/WhatsAppPreview";
import { useSelectedSession } from "@/features/session/session-context";
import { executionService, flowService } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/flows/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Editor - BerryAPI" }] }),
  component: FlowBuilderPage,
});

function FlowBuilderPage() {
  const { id } = useParams({ from: "/flows/$id" });
  const queryClient = useQueryClient();
  const { selectedSessionId } = useSelectedSession();
  const setFlow = useBuilderStore((state) => state.setFlow);
  const clearFlow = useBuilderStore((state) => state.clearFlow);
  const flowState = useBuilderStore((state) => state.flow);
  const validate = useBuilderStore((state) => state.validate);
  const [showPreview, setShowPreview] = useState(false);
  const [testTo, setTestTo] = useState("");

  const flow = useQuery({
    queryKey: ["flow", id, selectedSessionId],
    queryFn: () => flowService.getFlow(id, selectedSessionId ?? undefined),
  });
  const preview = useQuery({
    queryKey: ["preview", id],
    queryFn: () => executionService.getPreviewState(id),
    enabled: showPreview,
  });
  const logs = useQuery({
    queryKey: ["logs", id],
    queryFn: () => executionService.getExecutionLogs(id),
  });

  useEffect(() => {
    if (flow.data) {
      setFlow(flow.data);
      return;
    }
    if (!flow.isLoading) {
      clearFlow();
    }
  }, [clearFlow, flow.data, flow.isLoading, setFlow]);

  const save = useMutation({
    mutationFn: () =>
      flowService.updateFlow(id, {
        nodes: flowState!.nodes,
        edges: flowState!.edges,
        sessionId: selectedSessionId ?? flowState?.sessionId,
      }),
    onSuccess: () => {
      toast.success("Rascunho salvo");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      queryClient.invalidateQueries({ queryKey: ["flow", id] });
    },
  });

  const publish = useMutation({
    mutationFn: () => flowService.publishFlow(id),
    onSuccess: () => {
      toast.success("Fluxo publicado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      queryClient.invalidateQueries({ queryKey: ["flow", id] });
    },
  });

  const simulate = useMutation({
    mutationFn: () =>
      executionService.simulateFlow(id, {
        trigger: "On Message Received",
        payload: testTo.trim() ? { to: testTo.trim() } : undefined,
        sessionId: selectedSessionId ?? flowState?.sessionId,
      }),
    onSuccess: () => {
      toast.success(testTo.trim() ? "Execucao concluida" : "Simulacao concluida");
      queryClient.invalidateQueries({ queryKey: ["logs", id] });
    },
  });

  if (!flowState && flow.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Carregando editor...
      </div>
    );
  }

  if (!flowState || flowState.id !== id || !flow.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Fluxo indisponivel</h1>
          <p className="text-sm text-muted-foreground">
            Esse fluxo nao pertence a sessao selecionada ou nao foi encontrado.
          </p>
          <Button asChild variant="outline">
            <Link to="/flows">Voltar para fluxos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const errors = validate();

  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card/40 px-5 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/flows">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight">{flowState.name}</h1>
              <FlowStatusBadge status={flowState.status} />
              <Badge variant="outline" className="text-[10px] font-mono">
                v{flowState.version.version}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">/{flowState.slug}</span>
              <span>- {flowState.trigger}</span>
              {flowState.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {errors.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errors.length} aviso{errors.length > 1 ? "s" : ""}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Fluxo valido
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              placeholder="5511999999999@s.whatsapp.net"
              className="h-8 w-60 text-xs"
            />
            <Button variant="outline" size="sm" onClick={() => setShowPreview((value) => !value)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              {showPreview ? "Ocultar" : "Preview"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => simulate.mutate()}
              disabled={simulate.isPending}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {testTo.trim() ? "Executar" : "Simular"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Salvar
            </Button>
            <Button
              size="sm"
              onClick={() => publish.mutate()}
              disabled={publish.isPending}
              className="bg-gradient-primary shadow-glow"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Publicar
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <NodePalette
            onAdd={(kind) =>
              useBuilderStore
                .getState()
                .addNode(kind, { x: 220 + Math.random() * 200, y: 140 + Math.random() * 120 })
            }
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <FlowCanvas />
            {errors.length > 0 ? (
              <div className="flex items-center gap-2 border-t border-border bg-warning/5 px-4 py-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errors.join(" - ")}
              </div>
            ) : null}
          </div>

          {showPreview ? (
            <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-sidebar/60 backdrop-blur">
              <Tabs defaultValue="conv" className="flex flex-1 flex-col">
                <TabsList className="m-3 grid grid-cols-2">
                  <TabsTrigger value="conv">Conversa</TabsTrigger>
                  <TabsTrigger value="logs">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="conv" className="flex-1 overflow-y-auto px-4 pb-4">
                  {preview.data ? <WhatsAppPreview preview={preview.data} /> : null}
                </TabsContent>

                <TabsContent value="logs" className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                  {(logs.data ?? []).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border bg-card/60 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.nodeLabel}</span>
                        <Badge
                          variant="outline"
                          className={
                            log.status === "ok"
                              ? "border-success/30 text-success"
                              : "border-destructive/30 text-destructive"
                          }
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {log.durationMs} ms - {new Date(log.ts).toLocaleTimeString()}
                      </p>
                      {log.message ? <p className="mt-1 text-muted-foreground">{log.message}</p> : null}
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
