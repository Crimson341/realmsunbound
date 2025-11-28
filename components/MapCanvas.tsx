"use client";

import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Circle, Line, Text, Group } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  MousePointer2,
  Pencil,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Loader2
} from "lucide-react";

export interface MapLocationData {
  _id: Id<"locations">;
  name: string;
  type: string;
  description: string;
  neighbors: Id<"locations">[];
  mapX: number | null;
  mapY: number | null;
  shopCount: number;
  hasShops: boolean;
  mapIcon?: string | null;
}

interface MapCanvasProps {
  locations: MapLocationData[];
  currentLocationId?: Id<"locations"> | null;
  isEditor?: boolean;
  onLocationSelect?: (location: MapLocationData) => void;
  onTravel?: (location: MapLocationData) => void;
}

// Color mapping for location types
const typeColors: Record<string, string> = {
  town: "#10b981",
  city: "#3b82f6",
  village: "#22c55e",
  capital: "#f59e0b",
  castle: "#8b5cf6",
  fortress: "#64748b",
  forest: "#16a34a",
  mountain: "#78716c",
  dungeon: "#ef4444",
  cave: "#71717a",
  ruins: "#f97316",
  temple: "#eab308",
  swamp: "#84cc16",
  desert: "#fbbf24",
  coast: "#06b6d4",
  lake: "#0ea5e9",
  default: "#94a3b8",
};

function getTypeColor(type: string): string {
  return typeColors[type.toLowerCase()] || typeColors.default;
}

type Tool = "select" | "draw" | "delete";

