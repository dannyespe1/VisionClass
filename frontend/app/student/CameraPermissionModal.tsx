import { useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { AlertCircle, Camera, Database, FlaskConical, Shield } from "lucide-react";
import type { ConsentStatus } from "../lib/consent";

interface CameraPermissionModalProps {
  onAllow: (settings: PermissionSettings) => void | Promise<void>;
  onDeny: () => void | Promise<void>;
  consentStatus: ConsentStatus | null;
}

export interface PermissionSettings {
  enableCamera: boolean;
  enableAttentionTracking: boolean;
  saveAnalytics: boolean;
  shareWithInstructor: false;
  researchUse: boolean;
}

export function CameraPermissionModal({ onAllow, onDeny, consentStatus }: CameraPermissionModalProps) {
  const [localProcessing, setLocalProcessing] = useState(false);
  const [derivedPersistence, setDerivedPersistence] = useState(false);
  const [researchUse, setResearchUse] = useState(false);
  const consentTextApproved = Boolean(consentStatus?.enabled && consentStatus.text_approved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
        <div className="border-b p-8">
          <div className="mb-3 flex items-center gap-3">
            <Camera className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl">Decisión sobre cámara y datos derivados</h2>
          </div>
          <div className={`rounded-xl border p-4 text-sm ${consentTextApproved ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
            <p className="font-semibold">
              {consentTextApproved
                ? `TEXTO DE CONSENTIMIENTO APROBADO — VERSIÓN ${consentStatus?.current_version}`
                : "CONSENTIMIENTO NO DISPONIBLE — NO SE HABILITARÁ LA CÁMARA"}
            </p>
            <p>La cámara es opcional. Puedes cursar y realizar las actividades sin activarla.</p>
          </div>
        </div>
        <div className="space-y-4 p-8">
          <ConsentChoice icon={<Camera className="h-5 w-5" />} title="Procesamiento local de cámara" description="Procesa temporalmente la imagen para obtener señales observables. No autoriza guardar imágenes ni video." checked={localProcessing} onChange={setLocalProcessing} />
          <ConsentChoice icon={<Database className="h-5 w-5" />} title="Guardar datos derivados" description="Persiste eventos y métricas derivados. No concede acceso individual al docente." checked={derivedPersistence} onChange={setDerivedPersistence} />
          <ConsentChoice icon={<FlaskConical className="h-5 w-5" />} title="Uso para investigación" description="Finalidad independiente y opcional. Rechazarla no impide cursar." checked={researchUse} onChange={setResearchUse} />
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <Shield className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Imágenes almacenadas: no. Acceso individual del docente: no. Puedes revocar y la captura debe detenerse.</p>
          </div>
          {localProcessing !== derivedPersistence && <div className="flex items-start gap-2 text-sm text-amber-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>La captura requiere ambas finalidades.</p></div>}
        </div>
        <div className="flex gap-3 border-t bg-gray-50 p-8">
          <Button variant="outline" className="flex-1" onClick={onDeny}>Continuar sin cámara</Button>
          <Button className="flex-1" disabled={!consentTextApproved || !localProcessing || !derivedPersistence} onClick={() => onAllow({ enableCamera: true, enableAttentionTracking: true, saveAnalytics: true, shareWithInstructor: false, researchUse })}>
            Registrar decisiones y continuar
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConsentChoice({ icon, title, description, checked, onChange }: { icon: ReactNode; title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4"><div className="flex gap-3"><span className="mt-0.5 text-blue-600">{icon}</span><div><p>{title}</p><p className="text-sm text-gray-600">{description}</p></div></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
