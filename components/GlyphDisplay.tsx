
import React from 'react';
import { TRIANGLE_SIZE, GRID_COLS, GRID_ROWS, TRIANGLE_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface GlyphDisplayProps {
  gridState: string[];
  color?: string;
  className?: string;
  autoCrop?: boolean;
}

export const GlyphDisplay: React.FC<GlyphDisplayProps> = ({ gridState, color = '#111827', className = '', autoCrop = false }) => {
  const activeCells = new Set(gridState);

  // Helper to generate points for a single triangle
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
  let minC = Infinity;
  let maxC = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${r}-${c}`;
      if (activeCells.has(key)) {
        // Track bounds if auto-cropping
        if (autoCrop) {
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
        }

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

  // Calculate ViewBox
  let viewBox = `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`;
  
  if (autoCrop && polygons.length > 0) {
    // Calculate pixel bounds of active cells
    const minX = (minC * TRIANGLE_SIZE) / 2;
    // Max X needs to include the width of the last triangle (TRIANGLE_SIZE)
    const maxX = (maxC * TRIANGLE_SIZE) / 2 + TRIANGLE_SIZE;
    
    const minY = minR * TRIANGLE_HEIGHT;
    const maxY = (maxR + 1) * TRIANGLE_HEIGHT;

    const width = maxX - minX;
    const height = maxY - minY;
    
    // Add a little padding (e.g. 10%)
    const paddingX = width * 0.1;
    const paddingY = height * 0.1;

    viewBox = `${minX - paddingX} ${minY - paddingY} ${width + (paddingX * 2)} ${height + (paddingY * 2)}`;
  }

  return (
    <svg 
      viewBox={viewBox} 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {polygons}
    </svg>
  );
};
