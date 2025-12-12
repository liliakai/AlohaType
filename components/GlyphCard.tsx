
import React from 'react';
import { GlyphData } from '../types';
import { GlyphDisplay } from './GlyphDisplay';

interface GlyphCardProps {
  glyph: GlyphData;
  onEdit: (char: string) => void;
}

export const GlyphCard: React.FC<GlyphCardProps> = ({ glyph, onEdit }) => {
  
  // Determine what to show: Grid > Char
  // We deprioritize imageUrl for the card grid itself, focusing on the geometry editor entry point
  const showGrid = glyph.gridState && glyph.gridState.length > 0;
  
  return (
    <div className="relative group bg-white rounded-lg shadow-sm border border-stone-200 aspect-square flex items-center justify-center overflow-hidden transition-all hover:shadow-md hover:border-teal-300">
      
      {/* Content Layer */}
      <div className="w-full h-full p-1 flex items-center justify-center relative cursor-pointer" onClick={() => onEdit(glyph.char)}>
        {showGrid ? (
           <div className="w-full h-full p-1">
             <GlyphDisplay 
                gridState={glyph.gridState!} 
                color="#0c0a09" 
                autoCrop={true}
                className="w-full h-full" 
             />
           </div>
        ) : (
          <span className="text-2xl text-stone-300 font-serif font-bold opacity-30 select-none">
            {glyph.char}
          </span>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-start justify-end p-1 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(glyph.char);
            }}
            className="pointer-events-auto bg-white hover:bg-teal-50 text-stone-700 hover:text-teal-700 p-1 rounded-md shadow-sm border border-stone-200 transition-transform hover:scale-105"
            title="Edit Geometry"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
      </div>
      
      {/* Label */}
      <div className="absolute bottom-0.5 right-0.5 bg-white/90 px-1 rounded text-[8px] font-bold text-stone-400 pointer-events-none z-20">
        {glyph.char}
      </div>
    </div>
  );
};
