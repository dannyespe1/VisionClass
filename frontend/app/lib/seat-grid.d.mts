export const MAX_SEAT_ROWS: number;
export const MAX_SEAT_COLUMNS: number;

export type SeatPosition = {
  code: string;
  row: number;
  column: number;
};

export function isValidSeatLayout(rows: number, columns: number): boolean;
export function seatRowLabel(rowIndex: number): string;
export function buildSeatGrid(rows: number, columns: number): SeatPosition[];
