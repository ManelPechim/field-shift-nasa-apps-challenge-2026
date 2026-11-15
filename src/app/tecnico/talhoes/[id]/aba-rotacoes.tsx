import Link from "next/link";
import { CalendarioRotacao } from "@/components/graficos";
import { LegendaEvidencia, SeloEvidencia, SelosEvidencia } from "@/components/evidencia";
import { Selo, Vazio } from "@/components/ui";
import { CRITERIO_SIMPLES, LETRAS, PESO, PRIORIDADES as PRI, analisar, buscaDosParametros, parametros } from "@/lib/agro/decisao";
import { Glossario } from "@/components/glossario";
import { EscolherRotacao } from "./escolher";
import { CENARIOS, type Cenario } from "@/lib/agro/riscos";
import { CRITERIOS, beneficios, evidencias, lacunas, porQue, riscosDaRotacao } from "@/lib/agro/rotacao";
import { tiposDaFonte } from "@/lib/evidencia";
import { STATUS_SOLO, interpretar, prontidao } from "@/lib/agro/solo";
import type { ClimaTalhao } from "@/lib/nasa/power";
import type { RelevoTalhao } from "@/lib/nasa/relevo";
import type { Amostra, Talhao, Visita } from "@/lib/tipos";


export function AbaRotacoes({ talhao, clima, relevo, visita, amostra, sp }: {
  talhao: Talhao; clima: ClimaTalhao | null; relevo: RelevoTalhao | null; visita: Visita | null; amostra: Amostra | null;
  sp: Record<string, string | string[] | undefined>;
}) {
  if (!clima) return <Vazio titulo="Sem dados de clima">A comparação precisa dos dados da NASA POWER. Tente atualizar a aba Dados da NASA.</Vazio>;
  const par = parametros(sp, visita);
  const { cenario, pri, gado, irrigacao } = par;
  const analise = analisar(talhao, clima, relevo, visita, par);
  const { sul, riscos, cmp, melhor } = analise;
  const I = amostra ? interpretar(amostra.valores) : null;

  return (
    <div className="grid gap-8">
      <div className="grid gap-2 rounded-xl bg-sat-soft p-4 text-sm">
        <b>Como ler esta tela</b>
        <p><b>A</b> é o que o produtor planta hoje. <b>B</b> e <b>C</b> são as duas alternativas que mais combinam com o que ele quer. Cada opção ganha uma nota de 0 a 100 em seis pontos (solo, erosão, clima, renda, água e pasto). A nota final, <b>“combina”</b>, pesa mais os pontos que o produtor marcou como importantes.</p>
        <p>Dá para mudar as prioridades e testar um ano mais seco ou mais chuvoso no quadro abaixo e clicar em Recalcular.</p>
      </div>
      <form method="get" className="card grid gap-4 p-4">
        <input type="hidden" name="aba" value="rotacoes" />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label" htmlFor="cenario">E se a safra vier…</label>
            <select className="input w-auto" id="cenario" name="cenario" defaultValue={cenario}>
              {(Object.keys(CENARIOS) as Cenario[]).map((c) => <option key={c} value={c}>{c === "normal" ? "Normal" : c === "seco" ? "Mais seca (La Niña)" : "Mais chuvosa (El Niño)"}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" name="gado" value="1" defaultChecked={gado} /> Tem gado</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="irrigacao" value="1" defaultChecked={irrigacao} /> Tem irrigação</label>
        </div>
        <p className="-mt-2 text-xs text-muted"><SeloEvidencia tipo="hipotese" /> É um teste de “e se”, não previsão. {sul ? "No Sul, El Niño costuma trazer mais chuva e La Niña, seca." : "No Cerrado, El Niño e La Niña mudam pouco a chuva."} A previsão de verdade sai no INMET e na NOAA.{sul && <> <Link href={`/tecnico/talhoes/${talhao.id}/retroanalise`} className="font-semibold">Volta no tempo: o app teria acertado a La Niña de 2021/22?</Link></>}</p>
        <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="label">O que é mais importante para o produtor</legend>
          {PRI.map(([k, n]) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              {n}
              <select name={k} defaultValue={pri[k]} className="rounded-md border border-line bg-surface px-2 py-1">
                <option value={1}>Pouco</option><option value={2}>Médio</option><option value={3}>Muito</option>
              </select>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-ghost btn-sm">Recalcular</button>
          <Link href={`/tecnico/talhoes/${talhao.id}/relatorio?${buscaDosParametros(par)}`} className="btn btn-sm no-underline">Relatório de decisão</Link>
          <span className="text-xs text-muted">Uma página para levar ao produtor: as três opções em ano normal, seco e chuvoso, o que falta saber e as fontes.</span>
        </div>
      </form>

      <details className="card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">O que cada selo colorido quer dizer (de onde vem cada informação)</summary>
        <div className="mt-3"><LegendaEvidencia /></div>
      </details>

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
              {CRITERIOS.map(([k]) => {
                const mx = Math.max(...cmp.top.map((a) => a[k]));
                return (
                  <tr key={k}>
                    <th scope="row" className="w-[34%] border-b border-line px-2 py-1.5 text-left font-semibold">{CRITERIO_SIMPLES[k][0]}<small className="block font-normal text-muted">{CRITERIO_SIMPLES[k][1]} Importância: {k === "clima" ? "média (fixa)" : PESO[pri[k]]}.</small></th>
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
                <th scope="row" className="px-2 pt-3 text-left font-semibold">Nota final: combina com o produtor</th>
                {cmp.top.map((a) => <td key={a.rotacao.id} className={`px-2 pt-3 font-display text-2xl font-extrabold ${a === melhor ? "text-brand" : ""}`}>{Math.round(a.combina)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted">Notas de 0 a 100, comparando as opções entre si: não é produtividade nem lucro. A nota mais alta de cada linha está em verde. As regras são simplificadas e precisam de validação agronômica.</p>
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
              <p><b>Por que:</b> {porQue(a, cmp.atual, pri)} <SeloEvidencia tipo="regra" /></p>
              {pr && <p className="flex flex-wrap items-center gap-2 text-sm"><Selo tom={STATUS_SOLO[pr.status].tom}>{STATUS_SOLO[pr.status].nome}</Selo>{pr.correcoes.join(" · ")} <SeloEvidencia tipo="local" /></p>}
              <details className="border-t border-line pt-2">
                <summary className="cursor-pointer font-semibold text-brand">Detalhes: provas, benefícios, riscos e o que falta saber</summary>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><h3 className="eyebrow mb-1">Evidências</h3><ul className="list-disc pl-5">{evidencias(a, riscos).map((e) => <li key={e.texto}>{e.texto} <SelosEvidencia tipos={tiposDaFonte(e.fonte)} /> <span className="fonte">{e.fonte}</span></li>)}</ul></div>
                  <div><h3 className="eyebrow mb-1">Benefícios <SeloEvidencia tipo="regra" /></h3><ul className="list-disc pl-5">{beneficios(a).map((b) => <li key={b}>{b}</li>)}</ul></div>
                  {rs.length > 0 && <div><h3 className="eyebrow mb-1">Riscos para revisar <SeloEvidencia tipo="regra" /></h3><ul className="list-disc pl-5 marker:text-bad">{rs.map((r) => <li key={r}>{r}</li>)}</ul></div>}
                  <div><h3 className="eyebrow mb-1">O que o app não sabe</h3><ul className="list-disc pl-5">{lacunas(!!amostra).map((l) => <li key={l}>{l}</li>)}</ul></div>
                </div>
              </details>
              <div className="border-t border-line pt-3">
                <EscolherRotacao talhao={talhao} a={a} i={i} correcoes={pr?.correcoes ?? []} par={par} analise={analise} rotulo={i === 0 ? "Manter a atual e montar o plano" : "Escolher esta e montar o plano"} />
              </div>
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
      <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">A comparação apoia a decisão do técnico. Antes de recomendar, confirme a data de plantio no ZARC do município, se há comprador para as culturas e o histórico de pragas.</p>
      <Glossario termos={["Rotação", "Planta de cobertura", "El Niño / La Niña", "INMET", "NOAA", "ZARC"]} />
    </div>
  );
}
