"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Cell = { id: number; text: string; target: boolean };

const LETTERS = ["d", "p"];

function generateRow(size: number, targetProbability: number): Cell[] {
  return Array.from({ length: size }).map((_, idx) => {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const randomDashes = Math.floor(Math.random() * 3) + 1; // 1..3
    const forceTwo = Math.random() < targetProbability;
    const dashes = forceTwo ? 2 : randomDashes;
    const target = letter === "d" && dashes === 2;
    const text = `${letter}${"-".repeat(dashes)}`;
    return { id: idx, text, target };
  });
}

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
  onTick,
  onPhaseStart,
  onPhaseEnd,
  onClickEvent,
}: {
  durationSeconds?: number;
  rowSize?: number;
  targetProbability?: number;
  phase?: number;
  totalPhases?: number;
  onFinish: (phaseNumber: number, results: { hits: number; errors: number; omissions: number }) => void;
  onTick?: (data: { phase: number; timeLeft: number; spinning: boolean }) => void;
  onPhaseStart?: (data: { phase: number; startedAt: number; spinningEndsAt?: number }) => void;
  onPhaseEnd?: (data: { phase: number; endedAt: number; hits: number; errors: number; omissions: number; targetCount: number }) => void;
  onClickEvent?: (data: { phase: number; ts: number; cellId: number; isTarget: boolean }) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [active, setActive] = useState(false);
  const [spinning, setSpinning] = useState(true);
  const [row, setRow] = useState<Cell[]>(() => generateRow(rowSize, targetProbability));
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [clickedIds, setClickedIds] = useState<Set<number>>(new Set());
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedPhaseRef = useRef(false);
  const phaseStartRef = useRef<number | null>(null);
  const spinEndRef = useRef<number | null>(null);

  const startPhase = useCallback(() => {
    setActive(false);
    setSpinning(true);
    setHits(0);
    setErrors(0);
    setClickedIds(new Set());
    setTimeLeft(durationSeconds);
    finishedPhaseRef.current = false;

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);

    spinTimeoutRef.current = setTimeout(() => {
      setRow(generateRow(rowSize, targetProbability));
      setSpinning(false);
      setActive(true);
      const spinEndsAt = Date.now();
      spinEndRef.current = spinEndsAt;
      if (onPhaseStart) {
        const startedAt = phaseStartRef.current ?? Date.now();
        onPhaseStart({ phase, startedAt, spinningEndsAt: spinEndsAt });
      }
    }, 900);
    phaseStartRef.current = Date.now();
  }, [durationSeconds, rowSize, targetProbability, phase, onPhaseStart]);

  const finish = useCallback(() => {
    if (finishedPhaseRef.current) return;
    finishedPhaseRef.current = true;
    setActive(false);
    const targetCount = row.filter((c) => c.target).length;
    const omissions = Math.max(targetCount - hits, 0);
    setTimeout(() => {
      onFinish(phase, { hits, errors, omissions });
      if (onPhaseEnd) {
        onPhaseEnd({
          phase,
          endedAt: Date.now(),
          hits,
          errors,
          omissions,
          targetCount,
        });
      }
    }, 0);
  }, [errors, hits, onFinish, onPhaseEnd, phase, row]);

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
    if (onClickEvent) {
      onClickEvent({ phase, ts: Date.now(), cellId: cell.id, isTarget: cell.target });
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (active && !spinning) {
      timer = setInterval(() => {
        setTimeLeft((t) => {
          const next = t - 1;
          const value = next <= 0 ? 0 : next;
          if (onTick) {
            onTick({ phase, timeLeft: value, spinning });
          }
          return value;
        });
      }, 1000);
    } else {
      if (onTick) onTick({ phase, timeLeft, spinning });
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [active, spinning, onTick, phase, timeLeft]);

  useEffect(() => {
    if (active && !spinning && timeLeft <= 0) {
      finish();
    }
  }, [timeLeft, active, spinning, finish]);

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
          Marca únicamente las letras <span className="font-semibold text-sky-600">"d"</span> que tengan{" "}
          <span className="font-semibold text-sky-600">exactamente dos guiones</span>.
        </p>

        <div className="mt-4 flex justify-center">
          <div className="grid grid-cols-12 gap-2 sm:gap-3">
            {spinning
              ? Array.from({ length: rowSize }).map((_, idx) => <ReelCell key={idx} />)
              : row.map((cell) => {
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
                      <span className="leading-none">{cell.text}</span>
                    </button>
                  );
                })}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-slate-500">
          <p>
            Fase {phase} de {totalPhases} • {spinning ? "Preparando matriz..." : `${timeLeft} segundos restantes`}
          </p>
        </div>
      </div>
    </div>
  );
}
