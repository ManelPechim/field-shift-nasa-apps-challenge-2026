import { notFound } from "next/navigation";
import { Trilha } from "@/components/trilha";
import { Pagina } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { FormularioRelato } from "@/app/produtor/relatar/formulario";
import { dadosDoRelato } from "@/app/produtor/relatar/dados";

export const metadata = { title: "Relatar" };

/** Relato de dentro da propriedade: ela já está escolhida. Vindo de um talhão (?talhao=), ele também. */
export default async function RelatarNaPropriedade(props: PageProps<"/produtor/propriedades/[id]/relatar">) {
  const { id } = await props.params;
  const { talhao } = await props.searchParams;
  const { supabase } = await exigirPerfil("produtor");
  const { propriedades, talhoes } = await dadosDoRelato(supabase, id);
  const p = propriedades[0];
  if (!p) notFound();
  const t = talhoes.find((x) => x.id === talhao);

  return (
    <Pagina>
      <Trilha passos={[
        { rotulo: "Suas propriedades", href: "/produtor" },
        { rotulo: p.nome, tipo: "Propriedade", href: `/produtor/propriedades/${p.id}` },
        ...(t ? [{ rotulo: t.nome, tipo: "Talhão", href: `/produtor/talhoes/${t.id}` }] : []),
        { rotulo: "Relatar" },
      ]} />
      <h1 className="h1 mt-2 mb-1">Relatar algo {t ? "neste talhão" : "nesta propriedade"}</h1>
      <p className="mb-6 max-w-2xl text-muted">
        {p.nome}{p.local && ` · ${p.local}`}. Conte o que viu e, se puder, mande uma foto. O local vai junto e seu técnico recebe na hora.
      </p>
      <FormularioRelato propriedades={propriedades} talhoes={talhoes} inicial={{ propriedade: p.id, talhao: t?.id }} propriedadeFixa />
    </Pagina>
  );
}
