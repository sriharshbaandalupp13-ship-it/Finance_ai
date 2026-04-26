"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { CompanyRelation } from "@/data/contracts";
import "@xyflow/react/dist/style.css";

type WorkflowItem = { id: string; label: string; value: string };

type PipelineNodeData = {
  label: string;
  value: string;
};

type RelationNodeData = {
  label: string;
  subtitle: string;
  meta: string;
  tone: "center" | "peer";
};

function PipelineNode({ data }: NodeProps<Node<PipelineNodeData>>) {
  return (
    <div className="min-w-[190px] rounded-xl border border-cyan-300/20 bg-[#0b1220]/95 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Workflow</p>
      <h4 className="mt-2 text-sm font-semibold text-white">{data.label}</h4>
      <p className="mt-2 text-xs leading-5 text-slate-400">{data.value}</p>
    </div>
  );
}

function RelationNode({ data, selected }: NodeProps<Node<RelationNodeData>>) {
  const isCenter = data.tone === "center";

  return (
    <div
      className={`min-w-[190px] rounded-3xl border px-5 py-4 shadow-[0_20px_45px_rgba(15,23,42,0.12)] transition ${
        isCenter
          ? "border-emerald-300/35 bg-emerald-300/14 text-emerald-50"
          : selected
            ? "border-cyan-300/45 bg-cyan-300/14 text-white"
            : "border-white/10 bg-[#0b1220]/95 text-slate-100"
      }`}
    >
      <div className="text-sm font-semibold">{data.label}</div>
      <div className={`mt-1 text-xs ${isCenter ? "text-emerald-100" : "text-slate-400"}`}>{data.subtitle}</div>
      <div className={`mt-3 text-[11px] uppercase tracking-[0.22em] ${isCenter ? "text-emerald-200" : "text-cyan-200"}`}>
        {data.meta}
      </div>
    </div>
  );
}

const nodeTypes = {
  pipeline: PipelineNode,
  relation: RelationNode,
};

function buildWorkflowNodes(items: WorkflowItem[]): Node<PipelineNodeData>[] {
  return items.map((item, index) => ({
    id: item.id,
    type: "pipeline",
    position: { x: index * 230, y: index % 2 === 0 ? 20 : 120 },
    data: {
      label: item.label,
      value: item.value,
    },
    draggable: false,
    selectable: true,
  }));
}

function buildWorkflowEdges(items: WorkflowItem[]): Edge[] {
  return items.slice(0, -1).map((item, index) => ({
    id: `${item.id}-${items[index + 1].id}`,
    source: item.id,
    target: items[index + 1].id,
    animated: true,
    style: { stroke: "#22d3ee", strokeWidth: 2 },
  }));
}

function getRelationPeerSymbol(symbol: string, relation: CompanyRelation): string {
  return relation.targetSymbol === symbol ? relation.sourceSymbol : relation.targetSymbol;
}

function getRelationNodeId(symbol: string, relation: CompanyRelation, index: number): string {
  return `${symbol}-${getRelationPeerSymbol(symbol, relation)}-${relation.relation}-${index}`;
}

function buildRelationNodes(
  symbol: string,
  companyName: string,
  priceTarget: number,
  relations: CompanyRelation[],
): Node<RelationNodeData>[] {
  const center: Node<RelationNodeData> = {
    id: symbol,
    type: "relation",
    position: { x: 360, y: 200 },
    data: {
      label: symbol,
      subtitle: companyName,
      meta: `Target INR ${priceTarget.toFixed(2)}`,
      tone: "center",
    },
    draggable: false,
    selectable: true,
  };

  const radiusX = relations.length <= 2 ? 260 : 320;
  const radiusY = relations.length <= 2 ? 160 : 220;

  const satellites = relations.map((relation, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(relations.length, 1);
    const x = 360 + Math.cos(angle) * radiusX;
    const y = 200 + Math.sin(angle) * radiusY;
    const peerSymbol = getRelationPeerSymbol(symbol, relation);

    return {
      id: getRelationNodeId(symbol, relation, index),
      type: "relation",
      position: { x, y },
      data: {
        label: peerSymbol,
        subtitle: relation.relation.toUpperCase(),
        meta: `Strength ${Math.round(relation.strength * 100)}%`,
        tone: "peer",
      },
      draggable: false,
      selectable: true,
    } satisfies Node<RelationNodeData>;
  });

  return [center, ...satellites];
}

