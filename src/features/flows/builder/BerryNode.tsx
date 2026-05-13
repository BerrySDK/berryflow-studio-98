import { Handle, Position, type NodeProps } from "reactflow";
import { NODE_BY_KIND, CATEGORY_TONE } from "../node-catalog";
import type { FlowNodeData } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Sparkles } from "lucide-react";

export function BerryNode({ data, selected, id }: NodeProps<FlowNodeData>) {
  const def = NODE_BY_KIND[data.kind];
  const tone = CATEGORY_TONE[data.category];
  const Icon = def?.icon;
  const isOtp = data.category === "otp";
  const isAi = data.kind === "ai-label-message";
  const hasErrors = (data.errors?.length ?? 0) > 0;
  const cfg = data.config as { text?: string; ms?: number; buttons?: string[]; mode?: string } | undefined;

  return (
    <div
      data-node-id={id}
      className={cn(
        "min-w-[220px] rounded-xl shadow-card transition-all",
        tone.bg, tone.ring,
        "backdrop-blur-md",
        selected && "ring-2 ring-primary shadow-glow",
        isOtp && "ring-success/50",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        {Icon ? <Icon className={cn("h-4 w-4", tone.text)} /> : null}
        <span className="text-sm font-semibold tracking-tight">{data.label}</span>
        {isOtp && <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-success">OTP</span>}
        {isAi && <Sparkles className="ml-auto h-3.5 w-3.5 text-primary-glow" />}
        {hasErrors && <AlertTriangle className="ml-auto h-3.5 w-3.5 text-destructive" />}
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground space-y-1">
        {def?.description && <p className="line-clamp-1">{def.description}</p>}
        {cfg?.text && <p className="text-foreground/80 line-clamp-2">"{cfg.text}"</p>}
        {cfg?.ms !== undefined && <p>{cfg.ms} ms</p>}
        {cfg?.buttons && <p>{cfg.buttons.length} botões</p>}
        {cfg?.mode && <p className="font-mono">mode: {cfg.mode}</p>}
        {isAi && <p className="text-primary-glow/90">Apenas em chat privado</p>}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
