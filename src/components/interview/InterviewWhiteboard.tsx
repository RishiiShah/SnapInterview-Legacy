"use client";

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef, type PointerEvent, type ChangeEvent } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@/components/ui/icons";

export type WhiteboardNode = {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WhiteboardEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type WhiteboardScene = {
  version: 1;
  revision: number;
  contentHash: string;
  nodes: Array<{ id: string; kind: string; label: string; x?: number; y?: number }>;
  edges: Array<{ id: string; from: string; to: string; label?: string }>;
};

export type WhiteboardExport = {
  scene: WhiteboardScene;
  imageBase64?: string;
  mimeType: "image/jpeg";
  visionStatus?: "vision_available" | "vision_unavailable";
};

export type InterviewWhiteboardRef = {
  exportBoard: () => Promise<WhiteboardExport | null>;
  getScene: () => WhiteboardScene;
};

export const STAMP_TYPES = [
  { kind: "client", label: "Client / Users", color: "border-blue-500/50 bg-blue-500/10 text-blue-300" },
  { kind: "api", label: "API / Service", color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" },
  { kind: "database", label: "Database", color: "border-amber-500/50 bg-amber-500/10 text-amber-300" },
  { kind: "cache", label: "Cache (Redis)", color: "border-rose-500/50 bg-rose-500/10 text-rose-300" },
  { kind: "queue", label: "Queue / Stream", color: "border-purple-500/50 bg-purple-500/10 text-purple-300" },
  { kind: "cdn", label: "CDN", color: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" },
  { kind: "load_balancer", label: "Load Balancer", color: "border-indigo-500/50 bg-indigo-500/10 text-indigo-300" },
  { kind: "external_api", label: "External API", color: "border-orange-500/50 bg-orange-500/10 text-orange-300" },
  { kind: "storage", label: "Object Storage", color: "border-teal-500/50 bg-teal-500/10 text-teal-300" },
  { kind: "other", label: "Custom Component", color: "border-slate-500/50 bg-slate-500/10 text-slate-300" },
] as const;

function computeSceneHash(
  nodes: WhiteboardNode[],
  edges: WhiteboardEdge[],
  freehandPaths: Array<{ points: Array<{ x: number; y: number }> }>
): string {
  const payload = JSON.stringify({
    n: nodes.map((n) => ({ id: n.id, k: n.kind, l: n.label, x: Math.round(n.x), y: Math.round(n.y) })),
    e: edges.map((e) => ({ f: e.from, t: e.to, l: e.label || "" })),
    p: freehandPaths.map((p) => p.points.length),
  });

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

type ToolMode = "select" | "connect" | "draw" | "erase";

type InterviewWhiteboardProps = {
  onShareBoard?: (exportData: WhiteboardExport) => void;
  isSharing?: boolean;
  disabled?: boolean;
};

export const InterviewWhiteboard = forwardRef<InterviewWhiteboardRef, InterviewWhiteboardProps>(
  function InterviewWhiteboard({ onShareBoard, isSharing = false, disabled = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastSentHashRef = useRef<string | null>(null);

    const [nodes, setNodes] = useState<WhiteboardNode[]>([]);
    const [edges, setEdges] = useState<WhiteboardEdge[]>([]);
    const [freehandPaths, setFreehandPaths] = useState<Array<{ points: Array<{ x: number; y: number }> }>>([]);
    const [revision, setRevision] = useState(0);

    const [mode, setMode] = useState<ToolMode>("select");
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentDrawPoints, setCurrentDrawPoints] = useState<Array<{ x: number; y: number }>>([]);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [shareToast, setShareToast] = useState<string | null>(null);

    const currentHash = computeSceneHash(nodes, edges, freehandPaths);

    const getScene = useCallback((): WhiteboardScene => {
      return {
        version: 1,
        revision,
        contentHash: currentHash,
        nodes: nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label, x: Math.round(n.x), y: Math.round(n.y) })),
        edges: edges.map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label })),
      };
    }, [nodes, edges, revision, currentHash]);

    const exportBoard = useCallback(async (): Promise<WhiteboardExport | null> => {
      const scene = getScene();
      if (nodes.length === 0 && freehandPaths.length === 0) return null;

      const canvas = canvasRef.current;
      let imageBase64: string | undefined = undefined;

      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          if (dataUrl.startsWith("data:image/jpeg;base64,")) {
            imageBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
          }
        } catch {
          // Snapshot failed; fail-open with scene graph and visionStatus
        }
      }

      return {
        scene,
        imageBase64,
        mimeType: "image/jpeg",
        visionStatus: imageBase64 ? "vision_available" : "vision_unavailable",
      };
    }, [nodes, freehandPaths, getScene]);

    useImperativeHandle(ref, () => ({
      exportBoard,
      getScene,
    }), [exportBoard, getScene]);

    // Redraw canvas whenever nodes, edges, or paths change
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 600;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Background
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, width, height);

      // Subtle Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Edges (Arrows)
      for (const edge of edges) {
        const fromNode = nodes.find((n) => n.id === edge.from);
        const toNode = nodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) continue;

        const fromCenterX = fromNode.x + fromNode.width / 2;
        const fromCenterY = fromNode.y + fromNode.height / 2;
        const toCenterX = toNode.x + toNode.width / 2;
        const toCenterY = toNode.y + toNode.height / 2;

        ctx.strokeStyle = "#38BDF8";
        ctx.fillStyle = "#38BDF8";
        ctx.lineWidth = 2;

        // Line
        ctx.beginPath();
        ctx.moveTo(fromCenterX, fromCenterY);
        ctx.lineTo(toCenterX, toCenterY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(toCenterX, toCenterY);
        ctx.lineTo(toCenterX - headLen * Math.cos(angle - Math.PI / 6), toCenterY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toCenterX - headLen * Math.cos(angle + Math.PI / 6), toCenterY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        // Edge label if present
        if (edge.label) {
          const midX = (fromCenterX + toCenterX) / 2;
          const midY = (fromCenterY + toCenterY) / 2;
          ctx.font = "11px sans-serif";
          ctx.fillStyle = "#E2E8F0";
          ctx.textAlign = "center";
          ctx.fillText(edge.label, midX, midY - 6);
        }
      }

      // Draw Freehand Paths
      ctx.strokeStyle = "#F43F5E";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const path of freehandPaths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      }

      if (currentDrawPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentDrawPoints[0].x, currentDrawPoints[0].y);
        for (let i = 1; i < currentDrawPoints.length; i++) {
          ctx.lineTo(currentDrawPoints[i].x, currentDrawPoints[i].y);
        }
        ctx.stroke();
      }
    }, [nodes, edges, freehandPaths, currentDrawPoints]);

    const addNode = (stamp: typeof STAMP_TYPES[number]) => {
      const newNode: WhiteboardNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: stamp.kind,
        label: stamp.label,
        x: 60 + Math.random() * 120,
        y: 60 + Math.random() * 120,
        width: 140,
        height: 52,
      };
      setNodes((prev) => [...prev, newNode]);
      setRevision((r) => r + 1);
    };

    const handleNodePointerDown = (e: PointerEvent<HTMLDivElement>, nodeId: string) => {
      e.stopPropagation();
      if (mode === "connect") {
        if (!connectSourceNodeId) {
          setConnectSourceNodeId(nodeId);
        } else if (connectSourceNodeId !== nodeId) {
          const newEdge: WhiteboardEdge = {
            id: `edge_${Date.now()}`,
            from: connectSourceNodeId,
            to: nodeId,
          };
          setEdges((prev) => [...prev, newEdge]);
          setConnectSourceNodeId(null);
          setRevision((r) => r + 1);
        }
        return;
      }

      if (mode === "erase") {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setEdges((prev) => prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId));
        setRevision((r) => r + 1);
        return;
      }

      setSelectedNodeId(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDraggingNodeId(nodeId);
      setDragOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      });
    };

    const handleContainerPointerMove = (e: PointerEvent<HTMLDivElement>) => {
      if (draggingNodeId) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newX = Math.max(10, Math.min(rect.width - 150, e.clientX - rect.left - dragOffset.x));
        const newY = Math.max(10, Math.min(rect.height - 60, e.clientY - rect.top - dragOffset.y));

        setNodes((prev) =>
          prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
        );
      } else if (mode === "draw" && isDrawing) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setCurrentDrawPoints((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      }
    };

    const handleContainerPointerUp = () => {
      if (draggingNodeId) {
        setDraggingNodeId(null);
        setRevision((r) => r + 1);
      }
      if (mode === "draw" && isDrawing) {
        if (currentDrawPoints.length > 1) {
          setFreehandPaths((prev) => [...prev, { points: currentDrawPoints }]);
          setRevision((r) => r + 1);
        }
        setIsDrawing(false);
        setCurrentDrawPoints([]);
      }
    };

    const handleContainerPointerDown = (e: PointerEvent<HTMLDivElement>) => {
      if (mode === "draw") {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setIsDrawing(true);
        setCurrentDrawPoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      } else if (mode === "select") {
        setSelectedNodeId(null);
        setEditingNodeId(null);
        setConnectSourceNodeId(null);
      }
    };

    const handleManualShare = async () => {
      if (nodes.length === 0 && freehandPaths.length === 0) {
        setShareToast("Draw your architecture first before sharing.");
        setTimeout(() => setShareToast(null), 3000);
        return;
      }

      if (currentHash === lastSentHashRef.current) {
        setShareToast("Board is already up to date with interviewer.");
        setTimeout(() => setShareToast(null), 3000);
        return;
      }

      const exported = await exportBoard();
      if (exported && onShareBoard) {
        lastSentHashRef.current = currentHash;
        onShareBoard(exported);
        setShareToast("Board shared with interviewer!");
        setTimeout(() => setShareToast(null), 3000);
      }
    };

    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
        {/* Top Control Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-slate-900/80 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium text-slate-300">Whiteboard</span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
              System Design
            </span>
          </div>

          {/* Tool Modes */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setMode("select"); setConnectSourceNodeId(null); }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "select" ? "bg-blue-600 text-white" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              Move
            </button>
            <button
              type="button"
              onClick={() => { setMode("connect"); setSelectedNodeId(null); }}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "connect" ? "bg-blue-600 text-white" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              <IconArrowRight className="h-3 w-3" /> Connect
            </button>
            <button
              type="button"
              onClick={() => { setMode("draw"); setConnectSourceNodeId(null); }}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "draw" ? "bg-blue-600 text-white" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              <IconPencil className="h-3 w-3" /> Pen
            </button>
            <button
              type="button"
              onClick={() => setMode("erase")}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "erase" ? "bg-rose-600 text-white" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              <IconTrash className="h-3 w-3" /> Erase
            </button>
          </div>

          {/* Share Board Action */}
          <div className="flex items-center gap-2">
            {shareToast ? (
              <span className="text-[11px] font-medium text-emerald-400">{shareToast}</span>
            ) : null}
            <button
              type="button"
              onClick={handleManualShare}
              disabled={disabled || isSharing || (nodes.length === 0 && freehandPaths.length === 0)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSharing ? <IconRefresh className="h-3.5 w-3.5 animate-spin" /> : <IconCheck className="h-3.5 w-3.5" />}
              Share board
            </button>
          </div>
        </div>

        {/* Stamps Palette Bar */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.06] bg-slate-900/40 px-3 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Add Stamp:</span>
          {STAMP_TYPES.map((stamp) => (
            <button
              key={stamp.kind}
              type="button"
              onClick={() => addNode(stamp)}
              className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors hover:brightness-125 ${stamp.color}`}
            >
              <IconPlus className="h-2.5 w-2.5" />
              {stamp.label}
            </button>
          ))}
        </div>

        {/* Canvas & Node Overlay Container */}
        <div
          ref={containerRef}
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          className="relative flex-1 touch-none select-none overflow-hidden"
          style={{ cursor: mode === "draw" ? "crosshair" : mode === "connect" ? "pointer" : "default" }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* Render Interactive Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isConnectSource = connectSourceNodeId === node.id;
            const stampMeta = STAMP_TYPES.find((s) => s.kind === node.kind) ?? STAMP_TYPES[STAMP_TYPES.length - 1];

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
                className={`absolute z-10 flex flex-col justify-center rounded-lg border-2 px-2.5 py-1 shadow-lg backdrop-blur-sm transition-shadow ${
                  stampMeta.color
                } ${
                  isSelected
                    ? "ring-2 ring-white shadow-blue-500/30"
                    : isConnectSource
                    ? "ring-2 ring-emerald-400 animate-pulse"
                    : ""
                }`}
              >
                {editingNodeId === node.id ? (
                  <input
                    type="text"
                    value={node.label}
                    autoFocus
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const newLabel = e.target.value;
                      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, label: newLabel } : n)));
                    }}
                    onBlur={() => setEditingNodeId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingNodeId(null);
                    }}
                    className="w-full rounded bg-black/40 px-1 text-xs font-semibold text-white outline-none"
                  />
                ) : (
                  <div
                    onDoubleClick={() => setEditingNodeId(node.id)}
                    className="cursor-pointer truncate text-xs font-semibold leading-tight text-white"
                  >
                    {node.label}
                  </div>
                )}
                <div className="truncate text-[9px] uppercase tracking-wider text-slate-400">
                  {node.kind.replace("_", " ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
