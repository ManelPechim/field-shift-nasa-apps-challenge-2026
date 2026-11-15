import type { SupabaseClient } from "@supabase/supabase-js";
import type { Propriedade, Talhao } from "@/lib/tipos";
import type { PropriedadeRelato, TalhaoRelato } from "./formulario";

/** Propriedades e talhões que o produtor pode relatar; com `propriedadeId`, só os daquela propriedade. */
export async function dadosDoRelato(supabase: SupabaseClient, propriedadeId?: string) {
  let props = supabase.from("propriedades").select("id, nome, municipio, uf, lat, lon, limite").order("criado_em");
  let talhoes = supabase.from("talhoes").select("id, nome, propriedade_id, geojson, cor, centroide_lat, centroide_lon").order("criado_em");
  if (propriedadeId) { props = props.eq("id", propriedadeId); talhoes = talhoes.eq("propriedade_id", propriedadeId); }
  const [{ data: ps }, { data: ts }] = await Promise.all([
    props.returns<Pick<Propriedade, "id" | "nome" | "municipio" | "uf" | "lat" | "lon" | "limite">[]>(),
    talhoes.returns<Pick<Talhao, "id" | "nome" | "propriedade_id" | "geojson" | "cor" | "centroide_lat" | "centroide_lon">[]>(),
  ]);
  const propriedades: PropriedadeRelato[] = (ps ?? []).map((p) => ({ id: p.id, nome: p.nome, local: [p.municipio, p.uf].filter(Boolean).join(" - "), lat: p.lat, lon: p.lon, limite: p.limite }));
  const listaTalhoes: TalhaoRelato[] = (ts ?? []).map((t) => ({
    id: t.id, nome: t.nome, propriedadeId: t.propriedade_id, geojson: t.geojson, cor: t.cor,
    lat: t.centroide_lat ?? t.geojson.coordinates[0][0][1], lon: t.centroide_lon ?? t.geojson.coordinates[0][0][0],
  }));
  return { propriedades, talhoes: listaTalhoes };
}
