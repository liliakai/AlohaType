
import React from 'react';
import { TRIANGLE_SIZE, GRID_COLS, GRID_ROWS, TRIANGLE_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface GlyphDisplayProps {
  gridState: string[];
  color?: string;
  className?: string;
}

export const GlyphDisplay: React.FC<GlyphDisplayProps> = ({ gridState, color = '#111827', className = '' }) => {
  const activeCells = new Set(gridState);

  const getPoints = (r: number, c: number) => {
    const xBase = (c * TRIANGLE_SIZE) / 2;
    const yBase = r * TRIANGLE_HEIGHT;
    const isUp = (r + c) % 2 === 0;

    if (isUp) {
      return `${xBase},${yBase + TRIANGLE_HEIGHT} ${xBase + TRIANGLE_SIZE / 2},${yBase} ${xBase + TRIANGLE_SIZE},${yBase + TRIANGLE_HEIGHT}`;
    } else {
      return `${xBase},${yBase} ${xBase + TRIANGLE_SIZE},${yBase} ${xBase + TRIANGLE_SIZE / 2},${yBase + TRIANGLE_HEIGHT}`;
    }
  };

  const polygons = [];
  // Render only active cells to save DOM nodes, or render full grid?
  // For display, we only care about active cells.
  // We iterate through all possible cells and check if they are in the set.
  // OR we iterate through the set. Iterating through set is safer if set contains valid keys.
  
  // Actually, to ensure correct z-index or order if needed, but here order doesn't matter.
  // Let's iterate the grid to be safe against bad keys.
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${r}-${c}`;
      if (activeCells.has(key)) {
        polygons.push(
          <polygon
            key={key}
            points={getPoints(r, c)}
            fill={color}
          />
        );
      }
    }
  }

  return (
    <svg 
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {polygons}
    </svg>
  );
};
