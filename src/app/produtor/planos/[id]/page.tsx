import { notFound } from "next/navigation";
import { CalendarioRotacao } from "@/components/graficos";
import { TarefaProdutor } from "@/components/tarefa";
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
  const pendentes = tarefas?.filter((x) => x.status === "pendente").length ?? 0;

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

          <section>
            <h2 className="h2 mb-3">2. Por quê</h2>
            {plano.resumo_produtor
              ? <p className="max-w-prose whitespace-pre-line rounded-2xl bg-surface p-4">{plano.resumo_produtor}</p>
              : <p className="text-sm text-muted">O técnico não escreveu uma explicação. Se quiser entender melhor, use “Tenho dúvida”.</p>}
            {proposta?.ideia && <p className="mt-2 text-sm text-muted">Sobre essa rotação: {proposta.ideia}</p>}
          </section>

          <section>
            <h2 className="h2 mb-1">3. Quando</h2>
            <p className="mb-3 text-sm text-muted">O que fica plantado em cada mês, nos dois anos da rotação.</p>
            {proposta ? <CalendarioRotacao ocupacao={ocupacao(proposta, regiao)} /> : <p className="text-sm text-muted">Calendário indisponível.</p>}
          </section>

          <section id="tarefas" className="scroll-mt-24">
            <h2 className="h2 mb-1">4. O que você precisa fazer</h2>
            <p className="mb-3 text-sm text-muted">{pendentes ? `${pendentes} tarefa${pendentes > 1 ? "s" : ""} pendente${pendentes > 1 ? "s" : ""}. Marque cada uma quando fizer.` : "Tudo feito por enquanto."}</p>
            {tarefas?.length
              ? <ul className="grid gap-3">{tarefas.map((x) => <TarefaProdutor key={x.id} t={x} />)}</ul>
              : <Vazio titulo="Sem tarefas neste plano" />}
          </section>
        </div>

        <aside className="grid content-start gap-3 lg:sticky lg:top-24">
          <RespostaAoPlano key={plano.respondido_em ?? "sem-resposta"} planoId={plano.id} resposta={plano.resposta} duvida={plano.duvida} respondidoEm={plano.respondido_em}
            respostaTecnico={plano.resposta_tecnico} respostaTecnicoEm={plano.resposta_tecnico_em} nomeTecnico={tecnico?.nome.split(" ")[0] ?? "O técnico"} />
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
