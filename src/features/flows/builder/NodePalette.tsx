import { useState } from "react";
import { NODE_CATEGORIES, NODES, CATEGORY_TONE } from "../node-catalog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowNodeKind } from "@/types";

export function NodePalette({ onAdd }: { onAdd: (k: FlowNodeKind) => void }) {
  const [q, setQ] = useState("");
  const filtered = NODES.filter(n =>
    n.label.toLowerCase().includes(q.toLowerCase()) ||
    n.kind.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-sidebar/60 backdrop-blur flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nó…" className="pl-8 h-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {NODE_CATEGORIES.map(cat => {
          const items = filtered.filter(n => n.category === cat.key);
          if (!items.length) return null;
          return (
            <div key={cat.key} className="px-2 py-2">
              <div className="px-2 mb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat.label}</p>
              </div>
              <div className="space-y-1">
                {items.map(n => {
                  const tone = CATEGORY_TONE[n.category];
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.kind}
                      onClick={() => onAdd(n.kind)}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("application/berry-node", n.kind)}
                      className={cn(
                        "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors group",
                      )}
                    >
                      <div className={cn("h-7 w-7 rounded-md grid place-items-center", tone.bg, tone.ring)}>
                        <Icon className={cn("h-3.5 w-3.5", tone.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{n.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
