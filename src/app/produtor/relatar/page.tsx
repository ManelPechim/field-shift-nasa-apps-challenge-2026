import { Pagina, Vazio } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { FormularioRelato } from "./formulario";
import { dadosDoRelato } from "./dados";

export const metadata = { title: "Relatar" };

/** Relato a partir do início: primeiro escolhe a propriedade. De dentro da propriedade, use /produtor/propriedades/[id]/relatar. */
export default async function Relatar() {
  const { supabase } = await exigirPerfil("produtor");
  const { propriedades, talhoes } = await dadosDoRelato(supabase);

  return (
    <Pagina>
      <h1 className="h1 mb-1">Relatar algo na propriedade</h1>
      <p className="mb-6 max-w-2xl text-muted">Conte o que viu e, se puder, mande uma foto. O local vai junto e seu técnico recebe na hora.</p>
      {propriedades.length ? (
        <FormularioRelato propriedades={propriedades} talhoes={talhoes} inicial={{}} />
      ) : <Vazio titulo="Nenhuma propriedade cadastrada">Peça ao seu técnico para cadastrar sua propriedade.</Vazio>}
    </Pagina>
  );
}
