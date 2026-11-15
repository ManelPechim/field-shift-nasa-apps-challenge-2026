"use client";

/** Abre a impressão do navegador; dali dá para salvar em PDF. */
export function BotaoImprimir() {
  return <button type="button" className="btn btn-sm print:hidden" onClick={() => window.print()}>Imprimir ou salvar em PDF</button>;
}