export function MapCanvas({
  locations,
  currentLocationId,
  isEditor = false,
  onLocationSelect,
  onTravel,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [drawingLine, setDrawingLine] = useState<{ from: string; toPos: { x: number; y: number } } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mutations
  const updatePosition = useMutation(api.map.updateLocationPosition);
  const connectLocations = useMutation(api.map.connectLocations);
  const disconnectLocations = useMutation(api.map.disconnectLocations);

  // Build positions map with defaults
  const positionsMap = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const gridSize = Math.ceil(Math.sqrt(locations.length));
    locations.forEach((loc, index) => {
      const defaultX = (index % gridSize) * 150 + 100;
      const defaultY = Math.floor(index / gridSize) * 120 + 100;
      positionsMap.current.set(loc._id, {
        x: loc.mapX ?? defaultX,
        y: loc.mapY ?? defaultY,
      });
    });
  }, [locations]);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Get position for a location
  const getPosition = (id: string) => {
    return positionsMap.current.get(id) || { x: 100, y: 100 };
  };

  // Zoom handlers
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.3, Math.min(3, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Handle node drag
  const handleDragEnd = async (id: string, e: KonvaEventObject<DragEvent>) => {
    if (!isEditor) return;

    const newPos = { x: e.target.x(), y: e.target.y() };
    positionsMap.current.set(id, newPos);

    setIsSaving(true);
    try {
      await updatePosition({
        locationId: id as Id<"locations">,
        mapX: newPos.x,
        mapY: newPos.y,
      });
    } catch (err) {
      console.error("Failed to save position:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle drawing line start
  const handleNodeMouseDown = (id: string, _e: KonvaEventObject<MouseEvent>) => {
    if (!isEditor || tool !== "draw") return;

    const pos = getPosition(id);
    setDrawingLine({ from: id, toPos: pos });
  };

  // Handle mouse move for drawing
  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!drawingLine) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    setDrawingLine({
      ...drawingLine,
      toPos: {
        x: (pointer.x - position.x) / scale,
        y: (pointer.y - position.y) / scale,
      },
    });
  };

  // Handle drawing line end
  const handleNodeMouseUp = async (id: string) => {
    if (!isEditor || !drawingLine || drawingLine.from === id) {
      setDrawingLine(null);
      return;
    }

    setIsSaving(true);
    try {
      await connectLocations({
        locationIdA: drawingLine.from as Id<"locations">,
        locationIdB: id as Id<"locations">,
      });
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setIsSaving(false);
      setDrawingLine(null);
    }
  };

  // Handle edge click (delete)
  const handleEdgeClick = async (locA: string, locB: string) => {
    if (!isEditor || tool !== "delete") return;

    setIsSaving(true);
    try {
      await disconnectLocations({
        locationIdA: locA as Id<"locations">,
        locationIdB: locB as Id<"locations">,
      });
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle node click
  const handleNodeClick = (loc: MapLocationData) => {
    if (tool === "select") {
      setSelectedId(loc._id);
      onLocationSelect?.(loc);
    }
  };

  // Handle node double click (travel in player mode)
  const handleNodeDblClick = (loc: MapLocationData) => {
    if (!isEditor && onTravel) {
      onTravel(loc);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(3, s * 1.2));
  const zoomOut = () => setScale((s) => Math.max(0.3, s / 1.2));
  const fitToView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Build edges from neighbor relationships
  const edges: { from: string; to: string }[] = [];
  const addedEdges = new Set<string>();
  locations.forEach((loc) => {
    loc.neighbors.forEach((neighborId) => {
      const edgeId = [loc._id, neighborId].sort().join("-");
      if (!addedEdges.has(edgeId)) {
        addedEdges.add(edgeId);
        edges.push({ from: loc._id, to: neighborId as string });
      }
    });
  });

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      {isEditor && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool("select")}
              className={`p-2 rounded-lg transition-colors ${
                tool === "select" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              title="Select & Move"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("draw")}
              className={`p-2 rounded-lg transition-colors ${
                tool === "draw" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              title="Draw Connections"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("delete")}
              className={`p-2 rounded-lg transition-colors ${
                tool === "delete" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              title="Delete Connections"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            <div className="flex items-center gap-1">
              <button onClick={zoomOut} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={fitToView} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {isEditor && (
        <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800/50 text-xs text-slate-500">
          {tool === "select" && "Drag nodes to reposition • Click to select"}
          {tool === "draw" && "Drag from one node to another to connect them"}
          {tool === "delete" && "Click on a connection line to remove it"}
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable={tool === "select"}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDrawingLine(null)}
        >
          <Layer>
            {/* Grid dots background */}
            {Array.from({ length: 50 }, (_, i) =>
              Array.from({ length: 50 }, (_, j) => (
                <Circle
                  key={`grid-${i}-${j}`}
                  x={i * 40}
                  y={j * 40}
                  radius={1}
                  fill="#1e293b"
                />
              ))
            ).flat()}

            {/* Connection lines */}
            {edges.map(({ from, to }) => {
              const fromPos = getPosition(from);
              const toPos = getPosition(to);
              const isConnectedToCurrent = from === currentLocationId || to === currentLocationId;

              return (
                <Line
                  key={`${from}-${to}`}
                  points={[fromPos.x, fromPos.y, toPos.x, toPos.y]}
                  stroke={isConnectedToCurrent ? "#10b981" : "#334155"}
                  strokeWidth={isConnectedToCurrent ? 3 : 2}
                  opacity={tool === "delete" ? 0.8 : 0.5}
                  hitStrokeWidth={15}
                  onClick={() => handleEdgeClick(from, to)}
                  onTap={() => handleEdgeClick(from, to)}
                  listening={isEditor && tool === "delete"}
                />
              );
            })}

            {/* Drawing line preview */}
            {drawingLine && (
              <Line
                points={[
                  getPosition(drawingLine.from).x,
                  getPosition(drawingLine.from).y,
                  drawingLine.toPos.x,
                  drawingLine.toPos.y,
                ]}
                stroke="#10b981"
                strokeWidth={2}
                dash={[5, 5]}
                opacity={0.7}
              />
            )}

            {/* Location nodes */}
            {locations.map((loc) => {
              const pos = getPosition(loc._id);
              const color = getTypeColor(loc.type);
              const isCurrent = loc._id === currentLocationId;
              const isSelected = loc._id === selectedId;
              const isReachable = currentLocationId
                ? locations.find(l => l._id === currentLocationId)?.neighbors.includes(loc._id)
                : false;

              return (
                <Group
                  key={loc._id}
                  x={pos.x}
                  y={pos.y}
                  draggable={isEditor && tool === "select"}
                  onDragEnd={(e) => handleDragEnd(loc._id, e)}
                  onMouseDown={(e) => handleNodeMouseDown(loc._id, e)}
                  onMouseUp={() => handleNodeMouseUp(loc._id)}
                  onClick={() => handleNodeClick(loc)}
                  onDblClick={() => handleNodeDblClick(loc)}
                  onTap={() => handleNodeClick(loc)}
                  onDblTap={() => handleNodeDblClick(loc)}
                >
                  {/* Pulse effect for current location */}
                  {isCurrent && (
                    <Circle
                      radius={20}
                      fill={color}
                      opacity={0.2}
                    />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <Circle
                      radius={16}
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  )}

                  {/* Main dot */}
                  <Circle
                    radius={isCurrent ? 10 : 8}
                    fill={color}
                    opacity={!isEditor && !isCurrent && !isReachable ? 0.4 : 1}
                    shadowColor={color}
                    shadowBlur={isCurrent ? 15 : isSelected ? 10 : 0}
                    shadowOpacity={0.5}
                  />

                  {/* Shop indicator */}
                  {loc.hasShops && (
                    <Circle
                      x={6}
                      y={-6}
                      radius={4}
                      fill="#f59e0b"
                    />
                  )}

                  {/* Label */}
                  <Text
                    y={14}
                    text={loc.name}
                    fontSize={11}
                    fill={isCurrent ? "#fff" : isSelected ? "#fff" : "#94a3b8"}
                    align="center"
                    offsetX={loc.name.length * 2.8}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Player mode zoom controls */}
      {!isEditor && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-slate-900/80 rounded-lg p-1 border border-slate-800">
          <button onClick={zoomOut} className="p-2 hover:bg-slate-800 rounded text-slate-400">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={zoomIn} className="p-2 hover:bg-slate-800 rounded text-slate-400">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={fitToView} className="p-2 hover:bg-slate-800 rounded text-slate-400">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
