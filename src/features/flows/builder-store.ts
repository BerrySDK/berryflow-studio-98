import { create } from "zustand";
import { applyNodeChanges, applyEdgeChanges, addEdge, type NodeChange, type EdgeChange, type Connection } from "reactflow";
import type { Flow, FlowNode, FlowEdge, FlowNodeKind } from "@/types";
import { NODE_BY_KIND } from "./node-catalog";

interface BuilderState {
  flow: Flow | null;
  selectedNodeId: string | null;
  setFlow: (flow: Flow) => void;
  clearFlow: () => void;
  setSelectedNodeId: (id: string | null) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;
  addNode: (kind: FlowNodeKind, position: { x: number; y: number }) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  validate: () => string[];
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  flow: null,
  selectedNodeId: null,
  setFlow: (flow) => set({ flow, selectedNodeId: null }),
  clearFlow: () => set({ flow: null, selectedNodeId: null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  onNodesChange: (changes) => {
    const { flow } = get();
    if (!flow) return;
    const nodes = applyNodeChanges(changes, flow.nodes as unknown as never[]) as unknown as FlowNode[];
    set({ flow: { ...flow, nodes, nodeCount: nodes.length } });
  },
  onEdgesChange: (changes) => {
    const { flow } = get();
    if (!flow) return;
    const edges = applyEdgeChanges(changes, flow.edges as unknown as never[]) as unknown as FlowEdge[];
    set({ flow: { ...flow, edges } });
  },
  onConnect: (c) => {
    const { flow } = get();
    if (!flow) return;
    const edges = addEdge(c, flow.edges as unknown as never[]) as unknown as FlowEdge[];
    set({ flow: { ...flow, edges } });
  },

  addNode: (kind, position) => {
    const { flow } = get();
    if (!flow) return;
    const def = NODE_BY_KIND[kind];
    const id = `n_${Math.random().toString(36).slice(2, 8)}`;
    const node: FlowNode = {
      id, type: "berry", position,
      data: { label: def.label, kind, category: def.category, config: def.defaultConfig ?? {} },
    };
    const nodes = [...flow.nodes, node];
    set({ flow: { ...flow, nodes, nodeCount: nodes.length }, selectedNodeId: id });
  },

  updateNodeConfig: (id, config) => {
    const { flow } = get();
    if (!flow) return;
    const nodes = flow.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n);
    set({ flow: { ...flow, nodes } });
  },

  validate: () => {
    const { flow } = get();
    if (!flow) return [];
    const errs: string[] = [];
    if (!flow.nodes.some(n => n.data.kind === "start" || n.data.category === "event")) {
      errs.push("Fluxo precisa de um Start ou um nó de Evento.");
    }
    if (flow.nodes.length > 1 && flow.edges.length === 0) {
      errs.push("Conecte os nós antes de publicar.");
    }
    flow.nodes.forEach(n => {
      if (n.data.kind === "send-text" && !((n.data.config as { text?: string })?.text ?? "").trim()) {
        errs.push(`"${n.data.label}" sem texto definido.`);
      }
    });
    return errs;
  },
}));
