"use client";

import React, { useState } from "react";
import {
  createAprendizajeDraft,
  } from "../../lib/apiClient";

type ChatLike = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages?: ChatLike[];
  onClose?: () => void;
  onSaved?: (id: number) => void;
};

const createAprendizajeDraftFlow: React.FC<Props> = ({
  messages = [],
  onClose,
  onSaved,
}) => {
  const [titulo, setTitulo] = useState("");
  const [resumen, setResumen] = useState("");
  const [sectorId, setSectorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"draft" | "confirm">("draft");

  const handleDraft = async () => {
    setError(null);
    setLoading(true);
    try {
      // @ts-ignore
      const data = await createAprendizajeDraft({ conversacion: messages, confirmar: false }); if ("titulo" in data) { setTitulo(data.titulo); setResumen(data.resumen); }

      setStep("confirm");
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el resumen.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sectorId) {
      setError("Selecciona un sector antes de guardar.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // @ts-ignore
      const res = (await createAprendizajeDraft({
        titulo: titulo || "Aprendizaje sin t�tulo",
        resumen: resumen || "Resumen no disponible.",
        sectorId,
        conversacion: messages,
      });

      if (res?.ok && res.id) {
        if (onSaved) onSaved(res.id);
        if (onClose) onClose();
      } else {
        setError(res?.error || "No se pudo guardar el aprendizaje.");
      }
    } catch (e: any) {
      setError(e?.message || "Error al guardar el aprendizaje.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4">
        <h2 className="text-xl font-semibold">Guardar aprendizaje</h2>

        {step === "draft" && (
          <>
            <p className="text-sm text-gray-600">
              Vamos a generar un resumen a partir de tu conversaci�n actual.
            </p>
            <button
              onClick={handleDraft}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60"
            >
              {loading ? "Generando resumen..." : "Generar resumen"}
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium">T�tulo</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Resumen</label>
              <textarea
                value={resumen}
                onChange={(e) => setResumen(e.target.value)}
                rows={4}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Sector (ID num�rico temporal)
              </label>
              <input
                type="number"
                value={sectorId ?? ""}
                onChange={(e) =>
                  setSectorId(Number(e.target.value) || null)
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Ej: 1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Guardar aprendizaje"}
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default createAprendizajeDraftFlow;






