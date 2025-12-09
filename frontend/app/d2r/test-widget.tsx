"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Cell = { id: number; text: string; target: boolean };

const LETTERS = ["d", "p"];

function generateRow(size: number, targetProbability: number): Cell[] {
  return Array.from({ length: size }).map((_, idx) => {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const dashes = Math.floor(Math.random() * 3) + 1; // 1–3
    const target = letter === "d" && dashes === 2 && Math.random() < targetProbability;
    const text = `${letter}${"-".repeat(dashes)}`;
    return { id: idx, text, target };
  });
}

// Celda tipo “tragamonedas”: mientras spinning=true muestra una rueda vertical
function ReelCell() {
  const baseItems = ["d-", "p--", "d--", "q-", "b--", "p-"];
  const items = [...baseItems, ...baseItems];

  return (
    <div className="h-11 w-11 sm:h-12 sm:w-12 overflow-hidden rounded-2xl bg-white border border-slate-200">
      <div className="flex flex-col animate-reel-fast">
        {items.map((text, idx) => (
          <div
            key={`${text}-${idx}`}
            className="h-11 sm:h-12 flex items-center justify-center text-sm sm:text-base font-semibold text-slate-700"
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function D2RWidget({
  durationSeconds = 20,
  rowSize = 12,
  targetProbability = 0.4,
  phase = 1,
  totalPhases = 14,
  onFinish,
}: {
  durationSeconds?: number;
  rowSize?: number;
  targetProbability?: number;
  phase?: number;
  totalPhases?: number;
  onFinish: (results: { hits: number; errors: number; omissions: number }) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [active, setActive] = useState(false);
  const [spinning, setSpinning] = useState(true);
  const [row, setRow] = useState<Cell[]>(() => generateRow(rowSize, targetProbability));
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [clickedIds, setClickedIds] = useState<Set<number>>(new Set());
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPhase = useCallback(() => {
    setActive(false);
    setSpinning(true);
    setHits(0);
    setErrors(0);
    setClickedIds(new Set());
    setTimeLeft(durationSeconds);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);

    spinTimeoutRef.current = setTimeout(() => {
      setRow(generateRow(rowSize, targetProbability));
      setSpinning(false);
      setActive(true);
    }, 900);
  }, [durationSeconds, rowSize, targetProbability]);

  const finish = useCallback(() => {
    setActive(false);
    const targetCount = row.filter((c) => c.target).length;
    const omissions = Math.max(targetCount - hits, 0);
    onFinish({ hits, errors, omissions });
  }, [errors, hits, onFinish, row]);

  useEffect(() => {
    startPhase();
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [startPhase, phase]);

  const clickCell = (cell: Cell) => {
    if (!active || spinning) return;
    if (clickedIds.has(cell.id)) return;

    const newSet = new Set(clickedIds);
    newSet.add(cell.id);
    setClickedIds(newSet);

    if (cell.target) setHits((h) => h + 1);
    else setErrors((e) => e + 1);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (active && !spinning) {
      timer = setInterval(() => {
        setTimeLeft((t) => {
          const next = t - 1;
          if (next <= 0) {
            finish();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [active, spinning, finish]);

  const targetCount = useMemo(() => row.filter((c) => c.target).length, [row]);

  const progressPercent = useMemo(
    () => ((durationSeconds - timeLeft) / durationSeconds) * 100,
    [durationSeconds, timeLeft]
  );

  return (
    <div className="space-y-6">
      {/* Header tipo Insightful */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <span className="text-sky-600 text-xl">👁️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Test D2R</p>
              <p className="text-xs text-slate-500">
                Fase {phase} de {totalPhases}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </div>
            <span>{timeLeft}s</span>
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
          />
        </div>
      </div>

      {/* Card principal centrada */}
      <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm px-6 sm:px-10 py-8 flex flex-col gap-6 items-center">
        {/* Instrucciones como frase central */}
        <p className="text-center text-sm sm:text-base text-slate-700 max-w-xl font-medium">
          Marca únicamente las letras{" "}
          <span className="font-semibold text-sky-600">“d”</span> que tengan{" "}
          <span className="font-semibold text-sky-600">exactamente dos guiones</span>.
        </p>

        {/* Matriz o tragamonedas */}
        <div className="mt-4 flex justify-center">
          <div className="grid grid-cols-12 gap-2 sm:gap-3">
            {spinning
              ? Array.from({ length: rowSize }).map((_, idx) => <ReelCell key={idx} />)
              : row.map((cell) => {
                  const clicked = clickedIds.has(cell.id);
                  const isTarget = cell.target;

                  const base =
                    "h-11 w-11 sm:h-12 sm:w-12 rounded-2xl border text-sm sm:text-base font-semibold flex items-center justify-center transition-all select-none";
                  const idle = "bg-slate-50 border-slate-200 hover:bg-slate-100";
                  const success = "bg-emerald-50 border-emerald-300";
                  const error = "bg-rose-50 border-rose-300";

                  return (
                    <button
                      key={cell.id}
                      type="button"
                      onClick={() => clickCell(cell)}
                      className={[
                        base,
                        clicked ? (isTarget ? success : error) : idle,
                        "text-slate-800",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="leading-none">{cell.text}</span>
                    </button>
                  );
                })}
          </div>
        </div>

        {/* Pie tipo test */}
        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-slate-500">
          <p>
            Fase {phase} de {totalPhases} •{" "}
            {spinning ? "Preparando matriz..." : `${timeLeft} segundos restantes`}
          </p>

          <button
            type="button"
            onClick={startPhase}
            disabled={spinning}
            className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[11px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {spinning ? "Cargando fase..." : "Repetir esta fase"}
          </button>

          {!spinning && (
            <div className="grid grid-cols-2 gap-6 text-xs text-slate-600 mt-2">
              <div className="flex flex-col items-center">
                <span className="font-medium">Aciertos</span>
                <span className="text-lg font-semibold text-slate-900">{hits}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">Errores</span>
                <span className="text-lg font-semibold text-slate-900">{errors}</span>
              </div>
            </div>
          )}

          {!spinning && (
            <p className="text-[11px] text-center text-slate-400">
              Objetivos en esta fase: {targetCount}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