function buildRelationEdges(symbol: string, relations: CompanyRelation[]): Edge[] {
  return relations.map((relation, index) => ({
    id: `${relation.sourceSymbol}-${relation.targetSymbol}-${index}`,
    source: symbol,
    target: getRelationNodeId(symbol, relation, index),
    label: relation.relation,
    animated: relation.strength > 0.75,
    style: {
      stroke: relation.strength > 0.75 ? "#34d399" : "#22d3ee",
      strokeWidth: relation.strength > 0.75 ? 2.5 : 2,
    },
    labelStyle: { fill: "#cbd5e1", fontSize: 11, fontWeight: 700 },
  }));
}

export function WorkflowCanvas({
  workflow,
  symbol,
  companyName,
  priceTarget,
  relations,
}: {
  workflow: WorkflowItem[];
  symbol: string;
  companyName: string;
  priceTarget: number;
  relations: CompanyRelation[];
}) {
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);

  const workflowNodes = useMemo(() => buildWorkflowNodes(workflow), [workflow]);
  const workflowEdges = useMemo(() => buildWorkflowEdges(workflow), [workflow]);
  const relationNodes = useMemo(
    () => buildRelationNodes(symbol, companyName, priceTarget, relations),
    [companyName, priceTarget, relations, symbol],
  );
  const relationEdges = useMemo(() => buildRelationEdges(symbol, relations), [relations, symbol]);

  const selectedRelation = useMemo(() => {
    if (!selectedRelationId) return relations[0] ?? null;
    const relationIndex = relations.findIndex((relation, index) => getRelationNodeId(symbol, relation, index) === selectedRelationId);
    return relationIndex >= 0 ? relations[relationIndex] : relations[0] ?? null;
  }, [relations, selectedRelationId, symbol]);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Interactive workflow</p>
          <h3 className="mt-2 text-xl font-semibold text-white">News to prediction pipeline</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Follow how signals turn into a next-day call, from news volume through sentiment and final price direction.
          </p>
        </div>
        <div className="h-[360px] overflow-hidden rounded-xl border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(2,6,23,0.74),rgba(15,23,42,0.88))]">
          <ReactFlow
            nodes={workflowNodes}
            edges={workflowEdges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            panOnDrag
            zoomOnScroll={false}
            zoomOnPinch={false}
            nodeTypes={nodeTypes}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(148,163,184,0.22)" gap={18} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d141f]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200">Company relationship graph</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Chain-reaction explorer</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Click a related company to inspect how catalysts could ripple through suppliers, competitors, and partners.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-300/18 bg-emerald-300/[0.06] px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-200">Tomorrow target</div>
            <div className="mt-1 text-lg font-bold text-white">INR {priceTarget.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
          <div className="h-[380px] overflow-hidden rounded-xl border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(2,6,23,0.74),rgba(15,23,42,0.88))]">
            <ReactFlow
              nodes={relationNodes}
              edges={relationEdges}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              nodesDraggable={false}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedRelationId(node.id)}
              proOptions={{ hideAttribution: true }}
            >
              <MiniMap pannable zoomable nodeColor="#34d399" maskColor="rgba(2,6,23,0.65)" />
              <Background color="rgba(148,163,184,0.22)" gap={20} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          <aside className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Selected link</div>
            {selectedRelation ? (
              <>
                <h4 className="mt-3 text-lg font-semibold text-white">
                  {getRelationPeerSymbol(symbol, selectedRelation)}
                </h4>
                <p className="mt-1 text-sm font-medium text-emerald-200">
                  {selectedRelation.relation}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {selectedRelation.rationale}
                </p>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/18 p-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Connection strength</div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {Math.round(selectedRelation.strength * 100)}%
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-black/18 p-4 text-sm leading-6 text-slate-400">
                No related companies were found for this symbol yet. Try another company or expand the watchlist mappings.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
