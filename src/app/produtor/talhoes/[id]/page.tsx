import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarioRotacao } from "@/components/graficos";
import { Trilha } from "@/components/trilha";
import { Pagina, Selo, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { regiaoDe, rotacaoPorId } from "@/lib/agro/culturas";
import { ocupacao } from "@/lib/agro/rotacao";
import { QUADRANTES, aeem, cotDaMO, diagnostico4QM, interpretar } from "@/lib/agro/solo";
import type { Amostra, Plano, Talhao } from "@/lib/tipos";

export default async function TalhaoProdutor(props: PageProps<"/produtor/talhoes/[id]">) {
  const { id } = await props.params;
  const { supabase } = await exigirPerfil("produtor");
  const { data: t } = await supabase.from("talhoes").select("*, propriedades(id, nome)").eq("id", id).maybeSingle<Talhao & { propriedades: { id: string; nome: string } }>();
  if (!t) notFound();
  const [{ data: planos }, { data: amostras }] = await Promise.all([
    supabase.from("planos").select("*").eq("talhao_id", id).eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).returns<Plano[]>(),
    supabase.from("amostras").select("*").eq("talhao_id", id).order("criado_em", { ascending: false }).limit(1).returns<Amostra[]>(),
  ]);
  const plano = planos?.[0];
  const rot = plano ? rotacaoPorId(plano.rotacao_id) : null;
  const a = amostras?.[0];
  const I = a ? interpretar(a.valores) : null;
  const cot = a ? a.enzimas?.cot ?? (a.valores.mo != null ? cotDaMO(a.valores.mo) : null) : null;
  const d4 = a && cot != null ? diagnostico4QM(cot, a.enzimas ? aeem(a.enzimas, cot) : null) : null;
  const precisa = I?.indicadores.filter((i) => i.tom === "ruim" || i.tom === "atencao") ?? [];

  return (
    <Pagina>
      <Trilha passos={[
        { rotulo: "Suas propriedades", href: "/produtor" },
        { rotulo: t.propriedades.nome, tipo: "Propriedade", href: `/produtor/propriedades/${t.propriedades.id}` },
        { rotulo: t.nome, tipo: "Talhão" },
      ]} />
      <div className="mt-2 mb-6">
        <span className="eyebrow">{num(t.area_ha, 1)} ha</span>
        <h1 className="h1 flex items-center gap-2.5"><span className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: t.cor }} aria-hidden="true" />{t.nome}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="grid content-start gap-3">
          <h2 className="h2">Plano da safra</h2>
          {plano ? (
            <div className="card grid gap-3 p-4">
              <div><span className="eyebrow">Safra {plano.safra}</span><b className="block font-display text-lg">{plano.rotacao_nome}</b></div>
              {plano.resumo_produtor && <p className="whitespace-pre-line">{plano.resumo_produtor}</p>}
              {rot && <CalendarioRotacao ocupacao={ocupacao(rot, regiaoDe(t.centroide_lat!))} />}
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                {plano.resposta === "combinado" ? <Selo tom="bom">Combinado</Selo>
                  : plano.resposta === "duvida" ? <Selo tom="info">Dúvida enviada</Selo>
                  : <Selo tom="atencao">Esperando sua resposta</Selo>}
                <Link href={`/produtor/planos/${plano.id}`} className={plano.resposta ? "btn-ghost btn-sm" : "btn btn-sm"}>{plano.resposta ? "Ver o plano completo" : "Ver o plano e responder"}</Link>
              </div>
            </div>
          ) : <Vazio titulo="O plano ainda não foi publicado">Seu técnico está preparando. Quando publicar, aparece aqui.</Vazio>}
        </section>

        <section className="grid content-start gap-3">
          <h2 className="h2">Seu solo</h2>
          {a && I ? (
            <div className="card grid gap-3 p-4">
              <p className="text-sm text-muted">Análise de {dataBR(a.data_coleta ?? a.criado_em)}</p>
              {d4?.quadrante ? (
                <div><Selo tom={QUADRANTES[d4.quadrante].tom}>Saúde do solo: {QUADRANTES[d4.quadrante].nome}</Selo><p className="mt-1">{QUADRANTES[d4.quadrante].descricao}</p></div>
              ) : <p className="text-sm">A saúde biológica do solo ainda não foi medida. Pergunte ao técnico sobre a análise de enzimas (BioAS).</p>}
              {precisa.length ? (
                <div>
                  <b>O que precisa de cuidado</b>
                  <ul className="mt-1 grid gap-1 text-sm">{precisa.map((i) => <li key={i.nome}><Selo tom={i.tom}>{i.classe}</Selo> {i.nome.replace(/ \(.+\)/, "")}: {i.explicacao}</li>)}</ul>
                </div>
              ) : <p>Os nutrientes estão em bom nível.</p>}
              <p className="text-xs text-muted">Dose de calcário e de adubo: combine com o técnico.</p>
            </div>
          ) : <Vazio titulo="Ainda sem análise de solo">Quando o técnico registrar o laudo, o resumo aparece aqui.</Vazio>}
        </section>
      </div>
    </Pagina>
  );
}
