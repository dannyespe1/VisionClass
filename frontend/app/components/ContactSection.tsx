import { useState } from "react";
import { Button } from "@/app/ui/button";
import { Input } from "@/app/ui/input";
import { Label } from "@/app/ui/label";
import { Textarea } from "@/app/ui/textarea";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success("Mensaje enviado con exito. Te contactaremos pronto.");
      setFormData({ name: "", email: "", institution: "", message: "" });
      setIsSubmitting(false);
    }, 900);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contacto" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm inline-block mb-4 border border-indigo-100">
            Contacto
          </span>
          <h2 className="text-4xl lg:text-5xl text-slate-900 mb-4 font-semibold">Comienza tu transformacion digital</h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            ¿Listo para implementar VisionClass en tu institucion? Conversemos y te guiaremos en la puesta en marcha.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 lg:p-10 space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">👁️</div>
              <div>
                <p className="text-sm text-slate-200">Soporte dedicado</p>
                <p className="text-base font-semibold">Resolvemos dudas de implementacion y privacidad.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Dra. Laura Gomez"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electronico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="laura.gomez@universidad.edu"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institucion</Label>
                <Input
                  id="institution"
                  name="institution"
                  placeholder="Universidad / Colegio"
                  value={formData.institution}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Cuéntanos sobre tu necesidad, tiempos y metas de implementacion..."
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar mensaje"}
              </Button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
              <h3 className="text-2xl text-slate-900 mb-4 font-semibold">Informacion de contacto</h3>
              <p className="text-slate-600 mb-6">
                Estamos listos para ayudarte a lanzar VisionClass en tu institucion y asegurar una adopcion rapida.
              </p>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Email</div>
                    <a href="mailto:contacto@visionattent.com" className="text-slate-900 hover:text-indigo-600 transition-colors">
                      contacto@visionattent.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Telefono</div>
                    <a href="tel:+5938001234567" className="text-slate-900 hover:text-indigo-600 transition-colors">
                      +593 800 123 4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Oficina</div>
                    <p className="text-slate-900">
                      Av. Innovacion Tecnologica 123
                      <br />
                      Latacunga, Ecuador
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-sky-500 rounded-3xl p-8 text-white shadow-lg">
              <h4 className="text-xl mb-3 font-semibold">Horario de atencion</h4>
              <p className="text-indigo-100 mb-4">Nuestro equipo esta disponible para ayudarte.</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo-100">Lunes - Viernes</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">Sabado</span>
                  <span>10:00 AM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">Domingo</span>
                  <span>Cerrado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
