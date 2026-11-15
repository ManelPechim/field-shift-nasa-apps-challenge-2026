import Link from "next/link";
import { CalendarioRotacao } from "@/components/graficos";
import { Glossario } from "@/components/glossario";
import { SeloEvidencia } from "@/components/evidencia";
import { Selo, Vazio, dataBR, num, tomDoNivel } from "@/components/ui";
import { CRITERIO_SIMPLES, analisar, parametros } from "@/lib/agro/decisao";
import { NIVEL, NOME_RISCO, type ChaveRisco } from "@/lib/agro/riscos";
import { CRITERIOS } from "@/lib/agro/rotacao";
import { interpretar, prontidao } from "@/lib/agro/solo";
import type { ClimaTalhao } from "@/lib/nasa/power";
import type { RelevoTalhao } from "@/lib/nasa/relevo";
import type { Amostra, Plano, Talhao, Visita } from "@/lib/tipos";
import { EscolherRotacao } from "./escolher";

/** O que fazer quando o risco é médio ou alto, em uma frase. */
const O_QUE_FAZER: Record<ChaveRisco, string> = {
  erosao: "Manter o solo coberto o ano todo (palha ou planta de cobertura) e plantar em nível, cortando a descida.",
  alagamento: "Nas partes que encharcam, preferir culturas que toleram água parada e cuidar da drenagem.",
  geada: "No inverno, plantar culturas que aguentam frio (trigo, aveia) e não semear as de verão antes do fim das geadas.",
  seca: "Preferir culturas que aguentam falta de chuva (como o sorgo) e manter palha para segurar a umidade.",
  calor: "Evitar que a floração das culturas de verão caia nos dias mais quentes.",
};

