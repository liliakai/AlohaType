import React, { useState, useRef } from 'react';
import { FontMap, GlyphData } from '../types';
import { SAMPLE_TEXTS, STYLE_PRESETS, TRIANGLE_SIZE, GRID_COLS, GRID_ROWS, TRIANGLE_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { GlyphDisplay } from './GlyphDisplay';
import { generateStyledText } from '../services/geminiService';

interface TypeTesterProps {
  fontMap: FontMap;
  glyphs: GlyphData[];
  onApiKeyError: () => void;
}

export const TypeTester: React.FC<TypeTesterProps> = ({ fontMap, glyphs, onApiKeyError }) => {
  const [text, setText] = useState(SAMPLE_TEXTS[0]);
  const [fontSize, setFontSize] = useState(64);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);
  
  // Pattern Mode State
  const [patternMode, setPatternMode] = useState(true);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  
  // AI Generation State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Aspect ratio for rendering divs correctly
  const glyphAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

  // Helper to get glyph data for a char
  const getGlyphData = (char: string) => {
    const upperChar = char.toUpperCase();
    return glyphs.find(g => g.char === upperChar);
  };

  // ----------------------------------------------------------------------
  // Canvas Rendering Logic
  // ----------------------------------------------------------------------
  const renderTextToBase64 = async (): Promise<string | null> => {
    if (!text.trim()) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Constants for rendering at high res
    const SCALE = 2; // Render at 2x scale for quality
    const R_TRIANGLE_SIZE = TRIANGLE_SIZE * SCALE;
    const R_TRIANGLE_HEIGHT = TRIANGLE_HEIGHT * SCALE;
    const SPACING_CHAR = letterSpacing * SCALE;
    const SPACING_LINE = lineHeight * SCALE;
    
    // Base dimensions of one glyph grid
    const GLYPH_BASE_WIDTH = (GRID_COLS * R_TRIANGLE_SIZE) / 2 + (R_TRIANGLE_SIZE / 2);
    const GLYPH_HEIGHT = GRID_ROWS * R_TRIANGLE_HEIGHT;
    const SPACE_WIDTH = GLYPH_BASE_WIDTH * 0.4;

    const REPEAT_COUNT = 10;
    const PADDING_X = 50 * SCALE;
    const PADDING_Y = 50 * SCALE;

    let canvasWidth = 0;
    let canvasHeight = 0;

    const cleanText = patternMode ? text.replace(/[\n\r]/g, '') : text;
    const chars = cleanText.split(''); // Use raw chars or lines depending on mode
    
    // --- 1. Calculate Canvas Size ---
    if (patternMode) {
        // Calculate the length of ONE sequence of text
        let sequenceLengthPx = 0;
        chars.forEach((char, i) => {
            const w = (char === ' ') ? SPACE_WIDTH : GLYPH_BASE_WIDTH;
            sequenceLengthPx += w;
            if (i < chars.length - 1) sequenceLengthPx += SPACING_CHAR;
        });

        if (direction === 'horizontal') {
            // Width = Sequence
            // Height = Repeat * (Height + LineSpacing)
            canvasWidth = sequenceLengthPx;
            canvasHeight = (REPEAT_COUNT * GLYPH_HEIGHT) + ((REPEAT_COUNT - 1) * SPACING_LINE);
        } else {
            // Vertical Mode
            // Width = Repeat * (GlyphWidth + LineSpacing) -> But GlyphWidth is constant-ish, strictly it's the max width of column
            // Height = Sequence of heights (GlyphHeight * count) + Spacing
            
            // In vertical, letters stack. Height is accumulated height of letters.
            const sequenceHeightPx = (chars.length * GLYPH_HEIGHT) + ((chars.length - 1) * SPACING_CHAR);
            
            // Width is determined by the widest element (Glyph) repeated
            canvasWidth = (REPEAT_COUNT * GLYPH_BASE_WIDTH) + ((REPEAT_COUNT - 1) * SPACING_LINE);
            canvasHeight = sequenceHeightPx;
        }

    } else {
        // Standard Mode (Multiline)
        const lines = text.split('\n');
        let maxLineWidth = 0;
        lines.forEach(line => {
          let currentLineWidth = 0;
          const lChars = line.split('');
          lChars.forEach((char, i) => {
             const w = (char === ' ') ? SPACE_WIDTH : GLYPH_BASE_WIDTH;
             currentLineWidth += w;
             if (i < lChars.length - 1) currentLineWidth += SPACING_CHAR;
          });
          maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        });
        const totalHeight = (lines.length * GLYPH_HEIGHT) + ((lines.length - 1) * SPACING_LINE);
        canvasWidth = maxLineWidth;
        canvasHeight = totalHeight;
    }

    // Apply Padding
    canvas.width = canvasWidth + (PADDING_X * 2);
    canvas.height = canvasHeight + (PADDING_Y * 2);

    // --- 2. Render ---
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Helper to draw a single glyph at specific X,Y
    const drawGlyph = (char: string, startX: number, startY: number) => {
        if (char === ' ') return;
        const glyph = getGlyphData(char);
        
        // Draw Geometry
        if (glyph && glyph.gridState) {
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            
            const activeCells = new Set(glyph.gridState);
            activeCells.forEach((key: string) => {
              const [r, c] = key.split('-').map(Number);
              
              const xBase = startX + ((c * R_TRIANGLE_SIZE) / 2);
              const yBase = startY + (r * R_TRIANGLE_HEIGHT);
              const isUp = (r + c) % 2 === 0;

              ctx.beginPath();
              if (isUp) {
                ctx.moveTo(xBase, yBase + R_TRIANGLE_HEIGHT);
                ctx.lineTo(xBase + R_TRIANGLE_SIZE / 2, yBase);
                ctx.lineTo(xBase + R_TRIANGLE_SIZE, yBase + R_TRIANGLE_HEIGHT);
              } else {
                ctx.moveTo(xBase, yBase);
                ctx.lineTo(xBase + R_TRIANGLE_SIZE, yBase);
                ctx.lineTo(xBase + R_TRIANGLE_SIZE / 2, yBase + R_TRIANGLE_HEIGHT);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            });
        } else {
            // Fallback Text
            ctx.fillStyle = 'black';
            ctx.font = `bold ${GLYPH_HEIGHT * 0.6}px serif`;
            ctx.fillText(char, startX + (GLYPH_BASE_WIDTH * 0.2), startY + (GLYPH_HEIGHT * 0.75));
        }
    };

    if (patternMode) {
        // Render 10 repetitions
        for (let i = 0; i < REPEAT_COUNT; i++) {
            let cursorX = PADDING_X;
            let cursorY = PADDING_Y;

            // Calculate start position for this repetition row/col
            if (direction === 'horizontal') {
                cursorY += i * (GLYPH_HEIGHT + SPACING_LINE);
            } else {
                cursorX += i * (GLYPH_BASE_WIDTH + SPACING_LINE);
            }

            // Render sequence
            chars.forEach((char) => {
                drawGlyph(char, cursorX, cursorY);

                // Advance Cursor
                const advanceW = (char === ' ') ? SPACE_WIDTH : GLYPH_BASE_WIDTH;
                
                if (direction === 'horizontal') {
                    cursorX += advanceW + SPACING_CHAR;
                } else {
                    cursorY += GLYPH_HEIGHT + SPACING_CHAR;
                }
            });
        }

    } else {
        // Standard Multiline Render
        let currentY = PADDING_Y;
        const lines = text.split('\n');
        lines.forEach((line) => {
            let currentX = PADDING_X;
            const lChars = line.split('');
            lChars.forEach((char) => {
                drawGlyph(char, currentX, currentY);
                const w = (char === ' ') ? SPACE_WIDTH : GLYPH_BASE_WIDTH;
                currentX += w + SPACING_CHAR;
            });
            currentY += GLYPH_HEIGHT + SPACING_LINE;
        });
    }

    return canvas.toDataURL('image/png');
  };

  const handleGenerateBanner = async () => {
    if (!prompt.trim()) return;
    if (!process.env.API_KEY) {
      onApiKeyError();
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedImage(null);
      
      const referenceImage = await renderTextToBase64();
      if (!referenceImage) throw new Error("Could not render text");

      const resultImageUrl = await generateStyledText(referenceImage, prompt);
      
      setGeneratedImage(resultImageUrl);

    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-serif font-bold text-stone-800">Type Tester</h2>
            
            {/* Display Controls */}
            <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-lg">
                <button
                    onClick={() => setPatternMode(false)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!patternMode ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    Standard
                </button>
                <button
                    onClick={() => setPatternMode(true)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${patternMode ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    Pattern Mode
                </button>
            </div>
        </div>
        
        {/* Pattern Controls */}
        {patternMode && (
            <div className="flex items-center gap-4 py-2 border-b border-stone-100 animate-in slide-in-from-top-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Direction</span>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                        <input 
                            type="radio" 
                            name="direction" 
                            checked={direction === 'horizontal'} 
                            onChange={() => setDirection('horizontal')}
                            className="text-teal-600 focus:ring-teal-500"
                        />
                        Horizontal (Rows)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                        <input 
                            type="radio" 
                            name="direction" 
                            checked={direction === 'vertical'} 
                            onChange={() => setDirection('vertical')}
                            className="text-teal-600 focus:ring-teal-500"
                        />
                        Vertical (Columns)
                    </label>
                </div>
            </div>
        )}

        <div className="flex flex-wrap items-center gap-6 w-full">
           {/* Size Slider */}
           <div className="flex items-center gap-3 flex-1 min-w-[150px]">
             <label className="text-sm font-medium text-stone-500 whitespace-nowrap w-24">Size</label>
             <input 
              type="range" 
              min="16" 
              max="96" 
              value={fontSize} 
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
           </div>

           {/* Letter Spacing Slider */}
           <div className="flex items-center gap-3 flex-1 min-w-[150px]">
             <label className="text-sm font-medium text-stone-500 whitespace-nowrap w-24">Char Spacing</label>
             <input 
              type="range" 
              min="0" 
              max="60" 
              value={letterSpacing} 
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
           </div>

           {/* Line Height Slider */}
           <div className="flex items-center gap-3 flex-1 min-w-[150px]">
             <label className="text-sm font-medium text-stone-500 whitespace-nowrap w-24">
                 {patternMode ? (direction === 'horizontal' ? 'Row Gap' : 'Col Gap') : 'Line Height'}
             </label>
             <input 
              type="range" 
              min="0" 
              max="120" 
              value={lineHeight} 
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
           </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {SAMPLE_TEXTS.map((s, i) => (
          <button
            key={i}
            onClick={() => setText(s)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${
              text === s 
                ? 'bg-teal-100 text-teal-800 border border-teal-200' 
                : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-4 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none bg-stone-50 text-stone-800 font-sans text-lg"
        rows={2}
        placeholder="Type here to test your font..."
      />
      
      {/* ---------------------------------- */}
      {/* Interactive Render Area            */}
      {/* ---------------------------------- */}
      <div 
        className="min-h-[300px] max-h-[600px] overflow-auto p-8 border border-stone-100 rounded-xl bg-white shadow-inner relative"
        style={{ 
            backgroundImage: 'radial-gradient(#f0f0f0 1px, transparent 1px)', 
            backgroundSize: '20px 20px',
        }}
      >
        {/* 
            Pattern Mode Layout Logic:
            Horizontal: Flex Column (stacking rows), each row is Flex Row.
            Vertical: Flex Row (stacking cols), each col is Flex Column.
        */}
        <div 
            style={{
                display: 'flex',
                flexDirection: patternMode ? (direction === 'horizontal' ? 'column' : 'row') : 'column',
                gap: lineHeight,
                width: 'fit-content' // Allow growing
            }}
        >
            {/* Render Loops */}
            {(patternMode ? Array.from({ length: 10 }) : [0]).map((_, repeatIndex) => {
                
                // For standard mode, we split by lines. For pattern, we treat as one line.
                const contentLines = patternMode 
                    ? [text.replace(/[\n\r]/g, '')] 
                    : text.split('\n');

                return contentLines.map((lineContent, lineIndex) => (
                    <div 
                        key={`${repeatIndex}-${lineIndex}`}
                        style={{
                            display: 'flex',
                            flexDirection: patternMode && direction === 'vertical' ? 'column' : 'row',
                            gap: letterSpacing,
                            // In standard mode, enforce full width block behavior if needed, 
                            // but flex row handles 'inline-block' feel naturally.
                        }}
                    >
                        {lineContent.split('').map((char, charIndex) => {
                            const glyphData = getGlyphData(char);
                            
                            // Dimensions
                            const w = fontSize * glyphAspectRatio;
                            const h = fontSize;

                            if (char === ' ') {
                                return <div key={charIndex} style={{ width: fontSize * 0.4, height: h, flexShrink: 0 }} />;
                            }

                            return (
                                <div 
                                    key={charIndex}
                                    style={{ width: w, height: h, flexShrink: 0 }}
                                >
                                    {glyphData && glyphData.gridState && glyphData.gridState.length > 0 ? (
                                        <GlyphDisplay 
                                            gridState={glyphData.gridState} 
                                            color="#292524"
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <span className="flex w-full h-full items-center justify-center font-serif text-stone-300 bg-stone-50 border border-stone-100 rounded">
                                            {char}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ));
            })}
        </div>
      </div>

      {/* ---------------------------------- */}
      {/* AI Styling Section                 */}
      {/* ---------------------------------- */}
      <div className="bg-teal-50 rounded-xl p-6 border border-teal-100 mt-6">
        <h3 className="font-serif font-bold text-teal-900 mb-4">Style this pattern with AI</h3>
        
        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 space-y-4">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a material (e.g. 'carved koa wood', 'molten lava cracks')..."
                className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateBanner()}
              />
              
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setPrompt(preset.prompt)}
                    className="text-xs px-2 py-1 bg-white/60 hover:bg-white text-teal-800 rounded border border-teal-200/50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
           </div>

           <button 
             onClick={handleGenerateBanner}
             disabled={isGenerating || !prompt.trim() || !text.trim()}
             className="bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 whitespace-nowrap h-fit self-start md:self-auto transition-colors flex items-center gap-2"
           >
             {isGenerating ? (
               <>
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 Styling...
               </>
             ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                 </svg>
                 Generate Art
               </>
             )}
           </button>
        </div>
      </div>

      {/* Result Display */}
      {generatedImage && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-serif font-bold text-stone-800 mb-2">Generated Banner</h3>
          <div className="bg-white p-2 rounded-xl border border-stone-200 shadow-lg">
             <img src={generatedImage} alt="AI Generated Typography" className="w-full rounded-lg" />
          </div>
          <div className="mt-2 text-right">
             <a 
               href={generatedImage} 
               download={`aloha-type-${Date.now()}.png`}
               className="text-xs text-teal-600 hover:text-teal-800 font-medium underline"
             >
               Download Image
             </a>
          </div>
        </div>
      )}

    </div>
  );
};
