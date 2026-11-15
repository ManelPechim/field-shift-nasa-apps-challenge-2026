import Link from "next/link";
import { notFound } from "next/navigation";
import { Area, SeletorDeUnidade, UnidadeDeArea } from "@/components/area";
import { BotaoCopiar } from "@/components/copiar";
import { IconeRota } from "@/components/icones";
import { Trilha } from "@/components/trilha";
import { Pagina, Selo, Vazio, dataBR } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { ROTACOES, nomeRotacao, regiaoDe, rotacaoPorId } from "@/lib/agro/culturas";
import { criarTalhao } from "@/app/tecnico/actions";
import type { Propriedade, Talhao, Visita } from "@/lib/tipos";
import { TalhoesDaPropriedade } from "./talhoes-da-propriedade";

type Contagem = { count: number }[];
type TalhaoComContagens = Talhao & { amostras: Contagem; planos: Contagem; tarefas: Contagem };

export default async function PaginaPropriedade(props: PageProps<"/tecnico/propriedades/[id]">) {
  const { id } = await props.params;
  const { excluido } = await props.searchParams;
  const { supabase } = await exigirPerfil("tecnico");
  const [{ data: p }, { data: talhoes }, { data: visitas }] = await Promise.all([
    supabase.from("propriedades").select("*, produtores(id, nome)").eq("id", id).maybeSingle<Propriedade & { produtores: { id: string; nome: string } }>(),
    // Contagens: o modal de edição diz o que sai junto se o talhão for excluído
    supabase.from("talhoes").select("*, amostras(count), planos(count), tarefas(count)").eq("propriedade_id", id).order("criado_em").returns<TalhaoComContagens[]>(),
    supabase.from("visitas").select("*").eq("propriedade_id", id).order("data", { ascending: false }).returns<Visita[]>(),
  ]);
  if (!p) notFound();
  const lista = talhoes ?? [];
  const somaTalhoes = lista.reduce((a, t) => a + (t.area_ha ?? 0), 0);
  const ocupacao = p.area_ha && somaTalhoes ? Math.round((100 * somaTalhoes) / p.area_ha) : null;
  const coordenadas = `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
  const local = [p.municipio, p.uf].filter(Boolean).join(" - ");

  return (
    <Pagina>
      <Trilha passos={[
        { rotulo: "Clientes", href: "/tecnico" },
        { rotulo: p.produtores.nome, href: `/tecnico/produtores/${p.produtores.id}` },
        { rotulo: p.nome, tipo: "Propriedade" },
      ]} />

      {typeof excluido === "string" && <p role="status" className="mb-4 rounded-xl bg-ok-soft p-3 text-ok"><b>{excluido}</b> foi excluído.</p>}

      <UnidadeDeArea>
        <header className="card mb-10 grid gap-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Propriedade</span>
              <h1 className="h1">{p.nome}</h1>
              <p className="text-muted">de <Link href={`/tecnico/produtores/${p.produtores.id}`}>{p.produtores.nome}</Link>{local ? ` · ${local}` : ""}</p>
            </div>
            <Link href={`/tecnico/propriedades/${p.id}/visita`} className="btn">Registrar visita técnica</Link>
          </div>

          <dl className="grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid content-start gap-1">
              <dt className="eyebrow">Endereço</dt>
              <dd className="font-semibold">{p.endereco || "Sem endereço"}</dd>
              {local && <dd>{local}</dd>}
              <dd className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">Coordenadas: {coordenadas} <BotaoCopiar texto={coordenadas} /></dd>
              <dd>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold">
                  <IconeRota />Como chegar
                </a>
              </dd>
            </div>
            <div className="grid content-start gap-1">
              <dt className="flex items-center justify-between gap-2"><span className="eyebrow">Área da propriedade</span><SeletorDeUnidade /></dt>
              <dd className="font-display text-xl font-bold"><Area ha={p.area_ha} vazio="Limite não desenhado" /></dd>
              <dd className="text-xs text-muted">ha = hectare: 10.000 m², um quadrado de 100 m × 100 m (um pouco maior que um campo de futebol).</dd>
            </div>
            <div className="grid content-start gap-1">
              <dt className="eyebrow">Talhões</dt>
              <dd className="font-display text-xl font-bold">{lista.length} {lista.length === 1 ? "talhão" : "talhões"}</dd>
              {lista.length > 0 && <dd>Somam <b><Area ha={somaTalhoes} /></b>{ocupacao != null && <> · {ocupacao}% da propriedade</>}</dd>}
              {lista.length > 1 && <dd className="text-xs text-muted">A área é a soma de todos os talhões desenhados.</dd>}
            </div>
            <div className="grid content-start gap-1">
              <dt className="eyebrow">Cadastro e visitas</dt>
              <dd>{p.car_codigo ? <>CAR: <span className="font-mono text-xs">{p.car_codigo}</span></> : "CAR não informado"}</dd>
              <dd>Última visita: <b>{dataBR(visitas?.[0]?.data)}</b></dd>
              {p.observacoes && <dd className="text-muted">{p.observacoes}</dd>}
            </div>
          </dl>
        </header>

        <TalhoesDaPropriedade
          propriedadeId={p.id}
          talhoes={lista.map((t) => {
            const r = rotacaoPorId(t.rotacao_atual);
            return { id: t.id, nome: t.nome, geojson: t.geojson, area_ha: t.area_ha, cor: t.cor, descricao: r ? nomeRotacao(r) : "rotação atual não informada" };
          })}
          limite={p.limite}
          ponto={[p.lon, p.lat]}
          rotacoes={ROTACOES.filter((r) => r.atual).map((r) => ({ id: r.id, nome: nomeRotacao(r), regiao: r.regiao }))}
          acao={criarTalhao}
          edicao={Object.fromEntries(lista.map((t) => [t.id, {
            id: t.id, nome: t.nome, cor: t.cor, rotacaoAtual: t.rotacao_atual, areaHa: t.area_ha, geojson: t.geojson,
            vizinhos: lista.filter((x) => x.id !== t.id).map((x) => ({ id: x.id, nome: x.nome, geojson: x.geojson, cor: x.cor })),
            limite: p.limite, ponto: [p.lon, p.lat] as [number, number],
            rotacoes: ROTACOES.filter((r) => r.atual && r.regiao === regiaoDe(t.centroide_lat ?? p.lat)).map((r) => ({ id: r.id, nome: nomeRotacao(r) })),
            vinculos: { amostras: t.amostras[0]?.count ?? 0, planos: t.planos[0]?.count ?? 0, tarefas: t.tarefas[0]?.count ?? 0 },
          }]))}
        />
      </UnidadeDeArea>

      <section className="mt-10">
        <h2 className="h2 mb-3">Visitas técnicas</h2>
        {!visitas?.length ? (
          <Vazio titulo="Nenhuma visita registrada">A visita é onde entra o que o satélite não vê: alagamento, erosão, compactação, manejo e o que o produtor quer.</Vazio>
        ) : (
          <ul className="grid gap-2">
            {visitas.map((v) => (
              <li key={v.id} className="card p-3">
                <div className="flex flex-wrap items-center gap-2"><b>{dataBR(v.data)}</b>{v.objetivo && <span className="text-muted">· {v.objetivo}</span>}{v.talhao_id && <Selo tom="info">{lista.find((t) => t.id === v.talhao_id)?.nome}</Selo>}</div>
                {v.observacoes && <p className="mt-1 text-sm">{v.observacoes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Pagina>
  );
}
