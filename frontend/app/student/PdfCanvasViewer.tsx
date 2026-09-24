"use client";

import { useEffect, useRef, useState } from "react";

interface PdfCanvasViewerProps {
  data: Uint8Array;
  title: string;
}

export function PdfCanvasViewer({ data, title }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    const container = containerRef.current;

    const renderDocument = async () => {
      setStatus("loading");
      if (!container) return;
      container.replaceChildren();

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const task = pdfjs.getDocument({ data: data.slice() });
        loadingTask = task;
        const document = await task.promise;
        if (cancelled) return;

        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = window.document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas no disponible");

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "mx-auto block h-auto w-full max-w-4xl bg-white shadow-sm";
          canvas.setAttribute("aria-label", `${title}, página ${pageNumber}`);
          container.appendChild(canvas);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
        }

        if (!cancelled) setStatus("ready");
      } catch (error) {
        console.error("No se pudo renderizar el PDF", error);
        if (!cancelled) setStatus("error");
      }
    };

    renderDocument();
    return () => {
      cancelled = true;
      loadingTask?.destroy().catch(() => undefined);
      container?.replaceChildren();
    };
  }, [data, title]);

  return (
    <div className="min-h-[600px] bg-slate-100 p-3 sm:p-5">
      {status === "loading" && (
        <p className="py-8 text-center text-sm text-slate-500">Preparando lectura…</p>
      )}
      {status === "error" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No se pudo mostrar la lectura. Puedes abrirla con el botón Descargar.
        </p>
      )}
      <div ref={containerRef} className="space-y-4" />
    </div>
  );
}
