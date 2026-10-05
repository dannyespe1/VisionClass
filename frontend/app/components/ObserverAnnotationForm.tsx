"use client";

import { useState } from "react";

type Category = "attentive" | "distracted" | "no_observable" | "uncertain";
type NoObservableReason =
  | "sin_rostro"
  | "oclusion"
  | "iluminacion"
  | "multiples_personas"
  | "fallo_dispositivo"
  | "material_fuera_de_pantalla"
  | "retiro_consentimiento"
  | "otro_especificado";

type AnnotationValue = {
  assignmentId: string;
  category: Category;
  confidence: number;
  notesCode: NoObservableReason | "";
};

export function ObserverAnnotationForm({
  assignmentId,
  onSubmit,
}: {
  assignmentId: string;
  onSubmit: (value: AnnotationValue) => void;
}) {
  const [noObservableReason, setNoObservableReason] = useState<NoObservableReason | "">("");
  const submit = (category: Category, confidence: number, notesCode: NoObservableReason | "" = "") =>
    onSubmit({ assignmentId, category, confidence, notesCode });
  const categoryButton =
    "min-h-11 rounded-lg border px-4 py-3 text-left text-sm font-semibold shadow-sm " +
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  return (
    <section aria-labelledby="observer-title" className="space-y-3">
      <div>
        <h2 id="observer-title">Anotación independiente de orientación observable</h2>
        <p>
          Evalúa solamente la conducta visible durante la ventana sincronizada de 5 segundos. Las
          predicciones, el autoinforme y la respuesta del otro observador permanecen ocultos.
        </p>
      </div>
      <fieldset className="space-y-2" aria-describedby="observer-category-help">
        <legend className="font-semibold text-slate-900">Estado observable</legend>
        <p id="observer-category-help" className="text-sm text-slate-700">
          Selecciona la descripción que corresponda. Cada opción se registra inmediatamente.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${categoryButton} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600`}
            onClick={() => submit("attentive", 0.75)}
          >
            Orientación compatible con la tarea
          </button>
          <button
            type="button"
            className={`${categoryButton} border-rose-800 bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-700`}
            onClick={() => submit("distracted", 0.75)}
          >
            Orientación fuera de la tarea
          </button>
          <button
            type="button"
            className={`${categoryButton} border-amber-500 bg-amber-300 text-amber-950 hover:bg-amber-400 focus-visible:ring-amber-500`}
            onClick={() => submit("uncertain", 0.5)}
          >
            Evidencia incierta
          </button>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          Motivo cuando no es observable
          <select
            className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2"
            value={noObservableReason}
            onChange={(event) => setNoObservableReason(event.target.value as NoObservableReason | "")}
          >
            <option value="">Selecciona un motivo</option>
            <option value="sin_rostro">Rostro fuera de la señal</option>
            <option value="oclusion">Oclusión</option>
            <option value="iluminacion">Iluminación insuficiente</option>
            <option value="multiples_personas">Múltiples personas</option>
            <option value="fallo_dispositivo">Fallo del dispositivo</option>
            <option value="material_fuera_de_pantalla">Material autorizado fuera de pantalla</option>
            <option value="retiro_consentimiento">Consentimiento retirado</option>
            <option value="otro_especificado">Otro motivo protocolizado</option>
          </select>
        </label>
        <button
          type="button"
          className={`${categoryButton} border-slate-800 bg-slate-700 text-white hover:bg-slate-800 focus-visible:ring-slate-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none`}
          disabled={!noObservableReason}
          onClick={() => submit("no_observable", 1, noObservableReason)}
        >
          Registrar como no observable
        </button>
      </div>
    </section>
  );
}
