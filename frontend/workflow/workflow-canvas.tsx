"use client";

import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type WorkflowItem = { id: string; label: string; value: string };

type Relation = {
  sourceSymbol: string;
  targetSymbol: string;
  relation: string;
  strength: number;
};

function buildWorkflowNodes(items: WorkflowItem[]): Node[] {
  return items.map((item, index) => ({
    id: item.id,
    position: { x: index * 220, y: index % 2 === 0 ? 0 : 90 },
    data: {
      label: (
        <div className="min-w-[180px] rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-xl shadow-cyan-950/20">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/80">Workflow</p>
          <h4 className="mt-2 text-sm font-semibold text-slate-50">{item.label}</h4>
          <p className="mt-2 text-xs text-slate-300">{item.value}</p>
        </div>
      ),
    },
    draggable: false,
  }));
}

function buildWorkflowEdges(items: WorkflowItem[]): Edge[] {
  return items.slice(0, -1).map((item, index) => ({
    id: `${item.id}-${items[index + 1].id}`,
    source: item.id,
    target: items[index + 1].id,
    animated: true,
    style: { stroke: "#4fd1c5" },
  }));
}

function buildRelationNodes(symbol: string, relations: Relation[]): Node[] {
  const center: Node = {
    id: symbol,
    position: { x: 300, y: 180 },
    data: {
      label: (
        <div className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-6 py-5 text-center text-sm font-semibold text-emerald-100 shadow-lg">
          {symbol}
        </div>
      ),
    },
    draggable: false,
  };

  const satellites = relations.map((relation, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(relations.length, 1);
    const x = 300 + Math.cos(angle) * 220;
    const y = 180 + Math.sin(angle) * 140;
    return {
      id: relation.targetSymbol === symbol ? `${relation.targetSymbol}-${index}` : relation.targetSymbol,
      position: { x, y },
      data: {
        label: (
          <div className="w-[170px] rounded-2xl border border-white/10 bg-slate-950/85 p-3 text-left shadow-lg shadow-slate-950/40">
            <div className="text-sm font-semibold text-slate-100">{relation.targetSymbol === symbol ? relation.sourceSymbol : relation.targetSymbol}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-cyan-300">{relation.relation}</div>
            <div className="mt-2 text-xs text-slate-400">Strength {Math.round(relation.strength * 100)}%</div>
          </div>
        ),
      },
      draggable: false,
    } satisfies Node;
  });

  return [center, ...satellites];
}

function buildRelationEdges(symbol: string, relations: Relation[]): Edge[] {
  return relations.map((relation, index) => ({
    id: `${relation.sourceSymbol}-${relation.targetSymbol}-${index}`,
    source: symbol,
    target: relation.targetSymbol === symbol ? `${relation.targetSymbol}-${index}` : relation.targetSymbol,
    label: relation.relation,
    animated: relation.strength > 0.75,
    style: { stroke: relation.strength > 0.75 ? "#34d399" : "#38bdf8" },
    labelStyle: { fill: "#cbd5e1", fontSize: 11 },
  }));
}

export function WorkflowCanvas({ workflow, symbol, relations }: { workflow: WorkflowItem[]; symbol: string; relations: Relation[]; }) {
  const workflowNodes = buildWorkflowNodes(workflow);
  const workflowEdges = buildWorkflowEdges(workflow);
  const relationNodes = buildRelationNodes(symbol, relations);
  const relationEdges = buildRelationEdges(symbol, relations);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/30">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Interactive workflow</p>
          <h3 className="mt-2 text-xl font-semibold text-white">News to prediction pipeline</h3>
        </div>
        <div className="h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,#020617,#0f172a)]">
          <ReactFlow nodes={workflowNodes} edges={workflowEdges} fitView nodesDraggable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false}>
            <Background color="#1e293b" gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </section>
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/30">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Company relationship graph</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Chain-reaction explorer</h3>
        </div>
        <div className="h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,#020617,#0f172a)]">
          <ReactFlow nodes={relationNodes} edges={relationEdges} fitView nodesDraggable={false} elementsSelectable={false}>
            <MiniMap pannable zoomable />
            <Background color="#1e293b" gap={20} />
          </ReactFlow>
        </div>
      </section>
    </div>
  );
}
