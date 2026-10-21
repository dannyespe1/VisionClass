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
        <legend className="font-semibold text-foreground">Estado observable</legend>
        <p id="observer-category-help" className="text-sm text-muted-foreground">
          Selecciona la descripción que corresponda. Cada opción se envía al seleccionarla; si no puede registrarse, el panel mostrará un error.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${categoryButton} border-success bg-success text-[var(--success-foreground)] hover:bg-success/90 focus-visible:ring-success`}
            onClick={() => submit("attentive", 0.75)}
          >
            Orientación compatible con la tarea
          </button>
          <button
            type="button"
            className={`${categoryButton} border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive`}
            onClick={() => submit("distracted", 0.75)}
          >
            Orientación fuera de la tarea
          </button>
          <button
            type="button"
            className={`${categoryButton} border-warning bg-warning text-[var(--warning-foreground)] hover:bg-warning/90 focus-visible:ring-warning`}
            onClick={() => submit("uncertain", 0.5)}
          >
            Evidencia incierta
          </button>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-medium text-foreground">
          Motivo cuando no es observable
          <select
            className="min-h-11 rounded-lg border border-border bg-card px-3 py-2 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          className={`${categoryButton} border-primary bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none`}
          disabled={!noObservableReason}
          onClick={() => submit("no_observable", 1, noObservableReason)}
        >
          Registrar como no observable
        </button>
      </div>
    </section>
  );
}
