
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapToken, TokenPosition, Combatant, MapObject, Ping, MapTemplate, TemplateType, Drawing, Point, WeatherType, VisualEffect, VFXType } from '../types';
import { User, Skull, Shield, Move, Ban, Box, DoorOpen, DoorClosed, Flame, EyeOff, Ruler, Target, Shapes, Trash2, Eraser, CloudFog, MousePointer2, Undo2, Lock, Pencil } from 'lucide-react';
import { calculateDistance } from '../utils/mechanics';
import { computeVisibilityPolygon, getMapEdges, gridToPixelCenter } from '../utils/geometry';
import VisualFX from './VisualFX';

interface BattleMapProps {
  tokens: MapToken[];
  mapObjects?: MapObject[]; 
  mapTemplates?: MapTemplate[];
  combatants: Combatant[];
  backgroundImage?: string;
  fogImage?: string; // Base64 mask (Manual Fog)
  weather?: WeatherType; // NEW
  onMoveToken: (id: string, newPos: TokenPosition, cost: number) => void;
  onInteract?: (object: MapObject) => void; 
  onPing?: (x: number, y: number) => void;
  onUpdateTemplates?: (templates: MapTemplate[]) => void;
  onUpdateFog?: (base64: string) => void;
  activePings?: Ping[];
  remainingMovement?: number; 
  activePlayerId?: string; 
  onUndo?: () => void;
  isPaused?: boolean;
  mapFocusTarget?: { x: number, y: number, timestamp: number } | null;
  drawings?: Drawing[];
  onDraw?: (points: Point[], color: string, width: number) => void;
  onDropMonster?: (x: number, y: number, monsterData: any) => void; 
  // FX Trigger (can be called from parent)
  externalEffects?: VisualEffect[];
}

const GRID_SIZE = 40; // pixels
const GRID_COLS = 20;
const GRID_ROWS = 15;

type MapTool = 'move' | 'ruler' | 'ping' | 'template' | 'fog_reveal' | 'fog_hide' | 'focus_point' | 'draw';

