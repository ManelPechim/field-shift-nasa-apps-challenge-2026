"use client";

import { useState } from "react";

export function CampoResumo({ planoId, inicial }: { planoId: string; inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  async function gerar() {
    setGerando(true); setErro("");
    try {
      const r = await fetch("/api/resumo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planoId }) });
      const j = await r.json();
      if (!r.ok) setErro(j.erro ?? "A IA não respondeu.");
      else setTexto(j.texto);
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally { setGerando(false); }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="label mb-0" htmlFor="resumo_produtor">Texto para o produtor</label>
        <button type="button" onClick={gerar} disabled={gerando} className="btn-ghost btn-sm">{gerando ? "Escrevendo…" : texto ? "Reescrever com IA" : "Escrever com IA"}</button>
      </div>
      <textarea className="input min-h-36" id="resumo_produtor" name="resumo_produtor" value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="O que vai plantar, quando, por quê e qual o principal cuidado. Em linguagem simples." />
      <p className="text-xs text-muted">A IA usa só os números do plano. Revise antes de publicar: o produtor vai ler exatamente este texto.</p>
      {erro && <p role="alert" className="text-sm text-bad">{erro}</p>}
    </div>
  );
}
