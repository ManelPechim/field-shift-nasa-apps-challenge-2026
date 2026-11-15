import Link from "next/link";
import { notFound } from "next/navigation";
import { Area, SeletorDeUnidade, UnidadeDeArea } from "@/components/area";
import { BotaoCopiar } from "@/components/copiar";
import { IconeRota } from "@/components/icones";
import { Trilha } from "@/components/trilha";
import { TarefaProdutor } from "@/components/tarefa";
import { RelatosDoProdutor } from "@/components/relatos";
import { Pagina, Vazio, dataBR } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { dadosNasa } from "@/lib/dados";
import { alertasDoClima } from "@/lib/alertas";
import { pinosDosRelatos } from "@/lib/pinos";
import { formatarCelular, linkWhatsApp } from "@/lib/contato";
import { tecnicoDoProdutor } from "@/lib/tecnico-do-produtor";
import type { Ocorrencia, Plano, Propriedade, Talhao, Tarefa, Visita } from "@/lib/tipos";
import { TalhoesEMapa } from "./talhoes-e-mapa";

type PlanoResumo = Pick<Plano, "id" | "talhao_id" | "rotacao_nome" | "safra" | "visto_em" | "resposta">;

export default async function PropriedadeProdutor(props: PageProps<"/produtor/propriedades/[id]">) {
  const { id } = await props.params;
  const { relato } = await props.searchParams;
  const { supabase, perfil } = await exigirPerfil("produtor");
  const [{ data: p }, { data: talhoes }, { data: visitas }, { data: relatos }, { data: todosRelatos }, { count: nPropriedades }, tecnico] = await Promise.all([
    supabase.from("propriedades").select("*").eq("id", id).maybeSingle<Propriedade>(),
    supabase.from("talhoes").select("*").eq("propriedade_id", id).order("criado_em").returns<Talhao[]>(),
    supabase.from("visitas").select("data").eq("propriedade_id", id).order("data", { ascending: false }).limit(1).returns<Pick<Visita, "data">[]>(),
    supabase.from("ocorrencias").select("*").eq("propriedade_id", id).is("talhao_id", null).order("criado_em", { ascending: false }).limit(10).returns<Ocorrencia[]>(),
    supabase.from("ocorrencias").select("*").eq("propriedade_id", id).order("criado_em", { ascending: false }).limit(30).returns<Ocorrencia[]>(),
    supabase.from("propriedades").select("id", { count: "exact", head: true }),
    tecnicoDoProdutor(supabase, perfil.id),
  ]);
  if (!p) notFound();
  const lista = talhoes ?? [];
  const tIds = lista.map((t) => t.id);
  const [{ data: tarefas }, { data: planos }] = tIds.length
    ? await Promise.all([
      supabase.from("tarefas").select("*").in("talhao_id", tIds).eq("status", "pendente").order("criado_em").returns<Tarefa[]>(),
      supabase.from("planos").select("id, talhao_id, rotacao_nome, safra, visto_em, resposta").in("talhao_id", tIds).eq("status", "publicado").order("publicado_em", { ascending: false }).returns<PlanoResumo[]>(),
    ])
    : [{ data: [] as Tarefa[] }, { data: [] as PlanoResumo[] }];
  // O clima da NASA POWER tem grade de ~50 km: o primeiro talhão vale para a propriedade toda
  const nasa = lista[0] ? await dadosNasa(supabase, lista[0]).catch(() => null) : null;
  const alertas = alertasDoClima(nasa?.clima ?? null);

  const somaTalhoes = lista.reduce((a, t) => a + (t.area_ha ?? 0), 0);
  const ocupacao = p.area_ha && somaTalhoes ? Math.round((100 * somaTalhoes) / p.area_ha) : null;
  const coordenadas = `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
  const local = [p.municipio, p.uf].filter(Boolean).join(" - ");
  const nomeTalhao = (tid: string) => lista.find((t) => t.id === tid)?.nome;
  // Planos publicados que o produtor ainda não respondeu: aparecem em destaque no topo
  const semResposta = (planos ?? []).filter((x) => !x.resposta);
  // Única propriedade: o início redireciona para cá, então a trilha não volta para a lista
  const unica = nPropriedades === 1;

  return (
    <Pagina>
      {!unica && <Trilha passos={[
        { rotulo: "Suas propriedades", href: "/produtor" },
        { rotulo: p.nome, tipo: "Propriedade" },
      ]} />}

      {relato === "ok" && <p role="status" className="mb-4 rounded-xl bg-ok-soft p-3 text-ok">Relato da propriedade inteira enviado. Seu técnico vai ver e responder aqui.</p>}

      {semResposta.length > 0 && (
        <section aria-label="Planos para responder" className="mb-6 grid gap-2">
          {semResposta.map((pl) => (
            <div key={pl.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4">
              <div className="min-w-0 flex-1">
                <span className="eyebrow">{pl.visto_em ? "Esperando sua resposta" : "Plano novo"}</span>
                <p><b>Seu técnico publicou o plano da safra {pl.safra}</b> para o talhão <b>{nomeTalhao(pl.talhao_id)}</b>: {pl.rotacao_nome}.</p>
              </div>
              <Link href={`/produtor/planos/${pl.id}`} className="btn">Ver o plano</Link>
            </div>
          ))}
        </section>
      )}

      <UnidadeDeArea>
        <header className="card mb-10 grid gap-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">{unica ? `Olá, ${perfil.nome.split(" ")[0]} · sua propriedade` : "Propriedade"}</span>
              <h1 className="h1">{p.nome}</h1>
              {local && <p className="text-muted">{local}</p>}
            </div>
            <Link href={`/produtor/propriedades/${p.id}/relatar`} className="btn">Relatar algo desta propriedade</Link>
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
              {lista.length > 1 && <dd className="text-xs text-muted">A área é a soma de todos os talhões.</dd>}
            </div>
            <div className="grid content-start gap-1">
              <dt className="eyebrow">Acompanhamento</dt>
              <dd>Última visita do técnico: <b>{dataBR(visitas?.[0]?.data)}</b></dd>
              <dd>Tarefas pendentes: {tarefas?.length ? <a href="#tarefas" className="font-bold">{tarefas.length}, ver</a> : <b>0</b>}</dd>
              {tecnico && (
                <dd className="mt-1 grid gap-0.5 border-t border-line pt-2">
                  <span>Seu técnico: <b>{tecnico.nome}</b>{tecnico.instituicao && <span className="text-muted"> · {tecnico.instituicao}</span>}</span>
                  {tecnico.telefone && (
                    <a href={linkWhatsApp(tecnico.telefone, `Olá, ${tecnico.nome.split(" ")[0]}! Aqui é ${perfil.nome.split(" ")[0]}, da ${p.nome}, pelo Field Shift.`)} target="_blank" rel="noreferrer" className="font-semibold">
                      WhatsApp {formatarCelular(tecnico.telefone)}
                    </a>
                  )}
                </dd>
              )}
            </div>
          </dl>
        </header>

        {alertas.length > 0 && (
          <section className="mb-10">
            <h2 className="h2 mb-3">Como está o tempo</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {alertas.map((a) => (
                <div key={a.titulo} className={`rounded-2xl p-4 ${a.tom === "bom" ? "bg-ok-soft" : "bg-warn-soft"}`}>
                  <b className="font-display">{a.titulo}</b>
                  <p className="mt-1 text-sm">{a.texto}</p>
                </div>
              ))}
            </div>
            {nasa?.clima?.recente && <span className="fonte mt-2 block">Satélites da NASA (NASA POWER), últimos 30 dias até {dataBR(nasa.clima.recente.ate)}</span>}
          </section>
        )}

        <TalhoesEMapa
          talhoes={lista.map((t) => {
            const pl = planos?.find((x) => x.talhao_id === t.id);
            return {
              id: t.id, nome: t.nome, geojson: t.geojson, area_ha: t.area_ha, cor: t.cor,
              descricao: pl ? `Plano ${pl.safra}: ${pl.rotacao_nome}` : "Plano ainda não publicado",
              pendentes: tarefas?.filter((x) => x.talhao_id === t.id).length ?? 0,
            };
          })}
          limite={p.limite}
          ponto={[p.lon, p.lat]}
          pinos={pinosDosRelatos(todosRelatos ?? [], nomeTalhao, (o) => (o.talhao_id ? `/produtor/talhoes/${o.talhao_id}` : `/produtor/propriedades/${p.id}#relatos`))}
        />
      </UnidadeDeArea>

      <section id="tarefas" className="mt-10 scroll-mt-24">
        <h2 className="h2 mb-3">O que fazer agora nesta propriedade</h2>
        {tarefas?.length
          ? <ul className="grid gap-3 lg:grid-cols-2">{tarefas.map((t) => <TarefaProdutor key={t.id} t={t} talhao={nomeTalhao(t.talhao_id)} />)}</ul>
          : <Vazio titulo="Nada pendente">Quando seu técnico publicar o plano da safra, as tarefas aparecem aqui.</Vazio>}
      </section>

      <section id="relatos" className="mt-10 scroll-mt-24">
        <h2 className="h2 mb-1">Relatos da propriedade inteira</h2>
        <p className="mb-3 text-sm text-muted">Os relatos de um talhão ficam na página daquele talhão.</p>
        {relatos?.length ? <RelatosDoProdutor ocorrencias={relatos} /> : <p className="text-sm text-muted">Nada relatado para a propriedade inteira ainda.</p>}
      </section>
    </Pagina>
  );
}
