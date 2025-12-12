
export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface GlyphData {
  char: string;
  imageUrl: string | null;
  gridState?: string[]; // Array of "row-col" keys for the triangular grid
  status: 'pending' | 'loading' | 'success' | 'error';
}

export type FontMap = Record<string, string>;

export interface GenerationConfig {
  prompt: string;
  stylePreset?: string;
}
