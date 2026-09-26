import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../app/components/ObserverAnnotationForm.tsx", import.meta.url),
  "utf8",
);

test("uses observable-orientation language instead of claiming internal attention", () => {
  assert.match(source, /Orientación compatible con la tarea/);
  assert.match(source, /Orientación fuera de la tarea/);
  assert.match(source, /ventana sincronizada de 5 segundos/);
  assert.doesNotMatch(source, />Atento\/a</);
  assert.doesNotMatch(source, />Distraído\/a</);
});

test("requires a protocol reason before submitting no_observable", () => {
  assert.match(source, /disabled=\{!noObservableReason\}/);
  assert.match(source, /submit\("no_observable", 1, noObservableReason\)/);
  for (const reason of [
    "sin_rostro",
    "oclusion",
    "iluminacion",
    "multiples_personas",
    "fallo_dispositivo",
    "material_fuera_de_pantalla",
    "retiro_consentimiento",
    "otro_especificado",
  ]) {
    assert.match(source, new RegExp(`value="${reason}"`));
  }
});
