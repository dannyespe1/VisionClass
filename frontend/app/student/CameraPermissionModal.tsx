import { useState } from "react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Camera, Shield, Eye, Lock, CheckCircle2, AlertCircle } from "lucide-react";

interface CameraPermissionModalProps {
  onAllow: (settings: PermissionSettings) => void;
  onDeny: () => void;
}

export interface PermissionSettings {
  enableCamera: boolean;
  enableAttentionTracking: boolean;
  saveAnalytics: boolean;
  shareWithInstructor: boolean;
}

export function CameraPermissionModal({ onAllow, onDeny }: CameraPermissionModalProps) {
  const [settings, setSettings] = useState<PermissionSettings>({
    enableCamera: true,
    enableAttentionTracking: true,
    saveAnalytics: true,
    shareWithInstructor: true,
  });

  const handleAllow = () => {
    onAllow(settings);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Camera className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl mb-1">Permisos de Cámara</h2>
              <p className="text-gray-600">Optimiza tu experiencia de aprendizaje</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Beneficios del Monitoreo de Atención
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="mb-1">Análisis en Tiempo Real</div>
                  <p className="text-sm text-gray-600">
                    Detecta automáticamente momentos de distracción y te ayuda a mantener el enfoque
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="mb-1">Recomendaciones Personalizadas</div>
                  <p className="text-sm text-gray-600">
                    Recibe sugerencias de estudio adaptadas a tus patrones de atención
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
                <Lock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="mb-1">Medición No Invasiva</div>
                  <p className="text-sm text-gray-600">
                    Tecnología de visión por computadora pasiva que no graba ni almacena imágenes
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="mb-1 text-amber-900">Privacidad y Seguridad</div>
                <p className="text-sm text-amber-800">
                  Esta plataforma no recopila información personal identificable (PII) ni datos sensibles.
                  Solo se procesan métricas de atención de forma anónima. Puedes revocar estos permisos
                  en cualquier momento desde la configuración.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg mb-4">Configuración de Privacidad</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="mb-1">Habilitar Cámara</div>
                  <p className="text-sm text-gray-600">
                    Permite el acceso a la cámara para el análisis de atención
                  </p>
                </div>
                <Switch
                  checked={settings.enableCamera}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableCamera: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="mb-1">Seguimiento de Atención</div>
                  <p className="text-sm text-gray-600">
                    Analiza tus niveles de concentración durante las lecciones
                  </p>
                </div>
                <Switch
                  checked={settings.enableAttentionTracking}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableAttentionTracking: checked })
                  }
                  disabled={!settings.enableCamera}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="mb-1">Guardar Análisis</div>
                  <p className="text-sm text-gray-600">
                    Almacena tus métricas para ver tu progreso en el tiempo
                  </p>
                </div>
                <Switch
                  checked={settings.saveAnalytics}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, saveAnalytics: checked })
                  }
                  disabled={!settings.enableAttentionTracking}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="mb-1">Compartir con Instructor</div>
                  <p className="text-sm text-gray-600">
                    Permite que tu instructor vea estadísticas para ofrecer mejor apoyo
                  </p>
                </div>
                <Switch
                  checked={settings.shareWithInstructor}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, shareWithInstructor: checked })
                  }
                  disabled={!settings.saveAnalytics}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t bg-gray-50 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onDeny}>
            Continuar sin Cámara
          </Button>
          <Button className="flex-1" onClick={handleAllow} disabled={!settings.enableCamera}>
            Permitir y Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
