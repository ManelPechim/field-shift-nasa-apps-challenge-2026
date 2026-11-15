import { TIPOS_EVIDENCIA, type TipoEvidencia } from "@/lib/evidencia";

const COR: Record<TipoEvidencia, string> = {
  nasa: "bg-sat-soft text-sat",
  local: "bg-ok-soft text-ok",
  regra: "bg-surface-2 text-ink border border-line",
  hipotese: "bg-warn-soft text-warn",
};

/** Selo do tipo de evidência, ao lado de cada afirmação. */
export function SeloEvidencia({ tipo }: { tipo: TipoEvidencia }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-px align-middle text-[0.68rem] font-bold uppercase tracking-wide ${COR[tipo]}`} title={TIPOS_EVIDENCIA[tipo].explicacao}>
      {TIPOS_EVIDENCIA[tipo].nome}
    </span>
  );
}

export function SelosEvidencia({ tipos }: { tipos: TipoEvidencia[] }) {
  return <span className="inline-flex flex-wrap gap-1 align-middle">{tipos.map((t) => <SeloEvidencia key={t} tipo={t} />)}</span>;
}

/** Legenda dos quatro tipos, para o leitor saber o que é medido e o que é suposto. */
export function LegendaEvidencia() {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
      {(Object.keys(TIPOS_EVIDENCIA) as TipoEvidencia[]).map((t) => (
        <div key={t} className="flex items-start gap-2">
          <dt><SeloEvidencia tipo={t} /></dt>
          <dd className="text-muted">{TIPOS_EVIDENCIA[t].explicacao}</dd>
        </div>
      ))}
    </dl>
  );
}
