"use client";

import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import {
  deleteDemographicProfile,
  getDemographicProfile,
  saveDemographicProfile,
  type DemographicGender,
  type DemographicProfileStatus,
} from "../lib/demographics";

const LABELS: Record<DemographicGender, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  otro: "Otro",
};

export function DemographicResearchCard({ token }: { token: string }) {
  const [profile, setProfile] = useState<DemographicProfileStatus | null>(null);
  const [gender, setGender] = useState<DemographicGender | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDemographicProfile(token)
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!profile?.available) return null;

  const save = async () => {
    if (!gender || !confirmed) return;
    setBusy(true);
    setMessage(null);
    try {
      setProfile(await saveDemographicProfile(token, gender));
      setGender("");
      setConfirmed(false);
      setMessage("Respuesta cifrada y registrada.");
    } catch {
      setMessage("No fue posible registrar la respuesta.");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setMessage(null);
    try {
      setProfile(await deleteDemographicProfile(token));
      setMessage("La respuesta demográfica fue retirada.");
    } catch {
      setMessage("No fue posible retirar la respuesta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm">
      <p className="font-medium text-violet-950">Auditoría demográfica voluntaria</p>
      <p className="mt-1 text-xs text-violet-800">
        La edad 18–20 se usa solo como criterio de cohorte. El género se cifra, no entra al modelo y
        solo se analiza en grupos suficientemente grandes.
      </p>
      {!profile.research_consent_granted ? (
        <p className="mt-2 text-xs text-amber-700">Requiere consentimiento vigente para investigación.</p>
      ) : profile.registered ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-emerald-700">Respuesta registrada. El sistema no vuelve a mostrar su valor.</p>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={withdraw}>
            Retirar respuesta
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-xs text-violet-950">
            Género
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value as DemographicGender | "")}
              className="mt-1 w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Prefiero no responder</option>
              {profile.gender_options.map((option) => (
                <option key={option} value={option}>{LABELS[option]}</option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2 text-xs text-violet-900">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5"
            />
            Confirmo que mi participación es voluntaria y que puedo retirar esta respuesta.
          </label>
          <Button type="button" size="sm" disabled={busy || !gender || !confirmed} onClick={save}>
            Guardar respuesta cifrada
          </Button>
        </div>
      )}
      {message && <p className="mt-2 text-xs text-violet-800" role="status">{message}</p>}
    </section>
  );
}
