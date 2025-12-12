
import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { FontMap, GlyphData } from '../types';
import { SAMPLE_TEXTS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { GlyphDisplay } from './GlyphDisplay';

interface TypeTesterProps {
  fontMap: FontMap;
  glyphs: GlyphData[];
}

const MAX_FONT_SIZE = 360;
const PATTERN_REPEATS = 6;

export const TypeTester: React.FC<TypeTesterProps> = ({ fontMap, glyphs }) => {
  const [text, setText] = useState(SAMPLE_TEXTS[0]);
  const [fontSize, setFontSize] = useState(64);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);
  
  // Layout Options Visibility
  const [showOptions, setShowOptions] = useState(false);
  
  // Pattern Mode State
  const [patternMode, setPatternMode] = useState(true);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  
  // Export State
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Aspect ratio for rendering divs correctly
  const glyphAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

  // Helper to get glyph data for a char
  const getGlyphData = (char: string) => {
    const upperChar = char.toUpperCase();
    return glyphs.find(g => g.char === upperChar);
  };

  // Helper to calculate total width units for a string
  const calculateWidthUnits = (str: string) => {
    return str.split('').reduce((acc, char) => {
        // Spaces are 0.4 wide, others are glyphAspectRatio wide
        return acc + (char === ' ' ? 0.4 : glyphAspectRatio);
    }, 0);
  };

  // Auto-size Logic
  useEffect(() => {
    if (!containerRef.current) return;

    const calculateSize = () => {
        if (!containerRef.current) return;
        
        const { clientWidth, clientHeight } = containerRef.current;
        // Padding (p-8 = 32px) + safety buffer
        const availableW = Math.max(0, clientWidth - 80); 
        const availableH = Math.max(0, clientHeight - 80);

        // Determine geometric structure
        const cleanText = patternMode ? text.replace(/[\n\r]/g, '') : text;
        const charCount = cleanText.length || 1;
        
        // Dimensions in "units" of fontSize
        let unitsW = 0;
        let unitsH = 0;
        
        // Spacing overhead in pixels (approximate)
        let spacingOverheadW = 0;
        let spacingOverheadH = 0;

        if (patternMode) {
            if (direction === 'horizontal') {
                // Width: exact sequence of chars
                unitsW = calculateWidthUnits(cleanText);
                spacingOverheadW = Math.max(0, charCount - 1) * letterSpacing;
                
                // Height: PATTERN_REPEATS rows
                unitsH = PATTERN_REPEATS; 
                spacingOverheadH = (PATTERN_REPEATS - 1) * lineHeight;
            } else {
                // Vertical Mode
                // Width: PATTERN_REPEATS columns
                unitsW = PATTERN_REPEATS * glyphAspectRatio;
                spacingOverheadW = (PATTERN_REPEATS - 1) * lineHeight; // Gap between cols is lineHeight in this mode

                // Height: sequence of chars
                unitsH = charCount; // Height of each char is 1 unit
                spacingOverheadH = Math.max(0, charCount - 1) * letterSpacing;
            }
        } else {
            // Standard Mode
            const lines = text.split('\n');
            const lineCount = lines.length;

            // Find the widest line in units
            const maxLineWidthUnits = Math.max(...lines.map(l => calculateWidthUnits(l))) || glyphAspectRatio;
            const maxLineLength = Math.max(...lines.map(l => l.length));

            unitsW = maxLineWidthUnits;
            spacingOverheadW = Math.max(0, maxLineLength - 1) * letterSpacing;

            unitsH = lineCount;
            spacingOverheadH = Math.max(0, lineCount - 1) * lineHeight;
        }

        // Calculate Max Possible Font Size
        // Size * Units + Overhead <= Available
        // Size <= (Available - Overhead) / Units

        const safeW = Math.max(0, availableW - spacingOverheadW);
        const safeH = Math.max(0, availableH - spacingOverheadH);

        const fitW = unitsW > 0 ? safeW / unitsW : MAX_FONT_SIZE;
        const fitH = unitsH > 0 ? safeH / unitsH : MAX_FONT_SIZE;

        const bestFit = Math.min(fitW, fitH);
        
        // Clamp to slider ranges
        const clampedSize = Math.max(16, Math.min(MAX_FONT_SIZE, Math.floor(bestFit)));
        
        setFontSize(clampedSize);
    };

    // Calculate immediately
    calculateSize();
    
    // Also use ResizeObserver to handle container resizing
    const resizeObserver = new ResizeObserver(() => {
        calculateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();

  }, [text, patternMode, direction, letterSpacing, lineHeight, glyphAspectRatio]); 

  const handleDownload = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    
    try {
      const dataUrl = await toPng(contentRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Higher resolution
        backgroundColor: '#ffffff', // White background
        style: {
           padding: '40px', // Add some breathing room
           backgroundImage: 'radial-gradient(#f0f0f0 1px, transparent 1px)', 
           backgroundSize: '20px 20px',
        }
      });
      
      const link = document.createElement('a');
      link.download = `aloha-type-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-stone-200">
      
      {/* 1. Primary Call to Action: Text Input */}
      <div className="flex flex-col gap-3">
         <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-6 border-2 border-stone-200 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none resize-none bg-white text-stone-900 font-serif text-3xl placeholder-stone-300 text-center leading-normal"
            rows={1}
            placeholder="TYPE HERE"
            style={{ minHeight: '100px' }}
         />
         
         {/* Suggested Words */}
         <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-center">
            {SAMPLE_TEXTS.map((s, i) => (
            <button
                key={i}
                onClick={() => setText(s)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                text === s 
                    ? 'bg-teal-100 text-teal-800 border border-teal-200' 
                    : 'bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100'
                }`}
            >
                {s}
            </button>
            ))}
        </div>
      </div>

      {/* 2. Collapsible Layout Options */}
      <div>
         <button 
           onClick={() => setShowOptions(!showOptions)}
           className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-teal-600 transition-colors mb-4 mx-auto"
         >
            {showOptions ? 'Hide Layout Options' : 'Show Layout Options'}
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
         </button>

         {showOptions && (
             <div className="bg-stone-50 p-6 rounded-xl border border-stone-100 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Mode Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                             <span className="text-xs font-bold text-stone-400 w-20">MODE</span>
                             <div className="flex bg-white p-1 rounded-lg border border-stone-200 shadow-sm">
                                <button
                                    onClick={() => setPatternMode(false)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!patternMode ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={() => setPatternMode(true)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${patternMode ? 'bg-teal-600 text-white' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    Pattern
                                </button>
                             </div>
                        </div>

                        {patternMode && (
                            <div className="flex items-center gap-4 animate-in fade-in">
                                <span className="text-xs font-bold text-stone-400 w-20">FLOW</span>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-teal-700">
                                        <input 
                                            type="radio" 
                                            name="direction" 
                                            checked={direction === 'horizontal'} 
                                            onChange={() => setDirection('horizontal')}
                                            className="accent-teal-600"
                                        />
                                        Horizontal Rows
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-teal-700">
                                        <input 
                                            type="radio" 
                                            name="direction" 
                                            checked={direction === 'vertical'} 
                                            onChange={() => setDirection('vertical')}
                                            className="accent-teal-600"
                                        />
                                        Vertical Columns
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sliders */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="text-xs font-bold text-stone-400 w-20">SIZE</label>
                            <input 
                                type="range" 
                                min="16" 
                                max={MAX_FONT_SIZE} 
                                value={fontSize} 
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-600"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="text-xs font-bold text-stone-400 w-20">SPACING</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="60" 
                                value={letterSpacing} 
                                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-600"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="text-xs font-bold text-stone-400 w-20">
                                {patternMode ? 'GAP' : 'LEADING'}
                            </label>
                            <input 
                                type="range" 
                                min="0" 
                                max="120" 
                                value={lineHeight} 
                                onChange={(e) => setLineHeight(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-600"
                            />
                        </div>
                    </div>

                </div>
             </div>
         )}
      </div>
      
      {/* 3. Interactive Render Area */}
      {/* Removed transition-all duration-300 from container to fix resize race condition */}
      <div 
        ref={containerRef}
        className="min-h-[300px] max-h-[600px] overflow-auto p-8 border border-stone-100 rounded-xl bg-white shadow-inner relative flex items-center justify-center group"
        style={{ 
            backgroundImage: 'radial-gradient(#f0f0f0 1px, transparent 1px)', 
            backgroundSize: '20px 20px',
        }}
      >
        {/* Export Button - Visible on hover or always if mobile */}
        <button
            onClick={handleDownload}
            disabled={isExporting}
            className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm border border-stone-200 shadow-sm text-stone-500 p-2 rounded-lg hover:text-teal-600 hover:border-teal-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Banner as PNG"
        >
            {isExporting ? (
                 <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            )}
        </button>

        <div 
            ref={contentRef}
            className="m-auto"
            style={{
                display: 'flex',
                flexDirection: patternMode ? (direction === 'horizontal' ? 'column' : 'row') : 'column',
                gap: lineHeight,
                width: 'fit-content'
            }}
        >
            {(patternMode ? Array.from({ length: PATTERN_REPEATS }) : [0]).map((_, repeatIndex) => {
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
                        }}
                    >
                        {lineContent.split('').map((char, charIndex) => {
                            const glyphData = getGlyphData(char);
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
    </div>
  );
};
