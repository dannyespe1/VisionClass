// d2r-rows.ts
// -----------------------------------------------------------------------------
// IMPORTANTE:
// El d2-R (Version A) utiliza una matriz FIJA (no aleatoria).
// Este archivo es el punto de integracion para cargar esa matriz fija internamente.
//
// Este placeholder es DETERMINISTICO para mantener consistencia entre alumnos
// mientras el equipo incorpora la matriz licenciada (Version A).
// -----------------------------------------------------------------------------

export type D2RCell = {
  id: number;
  letter: "d" | "p";
  dashesTop: number;
  dashesBottom: number;
  target: boolean;
};

export const D2R_TOTAL_PHASES = 14;
export const D2R_ROW_SIZE = 47;

// PRNG deterministico simple (mulberry32) para placeholder reproducible
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPlaceholderRow(phase: number): D2RCell[] {
  const rand = mulberry32(0xd2 + phase * 101); // semilla fija por fase
  const letters: Array<D2RCell["letter"]> = ["d", "p"];

  return Array.from({ length: D2R_ROW_SIZE }).map((_, idx) => {
    const letter = letters[Math.floor(rand() * letters.length)];

    // total dashes 1..3 (d2-R real es fijo; esto es placeholder deterministico)
    const totalDashes = 1 + Math.floor(rand() * 3);
    const dashesTop = Math.floor(rand() * (totalDashes + 1));
    const dashesBottom = totalDashes - dashesTop;
    const target = letter === "d" && totalDashes === 2;

    return { id: idx, letter, dashesTop, dashesBottom, target };
  });
}

// TODO (equipo):
// Reemplazar este arreglo por la matriz FIJA de la Version A (licenciada),
// manteniendo exactamente 14 filas x 47 celdas.
export const D2R_ROWS: D2RCell[][] = Array.from({ length: D2R_TOTAL_PHASES }).map((_, i) =>
  buildPlaceholderRow(i + 1)
);
