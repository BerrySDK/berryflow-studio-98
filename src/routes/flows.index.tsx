import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FlowStatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { flowService } from "@/services";
import { Workflow, Search, MoreHorizontal, Copy, Archive, Power, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { FlowStatus, FlowType } from "@/types";

export const Route = createFileRoute("/flows/")({
  head: () => ({ meta: [{ title: "Fluxos — BerryFlow" }] }),
  component: FlowsPage,
});

function FlowsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const flows = useQuery({ queryKey: ["flows"], queryFn: () => flowService.listFlows() });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | FlowStatus>("all");
  const [type, setType] = useState<"all" | FlowType>("all");

  const filtered = useMemo(() => {
    return (flows.data ?? []).filter(f =>
      (status === "all" || f.status === status) &&
      (type === "all" || f.type === type) &&
      (f.name.toLowerCase().includes(q.toLowerCase()) || (f.description ?? "").toLowerCase().includes(q.toLowerCase()))
    );
  }, [flows.data, q, status, type]);

  const dup = useMutation({
    mutationFn: (id: string) => flowService.duplicateFlow(id),
    onSuccess: () => { toast.success("Fluxo duplicado"); qc.invalidateQueries({ queryKey: ["flows"] }); },
  });
  const arch = useMutation({
    mutationFn: (id: string) => flowService.archiveFlow(id),
    onSuccess: () => { toast.success("Fluxo arquivado"); qc.invalidateQueries({ queryKey: ["flows"] }); },
  });
  const pub = useMutation({
    mutationFn: (id: string) => flowService.publishFlow(id),
    onSuccess: () => { toast.success("Fluxo publicado"); qc.invalidateQueries({ queryKey: ["flows"] }); },
  });

  return (
    <AppShell>
      <PageHeader
        title="Fluxos"
        description="Gerencie todas as automações conversacionais do workspace."
        actions={
          <Button onClick={() => nav({ to: "/flows/new" })} className="bg-gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-1.5" /> Novo fluxo
          </Button>
        }
      />
      <div className="p-8 space-y-5">
        <Card className="p-3 flex flex-wrap gap-2 items-center bg-gradient-surface">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou descrição…" className="pl-8" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="automation">Automação</SelectItem>
              <SelectItem value="otp">OTP</SelectItem>
              <SelectItem value="campaign">Campanha</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(f => (
            <Card key={f.id} className="p-5 bg-gradient-surface hover:shadow-glow hover:border-primary/40 transition-all group">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 ring-1 ring-primary/30 grid place-items-center">
                  <Workflow className="h-5 w-5 text-primary-glow" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/flows/$id" params={{ id: f.id }} className="text-base font-semibold hover:text-primary-glow truncate block">
                    {f.name}
                  </Link>
                  <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => nav({ to: "/flows/$id", params: { id: f.id } })}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => dup.mutate(f.id)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => pub.mutate(f.id)}><Power className="h-3.5 w-3.5 mr-2" /> {f.status === "active" ? "Republicar" : "Publicar"}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => arch.mutate(f.id)}><Archive className="h-3.5 w-3.5 mr-2" /> Arquivar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <FlowStatusBadge status={f.status} />
                <span className="text-[11px] text-muted-foreground">· {f.trigger}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{f.nodeCount} nós · v{f.version.version}</span>
                <span>{new Date(f.updatedAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
          {!flows.isLoading && filtered.length === 0 && (
            <Card className="p-10 text-center col-span-full bg-gradient-surface">
              <p className="text-sm text-muted-foreground">Nenhum fluxo encontrado.</p>
              <Button asChild className="mt-4 bg-gradient-primary"><Link to="/flows/new">Criar o primeiro fluxo</Link></Button>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
