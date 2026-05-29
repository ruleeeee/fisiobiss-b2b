// hooks/useRegions.js
"use client";
import { useState, useEffect } from "react";
import { getRegions, saveRegions } from "../lib/db";
import { REGIONS } from "../lib/constants";

export function useRegions() {
  const [regions, setRegions] = useState(REGIONS); // fallback inmediato
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRegions()
      .then(r => { if (r?.length) setRegions(r); })
      .catch(() => {}) // silently keep fallback
      .finally(() => setLoading(false));
  }, []);

  const updateRegions = async (newRegions) => {
    // Actualización local inmediata — siempre funciona
    setRegions(newRegions);
    // Persistencia en Google Sheets — puede fallar si la hoja aún no existe
    // en ese caso igual el cambio queda en memoria para esta sesión
    try {
      await saveRegions(newRegions);
    } catch (err) {
      // Re-lanzamos para que el caller pueda decidir si mostrar error o no
      throw err;
    }
  };

  return { regions, setRegions, loading, updateRegions };
}