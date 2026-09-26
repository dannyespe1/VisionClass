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

  return (
    <section aria-labelledby="observer-title" className="space-y-3">
      <div>
        <h2 id="observer-title">Anotación independiente de orientación observable</h2>
        <p>
          Evalúa solamente la conducta visible durante la ventana sincronizada de 5 segundos. Las
          predicciones, el autoinforme y la respuesta del otro observador permanecen ocultos.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Categorías observables">
        <button type="button" onClick={() => submit("attentive", 0.75)}>
          Orientación compatible con la tarea
        </button>
        <button type="button" onClick={() => submit("distracted", 0.75)}>
          Orientación fuera de la tarea
        </button>
        <button type="button" onClick={() => submit("uncertain", 0.5)}>
          Evidencia incierta
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">
          Motivo cuando no es observable
          <select
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
          disabled={!noObservableReason}
          onClick={() => submit("no_observable", 1, noObservableReason)}
        >
          Registrar como no observable
        </button>
      </div>
    </section>
  );
}
