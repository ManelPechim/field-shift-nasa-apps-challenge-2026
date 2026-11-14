import { Pagina, Vazio } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { FormularioRelato } from "./formulario";

export const metadata = { title: "Relatar" };

export default async function Relatar(props: PageProps<"/produtor/relatar">) {
  const { talhao } = await props.searchParams;
  const { supabase } = await exigirPerfil("produtor");
  const { data: talhoes } = await supabase.from("talhoes").select("id, nome, propriedades(nome)").order("criado_em");
  return (
    <Pagina>
      <h1 className="h1 mb-1">Relatar algo da lavoura</h1>
      <p className="mb-6 text-muted">Tire uma foto e conte o que viu. Seu técnico recebe na hora.</p>
      {talhoes?.length ? (
        <FormularioRelato talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nome }))} inicial={typeof talhao === "string" ? talhao : talhoes[0].id} />
      ) : <Vazio titulo="Nenhum talhão cadastrado">Peça ao seu técnico para desenhar os talhões da sua propriedade.</Vazio>}
    </Pagina>
  );
}
