"use client";

type Category = "attentive" | "distracted" | "no_observable" | "uncertain";

export function ObserverAnnotationForm({ assignmentId, onSubmit }: { assignmentId: string; onSubmit: (value: { assignmentId: string; category: Category; confidence: number }) => void }) {
  const submit = (category: Category, confidence: number) => onSubmit({ assignmentId, category, confidence });
  return (
    <section aria-labelledby="observer-title">
      <h2 id="observer-title">Anotación independiente</h2>
      <p>Evalúa únicamente la evidencia disponible. Las predicciones del sistema permanecen ocultas.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => submit("attentive", 0.75)}>Atento/a</button>
        <button type="button" onClick={() => submit("distracted", 0.75)}>Distraído/a</button>
        <button type="button" onClick={() => submit("no_observable", 1)}>No observable</button>
        <button type="button" onClick={() => submit("uncertain", 0.5)}>Incierto</button>
      </div>
    </section>
  );
}
