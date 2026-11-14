import Link from "next/link";
import { Pagina, Selo, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";

export const metadata = { title: "Propriedades" };

export default async function PainelTecnico() {
  const { supabase, perfil } = await exigirPerfil("tecnico");
  const [{ data: props }, { data: ocorrencias }] = await Promise.all([
    supabase.from("propriedades").select("id, nome, municipio, uf, produtor_nome, produtor_email, talhoes(id, area_ha), visitas(data)").eq("tecnico_id", perfil.id).order("criado_em", { ascending: false }),
    supabase.from("ocorrencias").select("id, tipo, descricao, criado_em, talhao_id, talhoes(nome, propriedades(nome))").eq("status", "nova").order("criado_em", { ascending: false }).limit(10),
  ]);

  return (
    <Pagina>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Olá, {perfil.nome.split(" ")[0] || "técnico"}</span>
          <h1 className="h1">Suas propriedades</h1>
        </div>
        <Link href="/tecnico/propriedades/nova" className="btn">Nova propriedade</Link>
      </div>

      {!!ocorrencias?.length && (
        <section className="mb-8">
          <h2 className="h2 mb-2">Relatos novos dos produtores</h2>
          <ul className="grid gap-2">
            {ocorrencias.map((o) => {
              const t = o.talhoes as unknown as { nome: string; propriedades: { nome: string } } | null;
              return (
                <li key={o.id}>
                  <Link href={`/tecnico/talhoes/${o.talhao_id}?aba=campo`} className="card flex flex-wrap items-center gap-3 p-3 text-ink no-underline hover:border-brand">
                    <Selo tom="atencao">{o.tipo}</Selo>
                    <span className="min-w-0 flex-1 truncate">{o.descricao || "Sem descrição"}</span>
                    <span className="text-sm text-muted">{t?.propriedades.nome} · {t?.nome} · {dataBR(o.criado_em)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!props?.length ? (
        <Vazio titulo="Nenhuma propriedade ainda">
          Comece cadastrando uma propriedade que você atende. Depois desenhe os talhões no mapa.
          <div className="mt-3"><Link href="/tecnico/propriedades/nova" className="btn btn-sm">Cadastrar a primeira</Link></div>
        </Vazio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p) => {
            const talhoes = (p.talhoes ?? []) as { id: string; area_ha: number | null }[];
            const visitas = ((p.visitas ?? []) as { data: string }[]).map((v) => v.data).sort();
            const ha = talhoes.reduce((a, t) => a + (t.area_ha ?? 0), 0);
            return (
              <li key={p.id}>
                <Link href={`/tecnico/propriedades/${p.id}`} className="card block h-full p-4 text-ink no-underline hover:border-brand">
                  <b className="block font-display text-lg">{p.nome}</b>
                  <span className="text-sm text-muted">{[p.municipio, p.uf].filter(Boolean).join(" - ") || "Município não informado"}</span>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-muted">Talhões</dt><dd className="font-semibold">{talhoes.length}</dd></div>
                    <div><dt className="text-muted">Área</dt><dd className="font-semibold">{num(ha, 1)} ha</dd></div>
                    <div><dt className="text-muted">Última visita</dt><dd className="font-semibold">{dataBR(visitas[visitas.length - 1])}</dd></div>
                  </dl>
                  <p className="mt-3 text-sm">{p.produtor_nome ?? "Produtor não informado"} {p.produtor_email ? <span className="text-muted">· {p.produtor_email}</span> : <Selo tom="atencao">sem e-mail</Selo>}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Pagina>
  );
}
