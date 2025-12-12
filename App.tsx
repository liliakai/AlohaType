
import React, { useState, useCallback, useRef } from 'react';
import { FULL_ALPHABET, DEFAULT_GRID_STATES } from './constants';
import { GlyphData, FontMap } from './types';
import { GlyphCard } from './components/GlyphCard';
import { TypeTester } from './components/TypeTester';
import { GlyphEditor } from './components/GlyphEditor';
import { GlyphDisplay } from './components/GlyphDisplay';

// Initialize glyphs state with defaults - strictly geometric now
const INITIAL_GLYPHS: GlyphData[] = FULL_ALPHABET.map(char => ({
  char,
  imageUrl: null,
  gridState: DEFAULT_GRID_STATES[char],
  status: 'pending'
}));

export default function App() {
  const [glyphs, setGlyphs] = useState<GlyphData[]>(INITIAL_GLYPHS);
  
  // UI State
  const [isEditingGlyphs, setIsEditingGlyphs] = useState(false);
  
  // Edit State
  const [editingGlyph, setEditingGlyph] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to update a specific glyph
  const updateGlyph = useCallback((char: string, updates: Partial<GlyphData>) => {
    setGlyphs(prev => prev.map(g => g.char === char ? { ...g, ...updates } : g));
  }, []);

  // --- Edit / Sketch Logic ---
  const handleEditClick = (char: string) => {
    setEditingGlyph(char);
  };

  const handleEditorClose = () => {
    setEditingGlyph(null);
  };

  const handleEditorSave = (imageBase64: string | undefined, gridState: string[]) => {
    if (!editingGlyph) return;

    const char = editingGlyph;
    handleEditorClose();
    
    // Save the grid state. We don't save the imageBase64 for display anymore, 
    // as we render the SVG grid directly.
    updateGlyph(char, { 
        gridState: gridState
    });
  };

  // --- Import / Export Logic ---
  const handleExportFont = () => {
    const exportData = {
      version: 1,
      timestamp: new Date().toISOString(),
      glyphs: glyphs.reduce((acc, g) => {
        if (g.gridState && g.gridState.length > 0) {
          acc[g.char] = g.gridState;
        }
        return acc;
      }, {} as Record<string, string[]>)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aloha-font.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!json.glyphs || typeof json.glyphs !== 'object') {
          alert("Invalid font file: missing glyph data.");
          return;
        }

        setGlyphs(prev => prev.map(g => {
          const newGridState = json.glyphs[g.char];
          if (newGridState) {
            return {
              ...g,
              gridState: newGridState,
              imageUrl: null
            };
          }
          return g;
        }));

        // Reset file input so same file can be selected again if needed
        e.target.value = '';
        
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to import font file. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  // Create Font Map for Type Tester (Legacy image support, mostly unused now)
  const fontMap: FontMap = glyphs.reduce((acc, curr) => {
    if (curr.imageUrl) {
      acc[curr.char] = curr.imageUrl;
    }
    return acc;
  }, {} as FontMap);

  // Find the current glyph data for the editor
  const editingGlyphData = glyphs.find(g => g.char === editingGlyph);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-serif text-xl font-bold shadow-lg shadow-teal-600/20">
               Ā
             </div>
             <div>
               <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight leading-none">AlohaType</h1>
               <p className="text-[10px] text-stone-500 font-medium">Hawaiian Glyph Generator</p>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* 1. Character Set (Minimized & Collapsible) */}
        <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden transition-all">
          <div className="bg-stone-50/50 px-4 py-2 border-b border-stone-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wide flex items-center gap-2">
                Glyphs 
                {!isEditingGlyphs && <span className="text-[10px] bg-stone-100 text-stone-400 px-1.5 rounded-full border border-stone-200">{glyphs.length}</span>}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                  onClick={handleExportFont}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                  title="Download Font JSON"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={handleImportClick}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                  title="Upload Font JSON"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" transform="rotate(180 10 10)"/>
                  </svg>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
                
                <div className="w-px h-4 bg-stone-200"></div>

                <button
                  onClick={() => setIsEditingGlyphs(!isEditingGlyphs)}
                  className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                    isEditingGlyphs 
                      ? 'text-teal-600' 
                      : 'text-stone-400 hover:text-teal-600'
                  }`}
                >
                  {isEditingGlyphs ? 'Done' : 'Edit'}
                </button>
            </div>
          </div>
          
          <div className={`${isEditingGlyphs ? 'p-4' : 'px-4 py-3'}`}>
            {isEditingGlyphs ? (
              // Mode A: Interactive Editor Grid
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-2 animate-in fade-in duration-300">
                {glyphs.map((glyph) => (
                  <GlyphCard 
                    key={glyph.char} 
                    glyph={glyph} 
                    onEdit={handleEditClick}
                  />
                ))}
              </div>
            ) : (
              // Mode B: Very Compact Read-Only "Strip"
              <div className="flex flex-wrap gap-2 justify-center animate-in fade-in duration-300">
                {glyphs.map((glyph) => (
                  <div 
                    key={glyph.char} 
                    className="flex flex-col items-center gap-0.5 group cursor-pointer"
                    onClick={() => handleEditClick(glyph.char)}
                  >
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 p-0.5 rounded border border-stone-100 bg-stone-50 flex items-center justify-center relative select-none overflow-hidden transition-all group-hover:border-teal-400 group-hover:bg-white group-hover:shadow-md group-hover:-translate-y-0.5"
                      title={`Edit ${glyph.char}`}
                    >
                       {glyph.gridState && glyph.gridState.length > 0 ? (
                         <GlyphDisplay 
                           gridState={glyph.gridState} 
                           color="#0c0a09" // darker stone-950
                           autoCrop={true}
                           className="w-full h-full" 
                         />
                       ) : (
                         <span className="text-[10px] text-stone-300 font-serif font-bold">{glyph.char}</span>
                       )}
                    </div>
                     
                     {/* Annotation - Floating beneath */}
                     <span className="text-[8px] font-bold text-stone-400 leading-none group-hover:text-teal-600 transition-colors">
                       {glyph.char}
                     </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Helper Text only in Edit Mode */}
            {isEditingGlyphs && (
                <div className="mt-4 pt-3 border-t border-stone-100 text-center">
                   <p className="text-[10px] text-stone-400">
                     Click any card above to launch the geometry editor.
                   </p>
                </div>
            )}
          </div>
        </section>

        {/* 2. Type Tester (Primary UI) */}
        <section>
           <TypeTester 
             fontMap={fontMap} 
             glyphs={glyphs} 
           />
        </section>

      </main>

      {/* Edit Modal */}
      {editingGlyph && editingGlyphData && (
        <GlyphEditor 
          char={editingGlyph} 
          initialGridState={editingGlyphData.gridState || DEFAULT_GRID_STATES[editingGlyph]}
          backgroundImageUrl={editingGlyphData.imageUrl}
          onSave={handleEditorSave} 
          onCancel={handleEditorClose} 
        />
      )}
    </div>
  );
}
