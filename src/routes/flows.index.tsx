import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Archive,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Workflow,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { FlowStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedSession } from "@/features/session/session-context";
import { flowService } from "@/services";
import type { FlowStatus, FlowType } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/flows/")({
  head: () => ({ meta: [{ title: "Fluxos - BerryFlow" }] }),
  component: FlowsPage,
});

function FlowsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedSessionId } = useSelectedSession();
  const flows = useQuery({
    queryKey: ["flows", selectedSessionId],
    queryFn: () => flowService.listFlows(selectedSessionId ?? undefined),
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | FlowStatus>("all");
  const [type, setType] = useState<"all" | FlowType>("all");

  const filtered = useMemo(() => {
    return (flows.data ?? []).filter((flow) => {
      const matchesStatus = status === "all" || flow.status === status;
      const matchesType = type === "all" || flow.type === type;
      const haystack = `${flow.name} ${flow.description ?? ""}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesStatus && matchesType && matchesQuery;
    });
  }, [flows.data, query, status, type]);

  const duplicate = useMutation({
    mutationFn: (id: string) => flowService.duplicateFlow(id),
    onSuccess: () => {
      toast.success("Fluxo duplicado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => flowService.archiveFlow(id),
    onSuccess: () => {
      toast.success("Fluxo arquivado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const publish = useMutation({
    mutationFn: (id: string) => flowService.publishFlow(id),
    onSuccess: () => {
      toast.success("Fluxo publicado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const totalFlows = flows.data?.length ?? 0;
  const activeFlows = (flows.data ?? []).filter((flow) => flow.status === "active").length;
  const draftFlows = (flows.data ?? []).filter((flow) => flow.status === "draft").length;

  return (
    <AppShell>
      <PageHeader
        title="Fluxos"
        description={
          selectedSessionId
            ? `Gerencie os fluxos conectados a sessao ${selectedSessionId}.`
            : "Selecione uma sessao para abrir a biblioteca de fluxos."
        }
        actions={
          <Button onClick={() => navigate({ to: "/flows/new" })} className="bg-gradient-primary shadow-glow">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo fluxo
          </Button>
        }
      />

      <div className="space-y-5 p-8">
        <section className="hero-grid magic-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-primary-glow">
                Flow library
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-shimmer">
                  Fluxos desenhados para operar com BerryProtocol.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Explore automacoes, campanhas, rotinas de AI label e jornadas BerryOTP com visual mais refinado.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Total" value={totalFlows} />
              <MiniStat label="Ativos" value={activeFlows} />
              <MiniStat label="Rascunhos" value={draftFlows} />
            </div>
          </div>
        </section>

        {!selectedSessionId ? (
          <Card className="magic-panel rounded-[1.75rem] p-5">
            <p className="text-sm text-muted-foreground">
              Escolha uma sessao na lateral antes de criar ou editar fluxos.
            </p>
          </Card>
        ) : null}

        <Card className="magic-panel rounded-[1.5rem] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome ou descricao..."
                className="pl-8"
              />
            </div>

            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="automation">Automacao</SelectItem>
                <SelectItem value="otp">OTP</SelectItem>
                <SelectItem value="campaign">Campanha</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((flow) => (
            <Card
              key={flow.id}
              className="magic-panel group rounded-[1.75rem] p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                  <Workflow className="h-5 w-5 text-primary-glow" />
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    to="/flows/$id"
                    params={{ id: flow.id }}
                    className="block truncate text-base font-semibold transition-colors hover:text-primary-glow"
                  >
                    {flow.name}
                  </Link>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{flow.description}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate({ to: "/flows/$id", params: { id: flow.id } })}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate.mutate(flow.id)}>
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => publish.mutate(flow.id)}>
                      <Power className="mr-2 h-3.5 w-3.5" />
                      {flow.status === "active" ? "Republicar" : "Publicar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => archive.mutate(flow.id)}>
                      <Archive className="mr-2 h-3.5 w-3.5" />
                      Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <FlowStatusBadge status={flow.status} />
                <span className="text-[11px] text-muted-foreground">- {flow.trigger}</span>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {flow.nodeCount} nos - v{flow.version.version}
                </span>
                <span>{new Date(flow.updatedAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}

          {!flows.isLoading && filtered.length === 0 ? (
            <Card className="magic-panel col-span-full rounded-[1.75rem] p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum fluxo encontrado.</p>
              <Button asChild className="mt-4 bg-gradient-primary">
                <Link to="/flows/new">Criar o primeiro fluxo</Link>
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-primary/15 bg-card/45 px-4 py-3 text-center backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-shimmer">{value}</p>
    </div>
  );
}
