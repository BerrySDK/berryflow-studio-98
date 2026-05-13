import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { templateService, flowService } from "@/services";
import { LayoutTemplate, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { FlowTemplate } from "@/types";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — BerryFlow" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: () => templateService.listTemplates() });

  const useTpl = useMutation({
    mutationFn: async (t: FlowTemplate) => flowService.createFlow({
      name: t.name,
      description: t.description,
      type: t.flow.type,
      trigger: t.flow.trigger,
      tags: t.flow.tags,
      nodes: t.flow.nodes,
      edges: t.flow.edges,
    }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Template importado");
      nav({ to: "/flows/$id", params: { id: f.id } });
    },
  });

  return (
    <AppShell>
      <PageHeader title="Templates" description="Galeria de fluxos prontos para começar em segundos." />
      <div className="p-8 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(templates.data ?? []).map(t => (
          <Card key={t.id} className="p-5 bg-gradient-surface flex flex-col">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-md bg-primary/10 ring-1 ring-primary/30 grid place-items-center">
                <LayoutTemplate className="h-4 w-4 text-primary-glow" />
              </div>
              <p className="font-semibold">{t.name}</p>
              <Badge variant="outline" className="ml-auto text-[10px]">{t.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t.description}</p>
            <p className="text-[11px] text-muted-foreground mt-2 italic">"{t.preview}"</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{t.flow.nodes.length} nós</span>
              <Button size="sm" onClick={() => useTpl.mutate(t)} className="bg-gradient-primary shadow-glow">
                Usar template <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
