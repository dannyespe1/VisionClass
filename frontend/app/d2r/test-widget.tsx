"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { D2R_ROWS, D2R_ROW_SIZE } from "./d2r-rows";

type Cell = {
  id: number;
  letter: "d" | "p";
  dashesTop: number;
  dashesBottom: number;
  target: boolean;
};

function DashRow({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center gap-0.5 min-h-2">
      {Array.from({ length: count }).map((_, idx) => (
        <span key={idx} className="h-2.5 w-0.5 rounded-full bg-slate-500" />
      ))}
    </div>
  );
}

function CellGlyph({ letter, dashesTop, dashesBottom }: Omit<Cell, "id" | "target">) {
  return (
    <div className="flex flex-col items-center justify-center leading-none">
      <DashRow count={dashesTop} />
      <div className="text-sm sm:text-base font-semibold text-slate-800">{letter}</div>
      <DashRow count={dashesBottom} />
    </div>
  );
}

export default function D2RWidget({
  durationSeconds = 15,
  phase = 1,
  totalPhases = 14,
  onFinish,
  onTick,
  onPhaseStart,
  onPhaseEnd,
  onClickEvent,
}: {
  durationSeconds: number;
  phase: number;
  totalPhases: number;
  onFinish: (phaseNumber: number, results: { TR: number; TA: number; O: number; C: number; CON: number }) => void;
  onTick: (data: { phase: number; timeLeft: number }) => void;
  onPhaseStart: (data: { phase: number; startedAt: number }) => void;
  onPhaseEnd: (data: { phase: number; endedAt: number; TR: number; TA: number; O: number; C: number; CON: number; targetCount: number }) => void;
  onClickEvent: (data: { phase: number; ts: number; cellId: number; isTarget: boolean }) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [active, setActive] = useState(false);
  const ROW_SIZE = D2R_ROW_SIZE;
  const [row, setRow] = useState<Cell[]>(() => D2R_ROWS[0]  []);
  const [TA, setTA] = useState(0); // aciertos
  const [C, setC] = useState(0);   // comisiones
  const [clickedIds, setClickedIds] = useState<Set<number>>(new Set());
  const finishedPhaseRef = useRef(false);
  const phaseStartRef = useRef<number | null>(null);
  const lastTouchedIndexRef = useRef<number>(-1);

  const startPhase = useCallback(() => {
    setActive(false);
    setTA(0);
    setC(0);
    setClickedIds(new Set());
    setTimeLeft(durationSeconds);
    finishedPhaseRef.current = false;
    lastTouchedIndexRef.current = -1;

    // d2-R (Versin A) requiere filas fijas y estmulo esttico desde el inicio de la fase
    const nextRow = D2R_ROWS[phase - 1];
    setRow(nextRow  []);
    phaseStartRef.current = Date.now();
    onPhaseStart.({ phase, startedAt: phaseStartRef.current });
    setActive(true);
  }, [durationSeconds, phase, onPhaseStart]);

  const finish = useCallback(() => {
    if (finishedPhaseRef.current) return;
    finishedPhaseRef.current = true;
    setActive(false);
    const targetCount = row.filter((c) => c.target).length;
    const O = Math.max(targetCount - TA, 0);
    const TR = Math.max(lastTouchedIndexRef.current + 1, 0);
    const CON = TA - C;
    setTimeout(() => {
      onFinish(phase, { TR, TA, O, C, CON });
      if (onPhaseEnd) {
        onPhaseEnd({
          phase,
          endedAt: Date.now(),
          TR,
          TA,
          O,
          C,
          CON,
          targetCount,
        });
      }
    }, 0);
  }, [C, TA, onFinish, onPhaseEnd, phase, row]);

  useEffect(() => {
    startPhase();
    return () => {
      // no-op
    };
  }, [startPhase, phase]);

  const clickCell = (cell: Cell) => {
    if (!active) return;
    if (clickedIds.has(cell.id)) return;

    const newSet = new Set(clickedIds);
    newSet.add(cell.id);
    setClickedIds(newSet);

    lastTouchedIndexRef.current = Math.max(lastTouchedIndexRef.current, cell.id);
    if (cell.target) setTA((h) => h + 1);
    else setC((e) => e + 1);
    if (onClickEvent) {
      onClickEvent({ phase, ts: Date.now(), cellId: cell.id, isTarget: cell.target });
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (active) {
      timer = setInterval(() => {
        setTimeLeft((t) => {
          const next = t - 1;
          const value = next <= 0 ? 0 : next;
          if (onTick) {
            onTick({ phase, timeLeft: value });
          }
          return value;
        });
      }, 1000);
    } else {
      if (onTick) onTick({ phase, timeLeft });
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [active, onTick, phase, timeLeft]);

  useEffect(() => {
    if (active && timeLeft <= 0) {
      finish();
    }
  }, [timeLeft, active, finish]);

  const progressPercent = useMemo(
    () => ((durationSeconds - timeLeft) / durationSeconds) * 100,
    [durationSeconds, timeLeft]
  );

  return (
    <div className="space-y-6">
      <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <span className="text-sky-600 text-xl">D2R</span>
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

      <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm px-6 sm:px-10 py-8 flex flex-col gap-6 items-center">
        <p className="text-center text-sm sm:text-base text-slate-700 max-w-xl font-medium">
          Marca unicamente las letras <span className="font-semibold text-sky-600">"d"</span> que tengan{" "}
          <span className="font-semibold text-sky-600">exactamente dos rayitas</span>, arriba, abajo o divididas.
        </p>

        <div className="mt-4 flex justify-center">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3">
            {row.map((cell) => {
              const clicked = clickedIds.has(cell.id);

              const base =
                "h-11 w-11 sm:h-12 sm:w-12 rounded-2xl border text-sm sm:text-base font-semibold flex items-center justify-center transition-all select-none";
              const idle = "bg-slate-50 border-slate-200 hover:bg-slate-100";
              const neutralPressed = "bg-slate-200 border-slate-300";

              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => clickCell(cell)}
                  className={[base, clicked ? neutralPressed : idle, "text-slate-800"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <CellGlyph
                    letter={cell.letter}
                    dashesTop={cell.dashesTop}
                    dashesBottom={cell.dashesBottom}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-slate-500">
          <p>
            Fase {phase} de {totalPhases}  {timeLeft} segundos restantes
          </p>
        </div>
      </div>
    </div>
  );
}
