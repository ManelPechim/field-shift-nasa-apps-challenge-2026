import { CalendarioRotacao } from "@/components/graficos";
import { Selo, Vazio } from "@/components/ui";
import { regiaoDe } from "@/lib/agro/culturas";
import { CENARIOS, aplicarCenario, calcularRiscos, niveis, type Cenario } from "@/lib/agro/riscos";
import { CRITERIOS, beneficios, comparar, evidencias, lacunas, porQue, riscosDaRotacao, type Prioridades } from "@/lib/agro/rotacao";
import { STATUS_SOLO, interpretar, prontidao } from "@/lib/agro/solo";
import { criarPlano } from "@/app/tecnico/actions";
import type { ClimaTalhao } from "@/lib/nasa/power";
import type { RelevoTalhao } from "@/lib/nasa/relevo";
import type { Amostra, Talhao, Visita } from "@/lib/tipos";

const PRI: [keyof Prioridades, string][] = [["renda", "Renda"], ["solo", "Melhorar o solo"], ["erosao", "Proteger contra erosão"], ["agua", "Economizar água"], ["forragem", "Forragem para o gado"]];
const PESO = ["", "pouco", "médio", "muito"];
const LETRAS = ["A", "B", "C"];

export function AbaRotacoes({ talhao, clima, relevo, visita, amostra, sp }: {
  talhao: Talhao; clima: ClimaTalhao | null; relevo: RelevoTalhao | null; visita: Visita | null; amostra: Amostra | null;
  sp: Record<string, string | string[] | undefined>;
}) {
  if (!clima) return <Vazio titulo="Sem dados de clima">A comparação precisa dos dados da NASA POWER. Tente atualizar a aba Dados da NASA.</Vazio>;
  const regiao = regiaoDe(talhao.centroide_lat!);
  const sul = regiao === "sul";
  const cenario = (["seco", "normal", "chuvoso"].includes(String(sp.cenario)) ? sp.cenario : "normal") as Cenario;
  const p = (k: string, d: number) => { const n = Number(sp[k]); return n >= 1 && n <= 3 ? n : d; };
  const pri: Prioridades = { renda: p("renda", 3), solo: p("solo", 2), erosao: p("erosao", 2), agua: p("agua", 1), forragem: p("forragem", 1) };
  const gado = sp.gado ? sp.gado === "1" : !!visita?.condicoes.gado;
  const irrigacao = sp.irrigacao ? sp.irrigacao === "1" : !!visita?.condicoes.irrigacao;

  const base = niveis(calcularRiscos(clima, relevo, visita?.condicoes ?? null));
  const { riscos, chuva } = aplicarCenario(base, clima.chuva_mm, cenario, sul);
  const cmp = comparar(talhao.rotacao_atual, { regiao, riscos, chuva, geadaDias: clima.geada_dias, gado, irrigacao }, pri);
  const I = amostra ? interpretar(amostra.valores) : null;
  const melhor = [...cmp.top.slice(1)].sort((a, b) => b.combina - a.combina)[0];

  return (
    <div className="grid gap-8">
      <form method="get" className="card grid gap-4 p-4">
        <input type="hidden" name="aba" value="rotacoes" />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label" htmlFor="cenario">Previsão de chuva para a safra</label>
            <select className="input w-auto" id="cenario" name="cenario" defaultValue={cenario}>
              {(Object.keys(CENARIOS) as Cenario[]).map((c) => <option key={c} value={c}>{CENARIOS[c].nome} ({CENARIOS[c].enso})</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" name="gado" value="1" defaultChecked={gado} /> Tem gado</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="irrigacao" value="1" defaultChecked={irrigacao} /> Tem irrigação</label>
        </div>
        <p className="-mt-2 text-xs text-muted">{sul ? "No Sul, El Niño costuma trazer chuva acima da média e La Niña, estiagem." : "No Cerrado, El Niño e La Niña mudam pouco a chuva."} Consulte o boletim ENSO da NOAA e a previsão do INMET.</p>
        <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="label">Prioridades do produtor</legend>
          {PRI.map(([k, n]) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              {n}
              <select name={k} defaultValue={pri[k]} className="rounded-md border border-line bg-surface px-2 py-1">
                <option value={1}>Pouco</option><option value={2}>Médio</option><option value={3}>Muito</option>
              </select>
            </label>
          ))}
        </fieldset>
        <div><button className="btn-ghost btn-sm">Recalcular</button></div>
      </form>

      <section>
        <h2 className="h2 mb-2">Comparação lado a lado</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-xs uppercase text-muted">
                <th className="border-b border-line px-2 py-1.5 font-medium">Critério</th>
                {cmp.top.map((a, i) => <th key={a.rotacao.id} className="border-b border-line px-2 py-1.5 font-medium">{LETRAS[i]}{i === 0 ? " · atual" : ""}</th>)}
              </tr>
            </thead>
            <tbody>
              {CRITERIOS.map(([k, n]) => {
                const mx = Math.max(...cmp.top.map((a) => a[k]));
                return (
                  <tr key={k}>
                    <th scope="row" className="w-[34%] border-b border-line px-2 py-1.5 text-left font-semibold">{n}<small className="block font-normal text-muted">peso: {k === "clima" ? "médio (fixo)" : PESO[pri[k]]}</small></th>
                    {cmp.top.map((a) => (
                      <td key={a.rotacao.id} className="border-b border-line px-2 py-1.5 tabular-nums">
                        <div className="mb-1 h-1.5 overflow-hidden rounded bg-surface-2"><i className={`block h-full rounded ${a[k] === mx ? "bg-brand" : "bg-muted"}`} style={{ width: `${Math.round(a[k])}%` }} /></div>
                        <span className={a[k] === mx ? "font-bold text-brand" : ""}>{Math.round(a[k])}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="px-2 pt-3 text-left font-semibold">Combina com as prioridades</th>
                {cmp.top.map((a) => <td key={a.rotacao.id} className={`px-2 pt-3 font-display text-2xl font-extrabold ${a === melhor ? "text-brand" : ""}`}>{Math.round(a.combina)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted">Notas de 0 a 100. As regras estão no código e podem ser conferidas; a base de culturas é simplificada e precisa de validação agronômica.</p>
      </section>

      <section className="grid gap-4">
        <h2 className="h2">As três opções</h2>
        {cmp.top.map((a, i) => {
          const pr = I ? prontidao(a.rotacao, I) : null;
          const rs = riscosDaRotacao(a, riscos);
          return (
            <article key={a.rotacao.id} className={`card grid gap-3 p-4 ${a === melhor ? "border-brand ring-1 ring-brand" : ""}`}>
              <div className="flex flex-wrap items-start gap-3">
                <span className={`grid size-8 place-items-center rounded-lg font-display font-extrabold ${a === melhor ? "bg-brand text-brand-ink" : "bg-surface-2"}`}>{LETRAS[i]}</span>
                <div className="min-w-0 flex-1"><b className="font-display text-lg leading-tight">{a.nome}</b><p className="text-sm text-muted">{i === 0 ? "Rotação atual" : a === melhor ? "Melhor alternativa para essas prioridades" : "Alternativa"}</p></div>
                <div className="text-right"><b className="font-display text-2xl font-extrabold">{Math.round(a.combina)}</b><small className="block text-xs text-muted">combina</small></div>
              </div>
              <CalendarioRotacao ocupacao={a.ocupacao} />
              <p><b>Por que:</b> {porQue(a, cmp.atual, pri)}</p>
              {pr && <p className="flex flex-wrap items-center gap-2 text-sm"><Selo tom={STATUS_SOLO[pr.status].tom}>{STATUS_SOLO[pr.status].nome}</Selo>{pr.correcoes.join(" · ")}</p>}
              <details className="border-t border-line pt-2">
                <summary className="cursor-pointer font-semibold text-brand">Evidências, benefícios, riscos e lacunas</summary>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><h3 className="eyebrow mb-1">Evidências</h3><ul className="list-disc pl-5">{evidencias(a, riscos).map((e) => <li key={e.texto}>{e.texto} <span className="fonte">{e.fonte}</span></li>)}</ul></div>
                  <div><h3 className="eyebrow mb-1">Benefícios</h3><ul className="list-disc pl-5">{beneficios(a).map((b) => <li key={b}>{b}</li>)}</ul></div>
                  {rs.length > 0 && <div><h3 className="eyebrow mb-1">Riscos para revisar</h3><ul className="list-disc pl-5 marker:text-bad">{rs.map((r) => <li key={r}>{r}</li>)}</ul></div>}
                  <div><h3 className="eyebrow mb-1">O que o app não sabe</h3><ul className="list-disc pl-5">{lacunas(!!amostra).map((l) => <li key={l}>{l}</li>)}</ul></div>
                </div>
              </details>
              <form action={criarPlano} className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
                <input type="hidden" name="talhao_id" value={talhao.id} />
                <input type="hidden" name="rotacao_id" value={a.rotacao.id} />
                <input type="hidden" name="rotacao_nome" value={a.nome} />
                <input type="hidden" name="correcoes" value={JSON.stringify(pr?.correcoes ?? [])} />
                <input type="hidden" name="dados" value={JSON.stringify({ cenario, prioridades: pri, gado, irrigacao, riscos, notas: Object.fromEntries(CRITERIOS.map(([k]) => [k, Math.round(a[k])])), combina: Math.round(a.combina), atual: cmp.atual.nome, notas_atual: Object.fromEntries(CRITERIOS.map(([k]) => [k, Math.round(cmp.atual[k])])) })} />
                <div><label className="label" htmlFor={`safra-${i}`}>Safra</label><input className="input w-28" id={`safra-${i}`} name="safra" defaultValue="2026/27" /></div>
                <button className="btn btn-sm">{i === 0 ? "Manter a atual e montar o plano" : "Escolher esta e montar o plano"}</button>
              </form>
            </article>
          );
        })}
      </section>

      {cmp.outras.length > 0 && (
        <section>
          <h2 className="h2 mb-2">Outras opções avaliadas</h2>
          <ul className="grid gap-1.5 text-sm">
            {cmp.outras.map((a) => (
              <li key={a.rotacao.id} className="flex justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2"><span>{a.nome}</span><span className="whitespace-nowrap text-muted">{a.bloqueio ?? `${Math.round(a.combina)} de 100`}</span></li>
            ))}
          </ul>
        </section>
      )}
      <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">A comparação apoia a decisão do técnico. Confirme a janela de plantio no ZARC do município, o mercado local e o histórico de pragas antes de recomendar.</p>
    </div>
  );
}
