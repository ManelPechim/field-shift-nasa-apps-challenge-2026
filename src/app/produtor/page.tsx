import Link from "next/link";
import { Pagina, Selo, Vazio, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { formatarCelular, linkWhatsApp } from "@/lib/contato";
import { tecnicoDoProdutor } from "@/lib/tecnico-do-produtor";
import type { Propriedade, Talhao } from "@/lib/tipos";

export const metadata = { title: "Suas propriedades" };

export default async function InicioProdutor() {
  const { supabase, perfil } = await exigirPerfil("produtor");
  const [{ data: props }, tecnico] = await Promise.all([
    supabase.from("propriedades").select("*").order("criado_em").returns<Propriedade[]>(),
    tecnicoDoProdutor(supabase, perfil.id),
  ]);
  const primeiroNome = perfil.nome.split(" ")[0];

  const ids = (props ?? []).map((p) => p.id);
  const { data: talhoes } = ids.length
    ? await supabase.from("talhoes").select("*").in("propriedade_id", ids).order("criado_em").returns<Talhao[]>()
    : { data: [] as Talhao[] };
  const tIds = (talhoes ?? []).map((t) => t.id);
  // Planos publicados que o produtor ainda não respondeu: viram selo no card da propriedade
  const { data: planosNovos } = tIds.length
    ? await supabase.from("planos").select("talhao_id").in("talhao_id", tIds).eq("status", "publicado").is("resposta", null).returns<{ talhao_id: string }[]>()
    : { data: [] as { talhao_id: string }[] };
  const talhoesDe = (pid: string) => talhoes?.filter((t) => t.propriedade_id === pid) ?? [];
  const planosNovosDe = (pid: string) => { const ts = new Set(talhoesDe(pid).map((t) => t.id)); return planosNovos?.filter((x) => ts.has(x.talhao_id)).length ?? 0; };

  return (
    <Pagina>
      <div className="mb-6">
        <span className="eyebrow">Área do produtor</span>
        <h1 className="h1">Olá, {primeiroNome}</h1>
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
                const novos = planosNovosDe(p.id);
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
                        {novos > 0 ? <Selo tom="info">Plano novo para ver</Selo> : <span />}
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
                  <a href={linkWhatsApp(tecnico.telefone, `Olá, ${tecnico.nome.split(" ")[0]}! Aqui é ${primeiroNome}, pela Terrana.`)} target="_blank" rel="noreferrer" className="btn btn-sm no-underline">Conversar no WhatsApp</a>
                </>
              ) : <span className="text-sm text-muted">Celular não cadastrado.</span>}
            </div>
          ) : <p className="text-sm text-muted">Nenhum técnico ligado à sua conta.</p>}
        </aside>
      </div>
    </Pagina>
  );
}
