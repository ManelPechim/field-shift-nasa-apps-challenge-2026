"use client";

import { useState } from "react";
import { AvisoIA, SeloIA } from "@/components/aviso-ia";

export function CampoResumo({ inicial }: { inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [aviso, setAviso] = useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="label mb-0" htmlFor="resumo_produtor">Texto para o produtor</label>
        <span className="flex items-center gap-2">
          <SeloIA />
          <button type="button" onClick={() => setAviso(true)} className="btn-ghost btn-sm">{texto ? "Reescrever com IA" : "Escrever com IA"}</button>
        </span>
      </div>
      <textarea className="input min-h-36" id="resumo_produtor" name="resumo_produtor" value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="O que vai plantar, quando, por quê e qual o principal cuidado. Em linguagem simples." />
      <p className="text-xs text-muted">Revise antes de publicar: o produtor vai ler exatamente este texto.</p>
      <AvisoIA aberto={aviso} aoFechar={() => setAviso(false)} titulo="Escrever o texto com IA"
        oQueFaria="a partir da rotação escolhida, das notas, dos riscos da área e das tarefas, escreveria um rascunho em linguagem simples (o que plantar, quando, por quê e o principal cuidado) para você revisar antes de publicar."
        porEnquanto="escreva o texto à mão. Dica: comece pelo que muda em relação ao que ele já faz e termine com o primeiro passo." />
    </div>
  );
}
