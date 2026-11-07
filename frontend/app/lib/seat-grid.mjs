export const MAX_SEAT_ROWS = 20;
export const MAX_SEAT_COLUMNS = 20;
const SEAT_CODE_PATTERN = /^[A-T](?:[1-9]|1\d|20)$/;

export function isValidSeatLayout(rows, columns) {
  return Number.isInteger(rows)
    && Number.isInteger(columns)
    && rows >= 1
    && rows <= MAX_SEAT_ROWS
    && columns >= 1
    && columns <= MAX_SEAT_COLUMNS;
}

export function seatRowLabel(rowIndex) {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= MAX_SEAT_ROWS) {
    throw new RangeError("Índice de fila fuera del rango permitido.");
  }
  return String.fromCharCode(65 + rowIndex);
}

export function buildSeatGrid(rows, columns) {
  if (!isValidSeatLayout(rows, columns)) {
    throw new RangeError("La cuadrícula debe tener entre 1 y 20 filas y columnas.");
  }

  return Array.from({ length: rows * columns }, (_, index) => {
    const rowIndex = Math.floor(index / columns);
    const columnIndex = index % columns;
    return {
      code: `${seatRowLabel(rowIndex)}${columnIndex + 1}`,
      row: rowIndex + 1,
      column: columnIndex + 1,
    };
  });
}

export function sanitizeObservedSeatCodes(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((code) => typeof code === "string" && SEAT_CODE_PATTERN.test(code)))];
}

export function addObservedSeatCode(value, code) {
  return sanitizeObservedSeatCodes([...sanitizeObservedSeatCodes(value), code]);
}
