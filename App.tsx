import React, { useState, useCallback, useRef } from 'react';
import { FULL_ALPHABET, DEFAULT_GRID_STATES } from './constants';
import { GlyphData, FontMap } from './types';
import { GlyphCard } from './components/GlyphCard';
import { TypeTester } from './components/TypeTester';
import { GlyphEditor } from './components/GlyphEditor';

// Initialize glyphs state with defaults - strictly geometric now
const INITIAL_GLYPHS: GlyphData[] = FULL_ALPHABET.map(char => ({
  char,
  imageUrl: null,
  gridState: DEFAULT_GRID_STATES[char],
  status: 'pending'
}));

export default function App() {
  const [glyphs, setGlyphs] = useState<GlyphData[]>(INITIAL_GLYPHS);
  const [apiKeyError, setApiKeyError] = useState(false);
  
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-serif text-2xl font-bold shadow-lg shadow-teal-600/20">
               Ā
             </div>
             <div>
               <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight leading-none">AlohaType</h1>
               <p className="text-xs text-stone-500 font-medium">Hawaiian Glyph Generator</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Action Buttons */}
             <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportFont}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors"
                  title="Download Font JSON"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export
                </button>
                <button 
                  onClick={handleImportClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors"
                  title="Upload Font JSON"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" transform="rotate(180 10 10)"/>
                  </svg>
                  Import
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        
        {/* API Key Error Warning */}
        {apiKeyError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-bold">API Key Error</p>
              <p className="text-sm">Could not access the Gemini API. Please ensure your environment is configured correctly with a valid API key.</p>
            </div>
          </div>
        )}

        {/* Glyph Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-stone-800">Character Set</h2>
            <p className="text-sm text-stone-500">
               Click the "pencil" icon on any card to customize its geometric design.
            </p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-4">
            {glyphs.map((glyph) => (
              <GlyphCard 
                key={glyph.char} 
                glyph={glyph} 
                onEdit={handleEditClick}
              />
            ))}
          </div>
        </section>

        {/* Type Tester */}
        <section className="pb-12">
           <TypeTester 
             fontMap={fontMap} 
             glyphs={glyphs} 
             onApiKeyError={() => setApiKeyError(true)}
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