import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SEAT_COLUMNS,
  MAX_SEAT_ROWS,
  buildSeatGrid,
  isValidSeatLayout,
  seatRowLabel,
} from "../app/lib/seat-grid.mjs";

test("genera códigos de asiento ordenados por fila", () => {
  assert.deepEqual(buildSeatGrid(2, 3), [
    { code: "A1", row: 1, column: 1 },
    { code: "A2", row: 1, column: 2 },
    { code: "A3", row: 1, column: 3 },
    { code: "B1", row: 2, column: 1 },
    { code: "B2", row: 2, column: 2 },
    { code: "B3", row: 2, column: 3 },
  ]);
});

test("los códigos generados cumplen el contrato location_code", () => {
  for (const seat of buildSeatGrid(MAX_SEAT_ROWS, MAX_SEAT_COLUMNS)) {
    assert.match(seat.code, /^[A-Z0-9-]{2,16}$/);
  }
  assert.equal(seatRowLabel(0), "A");
  assert.equal(seatRowLabel(19), "T");
});

test("rechaza dimensiones vacías, negativas, decimales o excesivas", () => {
  for (const [rows, columns] of [
    [0, 4],
    [4, 0],
    [-1, 4],
    [4.5, 4],
    [MAX_SEAT_ROWS + 1, 4],
    [4, MAX_SEAT_COLUMNS + 1],
  ]) {
    assert.equal(isValidSeatLayout(rows, columns), false);
    assert.throws(() => buildSeatGrid(rows, columns), RangeError);
  }
});
