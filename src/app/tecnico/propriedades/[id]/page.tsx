import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagina, Selo, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { ROTACOES, nomeRotacao, rotacaoPorId } from "@/lib/agro/culturas";
import { criarTalhao } from "@/app/tecnico/actions";
import type { Propriedade, Talhao, Visita } from "@/lib/tipos";
import { NovoTalhao } from "./novo-talhao";

export default async function PaginaPropriedade(props: PageProps<"/tecnico/propriedades/[id]">) {
  const { id } = await props.params;
  const { supabase } = await exigirPerfil("tecnico");
  const [{ data: p }, { data: talhoes }, { data: visitas }] = await Promise.all([
    supabase.from("propriedades").select("*, produtores(id, nome)").eq("id", id).maybeSingle<Propriedade & { produtores: { id: string; nome: string } }>(),
    supabase.from("talhoes").select("*").eq("propriedade_id", id).order("criado_em").returns<Talhao[]>(),
    supabase.from("visitas").select("*").eq("propriedade_id", id).order("data", { ascending: false }).returns<Visita[]>(),
  ]);
  if (!p) notFound();
  const haTalhoes = (talhoes ?? []).reduce((a, t) => a + (t.area_ha ?? 0), 0);

  return (
    <Pagina>
      <nav className="text-sm" aria-label="Caminho">
        <Link href="/tecnico">Clientes</Link> <span className="text-muted">›</span> <Link href={`/tecnico/produtores/${p.produtores.id}`}>{p.produtores.nome}</Link>
      </nav>
      <div className="mt-2 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">{[p.municipio, p.uf].filter(Boolean).join(" - ") || "Propriedade"}{p.car_codigo ? ` · CAR ${p.car_codigo}` : ""}</span>
          <h1 className="h1">{p.nome}</h1>
          <p className="text-muted">de {p.produtores.nome}</p>
        </div>
        <Link href={`/tecnico/propriedades/${p.id}/visita`} className="btn">Registrar visita técnica</Link>
      </div>

      <dl className="mb-8 grid gap-2 text-sm sm:grid-cols-4">
        <div className="card p-3"><dt className="text-muted">Endereço</dt><dd className="font-semibold">{p.endereco || "—"}</dd></div>
        <div className="card p-3"><dt className="text-muted">Área da propriedade</dt><dd className="font-semibold">{p.area_ha ? `${num(p.area_ha, 1)} ha` : "Limite não desenhado"}</dd></div>
        <div className="card p-3"><dt className="text-muted">Talhões</dt><dd className="font-semibold">{talhoes?.length ?? 0}{haTalhoes ? ` · ${num(haTalhoes, 1)} ha` : ""}</dd></div>
        <div className="card p-3">
          <dt className="text-muted">Local</dt>
          <dd className="font-semibold"><a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noreferrer">Como chegar</a></dd>
        </div>
      </dl>

      <section className="mb-10">
        <h2 className="h2 mb-1">Talhões</h2>
        <p className="mb-3 text-sm text-muted">Desenhe cada talhão sobre a imagem. A linha branca tracejada é o limite da propriedade; o marcador vermelho, o local cadastrado. Toque num talhão para abrir.</p>
        <NovoTalhao
          propriedadeId={p.id}
          talhoes={(talhoes ?? []).map((t) => ({ id: t.id, nome: t.nome, geojson: t.geojson }))}
          limite={p.limite}
          ponto={[p.lon, p.lat]}
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
    </Pagina>
  );
}
