import type { SupabaseClient } from "@supabase/supabase-js";
import { climaDoPonto, type ClimaTalhao } from "@/lib/nasa/power";
import { relevoDoTalhao, type RelevoTalhao } from "@/lib/nasa/relevo";
import type { Talhao } from "@/lib/tipos";

const VALIDADE_CLIMA_H = 24; // os dados recentes mudam todo dia
const VALIDADE_RELEVO_H = 24 * 365;

async function comCache<T>(sb: SupabaseClient, talhaoId: string, tipo: string, horas: number, buscar: () => Promise<T>, forcar: boolean) {
  const { data } = await sb.from("dados_nasa").select("payload, atualizado_em").eq("talhao_id", talhaoId).eq("tipo", tipo).maybeSingle();
  const idade = data ? (Date.now() - new Date(data.atualizado_em).getTime()) / 3600_000 : Infinity;
  if (data && idade < horas && !forcar) return data.payload as T;
  try {
    const novo = await buscar();
    await sb.from("dados_nasa").upsert({ talhao_id: talhaoId, tipo, payload: novo, atualizado_em: new Date().toISOString() });
    return novo;
  } catch (e) {
    if (data) return data.payload as T; // usa o último dado guardado se a NASA não responder
    throw e;
  }
}

export async function dadosNasa(sb: SupabaseClient, t: Talhao, forcar = false) {
  const erros: string[] = [];
  const [clima, relevo] = await Promise.all([
    comCache<ClimaTalhao>(sb, t.id, "power", VALIDADE_CLIMA_H, () => climaDoPonto(t.centroide_lat!, t.centroide_lon!), forcar).catch((e) => {
      erros.push(`NASA POWER: ${e instanceof Error ? e.message : "sem resposta"}`);
      return null;
    }),
    comCache<RelevoTalhao>(sb, t.id, "relevo", VALIDADE_RELEVO_H, () => relevoDoTalhao(t.geojson), forcar).catch((e) => {
      erros.push(`Relevo SRTM: ${e instanceof Error ? e.message : "sem resposta"}`);
      return null;
    }),
  ]);
  return { clima, relevo, erros };
}
