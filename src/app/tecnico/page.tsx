import Link from "next/link";
import { Pagina, Selo, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { formatarCelular } from "@/lib/contato";

export const metadata = { title: "Clientes" };

interface Linha {
  id: string; nome: string; telefone: string;
  propriedades: { id: string; municipio: string | null; uf: string | null; area_ha: number | null; talhoes: { id: string }[]; visitas: { data: string }[] }[];
}

export default async function PainelTecnico(props: PageProps<"/tecnico">) {
  const { q } = await props.searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const { supabase, perfil } = await exigirPerfil("tecnico");
  let consulta = supabase
    .from("produtores")
    .select("id, nome, telefone, propriedades(id, municipio, uf, area_ha, talhoes(id), visitas(data))")
    .eq("tecnico_id", perfil.id)
    .order("nome");
  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);
  const [{ data: clientes }, { data: ocorrencias }, { data: duvidas }] = await Promise.all([
    consulta.returns<Linha[]>(),
    supabase.from("ocorrencias").select("id, tipo, descricao, criado_em, talhao_id, propriedade_id, talhoes(nome), propriedades(nome, produtores(nome))").eq("status", "nova").order("criado_em", { ascending: false }).limit(10),
    supabase.from("planos").select("id, safra, duvida, respondido_em, talhao_id, talhoes(nome, propriedades(nome, produtores(nome)))").eq("resposta", "duvida").is("resposta_tecnico", null).order("respondido_em", { ascending: false }).limit(10),
  ]);

  return (
    <Pagina>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Olá, {perfil.nome.split(" ")[0] || "técnico"}</span>
          <h1 className="h1">Seus clientes</h1>
        </div>
        <Link href="/tecnico/produtores/novo" className="btn">Novo cliente</Link>
      </div>

      {!!duvidas?.length && (
        <section className="mb-8">
          <h2 className="h2 mb-2">Dúvidas sobre planos para responder</h2>
          <ul className="grid gap-2">
            {duvidas.map((d) => {
              const t = d.talhoes as unknown as { nome: string; propriedades: { nome: string; produtores: { nome: string } } } | null;
              return (
                <li key={d.id}>
                  <Link href={`/tecnico/talhoes/${d.talhao_id}?aba=plano`} className="card flex flex-wrap items-center gap-3 p-3 text-ink no-underline hover:border-brand">
                    <Selo tom="atencao">Plano {d.safra}</Selo>
                    <span className="min-w-0 flex-1 truncate">“{d.duvida}”</span>
                    <span className="text-sm text-muted">{t?.propriedades.produtores.nome} · {t?.propriedades.nome} · {t?.nome} · {dataBR(d.respondido_em)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!!ocorrencias?.length && (
        <section className="mb-8">
          <h2 className="h2 mb-2">Relatos novos dos produtores</h2>
          <ul className="grid gap-2">
            {ocorrencias.map((o) => {
              const t = o.talhoes as unknown as { nome: string } | null;
              const p = o.propriedades as unknown as { nome: string; produtores: { nome: string } } | null;
              return (
                <li key={o.id}>
                  <Link href={o.talhao_id ? `/tecnico/talhoes/${o.talhao_id}?aba=campo` : `/tecnico/propriedades/${o.propriedade_id}#relatos`} className="card flex flex-wrap items-center gap-3 p-3 text-ink no-underline hover:border-brand">
                    <Selo tom="atencao">{o.tipo}</Selo>
                    <span className="min-w-0 flex-1 truncate">{o.descricao || "Sem descrição"}</span>
                    <span className="text-sm text-muted">{p?.produtores.nome} · {p?.nome} · {t?.nome ?? "propriedade inteira"} · {dataBR(o.criado_em)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(clientes?.length || busca) ? (
        <form method="get" className="mb-4 flex max-w-md gap-2">
          <input className="input" name="q" defaultValue={busca} placeholder="Buscar cliente pelo nome" aria-label="Buscar cliente" />
          <button className="btn-ghost btn-sm">Buscar</button>
        </form>
      ) : null}

      {!clientes?.length ? (
        <Vazio titulo={busca ? "Nenhum cliente com esse nome" : "Nenhum cliente ainda"}>
          {!busca && <>Cadastre o primeiro produtor que você atende. Você cria o acesso dele ao app e depois cadastra as propriedades.</>}
          {!busca && <div className="mt-3"><Link href="/tecnico/produtores/novo" className="btn btn-sm">Cadastrar o primeiro cliente</Link></div>}
        </Vazio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => {
            const ha = c.propriedades.reduce((a, p) => a + (p.area_ha ?? 0), 0);
            const talhoes = c.propriedades.reduce((a, p) => a + p.talhoes.length, 0);
            const visitas = c.propriedades.flatMap((p) => p.visitas.map((v) => v.data)).sort();
            const municipios = [...new Set(c.propriedades.map((p) => [p.municipio, p.uf].filter(Boolean).join(" - ")).filter(Boolean))];
            return (
              <li key={c.id}>
                <Link href={`/tecnico/produtores/${c.id}`} className="card block h-full p-4 text-ink no-underline hover:border-brand">
                  <b className="block font-display text-lg">{c.nome}</b>
                  <span className="text-sm text-muted">{municipios.join(" · ") || "Sem propriedade cadastrada"}</span>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-muted">Propriedades</dt><dd className="font-semibold">{c.propriedades.length}</dd></div>
                    <div><dt className="text-muted">Talhões</dt><dd className="font-semibold">{talhoes}{ha ? ` · ${num(ha, 0)} ha` : ""}</dd></div>
                    <div><dt className="text-muted">Última visita</dt><dd className="font-semibold">{dataBR(visitas[visitas.length - 1])}</dd></div>
                  </dl>
                  <p className="mt-2 text-sm text-muted">{formatarCelular(c.telefone)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Pagina>
  );
}
