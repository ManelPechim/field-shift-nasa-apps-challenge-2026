import Link from "next/link";
import { redirect } from "next/navigation";
import { Pagina, Selo, Vazio, num } from "@/components/ui";
import { TarefaProdutor } from "@/components/tarefa";
import { exigirPerfil } from "@/lib/supabase/server";
import { formatarCelular, linkWhatsApp } from "@/lib/contato";
import { tecnicoDoProdutor } from "@/lib/tecnico-do-produtor";
import type { Propriedade, Talhao, Tarefa } from "@/lib/tipos";

export const metadata = { title: "Início" };

export default async function InicioProdutor() {
  const { supabase, perfil } = await exigirPerfil("produtor");
  const [{ data: props }, tecnico] = await Promise.all([
    supabase.from("propriedades").select("*").order("criado_em").returns<Propriedade[]>(),
    tecnicoDoProdutor(supabase, perfil.id),
  ]);
  // Com uma propriedade só, a lista não ajuda: vai direto para ela (lá estão tarefas, tempo e o contato do técnico)
  if (props?.length === 1) redirect(`/produtor/propriedades/${props[0].id}`);
  const primeiroNome = perfil.nome.split(" ")[0];

  const ids = (props ?? []).map((p) => p.id);
  const { data: talhoes } = ids.length
    ? await supabase.from("talhoes").select("*").in("propriedade_id", ids).order("criado_em").returns<Talhao[]>()
    : { data: [] as Talhao[] };
  const tIds = (talhoes ?? []).map((t) => t.id);
  const [{ data: tarefas }, { data: planosNovos }] = tIds.length
    ? await Promise.all([
      supabase.from("tarefas").select("*").in("talhao_id", tIds).eq("status", "pendente").order("criado_em").returns<Tarefa[]>(),
      // Planos sem resposta do produtor ou com dúvida já respondida: viram selo no card da propriedade
      supabase.from("planos").select("talhao_id").in("talhao_id", tIds).eq("status", "publicado").or("resposta.is.null,and(resposta.eq.duvida,resposta_tecnico.not.is.null)").returns<{ talhao_id: string }[]>(),
    ])
    : [{ data: [] as Tarefa[] }, { data: [] as { talhao_id: string }[] }];
  const talhoesDe = (pid: string) => talhoes?.filter((t) => t.propriedade_id === pid) ?? [];
  const planosNovosDe = (pid: string) => { const ts = new Set(talhoesDe(pid).map((t) => t.id)); return planosNovos?.filter((x) => ts.has(x.talhao_id)).length ?? 0; };
  const pendentesDe = (pid: string) => { const ts = new Set(talhoesDe(pid).map((t) => t.id)); return tarefas?.filter((x) => ts.has(x.talhao_id)).length ?? 0; };
  const rotuloTalhao = (id: string) => {
    const t = talhoes?.find((x) => x.id === id);
    if (!t) return undefined;
    return (props?.length ?? 0) > 1 ? `${t.nome} (${props?.find((p) => p.id === t.propriedade_id)?.nome})` : t.nome;
  };

  return (
    <Pagina>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Área do produtor</span>
          <h1 className="h1">Olá, {primeiroNome}</h1>
        </div>
        {!!props?.length && <Link href="/produtor/relatar" className="btn">Relatar algo na propriedade</Link>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <h2 className="h2 mb-3">Suas propriedades {!!props?.length && <span className="font-normal text-muted">({props.length})</span>}</h2>
          {!props?.length ? (
            <Vazio titulo="Suas propriedades ainda não aparecem aqui">
              Seu técnico ainda não cadastrou suas propriedades. Assim que ele marcar a propriedade no mapa, ela aparece nesta tela.
            </Vazio>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {props.map((p) => {
                const ts = talhoesDe(p.id);
                const soma = ts.reduce((a, t) => a + (t.area_ha ?? 0), 0);
                const pend = pendentesDe(p.id);
                return (
                  <li key={p.id}>
                    <Link href={`/produtor/propriedades/${p.id}`} className="card grid h-full content-between gap-3 p-4 text-ink no-underline hover:border-brand">
                      <div>
                        <b className="block font-display text-lg leading-tight">{p.nome}</b>
                        <span className="text-sm text-muted">{[p.municipio, p.uf].filter(Boolean).join(" - ") || "Local não informado"}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div><dt className="eyebrow">Área</dt><dd className="font-semibold">{p.area_ha != null ? `${num(p.area_ha, 1)} ha` : <span className="font-normal text-muted">Sem limite desenhado</span>}</dd></div>
                        <div><dt className="eyebrow">Talhões</dt><dd className="font-semibold">{ts.length}{ts.length > 0 && <span className="font-normal text-muted"> · {num(soma, 1)} ha</span>}</dd></div>
                      </dl>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex flex-wrap gap-1.5">
                          {planosNovosDe(p.id) > 0 && <Selo tom="info">Plano para ver</Selo>}
                          {pend > 0 ? <Selo tom="atencao">{pend} tarefa{pend > 1 ? "s" : ""} pendente{pend > 1 ? "s" : ""}</Selo> : <Selo tom="bom">Nada pendente</Selo>}
                        </span>
                        <span className="text-sm font-semibold text-brand">Abrir propriedade →</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="grid content-start gap-3">
          <h2 className="h2">Seu técnico</h2>
          {tecnico ? (
            <div className="card grid gap-2 p-4">
              <div>
                <b className="block font-display text-lg leading-tight">{tecnico.nome}</b>
                {tecnico.instituicao && <span className="text-sm text-muted">{tecnico.instituicao}</span>}
              </div>
              {tecnico.telefone ? (
                <>
                  <span className="text-sm">{formatarCelular(tecnico.telefone)}</span>
                  <a href={linkWhatsApp(tecnico.telefone, `Olá, ${tecnico.nome.split(" ")[0]}! Aqui é ${primeiroNome}, pelo Field Shift.`)} target="_blank" rel="noreferrer" className="btn btn-sm no-underline">Conversar no WhatsApp</a>
                </>
              ) : <span className="text-sm text-muted">Celular não cadastrado.</span>}
              <p className="text-xs text-muted">Para algo que aconteceu na lavoura, use “Relatar”: o relato fica guardado com o local, na propriedade ou no talhão.</p>
            </div>
          ) : <p className="text-sm text-muted">Nenhum técnico ligado à sua conta.</p>}
        </aside>
      </div>

      {!!props?.length && (
        <section id="tarefas" className="mt-10 scroll-mt-24">
          <h2 className="h2 mb-3">O que fazer agora</h2>
          {tarefas?.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">{tarefas.slice(0, 6).map((t) => <TarefaProdutor key={t.id} t={t} talhao={rotuloTalhao(t.talhao_id)} />)}</ul>
          ) : (
            <Vazio titulo="Nada pendente">Quando seu técnico publicar o plano da safra, as tarefas aparecem aqui.</Vazio>
          )}
        </section>
      )}
    </Pagina>
  );
}
