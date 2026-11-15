"use client";

import { useState } from "react";
import { IconeCopiar } from "./icones";

export function BotaoCopiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { setOk(false); }
  }
  return (
    <button type="button" onClick={copiar} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline" title={`Copiar ${texto}`}>
      <IconeCopiar />{ok ? "Copiado" : rotulo}
    </button>
  );
}
