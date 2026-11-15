import { notFound } from "next/navigation";
import { CalendarioRotacao } from "@/components/graficos";
import { Trilha } from "@/components/trilha";
import { Pagina, Vazio, dataBR } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { nomeRotacao, regiaoDe, rotacaoPorId } from "@/lib/agro/culturas";
import { ocupacao } from "@/lib/agro/rotacao";
import { formatarCelular, linkWhatsApp } from "@/lib/contato";
import { tecnicoDoProdutor } from "@/lib/tecnico-do-produtor";
import type { Plano, Talhao, Tarefa } from "@/lib/tipos";
import { MarcarVisto, RespostaAoPlano } from "./resposta";

export const metadata = { title: "Plano da safra" };

/** O plano publicado, contado na ordem em que o produtor pensa: o que muda, por quê, quando e o que fazer. */
export default async function PlanoDoProdutor(props: PageProps<"/produtor/planos/[id]">) {
  const { id } = await props.params;
  const { supabase, perfil } = await exigirPerfil("produtor");
  // A política só mostra ao produtor planos publicados
  const { data: plano } = await supabase.from("planos").select("*").eq("id", id).maybeSingle<Plano>();
  if (!plano) notFound();
  const [{ data: t }, { data: tarefas }, tecnico] = await Promise.all([
    supabase.from("talhoes").select("*, propriedades(id, nome)").eq("id", plano.talhao_id).single<Talhao & { propriedades: { id: string; nome: string } }>(),
    supabase.from("tarefas").select("*").eq("plano_id", plano.id).order("criado_em").returns<Tarefa[]>(),
    tecnicoDoProdutor(supabase, perfil.id),
  ]);
  if (!t) notFound();
  const hoje = rotacaoPorId(t.rotacao_atual);
  const proposta = rotacaoPorId(plano.rotacao_id);
  const regiao = regiaoDe(t.centroide_lat ?? 0);
  // Resumo das opções que o técnico comparou, guardado no plano quando ele foi montado
  const dados = plano.dados as { opcoes?: { letra: string; id: string; nome: string; atual: boolean; combina: number; porque: string }[]; escolhida?: string; cenario?: string };
  const opcoes = dados.opcoes ?? [];

  return (
    <Pagina>
      <MarcarVisto planoId={plano.id} />
      <Trilha passos={[
        { rotulo: "Suas propriedades", href: "/produtor" },
        { rotulo: t.propriedades.nome, tipo: "Propriedade", href: `/produtor/propriedades/${t.propriedades.id}` },
        { rotulo: t.nome, tipo: "Talhão", href: `/produtor/talhoes/${t.id}` },
        { rotulo: `Plano ${plano.safra}` },
      ]} />

      <header className="mt-2 mb-8">
        <span className="eyebrow">Plano da safra {plano.safra} · publicado em {dataBR(plano.publicado_em)}</span>
        <h1 className="h1 flex items-center gap-2.5">
          <span className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: t.cor }} aria-hidden="true" />
          {t.nome}
        </h1>
        {tecnico && <p className="text-muted">Preparado por {tecnico.nome}{tecnico.instituicao ? ` · ${tecnico.instituicao}` : ""}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-8">
          <section>
            <h2 className="h2 mb-3">1. O que muda</h2>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="rounded-2xl bg-surface-2 p-4">
                <span className="eyebrow">Hoje</span>
                <b className="block font-display text-lg leading-tight">{hoje ? nomeRotacao(hoje) : "Não informado"}</b>
              </div>
              <span className="text-center text-2xl text-muted" aria-hidden="true">→</span>
              <div className="rounded-2xl border-2 border-brand bg-brand-soft p-4">
                <span className="eyebrow">Proposta</span>
                <b className="block font-display text-lg leading-tight">{plano.rotacao_nome}</b>
              </div>
            </div>
            {hoje && proposta && hoje.id === proposta.id && <p className="mt-2 text-sm text-muted">O técnico recomenda manter o que você já faz.</p>}
          </section>

          {opcoes.length > 1 && (
            <section>
              <h2 className="h2 mb-1">2. O que mais foi comparado</h2>
              <p className="mb-3 text-sm text-muted">O técnico comparou estas opções para o seu talhão, pelo clima de 20 anos da NASA, pelo relevo, pelo solo e pelo que você quer. A nota vai de 0 a 100 e mostra o quanto cada uma combina com as suas prioridades.</p>
              <ul className="grid gap-2">
                {opcoes.map((o) => {
                  const escolhida = o.letra === dados.escolhida;
                  return (
                    <li key={o.id} className={`card grid grid-cols-[2.2rem_minmax(0,1fr)_auto] items-start gap-3 p-3 ${escolhida ? "border-brand ring-1 ring-brand" : ""}`}>
                      <span className={`grid size-8 place-items-center rounded-lg font-display font-extrabold ${escolhida ? "bg-brand text-brand-ink" : "bg-surface-2"}`}>{o.letra}</span>
                      <div className="min-w-0">
                        <b className="leading-tight">{o.nome}</b>
                        <span className="text-sm text-muted"> · {o.atual ? "o que você faz hoje" : escolhida ? "a escolhida" : "alternativa"}</span>
                        <p className="text-sm text-muted">{o.porque}</p>
                      </div>
                      <b className={`font-display text-xl tabular-nums ${escolhida ? "text-brand" : ""}`}>{o.combina}</b>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h2 className="h2 mb-3">{opcoes.length > 1 ? "3" : "2"}. Por quê</h2>
            {plano.resumo_produtor
              ? <p className="max-w-prose whitespace-pre-line rounded-2xl bg-surface p-4">{plano.resumo_produtor}</p>
              : <p className="text-sm text-muted">O técnico não escreveu uma explicação. Se quiser entender melhor, use “Tenho dúvida”.</p>}
            {proposta?.ideia && <p className="mt-2 text-sm text-muted">Sobre essa rotação: {proposta.ideia}</p>}
          </section>

          <section>
            <h2 className="h2 mb-1">{opcoes.length > 1 ? "4" : "3"}. Quando</h2>
            <p className="mb-3 text-sm text-muted">O que fica plantado em cada mês, nos dois anos da rotação.</p>
            {proposta ? <CalendarioRotacao ocupacao={ocupacao(proposta, regiao)} /> : <p className="text-sm text-muted">Calendário indisponível.</p>}
          </section>

          <section id="tarefas" className="scroll-mt-24">
            <h2 className="h2 mb-1">{opcoes.length > 1 ? "5" : "4"}. O que você precisa fazer</h2>
            <p className="mb-3 text-sm text-muted">Na ordem do plano: primeiro o que prepara o solo, depois os plantios.</p>
            {tarefas?.length ? (
              <ol className="grid gap-2">
                {tarefas.map((x, i) => (
                  <li key={x.id} className="card grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 p-3">
                    <span className="font-display text-lg font-bold text-brand">{i + 1}</span>
                    <div>
                      <b className="leading-tight">{x.titulo}</b>
                      {x.quando && <span className="text-sm text-muted"> · {x.quando}</span>}
                      {x.descricao && <p className="text-sm text-muted">{x.descricao}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Vazio titulo="Sem tarefas neste plano" />}
          </section>
        </div>

        <aside className="grid content-start gap-3 lg:sticky lg:top-24">
          <RespostaAoPlano key={plano.respondido_em ?? "sem-resposta"} planoId={plano.id} resposta={plano.resposta} duvida={plano.duvida} respondidoEm={plano.respondido_em} />
          {tecnico?.telefone && (
            <a href={linkWhatsApp(tecnico.telefone, `Olá, ${tecnico.nome.split(" ")[0]}! Sobre o plano ${plano.safra} do ${t.nome}: `)} target="_blank" rel="noreferrer" className="btn-ghost no-underline">
              Falar com {tecnico.nome.split(" ")[0]} no WhatsApp · {formatarCelular(tecnico.telefone)}
            </a>
          )}
        </aside>
      </div>
    </Pagina>
  );
}
