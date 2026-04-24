export type CellState = 'hidden' | 'revealed' | 'flagged';

export interface Cell {
  id: string;           // "{row}-{col}"
  row: number;
  col: number;
  isMine: boolean;
  state: CellState;
  adjacentMines: number; // 0-8, only meaningful when revealed
}

export interface GameBoard {
  cells: Cell[][];
  rows: number;
  cols: number;
  totalMines: number;
  flaggedCount: number;
  revealedCount: number;
  status: 'idle' | 'playing' | 'won' | 'lost';
  firstMoveDone: boolean;
}

export interface Constraint {
  cellIds: Set<string>;
  mineCount: number;
}

export type AIMove =
  | { type: 'reveal'; cellId: string; reason: string; confidence: 'certain' | 'probable' }
  | { type: 'flag'; cellId: string; reason: string; confidence: 'certain' | 'probable' };

export interface AIState {
  isRunning: boolean;
  speed: number;        // ms between moves, 100-2000
  moveHistory: AIMove[];
  lastReason: string;
  phase: 'constraint' | 'probability' | 'idle';
  constraintCount: number;
  correctMoves: number;
  totalMoves: number;
}

export interface Difficulty {
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { name: 'Beginner',     rows: 9,  cols: 9,  mines: 10 },
  { name: 'Intermediate', rows: 16, cols: 16, mines: 40 },
  { name: 'Expert',       rows: 16, cols: 30, mines: 99 },
];