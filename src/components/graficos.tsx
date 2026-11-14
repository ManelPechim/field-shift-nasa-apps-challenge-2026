import { CULTURAS } from "@/lib/agro/culturas";
import { MESES } from "@/lib/agro/rotacao";
import type { Quadrante } from "@/lib/agro/solo";

/** Barras de chuva mensal + temperatura média + dias de geada, na mesma escala de meses. */
export function GraficoClima({ chuva, temp, geada }: { chuva: number[]; temp: number[]; geada: number[] }) {
  const W = 360, x0 = 10, cw = (W - 20) / 12, topo = 18, base = 104;
  const escala = Math.max(50, Math.ceil(Math.max(...chuva) / 50) * 50);
  return (
    <svg viewBox={`0 0 ${W} 160`} className="block h-auto w-full" role="img" aria-label="Chuva, temperatura e geada mês a mês">
      {chuva.map((v, i) => {
        const h = ((base - topo) * v) / escala, cx = x0 + i * cw + cw / 2, w = cw * 0.62;
        return (
          <g key={i}>
            <rect x={cx - w / 2} y={base - h} width={w} height={Math.max(h, 0.5)} rx={2} fill="var(--rain)" />
            <text x={cx} y={base - h - 3} textAnchor="middle" fontSize="8.5" fill="var(--muted)" fontFamily="var(--font-mono)">{v}</text>
            <text x={cx} y={base + 13} textAnchor="middle" fontSize="9.5" fill="var(--ink)">{MESES[i]}</text>
            <text x={cx} y={base + 29} textAnchor="middle" fontSize="8.5" fill="var(--temp)" fontFamily="var(--font-mono)">{Math.round(temp[i])}°</text>
            {geada[i] >= 0.05 && (
              <g>
                <rect x={cx - 9} y={base + 36} width={18} height={13} rx={3} fill="var(--frost)" />
                <text x={cx} y={base + 45.5} textAnchor="middle" fontSize="8" fill="var(--surface)" fontFamily="var(--font-mono)">{geada[i] < 1 ? geada[i].toFixed(1).replace(".", ",") : Math.round(geada[i])}</text>
              </g>
            )}
          </g>
        );
      })}
      <line x1={x0} x2={W - 10} y1={base} y2={base} stroke="var(--line)" />
    </svg>
  );
}

export function LegendaClima() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-rain align-[-1px]" />Chuva (mm por mês)</span>
      <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-temp align-[-1px]" />Temperatura média</span>
      <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-frost align-[-1px]" />Dias com mínima até 2 °C</span>
    </div>
  );
}

const COR_TIPO = {
  grao: "color-mix(in srgb, var(--grain) 42%, var(--surface))",
  cobertura: "color-mix(in srgb, var(--cover) 38%, var(--surface))",
  forragem: "color-mix(in srgb, var(--forage) 42%, var(--surface))",
};

