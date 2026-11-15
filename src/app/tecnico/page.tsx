import Link from "next/link";
import { Pagina, Selo, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { formatarCelular } from "@/lib/contato";

export const metadata = { title: "Clientes" };

interface Linha {
  id: string; nome: string; telefone: string;
  propriedades: { id: string; municipio: string | null; uf: string | null; area_ha: number | null; talhoes: { id: string; planos: { status: string; resposta: string | null }[] }[]; visitas: { data: string }[] }[];
}

/** Situação dos planos do cliente, do que mais pede ação do técnico para o que menos pede. */
function situacaoDosPlanos(c: Linha): [tom: "atencao" | "info" | "bom" | "neutro", texto: string] | null {
  const talhoes = c.propriedades.flatMap((p) => p.talhoes);
  if (!talhoes.length) return null;
  const publicados = talhoes.flatMap((t) => t.planos.filter((pl) => pl.status === "publicado"));
  const semPlano = talhoes.filter((t) => !t.planos.length).length;
  if (publicados.some((pl) => pl.resposta === "duvida")) return ["atencao", "Dúvida sobre o plano"];
  if (semPlano) return ["atencao", semPlano === talhoes.length ? "Esperando o plano" : `${semPlano} ${semPlano > 1 ? "talhões" : "talhão"} sem plano`];
  if (talhoes.some((t) => t.planos.length && t.planos.every((pl) => pl.status !== "publicado"))) return ["neutro", "Plano em rascunho"];
  if (publicados.some((pl) => !pl.resposta)) return ["info", "Plano publicado, sem resposta"];
  return ["bom", "Planos combinados"];
}

export default async function PainelTecnico(props: PageProps<"/tecnico">) {
  const { q } = await props.searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const { supabase, perfil } = await exigirPerfil("tecnico");
  let consulta = supabase
    .from("produtores")
    .select("id, nome, telefone, propriedades(id, municipio, uf, area_ha, talhoes(id, planos(status, resposta)), visitas(data))")
    .eq("tecnico_id", perfil.id)
    .order("nome");
  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);
  const { data: clientes } = await consulta.returns<Linha[]>();

  return (
    <Pagina>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Olá, {perfil.nome.split(" ")[0] || "técnico"}</span>
          <h1 className="h1">Seus clientes</h1>
        </div>
        <Link href="/tecnico/produtores/novo" className="btn">Novo cliente</Link>
      </div>

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
            const situacao = situacaoDosPlanos(c);
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
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted">{formatarCelular(c.telefone)}</span>
                    {situacao && <Selo tom={situacao[0]}>{situacao[1]}</Selo>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Pagina>
  );
}
