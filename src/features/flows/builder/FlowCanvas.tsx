import { useCallback, useMemo, useRef } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap, type ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";
import { useBuilderStore } from "../builder-store";
import { BerryNode } from "./BerryNode";
import type { FlowNodeKind } from "@/types";

const nodeTypes = { berry: BerryNode };

export function FlowCanvas() {
  const flow = useBuilderStore(s => s.flow);
  const onNodesChange = useBuilderStore(s => s.onNodesChange);
  const onEdgesChange = useBuilderStore(s => s.onEdgesChange);
  const onConnect = useBuilderStore(s => s.onConnect);
  const setSelected = useBuilderStore(s => s.setSelectedNodeId);
  const addNode = useBuilderStore(s => s.addNode);
  const wrapper = useRef<HTMLDivElement>(null);
  const rfRef = useRef<ReactFlowInstance | null>(null);

  const nodes = useMemo(() => flow?.nodes ?? [], [flow]);
  const edges = useMemo(() => flow?.edges ?? [], [flow]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/berry-node") as FlowNodeKind;
    if (!kind || !rfRef.current || !wrapper.current) return;
    const bounds = wrapper.current.getBoundingClientRect();
    const position = rfRef.current.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    addNode(kind, position);
  }, [addNode]);

  return (
    <div ref={wrapper} className="flex-1 relative" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodes as never}
        edges={edges as never}
        nodeTypes={nodeTypes}
        onInit={(i) => { rfRef.current = i; }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => setSelected(n.id)}
        onPaneClick={() => setSelected(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="oklch(0.45 0.08 295 / 0.5)" />
        <MiniMap pannable zoomable nodeColor={() => "oklch(0.55 0.20 300)"} maskColor="oklch(0.16 0.02 290 / 0.8)" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