/** Calendário de 2 anos: o que ocupa o talhão mês a mês. */
export function CalendarioRotacao({ ocupacao }: { ocupacao: (string | null)[][] }) {
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-1.5">
        <span />
        <div className="grid grid-cols-12 gap-0.5 text-center font-mono text-[0.62rem] text-muted">
          {"JFMAMJJASOND".split("").map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
      {ocupacao.map((row, y) => {
        const runs: [string | null, number][] = [];
        for (let i = 0; i < 12; ) { let j = i; while (j + 1 < 12 && row[j + 1] === row[i]) j++; runs.push([row[i], j - i + 1]); i = j + 1; }
        return (
          <div key={y} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1.5">
            <span className="font-mono text-[0.66rem] text-muted">Ano {y + 1}</span>
            <div className="grid grid-cols-12 gap-0.5">
              {runs.map(([id, n], k) => {
                const c = id ? CULTURAS[id] : null;
                const txt = c ? (n >= 4 ? c.curto ?? c.nome : c.sigla) : n >= 3 ? "descoberto" : n === 2 ? "desc." : "–";
                return (
                  <div key={k} title={c ? c.nome : "Solo descoberto"} style={{ gridColumn: `span ${n}`, background: c ? COR_TIPO[c.tipo] : undefined }}
                    className={`min-w-0 overflow-hidden whitespace-nowrap rounded-md px-0.5 py-1 text-center text-[0.72rem] font-semibold ${c ? "text-ink" : "border border-dashed border-soil/60 text-soil [background:repeating-linear-gradient(135deg,color-mix(in_srgb,var(--soil)_30%,transparent)_0_4px,transparent_4px_8px)]"}`}>
                    {txt}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><i className="mr-1 inline-block size-2.5 rounded-sm align-[-1px]" style={{ background: COR_TIPO.grao }} />Grão para vender</span>
        <span><i className="mr-1 inline-block size-2.5 rounded-sm align-[-1px]" style={{ background: COR_TIPO.cobertura }} />Cobertura do solo</span>
        <span><i className="mr-1 inline-block size-2.5 rounded-sm align-[-1px]" style={{ background: COR_TIPO.forragem }} />Pasto</span>
        <span><i className="mr-1 inline-block size-2.5 rounded-sm border border-dashed border-soil align-[-1px]" />Solo descoberto</span>
      </div>
    </div>
  );
}

/** Modelo de 4 quadrantes (Melo, 2026): notas de 0 a 100, corte em 50. */
export function Grafico4QM({ notaCot, notaAeem }: { notaCot: number; notaAeem: number | null }) {
  const X = (v: number) => 50 + 3 * v, Y = (v: number) => 320 - 3 * v;
  const regioes: { q: Quadrante; x: number; y: number; nome: string; cor: string }[] = [
    { q: "adoecendo", x: 50, y: 20, nome: "ADOECENDO", cor: "color-mix(in srgb, var(--warn) 22%, var(--surface))" },
    { q: "saudavel", x: 200, y: 20, nome: "SAUDÁVEL", cor: "color-mix(in srgb, var(--ok) 30%, var(--surface))" },
    { q: "doente", x: 50, y: 170, nome: "DOENTE", cor: "color-mix(in srgb, var(--bad) 22%, var(--surface))" },
    { q: "recuperacao", x: 200, y: 170, nome: "EM RECUPERAÇÃO", cor: "color-mix(in srgb, var(--ok) 15%, var(--surface))" },
  ];
  return (
    <svg viewBox="0 0 372 364" className="block h-auto w-full max-w-md" role="img" aria-label="Saúde do solo: atividade enzimática no eixo horizontal, carbono orgânico no vertical">
      {regioes.map((r) => (
        <g key={r.q}>
          <rect x={r.x} y={r.y} width={150} height={150} fill={r.cor} stroke="var(--surface)" strokeWidth={2} />
          <text x={r.x + 75} y={r.y + (r.y === 20 ? 22 : 138)} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--ink)" opacity={0.8} fontFamily="var(--font-display)">{r.nome}</text>
        </g>
      ))}
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <text x={X(t)} y={336} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">{t}</text>
          {t > 0 && <text x={44} y={Y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">{t}</text>}
        </g>
      ))}
      <text x={200} y={357} textAnchor="middle" fontSize="11" fill="var(--muted)">Atividade enzimática (AEEM), nota →</text>
      <text transform="translate(14 170) rotate(-90)" textAnchor="middle" fontSize="11" fill="var(--muted)">Carbono orgânico (COT), nota →</text>
      {notaAeem == null ? (
        <g>
          <line x1={52} x2={348} y1={Y(notaCot)} y2={Y(notaCot)} stroke="var(--sat)" strokeWidth={3} strokeDasharray="7 5" />
          <text x={200} y={Y(notaCot) - 8} textAnchor="middle" fontSize="11.5" fontWeight={700} fill="var(--ink)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">Sem enzimas: o solo está nesta faixa</text>
        </g>
      ) : (
        <g>
          <circle cx={X(notaAeem)} cy={Y(notaCot)} r={7} fill="var(--sat)" stroke="var(--surface)" strokeWidth={2.5} />
          <text x={X(notaAeem) + (notaAeem > 72 ? -11 : 11)} y={Y(notaCot) + 4} textAnchor={notaAeem > 72 ? "end" : "start"} fontSize="11.5" fontWeight={700} fill="var(--ink)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">Este talhão</text>
        </g>
      )}
    </svg>
  );
}
