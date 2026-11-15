// Ícones simples em SVG (traço na cor do texto). Decorativos: o texto do botão diz a ação.
import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />;
}

/** Polígono com lápis: desenhar uma área */
export const IconeDesenhar = () => (
  <Base><path d="M4 18 8 6l9 3-2 9z" /><path d="m16 3 5 5-3 3-5-5z" /></Base>
);
export const IconeConcluir = () => (
  <Base><path d="m5 12 5 5L20 7" /></Base>
);
export const IconeDesfazer = () => (
  <Base><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Base>
);
export const IconeCancelar = () => (
  <Base><path d="M18 6 6 18M6 6l12 12" /></Base>
);
export const IconeRefazer = () => (
  <Base><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Base>
);
/** Mira: levar o mapa até o item */
export const IconeVerNoMapa = () => (
  <Base><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="2" /></Base>
);
export const IconeRota = () => (
  <Base><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Base>
);
export const IconeCopiar = () => (
  <Base><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Base>
);
