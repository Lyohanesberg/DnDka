import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { calculateDistance } from '../utils/mechanics';
import { computeVisibilityPolygon, getMapEdges, gridToPixelCenter } from '../utils/geometry';
import VisualFX from './VisualFX';
import { MousePointer2, Ruler, Target, Shapes, Trash2, Eraser, CloudFog, Pencil, Undo2, Lock, Box, DoorOpen, DoorClosed, Flame, Ban, Square } from 'lucide-react';
import { MapTemplate, TemplateType, Point } from '../types';
import { peerService } from '../services/peerService';

const GRID_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;

const BattleMap = React.memo(() => {
  const { 
    mapTokens, mapObjects, mapTemplates, combatState, location, activePings, 
    visualEffects, mapFocusTarget, drawings, character, mpMode, isGamePaused,
    moveToken, updateMapObject, pingMap, addTemplate, removeTemplate, 
    updateFog, addDrawing, undoMove, updateLocation, remoteCursors
  } = useGameStore(useShallow(state => ({
    mapTokens: state.mapTokens,
    mapObjects: state.mapObjects,
    mapTemplates: state.mapTemplates,
    combatState: state.combatState,
    location: state.location,
    activePings: state.activePings,
    visualEffects: state.visualEffects,
    mapFocusTarget: state.mapFocusTarget,
    drawings: state.drawings,
    character: state.character,
    mpMode: state.mpMode,
    isGamePaused: state.isGamePaused,
    moveToken: state.moveToken,
    updateMapObject: state.updateMapObject,
    pingMap: state.pingMap,
    addTemplate: state.addTemplate,
    removeTemplate: state.removeTemplate,
    updateFog: state.updateFog,
    addDrawing: state.addDrawing,
    undoMove: state.undoMove,
    updateLocation: state.updateLocation,
    remoteCursors: state.remoteCursors
  })));

  const activePlayerId = mpMode === 'host' || mpMode === 'none' ? 'DM' : character.name;
  const isDM = activePlayerId === 'DM';

  const [activeTool, setActiveTool] = useState<'move'|'ruler'|'ping'|'template'|'draw'|'rect'|'fog_reveal'|'fog_hide'>('move');
  const [dmViewFog, setDmViewFog] = useState(true);
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null); // Grid coords
  const [mousePixelPos, setMousePixelPos] = useState<{ x: number, y: number } | null>(null); // Pixel coords for drawing
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  const [templateType, setTemplateType] = useState<TemplateType>('circle');
  const [templateSize, setTemplateSize] = useState<number>(15);
  const [drawingTemplateStart, setDrawingTemplateStart] = useState<{ x: number, y: number } | null>(null);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  
  const isDrawingLine = useRef(false);
  const isDrawingFog = useRef(false);
  const lightingCanvasRef = useRef<HTMLCanvasElement>(null);
  const manualFogCanvasRef = useRef<HTMLCanvasElement>(null);
  const visitedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Throttle cursor updates
  const lastCursorUpdate = useRef<number>(0);

  // --- Memoized Geometry ---
  const visibilityPolygons = useMemo(() => {
      const edges = getMapEdges(mapObjects);
      const sources = mapTokens.filter(t => t.type === 'player' || t.type === 'ally'); 
      const polygons: {x: number, y: number}[][] = [];
      if (sources.length > 0) {
          sources.forEach(token => {
               const origin = gridToPixelCenter(token.position);
               const polygon = computeVisibilityPolygon(origin, edges);
               polygons.push(polygon);
          });
      }
      return polygons;
  }, [mapTokens, mapObjects]);

  // --- Fog Rendering Logic ---
  useEffect(() => {
    if (!visitedCanvasRef.current) {
        const c = document.createElement('canvas');
        c.width = GRID_COLS * GRID_SIZE;
        c.height = GRID_ROWS * GRID_SIZE;
        const ctx = c.getContext('2d');
        if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0,0,c.width,c.height); }
        visitedCanvasRef.current = c;
    }
    
    // Reset visited canvas when background changes (new map)
    const vCanvas = visitedCanvasRef.current;
    if (vCanvas && location.imageUrl) {
         // Logic to reset if needed
    }

    const canvas = lightingCanvasRef.current;
    if (!canvas || !vCanvas) return;
    const ctx = canvas.getContext('2d');
    const vCtx = vCanvas.getContext('2d');
    if (!ctx || !vCtx) return;

    // Update Visited Mask
    if (visibilityPolygons.length > 0) {
        vCtx.globalCompositeOperation = 'destination-out';
        vCtx.fillStyle = 'white';
        visibilityPolygons.forEach(poly => {
            vCtx.beginPath();
            if (poly.length > 0) {
                vCtx.moveTo(poly[0].x, poly[0].y);
                for (let i = 1; i < poly.length; i++) vCtx.lineTo(poly[i].x, poly[i].y);
            }
            vCtx.closePath();
            vCtx.shadowBlur = 30; vCtx.shadowColor = 'white'; vCtx.fill(); vCtx.shadowBlur = 0;
        });
        vCtx.globalCompositeOperation = 'source-over';
    }

    // Render Fog
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(vCanvas, 0, 0); // Unvisited = Black
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Explored = Dim
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (visibilityPolygons.length > 0) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'white';
        visibilityPolygons.forEach(poly => {
            ctx.beginPath();
            if (poly.length > 0) {
                ctx.moveTo(poly[0].x, poly[0].y);
                for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
            }
            ctx.closePath();
            ctx.shadowBlur = 20; ctx.shadowColor = 'white'; ctx.fill(); ctx.shadowBlur = 0;
        });
    }
    ctx.globalCompositeOperation = 'source-over';

  }, [visibilityPolygons, location.imageUrl]); // Only redraw when geometry changes or BG changes

  // Manual Fog Rendering
  useEffect(() => {
      const canvas = manualFogCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              if (location.fogOfWar) {
                  const img = new Image();
                  img.src = location.fogOfWar;
                  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
          }
      }
  }, [location.fogOfWar]);

  const handleManualFog = (e: React.MouseEvent, isStart: boolean) => {
      if (!updateFog) return;
      const canvas = manualFogCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (isStart) isDrawingFog.current = true;
      if (!isDrawingFog.current) return;

      ctx.globalCompositeOperation = activeTool === 'fog_reveal' ? 'destination-out' : 'source-over';
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();

      if (e.type === 'mouseup' || e.type === 'mouseleave') {
          isDrawingFog.current = false;
          updateFog(canvas.toDataURL());
      }
  };

  const getGridCoords = (e: React.MouseEvent | React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);
    return { x: Math.max(0, Math.min(GRID_COLS - 1, x)), y: Math.max(0, Math.min(GRID_ROWS - 1, y)) };
  };

  const getPixelCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (activeTool === 'fog_reveal' || activeTool === 'fog_hide') {
          handleManualFog(e, true);
          return;
      }
      if (activeTool === 'draw') {
          isDrawingLine.current = true;
          setCurrentLine([getPixelCoords(e)]);
          return;
      }
      if (isGamePaused && !isDM) return;

      const coords = getGridCoords(e);
      if (activeTool === 'move') {
          const token = mapTokens.find(t => t.position.x === coords.x && t.position.y === coords.y);
          if (token) {
              if (activePlayerId && token.id !== activePlayerId && !isDM) return;
              setDraggingToken(token.id);
          } else {
             const obj = mapObjects.find(o => o.position.x === coords.x && o.position.y === coords.y);
             if (obj && obj.isInteractable) {
                 const newState = obj.state === 'open' ? 'closed' : 'open';
                 updateMapObject({ ...obj, state: newState, isPassable: newState === 'open' });
             }
          }
      } else if (activeTool === 'ruler') {
          setRulerStart(coords);
      } else if (activeTool === 'ping') {
          pingMap(coords.x, coords.y, activePlayerId);
          setActiveTool('move');
      } else if (activeTool === 'template') {
          setDrawingTemplateStart(coords);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      setMousePos(getGridCoords(e));
      setMousePixelPos(getPixelCoords(e));

      // Broadcast cursor logic (throttled)
      const now = Date.now();
      if (mpMode !== 'none' && now - lastCursorUpdate.current > 100) {
          const px = getPixelCoords(e);
          // peerService.broadcastMesh({ type: 'CURSOR_MOVE', payload: { peerId: peerService.myPeerId, x: px.x, y: px.y, color: '#f59e0b' } });
          lastCursorUpdate.current = now;
      }

      if (activeTool === 'fog_reveal' || activeTool === 'fog_hide') {
          handleManualFog(e, false);
          return;
      }
      if (activeTool === 'draw' && isDrawingLine.current) {
          setCurrentLine(prev => [...prev, getPixelCoords(e)]);
          return;
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (activeTool === 'fog_reveal' || activeTool === 'fog_hide') {
          handleManualFog(e, false);
          return;
      }
      if (activeTool === 'draw' && isDrawingLine.current) {
          isDrawingLine.current = false;
          if (currentLine.length > 1) {
              addDrawing({
                  id: Math.random().toString(36),
                  points: currentLine,
                  color: '#f59e0b',
                  width: 3,
                  timestamp: Date.now()
              });
          }
          setCurrentLine([]);
          return;
      }
      
      if (isGamePaused && !isDM) return;
      const coords = getGridCoords(e);

      if (activeTool === 'move' && draggingToken) {
          const token = mapTokens.find(t => t.id === draggingToken);
          if (token) {
              const dist = calculateDistance(token.position, coords);
              moveToken(draggingToken, coords, dist);
          }
          setDraggingToken(null);
      } else if (activeTool === 'ruler') {
          setRulerStart(null);
      } else if (activeTool === 'template' && drawingTemplateStart) {
          addTemplate({
              id: Math.random().toString(36),
              type: templateType,
              x: drawingTemplateStart.x,
              y: drawingTemplateStart.y,
              size: templateSize,
              rotation: 0,
              color: 'rgba(255, 0, 0, 0.3)',
              owner: activePlayerId
          });
          setDrawingTemplateStart(null);
          setActiveTool('move');
      }
  };

  const renderGrid = () => {
    const grid = [];
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        grid.push(
          <div key={`${x}-${y}`} className="border-[0.5px] border-white/10 absolute pointer-events-none" style={{ left: x * GRID_SIZE, top: y * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }} />
        );
      }
    }
    return grid;
  };

  return (
    <div className="w-full h-full flex flex-col relative select-none">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 bg-stone-900/90 p-2 rounded border border-stone-700 shadow-xl backdrop-blur-sm">
         <button onClick={() => setActiveTool('move')} className={`p-2 rounded ${activeTool === 'move' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><MousePointer2 className="w-5 h-5" /></button>
         <button onClick={() => setActiveTool('ruler')} className={`p-2 rounded ${activeTool === 'ruler' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><Ruler className="w-5 h-5" /></button>
         <button onClick={() => setActiveTool('ping')} className={`p-2 rounded ${activeTool === 'ping' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><Target className="w-5 h-5" /></button>
         <button onClick={() => setActiveTool('template')} className={`p-2 rounded ${activeTool === 'template' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><Shapes className="w-5 h-5" /></button>
         <button onClick={() => setActiveTool('draw')} className={`p-2 rounded ${activeTool === 'draw' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><Pencil className="w-5 h-5" /></button>
         {isDM && (
             <>
                 <div className="w-full h-px bg-stone-700 my-1" />
                 <button onClick={() => setActiveTool('fog_reveal')} className={`p-2 rounded ${activeTool === 'fog_reveal' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><Eraser className="w-5 h-5" /></button>
                 <button onClick={() => setActiveTool('fog_hide')} className={`p-2 rounded ${activeTool === 'fog_hide' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}><CloudFog className="w-5 h-5" /></button>
             </>
         )}
      </div>

      <div className="relative overflow-auto bg-[#1c1917] flex items-center justify-center" style={{ width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
      >
        <div className="relative shadow-2xl" style={{ width: GRID_COLS * GRID_SIZE, height: GRID_ROWS * GRID_SIZE }}>
             {location.imageUrl && <img src={location.imageUrl} alt="Map" className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />}
             <div className="absolute inset-0 pointer-events-none opacity-30">{renderGrid()}</div>
             
             {/* Map Objects */}
             {mapObjects.map(obj => (
                 <div key={obj.id} className="absolute flex items-center justify-center" style={{ left: obj.position.x * GRID_SIZE, top: obj.position.y * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }}>
                     <div className={`bg-black/50 p-1 rounded-md text-stone-400`}>
                         {obj.type === 'door' ? (obj.state === 'open' ? <DoorOpen className="w-6 h-6 text-amber-600"/> : <DoorClosed className="w-6 h-6 text-amber-600"/>) : <Box className="w-6 h-6"/>}
                     </div>
                 </div>
             ))}

             {/* Tokens */}
             {mapTokens.map(token => (
                 <div key={token.id} className="absolute z-20 transition-all duration-200" style={{ left: token.position.x * GRID_SIZE, top: token.position.y * GRID_SIZE, width: token.size * GRID_SIZE, height: token.size * GRID_SIZE }}>
                     <div className={`w-full h-full rounded-full border-2 overflow-hidden shadow-lg bg-stone-800 flex items-center justify-center ${token.type === 'enemy' ? 'border-red-500' : 'border-amber-500'}`}>
                         {token.imageUrl ? <img src={token.imageUrl} className="w-full h-full object-cover" /> : <div className="text-xs text-white">{token.id.slice(0,2)}</div>}
                     </div>
                 </div>
             ))}

             {/* Ruler */}
             {activeTool === 'ruler' && rulerStart && mousePos && (
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                     <line x1={rulerStart.x * GRID_SIZE + GRID_SIZE/2} y1={rulerStart.y * GRID_SIZE + GRID_SIZE/2} x2={mousePos.x * GRID_SIZE + GRID_SIZE/2} y2={mousePos.y * GRID_SIZE + GRID_SIZE/2} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" />
                 </svg>
             )}

             {/* Templates */}
             {mapTemplates.map(t => (
                 <div key={t.id} className="absolute z-10 border-2 border-red-500/50 bg-red-500/20 rounded-full pointer-events-none" 
                      style={{ left: t.x * GRID_SIZE + GRID_SIZE/2 - (t.size/5)*GRID_SIZE, top: t.y * GRID_SIZE + GRID_SIZE/2 - (t.size/5)*GRID_SIZE, width: (t.size/5)*GRID_SIZE*2, height: (t.size/5)*GRID_SIZE*2 }} />
             ))}

             <VisualFX width={GRID_COLS * GRID_SIZE} height={GRID_ROWS * GRID_SIZE} weather={location.weather} activeEffects={visualEffects} />
             
             {/* Fog Layers */}
             <canvas ref={lightingCanvasRef} width={GRID_COLS * GRID_SIZE} height={GRID_ROWS * GRID_SIZE} className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-300" style={{ opacity: isDM ? (dmViewFog ? 0.5 : 1) : 1 }} />
             <canvas ref={manualFogCanvasRef} width={GRID_COLS * GRID_SIZE} height={GRID_ROWS * GRID_SIZE} className={`absolute inset-0 z-40 transition-opacity duration-300 ${activeTool === 'fog_reveal' || activeTool === 'fog_hide' ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ opacity: isDM ? (dmViewFog ? 0.7 : 1) : 1 }} />
             
             {/* Drawings */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {drawings.map(d => (
                    <polyline key={d.id} points={d.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={d.color} strokeWidth={d.width} strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                ))}
                {currentLine.length > 0 && <polyline points={currentLine.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
             </svg>
        </div>
      </div>
    </div>
  );
});

export default BattleMap;