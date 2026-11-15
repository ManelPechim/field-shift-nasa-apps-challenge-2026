"use client";

import { useEffect, useRef } from "react";

/** Etiqueta ao lado das ações que usariam IA: deixa claro, antes do clique, que ainda não funcionam. */
export function SeloIA() {
  return <span className="inline-block justify-self-start rounded-full bg-sat-soft px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-sat">IA · em breve</span>;
}

/**
 * Aviso de que uma função de IA ainda não foi integrada neste protótipo.
 * Abre como modal quando `aberto`; `oQueFaria` explica o que a IA faria ali e `porEnquanto`, o que fazer agora.
 */
export function AvisoIA({ aberto, aoFechar, titulo, oQueFaria, porEnquanto }: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  oQueFaria: string;
  porEnquanto: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <dialog ref={dialogo} onClose={aoFechar} aria-labelledby="aviso-ia-titulo"
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60">
      <div className="grid gap-3 p-5">
        <SeloIA />
        <h2 id="aviso-ia-titulo" className="font-display text-lg font-bold">{titulo}: ainda não integrada</h2>
        <p className="text-sm"><b>O que a IA faria aqui:</b> {oQueFaria}</p>
        <p className="text-sm text-muted">Esta função está planejada, mas não foi ligada neste protótipo.</p>
        <p className="rounded-lg bg-surface-2 p-3 text-sm"><b>Por enquanto:</b> {porEnquanto}</p>
        <button type="button" className="btn justify-self-start" onClick={aoFechar} autoFocus>Entendi</button>
      </div>
    </dialog>
  );
}
