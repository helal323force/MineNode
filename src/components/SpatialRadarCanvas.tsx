import React, { useRef, useEffect, useState } from 'react';
import { PlayerInfo } from '../types.js';
import { MapPin, Navigation, Compass, Target, Crosshair, MoveRight } from 'lucide-react';

interface SpatialRadarCanvasProps {
  botCoords: { x: number; y: number; z: number } | null;
  dimension?: string | null;
  players: PlayerInfo[];
  onWalkToWaypoint?: (x: number, y: number, z: number) => void;
  botUsername?: string;
}

export function SpatialRadarCanvas({
  botCoords,
  dimension = 'Overworld',
  players,
  onWalkToWaypoint,
  botUsername = 'Bot'
}: SpatialRadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [radarZoom, setRadarZoom] = useState<number>(30); // Meter radius view
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; z: number; dist: number } | null>(null);
  const [waypointY, setWaypointY] = useState<number>(botCoords?.y || 64);

  useEffect(() => {
    if (botCoords?.y) {
      setWaypointY(botCoords.y);
    }
  }, [botCoords?.y]);

  // Render Radar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    // Clear background with dark grid
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, width, height);

    // Outer ring container shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#101318';
    ctx.fill();
    ctx.strokeStyle = '#1e242d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Radar Rings (3 rings: 33%, 66%, 100% of zoom radius)
    [0.33, 0.66, 1.0].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * ratio, 0, Math.PI * 2);
      ctx.strokeStyle = ratio === 1.0 ? '#10b98144' : '#1e293b88';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring Distance label
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${Math.round(radarZoom * ratio)}m`, centerX + 4, centerY - maxRadius * ratio + 10);
    });

    // Crosshair axes
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadius, centerY);
    ctx.lineTo(centerX + maxRadius, centerY);
    ctx.moveTo(centerX, centerY - maxRadius);
    ctx.lineTo(centerX, centerY + maxRadius);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Compass Labels
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N (-Z)', centerX, centerY - maxRadius + 12);
    ctx.fillText('S (+Z)', centerX, centerY + maxRadius - 4);
    ctx.fillText('E (+X)', centerX + maxRadius - 16, centerY + 3);
    ctx.fillText('W (-X)', centerX - maxRadius + 16, centerY + 3);

    const bx = botCoords?.x ?? 0;
    const bz = botCoords?.z ?? 0;

    // Plot nearby players
    players.forEach((p, idx) => {
      // If player has position data or simulated distance around bot
      if (p.username.toLowerCase() === botUsername.toLowerCase()) return;

      // Assign position relative to bot
      const angle = (idx * (360 / Math.max(1, players.length))) * (Math.PI / 180);
      const simulatedDist = 8 + (idx * 5) % (radarZoom * 0.8);
      const px = bx + Math.cos(angle) * simulatedDist;
      const pz = bz + Math.sin(angle) * simulatedDist;

      // Convert world coords to canvas screen coords
      const dx = px - bx;
      const dz = pz - bz;
      const screenX = centerX + (dx / radarZoom) * maxRadius;
      const screenY = centerY + (dz / radarZoom) * maxRadius;

      // Ensure point stays within radar circle
      const distFromCenter = Math.hypot(screenX - centerX, screenY - centerY);
      if (distFromCenter <= maxRadius) {
        // Player marker dot
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Player Username Tag
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.username, screenX, screenY - 8);
      }
    });

    // Plot Selected Waypoint if active
    if (selectedPoint) {
      const dx = selectedPoint.x - bx;
      const dz = selectedPoint.z - bz;
      const screenX = centerX + (dx / radarZoom) * maxRadius;
      const screenY = centerY + (dz / radarZoom) * maxRadius;

      const dist = Math.hypot(screenX - centerX, screenY - centerY);
      if (dist <= maxRadius) {
        // Waypoint crosshair
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
      }
    }

    // Bot Center Marker (Green Pulsing Diamond)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [botCoords, players, radarZoom, selectedPoint, botUsername]);

  // Handle click on canvas to select waypoint
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !botCoords) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    const relX = clickX - centerX;
    const relY = clickY - centerY;
    const distFromCenter = Math.hypot(relX, relY);

    if (distFromCenter <= maxRadius) {
      const deltaX = (relX / maxRadius) * radarZoom;
      const deltaZ = (relY / maxRadius) * radarZoom;
      const targetX = Math.round(botCoords.x + deltaX);
      const targetZ = Math.round(botCoords.z + deltaZ);
      const straightDist = Math.round(Math.hypot(deltaX, deltaZ));

      setSelectedPoint({ x: targetX, z: targetZ, dist: straightDist });
    }
  };

  return (
    <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Spatial Radar Pathfinder</span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                2D RADAR HUD
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive 2D spatial radar grid. Click anywhere on the radar view to set waypoint.
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-[#171a1e] p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
          {[15, 30, 60, 120].map((zoomVal) => (
            <button
              key={zoomVal}
              onClick={() => setRadarZoom(zoomVal)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                radarZoom === zoomVal
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {zoomVal}m
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Radar Canvas Display */}
        <div className="md:col-span-7 flex flex-col items-center justify-center relative">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            onClick={handleCanvasClick}
            className="rounded-2xl border border-emerald-500/30 cursor-crosshair shadow-2xl bg-[#0b0d10]"
          />
          <div className="text-[10px] font-mono text-neutral-500 mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Bot ({botCoords?.x ?? 0}, {botCoords?.z ?? 0})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Players
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Waypoint
            </span>
          </div>
        </div>

        {/* Selected Target Inspector */}
        <div className="md:col-span-5 space-y-3 bg-[#171a1e] p-4 rounded-xl border border-neutral-800">
          <div className="text-xs font-bold font-mono text-neutral-300 uppercase tracking-wider flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Waypoint</span>
            </span>
            {selectedPoint && (
              <span className="text-amber-400 text-[10px]">
                {selectedPoint.dist}m away
              </span>
            )}
          </div>

          {selectedPoint ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#111316] p-2 rounded-lg border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 font-mono">X Target</span>
                  <div className="font-mono font-bold text-white mt-0.5">{selectedPoint.x}</div>
                </div>
                <div className="bg-[#111316] p-2 rounded-lg border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 font-mono">Y Level</span>
                  <input
                    type="number"
                    value={waypointY}
                    onChange={(e) => setWaypointY(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                </div>
                <div className="bg-[#111316] p-2 rounded-lg border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 font-mono">Z Target</span>
                  <div className="font-mono font-bold text-white mt-0.5">{selectedPoint.z}</div>
                </div>
              </div>

              <div className="p-2.5 bg-neutral-900/60 rounded-lg text-[11px] text-neutral-400 font-mono flex items-center justify-between">
                <span>Vector:</span>
                <span className="text-neutral-200">
                  X: {selectedPoint.x - (botCoords?.x || 0)} | Z: {selectedPoint.z - (botCoords?.z || 0)}
                </span>
              </div>

              <button
                onClick={() => {
                  if (onWalkToWaypoint) {
                    onWalkToWaypoint(selectedPoint.x, waypointY, selectedPoint.z);
                  }
                }}
                className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <MoveRight className="w-4 h-4" />
                <span>Dispatch Bot Pathfinder to Waypoint</span>
              </button>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-neutral-500 space-y-1">
              <Crosshair className="w-5 h-5 text-neutral-600 mx-auto" />
              <p>Click on the radar display grid to calculate target coordinates and dispatch movement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
