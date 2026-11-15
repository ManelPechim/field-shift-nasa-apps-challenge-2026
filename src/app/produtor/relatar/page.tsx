import { Pagina, Vazio } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import type { Propriedade, Talhao } from "@/lib/tipos";
import { FormularioRelato } from "./formulario";

export const metadata = { title: "Relatar" };

export default async function Relatar(props: PageProps<"/produtor/relatar">) {
  const sp = await props.searchParams;
  const { supabase } = await exigirPerfil("produtor");
  const [{ data: propriedades }, { data: talhoes }] = await Promise.all([
    supabase.from("propriedades").select("id, nome, municipio, uf, lat, lon, limite").order("criado_em").returns<Pick<Propriedade, "id" | "nome" | "municipio" | "uf" | "lat" | "lon" | "limite">[]>(),
    supabase.from("talhoes").select("id, nome, propriedade_id, geojson, cor, centroide_lat, centroide_lon").order("criado_em").returns<Pick<Talhao, "id" | "nome" | "propriedade_id" | "geojson" | "cor" | "centroide_lat" | "centroide_lon">[]>(),
  ]);
  const talhaoInicial = talhoes?.find((t) => t.id === sp.talhao);
  const propInicial = talhaoInicial?.propriedade_id ?? propriedades?.find((p) => p.id === sp.propriedade)?.id;

  return (
    <Pagina>
      <h1 className="h1 mb-1">Relatar algo na propriedade</h1>
      <p className="mb-6 max-w-2xl text-muted">Conte o que viu e, se puder, mande uma foto. O local vai junto e seu técnico recebe na hora.</p>
      {propriedades?.length ? (
        <FormularioRelato
          propriedades={propriedades.map((p) => ({ id: p.id, nome: p.nome, local: [p.municipio, p.uf].filter(Boolean).join(" - "), lat: p.lat, lon: p.lon, limite: p.limite }))}
          talhoes={(talhoes ?? []).map((t) => ({
            id: t.id, nome: t.nome, propriedadeId: t.propriedade_id, geojson: t.geojson, cor: t.cor,
            lat: t.centroide_lat ?? t.geojson.coordinates[0][0][1], lon: t.centroide_lon ?? t.geojson.coordinates[0][0][0],
          }))}
          inicial={{ propriedade: propInicial, talhao: talhaoInicial?.id }}
        />
      ) : <Vazio titulo="Nenhuma propriedade cadastrada">Peça ao seu técnico para cadastrar sua propriedade.</Vazio>}
    </Pagina>
  );
}
