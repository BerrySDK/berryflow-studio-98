import { ConversationPreview } from "@/types";
import { Smartphone } from "lucide-react";

export function WhatsAppPreview({ preview }: { preview: ConversationPreview }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-surface shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-card/50">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{preview.contact.name}</p>
          <p className="text-[11px] text-muted-foreground">{preview.contact.phone}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-success">online</span>
      </div>
      <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto bg-[oklch(0.18_0.02_290)]">
        {preview.messages.map(m => {
          const mine = m.from === "user";
          const meta = m.meta as { buttons?: string[]; mode?: string; ttl?: number } | undefined;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-card ${
                mine ? "bg-primary/30 border border-primary/40" : "bg-card border border-border"
              }`}>
                {m.type === "otp" ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Código BerryOTP · {meta?.mode}</p>
                    <p className="text-2xl font-mono tracking-[0.3em] text-primary-glow">{m.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">expira em {meta?.ttl}s</p>
                    <button className="mt-2 w-full rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 px-2 py-1 text-xs">
                      Copiar código
                    </button>
                  </div>
                ) : m.type === "buttons" ? (
                  <div>
                    <p>{m.content}</p>
                    <div className="mt-2 flex flex-col gap-1">
                      {meta?.buttons?.map(b => (
                        <button key={b} className="text-xs rounded-md bg-background/40 hover:bg-background/60 border border-border px-2 py-1">
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
