"use client";

type ResponseValue = "focused" | "distracted" | "unsure" | "omitted";

export function MomentarySelfReportPrompt({ onAnswer }: { onAnswer: (value: ResponseValue) => void }) {
  return (
    <section aria-labelledby="momentary-report-title" className="rounded-lg border p-4">
      <h2 id="momentary-report-title" className="font-medium">¿Cómo describirías tu atención justo antes de esta pregunta?</h2>
      <p className="text-sm text-muted-foreground">Responder es opcional y no afecta tu curso.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onAnswer("focused")}>Concentrado/a</button>
        <button type="button" onClick={() => onAnswer("distracted")}>Distraído/a</button>
        <button type="button" onClick={() => onAnswer("unsure")}>No estoy seguro/a</button>
        <button type="button" onClick={() => onAnswer("omitted")}>Omitir</button>
      </div>
    </section>
  );
}