const BattleMap: React.FC<BattleMapProps> = ({ 
  tokens, 
  mapObjects = [],
  mapTemplates = [],
  combatants, 
  backgroundImage, 
  fogImage,
  weather = 'none',
  onMoveToken,
  onInteract,
  onPing,
  onUpdateTemplates,
  onUpdateFog,
  activePings = [],
  remainingMovement,
  activePlayerId,
  onUndo,
  isPaused,
  mapFocusTarget,
  drawings = [],
  onDraw,
  onDropMonster,
  externalEffects = []
}) => {
  const [activeTool, setActiveTool] = useState<MapTool>('move');
  const [dmViewFog, setDmViewFog] = useState(true); // DM sees semi-transparent fog
  
  // Dragging Token State
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  // Mouse State
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  
  // Ruler State
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  
  // Template State
  const [templateType, setTemplateType] = useState<TemplateType>('circle');
  const [templateSize, setTemplateSize] = useState<number>(15); // feet
  const [drawingTemplateStart, setDrawingTemplateStart] = useState<{ x: number, y: number } | null>(null);

  // Drawing State
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  const isDrawingLine = useRef(false);

  // Fog of War & Lighting Canvas
  const lightingCanvasRef = useRef<HTMLCanvasElement>(null);
  const manualFogCanvasRef = useRef<HTMLCanvasElement>(null);
  // Visited Mask (Offscreen canvas to store memory)
  const visitedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Container ref for scrolling
  const containerRef = useRef<HTMLDivElement>(null);

  const isDrawingFog = useRef(false);

  // Screen Shake State
  const [shake, setShake] = useState(false);

  // Trigger Shake on large effects (Fireball)
  useEffect(() => {
      if (externalEffects.length > 0) {
          const last = externalEffects[externalEffects.length - 1];
          if (last.type === 'fireball' || last.type === 'blood') {
              setShake(true);
              setTimeout(() => setShake(false), 500);
          }
      }
  }, [externalEffects]);

  // Initialize visited canvas once
  useEffect(() => {
    if (!visitedCanvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = GRID_COLS * GRID_SIZE;
        canvas.height = GRID_ROWS * GRID_SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Start fully black (unvisited)
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        visitedCanvasRef.current = canvas;
    }
  }, []);

  // Reset Visited Canvas on new map load
  useEffect(() => {
      const vCanvas = visitedCanvasRef.current;
      if (vCanvas && backgroundImage) {
          const ctx = vCanvas.getContext('2d');
          if (ctx) {
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = 'black';
              ctx.fillRect(0, 0, vCanvas.width, vCanvas.height);
          }
      }
  }, [backgroundImage]);

  // Handle Force Focus Scrolling
  useEffect(() => {
      if (mapFocusTarget && containerRef.current) {
          const pixelX = mapFocusTarget.x * GRID_SIZE;
          const pixelY = mapFocusTarget.y * GRID_SIZE;
          
          containerRef.current.scrollTo({
              left: pixelX - containerRef.current.clientWidth / 2,
              top: pixelY - containerRef.current.clientHeight / 2,
              behavior: 'smooth'
          });
      }
  }, [mapFocusTarget]);

  // --- PERFORMANCE OPTIMIZATION: Memoize Geometric Calculations ---
  const visibilityPolygons = useMemo(() => {
      const edges = getMapEdges(mapObjects);
      const sources = tokens.filter(t => t.type === 'player' || t.type === 'ally'); 
      
      const polygons: {x: number, y: number}[][] = [];
      if (sources.length > 0) {
          sources.forEach(token => {
               const origin = gridToPixelCenter(token.position);
               const polygon = computeVisibilityPolygon(origin, edges);
               polygons.push(polygon);
          });
      }
      return polygons;
  }, [tokens, mapObjects]); // Only recalculate if tokens move or walls change

  // --- 1. DYNAMIC LIGHTING & MEMORY RENDERING ---
  useEffect(() => {
    const canvas = lightingCanvasRef.current;
    const vCanvas = visitedCanvasRef.current;
    if (!canvas || !vCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const vCtx = vCanvas.getContext('2d');
    if (!ctx || !vCtx) return;

    // --- STEP B: Update "Visited" Memory (Offscreen) ---
    // We "cut out" the current visible polygons from the black visited mask
    if (visibilityPolygons.length > 0) {
        vCtx.globalCompositeOperation = 'destination-out'; // Remove black -> make transparent
        vCtx.fillStyle = 'white';
        
        visibilityPolygons.forEach(poly => {
            vCtx.beginPath();
            if (poly.length > 0) {
                vCtx.moveTo(poly[0].x, poly[0].y);
                for (let i = 1; i < poly.length; i++) vCtx.lineTo(poly[i].x, poly[i].y);
            }
            vCtx.closePath();
            // Add blur for soft discovery
            vCtx.shadowBlur = 30; 
            vCtx.shadowColor = 'white';
            vCtx.fill();
            vCtx.shadowBlur = 0;
        });
        vCtx.globalCompositeOperation = 'source-over';
    }

    // --- STEP C: Render Main Fog Layer (Visual) ---
    // 1. Clear Frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Unvisited Areas (Black) from vCanvas
    // vCanvas has Transparent for visited, Black for unvisited.
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(vCanvas, 0, 0);

    // 3. Draw "Explored but not visible" (Grey Dimming)
    // We cover the WHOLE map with semi-transparent black. 
    // Result: Unvisited stays Black. Visited (Transparent) becomes Grey.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Memory dimness
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 4. Cut out Active Vision (Bright)
    // We remove the grey overlay where we currently see.
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
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    // Reset composite
    ctx.globalCompositeOperation = 'source-over';

  }, [visibilityPolygons, backgroundImage]); // Dependencies reduced to memoized value + bg

  // --- 2. MANUAL FOG RENDERING (DM BRUSH) ---
  useEffect(() => {
      const canvas = manualFogCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              if (fogImage) {
                  const img = new Image();
                  img.src = fogImage;
                  img.onload = () => {
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  };
              }
          }
      }
  }, [fogImage]);

  const handleFogDraw = (e: React.MouseEvent, isStart: boolean) => {
      if (!onUpdateFog) return;
      const canvas = manualFogCanvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (isStart) isDrawingFog.current = true;
      if (!isDrawingFog.current) return;

      // 'fog_hide' adds black paint (Source Over)
      // 'fog_reveal' removes black paint (Destination Out)
      ctx.globalCompositeOperation = activeTool === 'fog_reveal' ? 'destination-out' : 'source-over';
      ctx.fillStyle = 'black';
      
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2); // Brush size
      ctx.fill();

      if (e.type === 'mouseup' || e.type === 'mouseleave') {
          isDrawingFog.current = false;
          onUpdateFog(canvas.toDataURL());
      }
  };

  // --- COORDINATE HELPERS ---
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

  // --- DRAG & DROP HANDLER (Monster Drop) ---
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const monsterDataStr = e.dataTransfer.getData('dnd-monster');
      if (monsterDataStr && onDropMonster) {
          try {
              const monsterData = JSON.parse(monsterDataStr);
              const coords = getGridCoords(e);
              onDropMonster(coords.x, coords.y, monsterData);
          } catch (err) {
              console.error("Invalid monster drop data", err);
          }
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
  };

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (activeTool === 'fog_reveal' || activeTool === 'fog_hide') {
          handleFogDraw(e, true);
          return;
      }

      if (activeTool === 'draw') {
          isDrawingLine.current = true;
          setCurrentLine([getPixelCoords(e)]);
          return;
      }

      if (isPaused) return;

      const coords = getGridCoords(e);
      
      if (activeTool === 'move') {
          const token = tokens.find(t => t.position.x === coords.x && t.position.y === coords.y);
          if (token) {
              // Only allow moving own token or if DM
              if (activePlayerId && token.id !== activePlayerId && activePlayerId !== 'DM') return;
              
              setDraggingToken(token.id);
              setDragOffset({ x: e.clientX, y: e.clientY });
          } else {
             // Check for object interaction
             const obj = mapObjects.find(o => o.position.x === coords.x && o.position.y === coords.y);
             if (obj && obj.isInteractable && onInteract) {
                 onInteract(obj);
             }
          }
      } else if (activeTool === 'ruler') {
          setRulerStart(coords);
      } else if (activeTool === 'ping' && onPing) {
          onPing(coords.x, coords.y);
          setActiveTool('move'); // Reset after ping
      } else if (activeTool === 'template') {
          setDrawingTemplateStart(coords);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const coords = getGridCoords(e);
      setMousePos(coords);

      if (activeTool === 'fog_reveal' || activeTool === 'fog_hide') {
          handleFogDraw(e, false);
          return;
      }

      if (activeTool === 'draw' && isDrawingLine.current) {
          setCurrentLine(prev => [...prev, getPixelCoords(e)]);
          return;
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (activeTool === 'fog_reveal' || activeTool === 'fog_hide') {
          handleFogDraw(e, false);
          return;
      }

      if (activeTool === 'draw' && isDrawingLine.current) {
          isDrawingLine.current = false;
          if (onDraw && currentLine.length > 1) {
              onDraw(currentLine, '#f59e0b', 3); // Default amber line
          }
          setCurrentLine([]);
          return;
      }

      if (isPaused) return;

      const coords = getGridCoords(e);

      if (activeTool === 'move' && draggingToken) {
          const token = tokens.find(t => t.id === draggingToken);
          if (token) {
              // Calculate distance
              const dist = calculateDistance(token.position, coords);
              onMoveToken(draggingToken, coords, dist);
          }
          setDraggingToken(null);
      } else if (activeTool === 'ruler') {
          setRulerStart(null); 
      } else if (activeTool === 'template' && drawingTemplateStart && onUpdateTemplates) {
          const newTemplate: MapTemplate = {
              id: Math.random().toString(36).substr(2, 9),
              type: templateType,
              x: drawingTemplateStart.x,
              y: drawingTemplateStart.y,
              size: templateSize,
              rotation: 0,
              color: 'rgba(255, 0, 0, 0.3)',
              owner: activePlayerId || 'DM'
          };
          onUpdateTemplates([...mapTemplates, newTemplate]);
          setDrawingTemplateStart(null);
          setActiveTool('move');
      }
  };

  const removeTemplate = (id: string) => {
      if (onUpdateTemplates) {
          onUpdateTemplates(mapTemplates.filter(t => t.id !== id));
      }
  };

  // --- RENDERING HELPERS ---
  const renderGrid = () => {
    const grid = [];
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        grid.push(
          <div 
            key={`${x}-${y}`} 
            className="border-[0.5px] border-white/10 absolute pointer-events-none"
            style={{ 
                left: x * GRID_SIZE, 
                top: y * GRID_SIZE, 
                width: GRID_SIZE, 
                height: GRID_SIZE 
            }}
          />
        );
      }
    }
    return grid;
  };

  const renderTemplate = (t: MapTemplate) => {
      const style: React.CSSProperties = {
          position: 'absolute',
          left: t.x * GRID_SIZE + GRID_SIZE / 2,
          top: t.y * GRID_SIZE + GRID_SIZE / 2,
          backgroundColor: t.color,
          border: '2px solid rgba(255,0,0,0.5)',
          pointerEvents: 'none',
          transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
          zIndex: 5
      };
      
      const pixelSize = (t.size / 5) * GRID_SIZE; 

      if (t.type === 'circle') {
          style.width = pixelSize * 2;
          style.height = pixelSize * 2;
          style.borderRadius = '50%';
      } else if (t.type === 'cube') {
          style.width = pixelSize;
          style.height = pixelSize;
      } else if (t.type === 'cone') {
           style.width = 0;
           style.height = 0;
           style.backgroundColor = 'transparent';
           style.borderLeft = `${pixelSize/2}px solid transparent`;
           style.borderRight = `${pixelSize/2}px solid transparent`;
           style.borderTop = `${pixelSize}px solid ${t.color}`;
           style.borderBottom = 'none';
      }

      return (
          <div key={t.id}>
              <div style={style} />
               {activeTool === 'template' && (
                   <button 
                     className="absolute z-50 bg-red-600 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px] hover:scale-110"
                     style={{ left: t.x * GRID_SIZE, top: t.y * GRID_SIZE }}
                     onClick={(e) => { e.stopPropagation(); removeTemplate(t.id); }}
                   >
                       <Trash2 className="w-3 h-3" />
                   </button>
               )}
          </div>
      );
  };

  return (
    <div className="w-full h-full flex flex-col relative select-none">
      
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 bg-stone-900/90 p-2 rounded border border-stone-700 shadow-xl backdrop-blur-sm">
         <button 
            onClick={() => setActiveTool('move')}
            className={`p-2 rounded ${activeTool === 'move' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
            title="Переміщення (Move)"
         >
            <MousePointer2 className="w-5 h-5" />
         </button>
         
         <button 
            onClick={() => setActiveTool('ruler')}
            className={`p-2 rounded ${activeTool === 'ruler' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
            title="Лінійка (Ruler)"
         >
            <Ruler className="w-5 h-5" />
         </button>
         
         <button 
            onClick={() => setActiveTool('ping')}
            className={`p-2 rounded ${activeTool === 'ping' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
            title="Пінг (Ping)"
         >
            <Target className="w-5 h-5" />
         </button>

         <div className="w-full h-px bg-stone-700 my-1" />
         
         <button 
            onClick={() => setActiveTool('template')}
            className={`p-2 rounded ${activeTool === 'template' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
            title="Шаблони (AoE)"
         >
            <Shapes className="w-5 h-5" />
         </button>

         {activeTool === 'template' && (
             <div className="absolute left-full top-32 ml-2 bg-stone-900 p-2 rounded border border-stone-700 flex flex-col gap-2 w-32">
                 <select 
                    value={templateType} 
                    onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                    className="bg-stone-800 text-xs p-1 rounded border border-stone-600 text-stone-300"
                 >
                     <option value="circle">Sphere</option>
                     <option value="cube">Cube</option>
                     <option value="cone">Cone</option>
                 </select>
                 <div className="flex items-center gap-1">
                     <input 
                        type="number" 
                        value={templateSize} 
                        onChange={(e) => setTemplateSize(Number(e.target.value))}
                        className="w-full bg-stone-800 text-xs p-1 rounded border border-stone-600 text-stone-300"
                     />
                     <span className="text-[10px] text-stone-500">ft</span>
                 </div>
             </div>
         )}

         <button 
            onClick={() => setActiveTool('draw')}
            className={`p-2 rounded ${activeTool === 'draw' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
            title="Малювання (Draw)"
         >
            <Pencil className="w-5 h-5" />
         </button>

         {onUpdateFog && (
             <>
                 <div className="w-full h-px bg-stone-700 my-1" />
                 <button 
                    onClick={() => setActiveTool('fog_reveal')}
                    className={`p-2 rounded ${activeTool === 'fog_reveal' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
                    title="Розкрити Туман (Pen)"
                 >
                    <Eraser className="w-5 h-5" />
                 </button>
                 <button 
                    onClick={() => setActiveTool('fog_hide')}
                    className={`p-2 rounded ${activeTool === 'fog_hide' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
                    title="Сховати Туман (Brush)"
                 >
                    <CloudFog className="w-5 h-5" />
                 </button>
                 <button 
                    onClick={() => setDmViewFog(!dmViewFog)}
                    className={`p-2 rounded ${!dmViewFog ? 'bg-blue-900 text-blue-300' : 'text-stone-500 hover:bg-stone-800'}`}
                    title="Перемикач виду Майстра (Туман)"
                 >
                    <EyeOff className="w-5 h-5" />
                 </button>
             </>
         )}
      </div>

      {isPaused && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-red-900/80 text-white px-4 py-2 rounded-full border border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2 animate-pulse">
                  <Lock className="w-4 h-4" /> ГРА НА ПАУЗІ
              </div>
          </div>
      )}

      {onUndo && (
          <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={onUndo}
                className="bg-stone-900/80 text-stone-300 hover:text-white p-2 rounded border border-stone-700 flex items-center gap-2 text-xs font-bold"
              >
                  <Undo2 className="w-4 h-4" /> Скасувати Рух
              </button>
          </div>
      )}

      {remainingMovement !== undefined && activePlayerId && (
           <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
               <div className={`bg-black/60 backdrop-blur rounded px-3 py-1 border ${remainingMovement > 0 ? 'border-green-600 text-green-400' : 'border-red-600 text-red-500'}`}>
                   <span className="text-xs font-bold uppercase">Рух: {remainingMovement} ft</span>
               </div>
           </div>
      )}

      <div 
        className="relative overflow-auto bg-[#1c1917] flex items-center justify-center"
        style={{ width: '100%', height: '100%', cursor: isPaused ? 'not-allowed' : activeTool === 'move' ? 'grab' : activeTool === 'draw' ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ref={containerRef}
      >
        <div 
            className={`relative shadow-2xl ${shake ? 'animate-shake' : ''}`}
            style={{ width: GRID_COLS * GRID_SIZE, height: GRID_ROWS * GRID_SIZE }}
        >
             {/* 1. Background */}
             {backgroundImage && (
                 <img 
                    src={backgroundImage} 
                    alt="Battle Map" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                 />
             )}
             
             {/* 2. Grid */}
             <div className="absolute inset-0 pointer-events-none opacity-30">
                 {renderGrid()}
             </div>

             {/* 3. Templates */}
             {mapTemplates.map(renderTemplate)}

             {/* 4. Objects */}
             {mapObjects.map(obj => {
                 let Icon = Box;
                 let color = "text-stone-400";
                 let showLock = obj.state === 'locked';

                 if (obj.type === 'door') { 
                     Icon = obj.state === 'open' ? DoorOpen : DoorClosed; 
                     color = "text-amber-600"; 
                 }
                 else if (obj.type === 'tree') { Icon = activeTool === 'move' ? Ban : Box; color = "text-green-700"; }
                 else if (obj.type === 'fire') { Icon = Flame; color = "text-orange-500 animate-pulse"; }
                 else if (obj.type === 'chest') { Icon = Box; color = "text-amber-400"; }

                 return (
                     <div 
                        key={obj.id}
                        className={`absolute flex items-center justify-center transition-all ${obj.type === 'door' || obj.type === 'chest' ? 'z-10 cursor-pointer hover:scale-110' : 'z-0'}`}
                        style={{
                            left: obj.position.x * GRID_SIZE,
                            top: obj.position.y * GRID_SIZE,
                            width: GRID_SIZE,
                            height: GRID_SIZE
                        }}
                        title={obj.description || obj.type}
                     >
                         <div className={`bg-black/50 p-1 rounded-md ${color} relative`}>
                             <Icon className="w-6 h-6" />
                             {showLock && (
                                 <div className="absolute -top-1 -right-1 bg-black rounded-full p-0.5 border border-stone-600">
                                     <Lock className="w-3 h-3 text-red-500" />
                                 </div>
                             )}
                         </div>
                     </div>
                 );
             })}

             {/* 5. Tokens */}
             {tokens.map(token => {
                 const combatant = combatants.find(c => c.name === token.id);
                 const isAlly = token.type === 'ally';
                 const isEnemy = token.type === 'enemy';
                 const isDragging = draggingToken === token.id;
                 
                 const pos = isDragging && mousePos ? mousePos : token.position;
                 
                 return (
                     <div 
                        key={token.id}
                        className={`absolute transition-all duration-200 z-20 ${isDragging ? 'scale-110 z-30 opacity-80' : ''}`}
                        style={{
                            left: pos.x * GRID_SIZE,
                            top: pos.y * GRID_SIZE,
                            width: token.size * GRID_SIZE,
                            height: token.size * GRID_SIZE
                        }}
                     >
                         {combatant?.isCurrentTurn && (
                             <div className="absolute -inset-1 rounded-full border-2 border-white animate-pulse shadow-[0_0_10px_white]" />
                         )}

                         <div className={`
                            w-full h-full rounded-full border-2 overflow-hidden shadow-lg bg-stone-800 flex items-center justify-center relative
                            ${isEnemy ? 'border-red-500' : isAlly ? 'border-blue-400' : 'border-amber-500'}
                         `}>
                             {token.imageUrl ? (
                                 <img src={token.imageUrl} alt={token.id} className="w-full h-full object-cover" draggable={false} />
                             ) : (
                                 isEnemy ? <Skull className="w-3/4 h-3/4 text-red-500" /> : <User className="w-3/4 h-3/4 text-stone-300" />
                             )}
                             
                             {combatant?.conditions && combatant.conditions.length > 0 && (
                                 <div className="absolute top-0 right-0 p-0.5 bg-black/70 rounded-bl-lg">
                                     <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                 </div>
                             )}
                         </div>

                         {combatant && combatant.maxHp && (
                             <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-black rounded-full overflow-hidden border border-black/50">
                                 <div 
                                    className={`h-full ${isEnemy ? 'bg-red-600' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, ((combatant.hp || 0) / combatant.maxHp) * 100))}%` }}
                                 />
                             </div>
                         )}
                         
                         <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 px-1.5 rounded text-[8px] text-white pointer-events-none">
                             {token.id}
                         </div>
                     </div>
                 );
             })}

             {/* 6. Ruler */}
             {activeTool === 'ruler' && rulerStart && mousePos && (
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-40" style={{ overflow: 'visible' }}>
                     <line 
                        x1={rulerStart.x * GRID_SIZE + GRID_SIZE/2} 
                        y1={rulerStart.y * GRID_SIZE + GRID_SIZE/2}
                        x2={mousePos.x * GRID_SIZE + GRID_SIZE/2}
                        y2={mousePos.y * GRID_SIZE + GRID_SIZE/2}
                        stroke="#f59e0b" 
                        strokeWidth="2" 
                        strokeDasharray="5,5"
                     />
                     <text 
                        x={(rulerStart.x + mousePos.x)/2 * GRID_SIZE} 
                        y={(rulerStart.y + mousePos.y)/2 * GRID_SIZE - 10} 
                        fill="white" 
                        fontSize="12" 
                        fontWeight="bold"
                        textAnchor="middle"
                        style={{ textShadow: '0 0 4px black' }}
                     >
                         {calculateDistance(rulerStart, mousePos)} ft
                     </text>
                 </svg>
             )}

             {/* 7. Pings */}
             {activePings.map(ping => (
                 <div 
                    key={ping.id}
                    className="absolute pointer-events-none z-50"
                    style={{
                        left: ping.x * GRID_SIZE,
                        top: ping.y * GRID_SIZE,
                        width: GRID_SIZE,
                        height: GRID_SIZE
                    }}
                 >
                     <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping" />
                     <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-pulse" />
                 </div>
             ))}

             {/* 8. VISUAL EFFECTS LAYER (Particles & Weather) */}
             <VisualFX 
                width={GRID_COLS * GRID_SIZE}
                height={GRID_ROWS * GRID_SIZE}
                weather={weather}
                activeEffects={externalEffects}
             />

             {/* 9. DYNAMIC LIGHTING / FOG LAYER */}
             <canvas 
                ref={lightingCanvasRef}
                width={GRID_COLS * GRID_SIZE}
                height={GRID_ROWS * GRID_SIZE}
                className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-300"
                style={{ opacity: activePlayerId === 'DM' ? (dmViewFog ? 0.5 : 1) : 1 }}
             />

             {/* 10. MANUAL FOG LAYER (Magical Darkness) */}
             <canvas 
                ref={manualFogCanvasRef}
                width={GRID_COLS * GRID_SIZE}
                height={GRID_ROWS * GRID_SIZE}
                className={`absolute inset-0 z-40 transition-opacity duration-300 ${activeTool === 'fog_reveal' || activeTool === 'fog_hide' ? 'pointer-events-auto' : 'pointer-events-none'}`}
                style={{ opacity: activePlayerId === 'DM' ? (dmViewFog ? 0.7 : 1) : 1 }}
             />

             {/* 11. DRAWINGS LAYER */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {drawings.map(d => (
                    <polyline 
                       key={d.id}
                       points={d.points.map(p => `${p.x},${p.y}`).join(' ')}
                       fill="none"
                       stroke={d.color}
                       strokeWidth={d.width}
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       opacity="0.8"
                    />
                ))}
                {currentLine.length > 0 && (
                    <polyline 
                       points={currentLine.map(p => `${p.x},${p.y}`).join(' ')}
                       fill="none"
                       stroke="#f59e0b"
                       strokeWidth="3"
                       strokeLinecap="round"
                       strokeLinejoin="round"
                    />
                )}
             </svg>

        </div>
      </div>
    </div>
  );
};

export default BattleMap;
