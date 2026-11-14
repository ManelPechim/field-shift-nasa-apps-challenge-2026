import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagina, Selo, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { ROTACOES, nomeRotacao, rotacaoPorId } from "@/lib/agro/culturas";
import { criarTalhao, editarProdutor } from "@/app/tecnico/actions";
import type { Propriedade, Talhao, Visita } from "@/lib/tipos";
import { NovoTalhao } from "./novo-talhao";

export default async function PaginaPropriedade(props: PageProps<"/tecnico/propriedades/[id]">) {
  const { id } = await props.params;
  const { supabase } = await exigirPerfil("tecnico");
  const [{ data: p }, { data: talhoes }, { data: visitas }] = await Promise.all([
    supabase.from("propriedades").select("*").eq("id", id).maybeSingle<Propriedade>(),
    supabase.from("talhoes").select("*").eq("propriedade_id", id).order("criado_em").returns<Talhao[]>(),
    supabase.from("visitas").select("*").eq("propriedade_id", id).order("data", { ascending: false }).returns<Visita[]>(),
  ]);
  if (!p) notFound();
  const { data: contaProdutor } = p.produtor_email
    ? await supabase.from("perfis").select("id").ilike("email", p.produtor_email).maybeSingle()
    : { data: null };

  return (
    <Pagina>
      <Link href="/tecnico" className="text-sm">← Propriedades</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">{[p.municipio, p.uf].filter(Boolean).join(" - ") || "Propriedade"}{p.car_codigo ? ` · CAR ${p.car_codigo}` : ""}</span>
          <h1 className="h1">{p.nome}</h1>
        </div>
        <Link href={`/tecnico/propriedades/${p.id}/visita`} className="btn">Registrar visita técnica</Link>
      </div>

      <section className="mb-10">
        <h2 className="h2 mb-1">Talhões</h2>
        <p className="mb-3 text-sm text-muted">Imagem de satélite de alta resolução para desenhar. Troque a camada para ver dados da NASA sobre a região. Toque num talhão para abrir.</p>
        <NovoTalhao
          propriedadeId={p.id}
          talhoes={(talhoes ?? []).map((t) => ({ id: t.id, nome: t.nome, geojson: t.geojson }))}
          rotacoes={ROTACOES.filter((r) => r.atual).map((r) => ({ id: r.id, nome: nomeRotacao(r), regiao: r.regiao }))}
          acao={criarTalhao}
        />
        {!!talhoes?.length && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {talhoes.map((t) => (
              <li key={t.id}>
                <Link href={`/tecnico/talhoes/${t.id}`} className="card block p-3 text-ink no-underline hover:border-brand">
                  <b className="font-display">{t.nome}</b> <span className="text-sm text-muted">· {num(t.area_ha, 1)} ha</span>
                  <p className="text-sm text-muted">{rotacaoPorId(t.rotacao_atual) ? nomeRotacao(rotacaoPorId(t.rotacao_atual)!) : "Rotação atual não informada"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="h2 mb-3">Visitas técnicas</h2>
          {!visitas?.length ? (
            <Vazio titulo="Nenhuma visita registrada">A visita é onde entra o que o satélite não vê: alagamento, erosão, compactação, manejo e o que o produtor quer.</Vazio>
          ) : (
            <ul className="grid gap-2">
              {visitas.map((v) => (
                <li key={v.id} className="card p-3">
                  <div className="flex flex-wrap items-center gap-2"><b>{dataBR(v.data)}</b>{v.objetivo && <span className="text-muted">· {v.objetivo}</span>}{v.talhao_id && <Selo tom="info">{talhoes?.find((t) => t.id === v.talhao_id)?.nome}</Selo>}</div>
                  {v.observacoes && <p className="mt-1 text-sm">{v.observacoes}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="h2 mb-3">Acesso do produtor</h2>
          <form action={editarProdutor} className="card grid gap-3 p-4">
            <input type="hidden" name="propriedade_id" value={p.id} />
            <div><label className="label" htmlFor="produtor_nome">Nome</label><input className="input" id="produtor_nome" name="produtor_nome" defaultValue={p.produtor_nome ?? ""} /></div>
            <div><label className="label" htmlFor="produtor_email">E-mail</label><input className="input" id="produtor_email" name="produtor_email" type="email" defaultValue={p.produtor_email ?? ""} /></div>
            <div><label className="label" htmlFor="produtor_telefone">Celular</label><input className="input" id="produtor_telefone" name="produtor_telefone" defaultValue={p.produtor_telefone ?? ""} /></div>
            <p className="text-sm">
              {!p.produtor_email ? <Selo tom="atencao">Sem e-mail: o produtor não consegue ver nada</Selo>
                : contaProdutor ? <Selo tom="bom">O produtor já tem conta e vê esta propriedade</Selo>
                : <Selo tom="info">Peça para o produtor criar a conta com este e-mail</Selo>}
            </p>
            <div><button className="btn-ghost btn-sm">Salvar</button></div>
          </form>
        </section>
      </div>
    </Pagina>
  );
}
