import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { flowService } from "@/services";
import type { FlowType } from "@/types";
import { toast } from "sonner";
import { useSelectedSession } from "@/features/session/session-context";

export const Route = createFileRoute("/flows/new")({
  head: () => ({ meta: [{ title: "Novo fluxo - BerryAPI" }] }),
  component: NewFlowPage,
});

function NewFlowPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { selectedSessionId } = useSelectedSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FlowType>("automation");

  const create = useMutation({
    mutationFn: () =>
      flowService.createFlow({
        name: name || "Novo fluxo",
        description,
        type,
        sessionId: selectedSessionId ?? undefined,
      }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["flows", selectedSessionId] });
      toast.success("Fluxo criado");
      nav({ to: "/flows/$id", params: { id: f.id } });
    },
  });

  return (
    <AppShell>
      <PageHeader title="Novo fluxo" description="Configure a automacao base e abra o editor operacional." />
      <div className="max-w-2xl p-8">
        <Card className="space-y-5 bg-gradient-surface p-6">
          <div className="space-y-1.5">
            <Label>Sessao selecionada</Label>
            <div className="rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
              {selectedSessionId ?? "Nenhuma sessao selecionada"}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Atendimento inicial" />
          </div>
          <div className="space-y-1.5">
            <Label>Descricao</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que essa automacao faz?" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as FlowType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automation">Automacao</SelectItem>
                <SelectItem value="otp">OTP</SelectItem>
                <SelectItem value="campaign">Campanha</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => nav({ to: "/flows" })}>Cancelar</Button>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !selectedSessionId}
              className="bg-gradient-primary shadow-glow"
            >
              {create.isPending ? "Criando..." : "Criar e abrir editor"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
