import { Pagina, Vazio } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { FormularioRelato } from "./formulario";

export const metadata = { title: "Relatar" };

export default async function Relatar(props: PageProps<"/produtor/relatar">) {
  const { talhao, propriedade } = await props.searchParams;
  const { supabase } = await exigirPerfil("produtor");
  let consulta = supabase.from("talhoes").select("id, nome, propriedade_id, propriedades(nome)").order("criado_em");
  if (typeof propriedade === "string") consulta = consulta.eq("propriedade_id", propriedade);
  const { data: talhoes } = await consulta.returns<{ id: string; nome: string; propriedade_id: string; propriedades: { nome: string } }[]>();
  // Com mais de uma propriedade na lista, o nome dela evita confundir talhões de nomes parecidos
  const variasPropriedades = new Set(talhoes?.map((t) => t.propriedade_id)).size > 1;
  return (
    <Pagina>
      <h1 className="h1 mb-1">Relatar algo da lavoura</h1>
      <p className="mb-6 text-muted">Tire uma foto e conte o que viu. Seu técnico recebe na hora.</p>
      {talhoes?.length ? (
        <FormularioRelato
          talhoes={talhoes.map((t) => ({ id: t.id, nome: variasPropriedades ? `${t.nome} (${t.propriedades.nome})` : t.nome }))}
          inicial={typeof talhao === "string" ? talhao : talhoes[0].id}
        />
      ) : <Vazio titulo="Nenhum talhão cadastrado">Peça ao seu técnico para desenhar os talhões da sua propriedade.</Vazio>}
    </Pagina>
  );
}
