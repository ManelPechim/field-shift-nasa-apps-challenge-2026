"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** ha = hectare (10.000 m², um quadrado de 100 m × 100 m). Escolha vale para a página toda. */
export type Unidade = "ha" | "m2";
const Ctx = createContext<{ unidade: Unidade; setUnidade: (u: Unidade) => void }>({ unidade: "ha", setUnidade: () => {} });

export function UnidadeDeArea({ children }: { children: ReactNode }) {
  const [unidade, setUnidade] = useState<Unidade>("ha");
  return <Ctx.Provider value={{ unidade, setUnidade }}>{children}</Ctx.Provider>;
}

export function formatarArea(ha: number, u: Unidade) {
  return u === "ha"
    ? `${ha.toLocaleString("pt-BR", { maximumFractionDigits: ha < 10 ? 2 : 1 })} ha`
    : `${Math.round(ha * 10000).toLocaleString("pt-BR")} m²`;
}

export function Area({ ha, vazio = "—" }: { ha: number | null | undefined; vazio?: string }) {
  const { unidade } = useContext(Ctx);
  return <>{ha == null ? vazio : formatarArea(ha, unidade)}</>;
}

export function SeletorDeUnidade() {
  const { unidade, setUnidade } = useContext(Ctx);
  const opcoes: [Unidade, string, string][] = [["ha", "ha", "hectares"], ["m2", "m²", "metros quadrados"]];
  return (
    <div className="inline-flex rounded-md border border-line p-0.5 text-xs" role="group" aria-label="Unidade de área">
      {opcoes.map(([u, rotulo, nome]) => (
        <button key={u} type="button" onClick={() => setUnidade(u)} aria-pressed={unidade === u} title={nome}
          className={`rounded px-2 py-0.5 font-semibold ${unidade === u ? "bg-brand text-brand-ink" : "text-muted hover:text-ink"}`}>
          {rotulo}
        </button>
      ))}
    </div>
  );
}
