import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppShell, PageHeader } from "@/components/AppShell";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sessionService } from "@/services";
import type { Session } from "@/types";
import { toast } from "sonner";
import {
  Link2,
  Loader2,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Sessoes - BerryFlow" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [connectionType, setConnectionType] = useState<Session["connectionType"]>("qr");
  const [phoneNumber, setPhoneNumber] = useState("");

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionService.listSessions(),
    refetchInterval: 3000,
  });

  const connect = useMutation({
    mutationFn: (id: string) => sessionService.connectSession(id),
    onSuccess: () => {
      toast.success("Pareamento iniciado");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao conectar sessao");
    },
  });

  const reconnect = useMutation({
    mutationFn: (id: string) => sessionService.reconnectSession(id),
    onSuccess: () => {
      toast("Reconectando...");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao reconectar sessao");
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => sessionService.disconnectSession(id),
    onSuccess: () => {
      toast.success("Sessao desconectada");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const created = await sessionService.createSession({
        id: sessionId.trim(),
        name: sessionName.trim() || sessionId.trim(),
        connectionType,
        phoneNumber: connectionType === "pairing-code" ? phoneNumber.trim() : undefined,
      });
      await sessionService.connectSession(created.id);
      return created;
    },
    onSuccess: (created) => {
      toast.success(`Sessao ${created.name} criada`);
      setOpen(false);
      setSessionId("");
      setSessionName("");
      setPhoneNumber("");
      setConnectionType("qr");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao criar sessao");
    },
  });

  const activeSessions = useMemo(
    () =>
      (sessions.data ?? []).filter(
        (session) =>
          session.status === "qr_pending" ||
          session.status === "connecting" ||
          Boolean(session.qrCode) ||
          Boolean(session.pairingCode),
      ),
    [sessions.data],
  );

  const connectedCount = (sessions.data ?? []).filter((session) => session.status === "connected").length;

  return (
    <AppShell>
      <PageHeader
        title="Sessoes"
        description="Conexoes BerryProtocol ativas neste workspace."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow">
                <Plus className="mr-1.5 h-4 w-4" />
                Nova sessao
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar sessao</DialogTitle>
                <DialogDescription>
                  Defina o identificador do runtime BerryProtocol e inicie o pareamento.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="session-id">Identificador</Label>
                  <Input
                    id="session-id"
                    value={sessionId}
                    onChange={(event) => setSessionId(event.target.value)}
                    placeholder="ex: loja-sp-01"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="session-name">Nome visivel</Label>
                  <Input
                    id="session-name"
                    value={sessionName}
                    onChange={(event) => setSessionName(event.target.value)}
                    placeholder="ex: Loja Sao Paulo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Metodo de conexao</Label>
                  <Select
                    value={connectionType}
                    onValueChange={(value) => setConnectionType(value as Session["connectionType"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr">QR code</SelectItem>
                      <SelectItem value="pairing-code">Pairing code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {connectionType === "pairing-code" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="phone-number">Numero do WhatsApp</Label>
                    <Input
                      id="phone-number"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="5511999999999"
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe o numero com DDI para o BerryProtocol solicitar o codigo de pareamento.
                    </p>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => create.mutate()}
                  disabled={
                    create.isPending ||
                    !sessionId.trim() ||
                    (connectionType === "pairing-code" && !phoneNumber.trim())
                  }
                  className="bg-gradient-primary shadow-glow"
                >
                  {create.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Criar e conectar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6 p-8">
        <section className="hero-grid magic-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-primary-glow">
                Session control
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-shimmer">
                  Pareamento bonito, leitura rapida e operacao centralizada.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Ligue QR, pairing code e reconexao sem sair do studio, com feedback visual mais claro.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SessionMiniStat label="Total" value={sessions.data?.length ?? 0} />
              <SessionMiniStat label="Online" value={connectedCount} />
              <SessionMiniStat label="Pareando" value={activeSessions.length} />
            </div>
          </div>
        </section>

        {activeSessions.length > 0 ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {activeSessions.map((session) => (
              <ConnectionPanel key={`active_${session.id}`} session={session} />
            ))}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(sessions.data ?? []).map((session) => (
            <Card key={session.id} className="magic-panel rounded-[1.75rem] p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
                  <Smartphone className="h-5 w-5 text-primary-glow" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.phoneNumber ?? "Sem numero pareado"}
                  </p>
                </div>
                <SessionStatusBadge status={session.status} />
              </div>

              <div className="mt-4 space-y-1 text-[11px] text-muted-foreground">
                <p>
                  Sessao: <span className="font-mono text-foreground/90">{session.id}</span>
                </p>
                <p>Conexao: {session.connectionType}</p>
                <p>Ultima atividade: {new Date(session.lastActivityAt).toLocaleString()}</p>
              </div>

              {session.qrCode || session.pairingCode ? (
                <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-xs text-primary-glow">
                  {session.qrCode ? "QR pronto para leitura abaixo." : "Pairing code pronto para uso."}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                {session.status === "disconnected" ? (
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-primary"
                    onClick={() => connect.mutate(session.id)}
                    disabled={connect.isPending}
                  >
                    Conectar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => reconnect.mutate(session.id)}
                      disabled={reconnect.isPending}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Reconectar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => disconnect.mutate(session.id)}
                      disabled={disconnect.isPending}
                    >
                      <Power className="mr-1.5 h-3.5 w-3.5" />
                      Desconectar
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function ConnectionPanel({ session }: { session: Session }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;

    if (!session.qrCode) {
      setQrDataUrl("");
      return;
    }

    void QRCode.toDataURL(session.qrCode, {
      margin: 1,
      width: 240,
      color: { dark: "#8b5cf6", light: "#0b0b12" },
    }).then((value) => {
      if (active) setQrDataUrl(value);
    });

    return () => {
      active = false;
    };
  }, [session.qrCode]);

  return (
    <Card className="magic-panel rounded-[1.75rem] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{session.name}</p>
          <p className="text-xs text-muted-foreground">
            {session.connectionType === "pairing-code"
              ? "Finalize o pareamento usando o codigo abaixo."
              : "Escaneie o QR code no WhatsApp para conectar a sessao."}
          </p>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
        <div className="grid place-items-center rounded-[1.5rem] border border-primary/25 bg-card/80 p-4">
          {session.qrCode ? (
            qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR da sessao ${session.name}`} className="h-60 w-60 rounded-2xl" />
            ) : (
              <div className="grid h-60 w-60 place-items-center rounded-2xl bg-primary/5">
                <Loader2 className="h-6 w-6 animate-spin text-primary-glow" />
              </div>
            )
          ) : (
            <div className="grid h-60 w-60 place-items-center rounded-2xl bg-primary/5 text-center">
              <div>
                <Link2 className="mx-auto h-10 w-10 text-primary-glow" />
                <p className="mt-3 text-2xl font-bold tracking-[0.3em] text-primary-glow">
                  {session.pairingCode ?? "-----"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card/40 p-4">
          <p className="text-sm font-medium">Instrucoes</p>
          {session.connectionType === "pairing-code" ? (
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Abra o WhatsApp no celular.</li>
              <li>2. Entre em aparelhos conectados.</li>
              <li>3. Escolha conectar usando codigo.</li>
              <li>4. Digite o codigo exibido pelo BerryFlow.</li>
            </ol>
          ) : (
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Abra o WhatsApp no celular.</li>
              <li>2. Entre em aparelhos conectados.</li>
              <li>3. Toque em conectar aparelho.</li>
              <li>4. Escaneie o QR code desta tela.</li>
            </ol>
          )}

          <div className="mt-4 rounded-2xl border border-border bg-background/80 p-3 text-xs text-muted-foreground">
            <p>
              Sessao: <span className="font-mono text-foreground">{session.id}</span>
            </p>
            {session.phoneNumber ? (
              <p>
                Numero: <span className="font-mono text-foreground">{session.phoneNumber}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SessionMiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-primary/15 bg-card/45 px-4 py-3 text-center backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-shimmer">{value}</p>
    </div>
  );
}
