
import React, { useRef, useState, useEffect } from 'react';
import { TRIANGLE_SIZE, GRID_COLS, GRID_ROWS, TRIANGLE_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface GlyphEditorProps {
  char: string;
  initialGridState?: string[];
  backgroundImageUrl?: string | null;
  onSave: (sketchBase64: string | undefined, gridState: string[]) => void;
  onCancel: () => void;
}

export const GlyphEditor: React.FC<GlyphEditorProps> = ({ char, initialGridState, backgroundImageUrl, onSave, onCancel }) => {
  const [activeCells, setActiveCells] = useState<Set<string>>(() => new Set(initialGridState || []));
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetState, setDragTargetState] = useState<boolean>(true); // true = turning ON, false = turning OFF
  
  // Hidden canvas for exporting the grid to an image
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate SVG path points for a triangle at row r, col c
  const getPoints = (r: number, c: number) => {
    const xBase = (c * TRIANGLE_SIZE) / 2;
    const yBase = r * TRIANGLE_HEIGHT;
    // Checkerboard pattern for up/down triangles
    const isUp = (r + c) % 2 === 0;

    if (isUp) {
      // Pointing Up
      return `${xBase},${yBase + TRIANGLE_HEIGHT} ${xBase + TRIANGLE_SIZE / 2},${yBase} ${xBase + TRIANGLE_SIZE},${yBase + TRIANGLE_HEIGHT}`;
    } else {
      // Pointing Down
      return `${xBase},${yBase} ${xBase + TRIANGLE_SIZE},${yBase} ${xBase + TRIANGLE_SIZE / 2},${yBase + TRIANGLE_HEIGHT}`;
    }
  };

  const toggleCell = (r: number, c: number, forceState?: boolean) => {
    const key = `${r}-${c}`;
    setActiveCells(prev => {
      const next = new Set(prev);
      const currentState = next.has(key);
      const newState = forceState !== undefined ? forceState : !currentState;
      
      if (newState) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  // Mouse Event Handlers for Draw/Drag
  const handleMouseDown = (r: number, c: number) => {
    setIsDragging(true);
    const key = `${r}-${c}`;
    const willBeActive = !activeCells.has(key);
    setDragTargetState(willBeActive);
    toggleCell(r, c, willBeActive);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isDragging) {
      toggleCell(r, c, dragTargetState);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    setActiveCells(new Set());
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Reset canvas to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 2. Draw active triangles in black
    ctx.fillStyle = 'black';
    // Small overlap to prevent subpixel gaps
    ctx.strokeStyle = 'black'; 
    ctx.lineWidth = 1;

    activeCells.forEach(key => {
      const [r, c] = key.split('-').map(Number);
      const xBase = (c * TRIANGLE_SIZE) / 2;
      const yBase = r * TRIANGLE_HEIGHT;
      const isUp = (r + c) % 2 === 0;

      ctx.beginPath();
      if (isUp) {
         ctx.moveTo(xBase, yBase + TRIANGLE_HEIGHT);
         ctx.lineTo(xBase + TRIANGLE_SIZE / 2, yBase);
         ctx.lineTo(xBase + TRIANGLE_SIZE, yBase + TRIANGLE_HEIGHT);
      } else {
         ctx.moveTo(xBase, yBase);
         ctx.lineTo(xBase + TRIANGLE_SIZE, yBase);
         ctx.lineTo(xBase + TRIANGLE_SIZE / 2, yBase + TRIANGLE_HEIGHT);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 3. Export
    const dataUrl = activeCells.size > 0 ? canvas.toDataURL('image/png') : undefined;
    const gridStateArray = Array.from(activeCells);
    onSave(dataUrl, gridStateArray);
  };

  // Generate grid cells
  const gridCells = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${r}-${c}`;
      const isActive = activeCells.has(key);
      gridCells.push(
        <polygon
          key={key}
          points={getPoints(r, c)}
          fill={isActive ? '#111827' : 'transparent'} // stone-900 or transparent
          stroke={isActive ? '#111827' : '#E5E7EB'} // stone-900 or stone-200
          strokeWidth="1"
          className="transition-colors duration-75 cursor-pointer hover:opacity-80"
          onMouseDown={() => handleMouseDown(r, c)}
          onMouseEnter={() => handleMouseEnter(r, c)}
        />
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Grid Editor */}
        <div className="flex-1 bg-stone-50 p-6 flex flex-col items-center justify-center relative select-none">
           <h3 className="absolute top-4 left-6 text-sm font-semibold text-stone-500 uppercase tracking-wide">
             Design Structure for {char}
           </h3>
           
           <div className="relative aspect-square w-full max-w-[450px] bg-white shadow-sm border border-stone-200 rounded-lg overflow-hidden touch-none p-4 flex items-center justify-center">
              {/* Optional Background Image for Tracing (AI Generated or previous edit) */}
              {!initialGridState && backgroundImageUrl && activeCells.size === 0 && (
                <div className="absolute inset-0 p-4 opacity-20 pointer-events-none flex items-center justify-center">
                   <img src={backgroundImageUrl} className="w-full h-full object-contain" alt="Trace Reference" />
                </div>
              )}

              <svg 
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                className="w-full h-full drop-shadow-sm relative z-10"
                style={{ maxHeight: '100%', maxWidth: '100%' }}
                onMouseLeave={handleMouseUp}
              >
                {gridCells}
              </svg>
           </div>
           
           <div className="mt-4 flex gap-4 items-center">
             <button 
               onClick={handleClear}
               className="text-xs font-medium text-stone-500 hover:text-red-500 underline"
             >
               Clear Grid
             </button>
             <span className="text-xs text-stone-400 border-l border-stone-300 pl-4">
               Click or drag to toggle triangles
             </span>
           </div>

           {/* Hidden Canvas for Export */}
           <canvas 
             ref={canvasRef}
             width={CANVAS_WIDTH}
             height={CANVAS_HEIGHT}
             className="hidden"
           />
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-80 p-6 flex flex-col border-l border-stone-200 bg-white">
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-stone-800 mb-1">Edit Glyph {char}</h2>
            <p className="text-sm text-stone-500">Construct a geometric design for this character.</p>
          </div>

          <div className="flex-1 space-y-6">
             <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
               <h4 className="text-sm font-semibold text-stone-700 mb-2">Instructions</h4>
               <ul className="text-sm text-stone-600 space-y-2 list-disc list-inside">
                 <li>Click any triangle to toggle it black/white.</li>
                 <li>Click and drag to paint multiple triangles.</li>
                 <li>Create a solid shape or a pattern.</li>
                 <li>This design will be saved directly as the final glyph.</li>
               </ul>
             </div>
             
             {!initialGridState && backgroundImageUrl && (
                <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                    <p className="text-xs text-teal-800">
                        <strong>Tracing Mode:</strong> The existing AI image is shown in the background to help you recreate structure on the grid.
                    </p>
                </div>
             )}
          </div>

          <div className="mt-8 flex gap-3 pt-6 border-t border-stone-100">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-medium transition-colors shadow-lg shadow-teal-600/20"
            >
              Save Glyph
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
