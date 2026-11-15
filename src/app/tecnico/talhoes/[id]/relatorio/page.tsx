import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LegendaEvidencia, SeloEvidencia, SelosEvidencia } from "@/components/evidencia";
import { BotaoImprimir } from "@/components/imprimir";
import { Trilha } from "@/components/trilha";
import { Pagina, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { dadosNasa } from "@/lib/dados";
import { MESES_NOME, nomeCultura, nomeRotacao, rotacaoPorId } from "@/lib/agro/culturas";
import { LETRAS, PESO, PRIORIDADES, analisar, parametros } from "@/lib/agro/decisao";
import { CENARIOS, NIVEL, NOME_RISCO, type ChaveRisco } from "@/lib/agro/riscos";
import { CRITERIOS, beneficios, evidencias, lacunas, porQue, riscosDaRotacao } from "@/lib/agro/rotacao";
import { QUADRANTES, aeem, cotDaMO, diagnostico4QM, interpretar, prontidao } from "@/lib/agro/solo";
import { tiposDaFonte } from "@/lib/evidencia";
import type { Amostra, CondicoesVisita, Propriedade, Talhao, Visita } from "@/lib/tipos";

export const metadata = { title: "Relatório de decisão" };

const VISITA: { [K in keyof CondicoesVisita]?: [string, Record<string, string>] } = {
  alagamento: ["Alagamento", { nao: "não alaga", as_vezes: "às vezes, em chuva forte", frequente: "com frequência" }],
  erosao: ["Erosão", { nenhuma: "sem sinais", laminar: "laminar", sulcos: "em sulcos", vocorocas: "voçorocas" }],
  compactacao: ["Compactação", { nao: "não", suspeita: "suspeita", confirmada: "confirmada" }],
  cobertura_solo: ["Cobertura do solo", { descoberto: "descoberto", parcial: "parcial", palhada: "boa palhada" }],
  plantio_direto: ["Plantio direto", { sim: "sim", parcial: "em parte", nao: "não, revolve o solo" }],
};

function Secao({ n, titulo, sub, children }: { n: string; titulo: string; sub?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line pt-5 break-inside-avoid-page">
      <div>
        <span className="eyebrow">{n}</span>
        <h2 className="h2">{titulo}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/** Relatório de decisão do talhão: o que os dados permitem afirmar, que alternativas merecem estudo e o que falta verificar. */
export default async function RelatorioDeDecisao(props: PageProps<"/tecnico/talhoes/[id]/relatorio">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, perfil } = await exigirPerfil("tecnico");
  const { data: t } = await supabase.from("talhoes").select("*").eq("id", id).maybeSingle<Talhao>();
  if (!t) notFound();
  const [{ data: prop }, { data: visitas }, { data: amostras }] = await Promise.all([
    supabase.from("propriedades").select("*, produtores(id, nome)").eq("id", t.propriedade_id).single<Propriedade & { produtores: { id: string; nome: string } }>(),
    supabase.from("visitas").select("*").eq("propriedade_id", t.propriedade_id).or(`talhao_id.eq.${t.id},talhao_id.is.null`).order("data", { ascending: false }).returns<Visita[]>(),
    supabase.from("amostras").select("*").eq("talhao_id", t.id).order("criado_em", { ascending: false }).limit(1).returns<Amostra[]>(),
  ]);
  if (!prop) notFound();
  const visita = visitas?.find((v) => v.talhao_id === t.id) ?? visitas?.[0] ?? null;
  const amostra = amostras?.[0] ?? null;
  const { clima, relevo } = await dadosNasa(supabase, t);
  if (!clima) return <Pagina><p>Sem dados da NASA POWER para este talhão. Abra a aba Dados da NASA e tente atualizar.</p></Pagina>;

  const par = parametros(sp, visita);
  const { explicados, cmp, melhor, porCenario, sul } = analisar(t, clima, relevo, visita, par);
  const I = amostra ? interpretar(amostra.valores) : null;
  const cot = amostra ? amostra.enzimas?.cot ?? (amostra.valores.mo != null ? cotDaMO(amostra.valores.mo) : null) : null;
  const d4 = amostra && cot != null ? diagnostico4QM(cot, amostra.enzimas ? aeem(amostra.enzimas, cot) : null) : null;
  const atualRot = rotacaoPorId(t.rotacao_atual);
  const local = [prop.municipio, prop.uf].filter(Boolean).join(" - ");

  const mesMais = (v: number[], maior: boolean) => v.indexOf(maior ? Math.max(...v) : Math.min(...v));
  const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);
  const chuvoso = mesMais(clima.chuva_mm, true), seco = mesMais(clima.chuva_mm, false);
  const frio = mesMais(clima.temp_min, false), quente = mesMais(clima.temp_max, true);

  // Culturas que a melhor alternativa traz e a rotação atual não tem: é sobre elas que mais falta saber
  const novas = [...new Set(melhor.rotacao.slots.filter((x): x is string => !!x && !cmp.atual.rotacao.slots.includes(x)))].map((x) => nomeCultura(x).toLowerCase());
  const lacunasPerfil = [
    !atualRot && "A rotação atual do talhão não foi informada; a comparação partiu da rotação mais comum da região.",
    !visita && "Sem visita técnica: alagamento e erosão vêm só do relevo e do clima.",
    !amostra && "Sem análise de solo: não dá para dizer se o solo está pronto para cada opção.",
    amostra && !amostra.enzimas && "Sem análise biológica (enzimas): a saúde do solo está estimada só pela matéria orgânica.",
    !visita?.condicoes.mercado && "Mercado para as culturas não registrado.",
  ].filter(Boolean) as string[];
  const correcoes = I ? prontidao(melhor.rotacao, I).correcoes : [];
  const perguntas = [
    novas.length && `A janela do ZARC para ${prop.municipio ?? "o município"} comporta ${novas.join(" e ")} nas datas do calendário?`,
    novas.length && `Há quem compre ${novas.join(" e ")} na região, e a que preço?`,
    novas.length && `As máquinas disponíveis${visita?.condicoes.maquinario ? ` (${visita.condicoes.maquinario.toLowerCase()})` : ""} servem para ${novas.join(" e ")}?`,
    correcoes.length && `Qual a dose de corretivo e de adubo pelo ${sul ? "Manual de Calagem e Adubação da CQFS-RS/SC (índice SMP)" : "Boletim 100 do IAC"}?`,
    amostra && !amostra.enzimas && "Vale pedir a análise biológica (BioAS) para medir a atividade do solo?",
    "O histórico de pragas e doenças do talhão muda a ordem das culturas?",
  ].filter(Boolean) as string[];

  return (
    <Pagina>
      <div className="print:hidden">
        <Trilha passos={[
          { rotulo: "Clientes", href: "/tecnico" },
          { rotulo: prop.produtores.nome, href: `/tecnico/produtores/${prop.produtores.id}` },
          { rotulo: prop.nome, tipo: "Propriedade", href: `/tecnico/propriedades/${prop.id}` },
          { rotulo: t.nome, tipo: "Talhão", href: `/tecnico/talhoes/${t.id}?aba=rotacoes` },
          { rotulo: "Relatório de decisão" },
        ]} />
      </div>

      <article className="mx-auto grid max-w-4xl gap-8">
        <header className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Field Shift · Relatório de decisão · {dataBR(new Date().toISOString())}</span>
              <h1 className="h1 flex items-center gap-2.5">
                <span className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: t.cor }} aria-hidden="true" />
                {t.nome}
              </h1>
              <p className="text-muted">{prop.nome}{local && ` · ${local}`} · {num(t.area_ha, 1)} ha · produtor {prop.produtores.nome} · técnico {perfil.nome}</p>
            </div>
            <BotaoImprimir />
          </div>
          <p className="max-w-3xl">
            <b>Objetivo:</b> comparar a rotação atual com duas alternativas, nas condições deste talhão, e dizer o que os dados permitem afirmar e o que ainda falta verificar.
            É apoio à decisão: não substitui o técnico nem o conhecimento do produtor, e não estima produtividade nem lucro.
          </p>
          <div className="card p-3"><LegendaEvidencia /></div>
        </header>

        <Secao n="01" titulo="Evidência climática e de relevo" sub={`NASA POWER no centro do talhão (${num(t.centroide_lat, 4)}, ${num(t.centroide_lon, 4)}; grade de cerca de 50 km), ${clima.periodo}, consultado em ${dataBR(clima.atualizado_em)}.`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead><tr className="text-left font-mono text-xs uppercase text-muted"><th className="border-b border-line px-2 py-1.5 font-medium">Indicador</th><th className="border-b border-line px-2 py-1.5 font-medium">Valor</th><th className="border-b border-line px-2 py-1.5 font-medium">Variável e unidade</th></tr></thead>
              <tbody>
                {[
                  ["Chuva no ano", `${num(clima.chuva_anual_mm)} mm`, "PRECTOTCORR, soma das médias mensais"],
                  ["Mês mais chuvoso / mais seco", `${MESES_NOME[chuvoso]} (${num(clima.chuva_mm[chuvoso])} mm) / ${MESES_NOME[seco]} (${num(clima.chuva_mm[seco])} mm)`, "PRECTOTCORR, mm por mês"],
                  ["Dias com chuva acima de 50 mm", `${num(clima.chuva_extrema_dias_ano, 1)} por ano`, "PRECTOTCORR diária"],
                  ["Maior sequência sem chuva", `${clima.maior_estiagem_dias} dias por ano, em média`, "dias seguidos abaixo de 1 mm"],
                  ["Mínima média no mês mais frio", `${num(clima.temp_min[frio], 1)} °C em ${MESES_NOME[frio]}`, "T2M_MIN"],
                  ["Dias com mínima até 2 °C (geada)", `${num(soma(clima.geada_dias), 1)} por ano`, "T2M_MIN diária"],
                  ["Máxima média no mês mais quente", `${num(clima.temp_max[quente], 1)} °C em ${MESES_NOME[quente]}`, "T2M_MAX"],
                  ["Dias com máxima acima de 35 °C", `${num(soma(clima.calor_dias), 1)} por ano`, "T2M_MAX diária"],
                  ...clima.chuva_decadas.map((d) => [`Chuva média ${d.de}`, `${num(d.mm_ano)} mm por ano`, "PRECTOTCORR"]),
                  ...(relevo ? [
                    ["Declividade média (máxima de 90% da área)", `${num(relevo.declividade_media, 1)}% (${num(relevo.declividade_p90, 1)}%), ${relevo.classe.toLowerCase()}`, `SRTM, pixel de ${num(relevo.pixel_m)} m, ${relevo.pontos} pontos`],
                    ["Altitude", `${num(relevo.altitude_min)} a ${num(relevo.altitude_max)} m`, "SRTM"],
                  ] : []),
                ].map(([a, b, c]) => (
                  <tr key={a}><th scope="row" className="border-b border-line px-2 py-1.5 text-left font-semibold">{a}</th><td className="border-b border-line px-2 py-1.5 tabular-nums">{b} <SeloEvidencia tipo="nasa" /></td><td className="border-b border-line px-2 py-1.5 text-xs text-muted">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="font-display font-bold">Riscos do talhão</h3>
          <ul className="grid gap-1.5 text-sm">
            {(Object.keys(NOME_RISCO) as ChaveRisco[]).map((k) => (
              <li key={k}><b>{NOME_RISCO[k]}: {NIVEL[explicados[k].nivel].toLowerCase()}.</b> {explicados[k].motivo} <SelosEvidencia tipos={tiposDaFonte(explicados[k].fonte)} /></li>
            ))}
          </ul>
        </Secao>

        <Secao n="02" titulo="Perfil agrícola" sub="O que se sabe do talhão e do produtor. Nada aqui foi preenchido por suposição.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid content-start gap-1.5 text-sm">
              <h3 className="font-display font-bold">Manejo e visita</h3>
              <p><b>Rotação atual:</b> {atualRot ? nomeRotacao(atualRot) : "não informada"} <SeloEvidencia tipo="local" /></p>
              {visita ? (
                <>
                  <p className="text-muted">Visita de {dataBR(visita.data)}{visita.objetivo ? ` · ${visita.objetivo}` : ""}</p>
                  <ul className="grid gap-1">
                    {(Object.keys(VISITA) as (keyof CondicoesVisita)[]).map((k) => {
                      const v = visita.condicoes[k];
                      const def = VISITA[k];
                      return def && typeof v === "string" ? <li key={k}>{def[0]}: <b>{def[1][v] ?? v}</b> <SeloEvidencia tipo="local" /></li> : null;
                    })}
                    {visita.condicoes.maquinario && <li>Máquinas: <b>{visita.condicoes.maquinario}</b> <SeloEvidencia tipo="local" /></li>}
                    {visita.condicoes.mercado && <li>Vende para: <b>{visita.condicoes.mercado}</b> <SeloEvidencia tipo="local" /></li>}
                    {visita.condicoes.objetivo_produtor && <li>O produtor quer: <b>{visita.condicoes.objetivo_produtor}</b> <SeloEvidencia tipo="local" /></li>}
                  </ul>
                </>
              ) : <p className="text-muted">Nenhuma visita registrada.</p>}
            </div>
            <div className="grid content-start gap-1.5 text-sm">
              <h3 className="font-display font-bold">Solo</h3>
              {amostra && I ? (
                <>
                  <p className="text-muted">Laudo de {dataBR(amostra.data_coleta ?? amostra.criado_em)}{amostra.laboratorio ? ` · ${amostra.laboratorio}` : ""}</p>
                  <ul className="grid gap-1">
                    {I.indicadores.map((x) => <li key={x.nome}>{x.nome}: <b>{x.valor}</b> ({x.classe.toLowerCase()}) <SeloEvidencia tipo="local" /></li>)}
                  </ul>
                  {d4 && <p>Saúde do solo: {d4.quadrante ? <b>{QUADRANTES[d4.quadrante].nome}</b> : <>carbono com nota <b>{d4.notaCot}</b> de 100; sem enzimas, o quadrante fica em aberto</>} <SeloEvidencia tipo="regra" /></p>}
                </>
              ) : <p className="text-muted">Sem análise de solo registrada.</p>}
              <h3 className="mt-2 font-display font-bold">Prioridades e limitações</h3>
              <ul className="grid gap-1">
                {PRIORIDADES.map(([k, n]) => <li key={k}>{n}: <b>{PESO[par.pri[k]]}</b> <SeloEvidencia tipo="local" /></li>)}
                <li>Gado: <b>{par.gado ? "sim" : "não"}</b> · irrigação: <b>{par.irrigacao ? "sim" : "não"}</b> <SeloEvidencia tipo="local" /></li>
              </ul>
            </div>
          </div>
          {lacunasPerfil.length > 0 && (
            <div className="rounded-xl bg-warn-soft p-3 text-sm">
              <b>Lacunas do perfil</b>
              <ul className="mt-1 list-disc pl-5">{lacunasPerfil.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          )}
        </Secao>

        <Secao n="03" titulo="Alternativas" sub={`A rotação atual e as duas alternativas que mais combinam com as prioridades, no cenário ${CENARIOS[par.cenario].nome.toLowerCase()}. Notas de 0 a 100, relativas entre si: não são produtividade.`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs uppercase text-muted">
                  <th className="border-b border-line px-2 py-1.5 font-medium">Critério</th>
                  {cmp.top.map((a, i) => <th key={a.rotacao.id} className="border-b border-line px-2 py-1.5 font-medium">{LETRAS[i]}{i === 0 ? " · atual" : ""}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr><th scope="row" className="border-b border-line px-2 py-1.5 text-left font-semibold">Rotação</th>{cmp.top.map((a) => <td key={a.rotacao.id} className="border-b border-line px-2 py-1.5">{a.nome}</td>)}</tr>
                {CRITERIOS.map(([k, n]) => {
                  const mx = Math.max(...cmp.top.map((a) => a[k]));
                  return (
                    <tr key={k}>
                      <th scope="row" className="border-b border-line px-2 py-1.5 text-left font-semibold">{n}<small className="block font-normal text-muted">peso {k === "clima" ? "médio (fixo)" : PESO[par.pri[k]]}</small></th>
                      {cmp.top.map((a) => <td key={a.rotacao.id} className={`border-b border-line px-2 py-1.5 tabular-nums ${a[k] === mx ? "font-bold text-brand" : ""}`}>{Math.round(a[k])}</td>)}
                    </tr>
                  );
                })}
                <tr><th scope="row" className="px-2 pt-2 text-left font-semibold">Combina com as prioridades</th>{cmp.top.map((a) => <td key={a.rotacao.id} className={`px-2 pt-2 font-display text-xl font-extrabold ${a === melhor ? "text-brand" : ""}`}>{Math.round(a.combina)}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className="grid gap-3">
            {cmp.top.map((a, i) => (
              <div key={a.rotacao.id} className="card grid gap-2 p-3 text-sm break-inside-avoid">
                <b className="font-display text-base">{LETRAS[i]} · {a.nome}{i === 0 ? " (atual)" : a === melhor ? " (melhor alternativa para estas prioridades)" : ""}</b>
                <p><b>Por que:</b> {porQue(a, cmp.atual, par.pri)} <SeloEvidencia tipo="regra" /></p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><b>Evidências</b><ul className="list-disc pl-5">{evidencias(a, porCenario.find((c) => c.cenario === par.cenario)!.riscos).map((e) => <li key={e.texto}>{e.texto} <SelosEvidencia tipos={tiposDaFonte(e.fonte)} /></li>)}</ul></div>
                  <div><b>Benefícios</b> <SeloEvidencia tipo="regra" /><ul className="list-disc pl-5">{beneficios(a).map((b) => <li key={b}>{b}</li>)}</ul></div>
                </div>
              </div>
            ))}
          </div>
        </Secao>

        <Secao n="04" titulo="Riscos e cenários" sub="As mesmas três rotações com a chuva da safra abaixo da média, normal e acima. É hipótese para testar a decisão, não previsão.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs uppercase text-muted">
                  <th className="border-b border-line px-2 py-1.5 font-medium">Rotação</th>
                  {porCenario.map((c) => <th key={c.cenario} className="border-b border-line px-2 py-1.5 font-medium">{CENARIOS[c.cenario].nome} <span className="normal-case">({CENARIOS[c.cenario].enso})</span></th>)}
                </tr>
              </thead>
              <tbody>
                {cmp.top.map((a, i) => (
                  <tr key={a.rotacao.id}>
                    <th scope="row" className="border-b border-line px-2 py-2 text-left font-semibold">{LETRAS[i]} · {a.nome}</th>
                    {porCenario.map((c) => {
                      const av = c.avaliacoes[i];
                      const top = Math.max(...c.avaliacoes.map((x) => x.combina));
                      const risco = riscosDaRotacao(av, c.riscos)[0];
                      return (
                        <td key={c.cenario} className="border-b border-line px-2 py-2 align-top">
                          <b className={`font-display text-lg tabular-nums ${av.combina === top ? "text-brand" : ""}`}>{Math.round(av.combina)}</b>
                          {risco && <p className="text-xs text-muted">{risco}</p>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm"><SeloEvidencia tipo="hipotese" /> {sul ? "No Sul, El Niño costuma trazer chuva acima da média e La Niña, estiagem: o cenário muda em 25% a chuva de setembro a fevereiro e ajusta os riscos de alagamento e de seca." : "No Cerrado, El Niño e La Niña mudam pouco a chuva: o cenário muda em 10% a chuva de setembro a fevereiro."} Confira o boletim ENSO da NOAA e a previsão do INMET antes da safra.</p>
        </Secao>

        <Secao n="05" titulo="Próximos passos" sub="O que precisa ser confirmado no campo e por um profissional antes de mudar a rotação.">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="grid content-start gap-1.5">
              <h3 className="font-display font-bold">Antes de plantar ({melhor.nome})</h3>
              {correcoes.length ? <ul className="list-disc pl-5">{correcoes.map((c) => <li key={c}>{c} <SeloEvidencia tipo="local" /></li>)}</ul> : <p className="text-muted">{amostra ? "O laudo não aponta correção para esta rotação." : "Sem laudo, não dá para dizer se o solo precisa de correção."}</p>}
              <h3 className="mt-2 font-display font-bold">O que o app não sabe</h3>
              <ul className="list-disc pl-5">{lacunas(!!amostra).map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
            <div className="grid content-start gap-1.5">
              <h3 className="font-display font-bold">Perguntas para o agrônomo e o produtor</h3>
              <ol className="list-decimal pl-5">{perguntas.map((q) => <li key={q}>{q}</li>)}</ol>
            </div>
          </div>
        </Secao>

        <Secao n="06" titulo="Fontes e método">
          <ul className="grid gap-1.5 text-sm">
            <li><b>NASA POWER</b> (power.larc.nasa.gov), API diária, parâmetros PRECTOTCORR, T2M_MIN, T2M_MAX, T2M e RH2M, {clima.periodo}. Grade de cerca de 0,5°: vale para a região, não para pontos dentro do talhão.</li>
            {relevo && <li><b>SRTM</b> (NASA), lido pelo AWS Terrain Tiles, pixel de {num(relevo.pixel_m)} m, {relevo.pontos} pontos dentro do contorno; classes de declividade da Embrapa.</li>}
            <li><b>Solo:</b> faixas de interpretação do Boletim 100 (IAC) para culturas anuais; saúde do solo pelo modelo de quatro quadrantes (carbono e enzimas, Melo 2026), com referência de pomares de pessegueiro em Pelotas (RS), que ainda precisa de validação para grãos.</li>
            <li><b>Comparação:</b> base de culturas e regras visíveis no código (<code>src/lib/agro</code>). Cada critério dá uma nota de 0 a 100; o total pondera as prioridades (pouco = 1, médio = 2, muito = 3; clima com peso fixo 2). As notas são relativas entre as opções: não são produtividade, renda em reais nem probabilidade de perda.</li>
            <li><b>Cenários:</b> ajuste da chuva de setembro a fevereiro pela fase do ENSO; é hipótese de análise.</li>
            <li><b>Limitações:</b> sem janela do ZARC, sem preços e mercado, sem histórico de pragas, base de culturas simplificada. Leitura de laudo e explicação por IA estão planejadas, não integradas.</li>
          </ul>
        </Secao>

        <p className="print:hidden"><Link href={`/tecnico/talhoes/${t.id}?aba=rotacoes`}>← Voltar para a comparação</Link></p>
      </article>
    </Pagina>
  );
}
