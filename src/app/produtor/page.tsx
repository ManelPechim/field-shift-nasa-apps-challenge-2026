import Link from "next/link";
import { Pagina, Selo, Vazio, num } from "@/components/ui";
import { TarefaProdutor } from "@/components/tarefa";
import { exigirPerfil } from "@/lib/supabase/server";
import { dadosNasa } from "@/lib/dados";
import { alertasDoClima } from "@/lib/alertas";
import type { Propriedade, Talhao, Tarefa } from "@/lib/tipos";

export const metadata = { title: "Início" };

export default async function InicioProdutor() {
  const { supabase, perfil } = await exigirPerfil("produtor");
  const { data: props } = await supabase.from("propriedades").select("*").returns<Propriedade[]>();
  if (!props?.length) {
    return (
      <Pagina>
        <h1 className="h1 mb-4">Olá, {perfil.nome.split(" ")[0]}</h1>
        <Vazio titulo="Suas lavouras ainda não aparecem aqui">
          Peça ao seu técnico para cadastrar sua propriedade no Field Shift com o e-mail <b>{perfil.email}</b>. Assim que ele salvar, ela aparece nesta tela.
        </Vazio>
      </Pagina>
    );
  }
  const ids = props.map((p) => p.id);
  const { data: talhoes } = await supabase.from("talhoes").select("*").in("propriedade_id", ids).order("criado_em").returns<Talhao[]>();
  const tIds = (talhoes ?? []).map((t) => t.id);
  const [{ data: tarefas }, { data: planos }] = await Promise.all([
    tIds.length ? supabase.from("tarefas").select("*").in("talhao_id", tIds).eq("status", "pendente").order("criado_em").returns<Tarefa[]>() : Promise.resolve({ data: [] as Tarefa[] }),
    tIds.length ? supabase.from("planos").select("talhao_id, rotacao_nome, safra").in("talhao_id", tIds).eq("status", "publicado") : Promise.resolve({ data: [] }),
  ]);
  // Alertas do primeiro talhão (o clima da NASA POWER tem grade de ~50 km: vale para a propriedade toda)
  const nasa = talhoes?.[0] ? await dadosNasa(supabase, talhoes[0]).catch(() => null) : null;
  const alertas = alertasDoClima(nasa?.clima ?? null);
  const nomeTalhao = (id: string) => talhoes?.find((t) => t.id === id)?.nome;

  return (
    <Pagina>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">{props.map((p) => p.nome).join(" · ")}</span>
          <h1 className="h1">Olá, {perfil.nome.split(" ")[0]}</h1>
        </div>
        <Link href="/produtor/relatar" className="btn">Relatar algo da lavoura</Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <h2 className="h2 mb-3">O que fazer agora</h2>
          {tarefas?.length ? (
            <ul className="grid gap-3">{tarefas.slice(0, 6).map((t) => <TarefaProdutor key={t.id} t={t} talhao={nomeTalhao(t.talhao_id)} />)}</ul>
          ) : (
            <Vazio titulo="Nada pendente">Quando seu técnico publicar o plano da safra, as tarefas aparecem aqui.</Vazio>
          )}
        </section>
        <aside className="grid content-start gap-3">
          <h2 className="h2">Como está o tempo</h2>
          {alertas.length ? alertas.map((a) => (
            <div key={a.titulo} className={`rounded-2xl p-4 ${a.tom === "bom" ? "bg-ok-soft" : "bg-warn-soft"}`}>
              <b className="font-display">{a.titulo}</b>
              <p className="mt-1 text-sm">{a.texto}</p>
            </div>
          )) : <p className="text-sm text-muted">Sem dados recentes.</p>}
          {nasa?.clima?.recente && <span className="fonte">Satélites da NASA (NASA POWER), até {nasa.clima.recente.ate.split("-").reverse().join("/")}</span>}
        </aside>
      </div>

      <section className="mt-10">
        <h2 className="h2 mb-3">Seus talhões</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {talhoes?.map((t) => {
            const pl = planos?.find((p) => p.talhao_id === t.id);
            const pend = tarefas?.filter((x) => x.talhao_id === t.id).length ?? 0;
            return (
              <li key={t.id}>
                <Link href={`/produtor/talhoes/${t.id}`} className="card block h-full p-4 text-ink no-underline hover:border-brand">
                  <b className="font-display text-lg">{t.nome}</b> <span className="text-sm text-muted">· {num(t.area_ha, 1)} ha</span>
                  <p className="mt-1 text-sm">{pl ? `Plano ${pl.safra}: ${pl.rotacao_nome}` : "Plano ainda não publicado"}</p>
                  {pend > 0 && <div className="mt-2"><Selo tom="atencao">{pend} tarefa{pend > 1 ? "s" : ""} pendente{pend > 1 ? "s" : ""}</Selo></div>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Pagina>
  );
}
