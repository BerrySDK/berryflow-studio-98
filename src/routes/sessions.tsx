import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sessionService } from "@/services";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { Smartphone, QrCode, RefreshCw, Power, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Sessões — BerryFlow" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => sessionService.listSessions() });

  const conn = useMutation({ mutationFn: (id: string) => sessionService.connectSession(id), onSuccess: () => { toast.success("Iniciando pareamento"); qc.invalidateQueries({ queryKey: ["sessions"] }); } });
  const reconn = useMutation({ mutationFn: (id: string) => sessionService.reconnectSession(id), onSuccess: () => { toast("Reconectando…"); qc.invalidateQueries({ queryKey: ["sessions"] }); } });
  const disc = useMutation({ mutationFn: (id: string) => sessionService.disconnectSession(id), onSuccess: () => { toast.success("Sessão desconectada"); qc.invalidateQueries({ queryKey: ["sessions"] }); } });

  return (
    <AppShell>
      <PageHeader
        title="Sessões"
        description="Conexões BerryProtocol ativas neste workspace."
        actions={<Button className="bg-gradient-primary shadow-glow"><Plus className="h-4 w-4 mr-1.5" /> Nova sessão</Button>}
      />
      <div className="p-8 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(sessions.data ?? []).map(s => (
          <Card key={s.id} className="p-5 bg-gradient-surface">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-primary/10 ring-1 ring-primary/30 grid place-items-center">
                <Smartphone className="h-5 w-5 text-primary-glow" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.phoneNumber ?? "Sem número pareado"}</p>
              </div>
              <SessionStatusBadge status={s.status} />
            </div>

            <div className="mt-4 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Conexão: {s.connectionType}</span>
              <span>Última: {new Date(s.lastActivityAt).toLocaleTimeString()}</span>
            </div>

            {s.status === "qr_pending" && (
              <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4 grid place-items-center">
                <QrCode className="h-20 w-20 text-primary-glow" />
                <p className="text-[11px] text-muted-foreground mt-2">Escaneie no WhatsApp</p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {s.status === "disconnected" ? (
                <Button size="sm" className="flex-1 bg-gradient-primary" onClick={() => conn.mutate(s.id)}>Conectar</Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => reconn.mutate(s.id)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reconectar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => disc.mutate(s.id)}>
                    <Power className="h-3.5 w-3.5 mr-1.5" /> Desconectar
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