/** A análise pronta do talhão: recomendação, o porquê e o que falta, para entender de relance. */
export function AbaResumo({ talhao, clima, relevo, visita, amostra, plano }: {
  talhao: Talhao; clima: ClimaTalhao | null; relevo: RelevoTalhao | null; visita: Visita | null; amostra: Amostra | null; plano: Plano | null;
}) {
  if (!clima) return <Vazio titulo="Sem dados de clima">A NASA não respondeu agora. Tente de novo em alguns minutos.</Vazio>;
  const par = parametros({}, visita);
  const analise = analisar(talhao, clima, relevo, visita, par);
  const { cmp, melhor, explicados } = analise;
  const atual = cmp.atual;
  const trocar = melhor.combina - atual.combina >= 4;
  const escolhida = trocar ? melhor : atual;
  const iEscolhida = cmp.top.indexOf(escolhida);
  const I = amostra ? interpretar(amostra.valores) : null;
  const correcoes = I ? prontidao(escolhida.rotacao, I).correcoes : [];

  // Onde a recomendada ganha e onde perde da rotação de hoje
  const dif = CRITERIOS.filter(([k]) => k !== "forragem" || par.gado).map(([k]) => ({ k, de: Math.round(atual[k]), para: Math.round(melhor[k]), d: melhor[k] - atual[k] }));
  const ganhos = dif.filter((x) => x.d >= 4).sort((a, b) => b.d - a.d).slice(0, 3);
  const perdas = dif.filter((x) => x.d <= -4).sort((a, b) => a.d - b.d).slice(0, 2);
  const riscos = (Object.keys(explicados) as ChaveRisco[]).filter((k) => explicados[k].nivel >= 2).sort((a, b) => explicados[b].nivel - explicados[a].nivel);
  // Primeiro o que está ruim, depois o que pede atenção
  const problemasSolo = [...(I?.indicadores.filter((x) => x.tom === "ruim") ?? []), ...(I?.indicadores.filter((x) => x.tom === "atencao") ?? [])];
  const geadaAno = clima.geada_dias.reduce((a, b) => a + b, 0);
  const r = clima.recente;

  const etapas: [string, boolean, string | null][] = [
    ["Dados da NASA", true, null],
    ["Visita na lavoura", !!visita, `/tecnico/propriedades/${talhao.propriedade_id}/visita?talhao=${talhao.id}`],
    ["Análise de solo", !!amostra, `/tecnico/talhoes/${talhao.id}?aba=solo`],
    ["Plano para o produtor", plano?.status === "publicado", plano ? `/tecnico/talhoes/${talhao.id}?aba=plano` : null],
  ];

  return (
    <div className="grid gap-8">
      <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas deste talhão">
        {etapas.map(([nome, ok, href], i) => (
          <li key={nome} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${ok ? "border-ok/40 bg-ok-soft" : "border-line bg-surface"}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full font-display font-extrabold ${ok ? "bg-ok text-surface" : "bg-surface-2 text-muted"}`}>{ok ? "✓" : i + 1}</span>
            <span className="min-w-0"><b className="block leading-tight">{nome}</b>
              <span className="text-muted">{ok ? "Feito" : href ? <Link href={href}>Fazer agora</Link> : "Escolha uma opção abaixo"}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="card grid gap-4 border-brand p-5 ring-1 ring-brand">
        <span className="eyebrow">Recomendação do app {!visita && "· sem visita, a análise usa só os dados da NASA"}</span>
        <h2 className="font-display text-2xl leading-tight font-extrabold sm:text-3xl">
          {trocar ? <>Trocar <span className="text-muted">{atual.nome}</span> por <span className="text-brand">{melhor.nome}</span></> : <>Manter <span className="text-brand">{atual.nome}</span></>}
        </h2>
        <p className="max-w-3xl">{escolhida.rotacao.ideia}</p>
        {!talhao.rotacao_atual && <p className="-mt-2 text-sm text-warn">O que se planta hoje não foi informado: o app comparou com {atual.nome.toLowerCase()}, a rotação mais comum na região. Corrija em “Editar talhão”.</p>}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-2">
            {trocar && ganhos.length > 0 && (
              <div><b className="text-ok">O que melhora</b>
                <ul className="mt-1 grid gap-1">{ganhos.map((g) => <li key={g.k}><Barra nome={CRITERIO_SIMPLES[g.k][0]} de={g.de} para={g.para} /></li>)}</ul>
              </div>
            )}
            {trocar && perdas.length > 0 && (
              <div><b className="text-warn">O que piora</b>
                <ul className="mt-1 grid gap-1">{perdas.map((g) => <li key={g.k}><Barra nome={CRITERIO_SIMPLES[g.k][0]} de={g.de} para={g.para} /></li>)}</ul>
              </div>
            )}
            {!trocar && <p className="text-sm text-muted">As alternativas não ficaram claramente melhores para as prioridades do produtor (diferença menor que 4 pontos).</p>}
            <p className="text-xs text-muted">Notas de 0 a 100, comparando as opções entre si. Não é produtividade nem lucro. <SeloEvidencia tipo="regra" /></p>
          </div>
          <div className="min-w-0">
            <span className="eyebrow">Como fica o ano (2 anos de ciclo)</span>
            <CalendarioRotacao ocupacao={escolhida.ocupacao} />
          </div>
        </div>
        {correcoes.length > 0 && (
          <div className="rounded-xl bg-warn-soft p-3 text-sm"><b>Antes de plantar, corrigir o solo:</b> {correcoes.join("; ")}. A dose quem define é o técnico, pelo laudo. <SeloEvidencia tipo="local" /></div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
          {plano ? <p className="text-sm">Já existe um plano: <Link href={`/tecnico/talhoes/${talhao.id}?aba=plano`}>{plano.rotacao_nome}</Link>.</p>
            : <EscolherRotacao talhao={talhao} a={escolhida} i={iEscolhida} correcoes={correcoes} par={par} analise={analise} rotulo="Aceitar e montar o plano" />}
          <Link href={`/tecnico/talhoes/${talhao.id}?aba=rotacoes`} className="text-sm font-semibold">Ver as 3 opções lado a lado →</Link>
        </div>
      </section>

      <section>
        <h2 className="h2 mb-1">Por que: o que os dados mostram</h2>
        <p className="mb-3 text-sm text-muted">20 anos de clima da NASA no ponto do talhão{visita ? `, mais a visita de ${dataBR(visita.data)}` : ""}{amostra ? " e a análise de solo" : ""}.</p>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Numero valor={`${num(clima.chuva_anual_mm)} mm`} rotulo="de chuva por ano" explica={clima.chuva_anual_mm >= 1200 ? "Chuva suficiente para duas safras por ano." : "Chuva curta: atenção às culturas que pedem mais água."} />
          <Numero valor={num(clima.chuva_extrema_dias_ano, 1)} rotulo="dias por ano de chuva muito forte" explica="Acima de 50 mm num dia: é quando a enxurrada leva a terra." />
          <Numero valor={num(geadaAno, 1)} rotulo="dias de geada por ano" explica={geadaAno ? "Quase todos em junho, julho e agosto." : "Sem geada no período."} />
          {relevo
            ? <Numero valor={`${num(relevo.declividade_media, 0)}%`} rotulo="de inclinação média" explica={`Sobe ${num(relevo.declividade_media, 0)} m a cada 100 m: ${relevo.classe.toLowerCase()}.`} />
            : <Numero valor="—" rotulo="inclinação" explica="O relevo não carregou." />}
        </dl>
        {r && r.chuva_30d_mm > 1.5 * r.chuva_30d_normal_mm && (
          <p className="mt-2 rounded-xl bg-warn-soft p-3 text-sm"><b>Agora:</b> choveu {r.chuva_30d_mm} mm nos últimos 30 dias, {Math.round(r.chuva_30d_mm / Math.max(1, r.chuva_30d_normal_mm) * 10) / 10}× o normal ({r.chuva_30d_normal_mm} mm). Cuidado com enxurrada nas partes inclinadas. <SeloEvidencia tipo="nasa" /></p>
        )}
      </section>

      <section>
        <h2 className="h2 mb-1">Riscos que pesam na decisão</h2>
        {riscos.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {riscos.map((k) => (
              <li key={k} className="card grid gap-1.5 p-4">
                <div className="flex items-center justify-between gap-2"><b className="font-display text-lg">{NOME_RISCO[k]}</b><Selo tom={tomDoNivel(explicados[k].nivel)}>Risco {NIVEL[explicados[k].nivel].toLowerCase()}</Selo></div>
                <p className="text-sm"><b>Por quê:</b> {explicados[k].motivo}</p>
                <p className="text-sm"><b>O que fazer:</b> {O_QUE_FAZER[k]} <SeloEvidencia tipo="regra" /></p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Nenhum risco médio ou alto.</p>}
      </section>

      <section>
        <h2 className="h2 mb-1">Solo</h2>
        {I ? (
          problemasSolo.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {problemasSolo.slice(0, 4).map((p) => (
                <li key={p.nome} className="card grid gap-1 p-4">
                  <div className="flex items-center justify-between gap-2"><b>{p.nome}</b><Selo tom={p.tom}>{p.classe}</Selo></div>
                  <p className="text-sm text-muted">{p.explicacao}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm">Nenhum problema sério no laudo. <Link href={`/tecnico/talhoes/${talhao.id}?aba=solo`}>Ver a análise completa</Link></p>
        ) : (
          <p className="text-sm">Sem análise de solo, a recomendação não sabe se o solo precisa de correção. <Link href={`/tecnico/talhoes/${talhao.id}?aba=solo`}>Registrar o laudo</Link></p>
        )}
      </section>

      <section className="card grid gap-2 p-4">
        <h2 className="h2">Antes de levar ao produtor, confirme</h2>
        <ol className="list-decimal grid gap-1 pl-5 text-sm">
          <li>A data de plantio de cada cultura no <b>ZARC</b> do município (app Plantio Certo, da Embrapa).</li>
          <li>Se há comprador na região para as culturas novas e se as máquinas do produtor servem.</li>
          <li>O histórico de pragas e doenças do talhão, que o app não sabe.</li>
        </ol>
        <p className="text-xs text-muted">O app ajuda a decidir. Quem recomenda é o técnico, junto com o produtor.</p>
      </section>

      <Glossario termos={["NASA POWER", "SRTM", "Declividade", "Erosão", "Rotação", "Planta de cobertura", "ZARC", "V%"]} />
    </div>
  );
}

function Numero({ valor, rotulo, explica }: { valor: string; rotulo: string; explica: string }) {
  return (
    <div className="card grid content-start gap-0.5 p-3">
      <dd className="font-display text-2xl font-extrabold">{valor}</dd>
      <dt className="text-sm font-semibold">{rotulo}</dt>
      <dd className="text-sm text-muted">{explica} <SeloEvidencia tipo="nasa" /></dd>
    </div>
  );
}

function Barra({ nome, de, para }: { nome: string; de: number; para: number }) {
  return (
    <span className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-2 text-sm">
      <span>{nome}</span>
      <span className="relative h-2 rounded bg-surface-2">
        <span className="absolute inset-y-0 left-0 rounded bg-muted/40" style={{ width: `${de}%` }} />
        <span className={`absolute inset-y-0 left-0 rounded ${para >= de ? "bg-ok" : "bg-warn"}`} style={{ width: `${para}%`, opacity: 0.85 }} />
      </span>
      <span className="font-mono text-xs whitespace-nowrap">{de} → <b>{para}</b></span>
    </span>
  );
}

