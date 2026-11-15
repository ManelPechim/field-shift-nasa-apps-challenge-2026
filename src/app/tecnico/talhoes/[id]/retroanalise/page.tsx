import Link from "next/link";
import { notFound } from "next/navigation";
import { SeloEvidencia } from "@/components/evidencia";
import { Trilha } from "@/components/trilha";
import { Pagina, Selo, num, tomDoNivel } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { dadosNasa } from "@/lib/dados";
import { CRITERIO_SIMPLES, LETRAS, analisar, parametros } from "@/lib/agro/decisao";
import { NIVEL } from "@/lib/agro/riscos";
import { climaDoPonto, safraObservada } from "@/lib/nasa/power";
import type { Propriedade, Talhao, Visita } from "@/lib/tipos";

export const metadata = { title: "Volta no tempo: safra 2021/22" };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// Meses da safra de verão comparados (novembro a fevereiro: plantio, floração e enchimento de grão da soja)
const SAFRA = [10, 11, 0, 1];

/**
 * Retroanálise: o motor roda como se fosse 15/10/2021, sabendo só o clima de 2001–2020,
 * e o resultado é comparado com o que a NASA mediu na safra 2021/22.
 */
export default async function Retroanalise(props: PageProps<"/tecnico/talhoes/[id]/retroanalise">) {
  const { id } = await props.params;
  const { supabase } = await exigirPerfil("tecnico");
  const { data: t } = await supabase.from("talhoes").select("*").eq("id", id).maybeSingle<Talhao>();
  if (!t) notFound();
  const [{ data: prop }, { data: visitas }] = await Promise.all([
    supabase.from("propriedades").select("*, produtores(id, nome)").eq("id", t.propriedade_id).single<Propriedade & { produtores: { id: string; nome: string } }>(),
    supabase.from("visitas").select("*").eq("propriedade_id", t.propriedade_id).or(`talhao_id.eq.${t.id},talhao_id.is.null`).order("data", { ascending: false }).returns<Visita[]>(),
  ]);
  if (!prop) notFound();
  const visita = visitas?.find((v) => v.talhao_id === t.id) ?? visitas?.[0] ?? null;
  const lat = t.centroide_lat!, lon = t.centroide_lon!;

  const [{ relevo }, clima, obs] = await Promise.all([
    dadosNasa(supabase, t),
    climaDoPonto(lat, lon, { de: 2001, ate: 2020, hoje: new Date("2021-10-15T12:00:00Z") }),
    safraObservada(lat, lon, "20211101", "20220228"),
  ]);

  const parNormal = parametros({ cenario: "normal" }, visita);
  const parSeco = parametros({ cenario: "seco" }, visita);
  const normal = analisar(t, clima, relevo, visita, parNormal);
  const seco = analisar(t, clima, relevo, visita, parSeco);
  const cNormal = seco.porCenario.find((c) => c.cenario === "normal")!;
  const cSeco = seco.porCenario.find((c) => c.cenario === "seco")!;

  // Chuva: normal de 2001–2020, o que o app supôs para La Niña (−25% de setembro a fevereiro no Sul) e o observado
  const fator = seco.sul ? 0.75 : 0.9;
  const linhas = SAFRA.map((m, i) => {
    const o = obs[i];
    const diasMes = new Date(2001, m + 1, 0).getDate();
    return { m, normal: clima.chuva_mm[m], app: Math.round(clima.chuva_mm[m] * fator), obs: o?.chuva ?? 0, calorNormal: clima.calor_dias[m], calorObs: o?.diasCalor ?? 0, tmaxNormal: clima.temp_max[m], tmaxObs: o?.tmaxMedia ?? 0, diasMes };
  });
  const tot = (k: "normal" | "app" | "obs") => linhas.reduce((a, l) => a + l[k], 0);
  const pct = (v: number, base: number) => Math.round((100 * v) / Math.max(1, base));
  const calorNormal = linhas.reduce((a, l) => a + l.calorNormal, 0), calorObs = linhas.reduce((a, l) => a + l.calorObs, 0);
  const maiorEstiagemObs = Math.max(...obs.map((o) => o.maiorEstiagem));
  const escala = Math.max(...linhas.flatMap((l) => [l.normal, l.obs]));
  const subiuSeca = seco.riscos.seca > normal.riscos.seca;
  const choveuMenos = tot("obs") < tot("normal");

  return (
    <Pagina>
      <Trilha passos={[
        { rotulo: "Clientes", href: "/tecnico" },
        { rotulo: prop.produtores.nome, href: `/tecnico/produtores/${prop.produtores.id}` },
        { rotulo: prop.nome, tipo: "Propriedade", href: `/tecnico/propriedades/${prop.id}` },
        { rotulo: t.nome, tipo: "Talhão", href: `/tecnico/talhoes/${t.id}` },
        { rotulo: "Volta no tempo: safra 2021/22" },
      ]} />

      <header className="mt-2 mb-6 grid max-w-4xl gap-2">
        <span className="eyebrow">Retroanálise · simulação com dados reais da NASA</span>
        <h1 className="h1">Se a Terrana existisse em outubro de 2021, ele teria acendido o alerta?</h1>
        <p className="text-muted">O motor do app roda como se fosse <b className="text-ink">15 de outubro de 2021</b>, antes do plantio da soja. Ele só sabe o clima de 2001 a 2020 deste talhão e a previsão de La Niña da época. Depois comparamos com o que a NASA mediu de novembro de 2021 a fevereiro de 2022. O app não calcula produtividade: a pergunta é se ele teria preparado o técnico para a safra.</p>
      </header>

      <div className="grid gap-8">
        <section className="grid gap-3 md:grid-cols-3">
          <Cartao titulo="Outubro de 2021: o que se sabia" tom="info">
            <p>Em <b>14/10/2021</b> a NOAA (agência de clima dos EUA) emitiu o alerta de La Niña, com <b>87% de chance</b> para dezembro a fevereiro. No Sul, La Niña costuma trazer seca. <SeloEvidencia tipo="hipotese" /></p>
          </Cartao>
          <Cartao titulo="O que o app teria mostrado" tom={subiuSeca ? "bom" : "atencao"}>
            <p>Com o cenário “mais seca (La Niña)”, o risco de falta de chuva sobe de <b>{NIVEL[normal.riscos.seca].toLowerCase()}</b> para <b>{NIVEL[seco.riscos.seca].toLowerCase()}</b>, e a chuva esperada de novembro a fevereiro cai para {num(tot("app"))} mm ({pct(tot("app"), tot("normal"))}% do normal).</p>
          </Cartao>
          <Cartao titulo="O que aconteceu" tom="ruim">
            <p>Choveu <b>{num(tot("obs"))} mm</b> de novembro a fevereiro: <b>{pct(tot("obs"), tot("normal"))}% do normal</b>. Foram {calorObs} dias acima de 35 °C, contra {num(calorNormal, 0)} num ano normal. O RS colheu menos da metade da soja esperada (Emater). <SeloEvidencia tipo="nasa" /></p>
          </Cartao>
        </section>

        <section>
          <h2 className="h2 mb-1">Chuva mês a mês: normal, o que o app supôs e o que aconteceu</h2>
          <p className="mb-3 text-sm text-muted">No centro do talhão. Normal = média de 2001 a 2020, o que se sabia antes da safra.</p>
          <div className="card grid gap-3 p-4">
            {linhas.map((l) => (
              <div key={l.m} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 text-sm">
                <b className="uppercase">{MESES[l.m]}</b>
                <div className="grid gap-1">
                  <Barra valor={l.normal} escala={escala} cor="bg-muted/50" rotulo={`Normal: ${l.normal} mm`} />
                  <Barra valor={l.app} escala={escala} cor="bg-warn" rotulo={`App em La Niña: ${l.app} mm`} />
                  <Barra valor={l.obs} escala={escala} cor="bg-bad" rotulo={`Aconteceu: ${l.obs} mm (${pct(l.obs, l.normal)}%)`} />
                </div>
              </div>
            ))}
          </div>
          <span className="fonte">Fonte: NASA POWER, chuva diária no ponto do talhão.</span>
        </section>

        <section>
          <h2 className="h2 mb-1">O alerta acendeu?</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead><tr className="text-left font-mono text-xs uppercase text-muted">
                <th className="border-b border-line px-2 py-1.5 font-medium">O que comparar</th>
                <th className="border-b border-line px-2 py-1.5 font-medium">App em out/2021 (La Niña)</th>
                <th className="border-b border-line px-2 py-1.5 font-medium">Aconteceu</th>
                <th className="border-b border-line px-2 py-1.5 font-medium">Resultado</th>
              </tr></thead>
              <tbody>
                <tr>
                  <th scope="row" className="border-b border-line px-2 py-2 text-left font-semibold">Direção da chuva</th>
                  <td className="border-b border-line px-2 py-2">Menos chuva que o normal</td>
                  <td className="border-b border-line px-2 py-2">{choveuMenos ? "Menos chuva que o normal" : "Chuva normal ou acima"}</td>
                  <td className="border-b border-line px-2 py-2">{choveuMenos ? <Selo tom="bom">Acertou</Selo> : <Selo tom="ruim">Errou</Selo>}</td>
                </tr>
                <tr>
                  <th scope="row" className="border-b border-line px-2 py-2 text-left font-semibold">Tamanho da seca</th>
                  <td className="border-b border-line px-2 py-2">{pct(tot("app"), tot("normal"))}% do normal</td>
                  <td className="border-b border-line px-2 py-2">{pct(tot("obs"), tot("normal"))}% do normal</td>
                  <td className="border-b border-line px-2 py-2">{tot("obs") < tot("app") * 0.8 ? <Selo tom="atencao">Foi pior que o previsto</Selo> : <Selo tom="bom">Próximo</Selo>}</td>
                </tr>
                <tr>
                  <th scope="row" className="border-b border-line px-2 py-2 text-left font-semibold">Risco de falta de chuva</th>
                  <td className="border-b border-line px-2 py-2"><Selo tom={tomDoNivel(seco.riscos.seca)}>{NIVEL[seco.riscos.seca]}</Selo> (era {NIVEL[normal.riscos.seca].toLowerCase()} sem La Niña)</td>
                  <td className="border-b border-line px-2 py-2">Até {maiorEstiagemObs} dias seguidos sem chuva</td>
                  <td className="border-b border-line px-2 py-2">{subiuSeca ? <Selo tom="bom">Alerta acendeu</Selo> : <Selo tom="ruim">Não acendeu</Selo>}</td>
                </tr>
                <tr>
                  <th scope="row" className="border-b border-line px-2 py-2 text-left font-semibold">Calor extremo</th>
                  <td className="border-b border-line px-2 py-2"><Selo tom={tomDoNivel(seco.riscos.calor)}>{NIVEL[seco.riscos.calor]}</Selo> (o cenário não muda o calor)</td>
                  <td className="border-b border-line px-2 py-2">{calorObs} dias acima de 35 °C (normal: {num(calorNormal, 0)})</td>
                  <td className="border-b border-line px-2 py-2"><Selo tom="atencao">O app não previu</Selo></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="h2 mb-1">As mesmas três rotações, num ano normal e num ano de La Niña</h2>
          <p className="mb-3 text-sm text-muted">Nota de 0 a 100: quanto cada opção combina com o produtor. “Aguenta o clima” mostra só a parte do clima. Não é produtividade.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead><tr className="text-left font-mono text-xs uppercase text-muted">
                <th className="border-b border-line px-2 py-1.5 font-medium">Rotação</th>
                <th className="border-b border-line px-2 py-1.5 font-medium">Nota, ano normal</th>
                <th className="border-b border-line px-2 py-1.5 font-medium">Nota, La Niña</th>
                <th className="border-b border-line px-2 py-1.5 font-medium">{CRITERIO_SIMPLES.clima[0]}: normal → La Niña</th>
              </tr></thead>
              <tbody>
                {seco.cmp.top.map((a, i) => {
                  const n = cNormal.avaliacoes[i], s = cSeco.avaliacoes[i];
                  const melhorSeco = Math.max(...cSeco.avaliacoes.map((x) => x.combina)) === s.combina;
                  return (
                    <tr key={a.rotacao.id}>
                      <th scope="row" className="border-b border-line px-2 py-2 text-left font-semibold">{LETRAS[i]} · {a.nome}{i === 0 ? " (o que se planta hoje)" : ""}</th>
                      <td className="border-b border-line px-2 py-2 tabular-nums">{Math.round(n.combina)}</td>
                      <td className={`border-b border-line px-2 py-2 tabular-nums ${melhorSeco ? "font-bold text-brand" : ""}`}>{Math.round(s.combina)}{melhorSeco ? " · melhor em La Niña" : ""}</td>
                      <td className="border-b border-line px-2 py-2 tabular-nums">{Math.round(n.clima)} → {Math.round(s.clima)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm">Recomendação do app em outubro de 2021, com La Niña: <b className="text-brand">{seco.melhor.nome}</b>. {seco.melhor.rotacao.ideia} <SeloEvidencia tipo="regra" /></p>
        </section>

        <section className="card grid gap-2 p-4 text-sm">
          <h2 className="h2">O que este teste mostra, sem exagero</h2>
          <ul className="list-disc grid gap-1 pl-5">
            <li><b>O que deu certo:</b> com a previsão de La Niña que já existia, o app teria apontado menos chuva e risco maior de seca antes do plantio, e mudado a nota das rotações.</li>
            <li><b>O que o teste revelou para melhorar:</b> a seca real foi bem mais forte que os −25% que o app supõe, e o app não aumenta o risco de calor em ano de La Niña. Os dois ajustes estão nos próximos passos.</li>
            <li><b>O que ele não mostra:</b> quanto o produtor teria colhido. O app compara opções; não calcula sacas por hectare. Data de plantio e variedade também pesam e ficam com o técnico e o ZARC.</li>
          </ul>
        </section>

        <p className="text-sm"><Link href={`/tecnico/talhoes/${t.id}`}>← Voltar ao talhão</Link></p>
      </div>
    </Pagina>
  );
}

function Cartao({ titulo, tom, children }: { titulo: string; tom: "info" | "bom" | "atencao" | "ruim"; children: React.ReactNode }) {
  const fundo = { info: "bg-sat-soft", bom: "bg-ok-soft", atencao: "bg-warn-soft", ruim: "bg-bad-soft" }[tom];
  return <div className={`grid content-start gap-2 rounded-2xl p-4 ${fundo}`}><h2 className="font-display text-lg font-bold">{titulo}</h2>{children}</div>;
}

function Barra({ valor, escala, cor, rotulo }: { valor: number; escala: number; cor: string; rotulo: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_14rem] items-center gap-2">
      <span className="h-3 rounded bg-surface-2"><span className={`block h-3 rounded ${cor}`} style={{ width: `${Math.max(1, (100 * valor) / Math.max(1, escala))}%` }} /></span>
      <span className="text-xs text-muted">{rotulo}</span>
    </div>
  );
}
