import type { SupabaseClient } from "@supabase/supabase-js";
import type { Perfil } from "./tipos";

export type TecnicoDoProdutor = Pick<Perfil, "nome" | "telefone" | "instituicao">;

/** O técnico que atende este produtor (um por produtor). */
export async function tecnicoDoProdutor(supabase: SupabaseClient, usuarioId: string): Promise<TecnicoDoProdutor | null> {
  const { data: cadastro } = await supabase.from("produtores").select("tecnico_id").eq("usuario_id", usuarioId).maybeSingle<{ tecnico_id: string }>();
  if (!cadastro) return null;
  const { data } = await supabase.from("perfis").select("nome, telefone, instituicao").eq("id", cadastro.tecnico_id).maybeSingle<TecnicoDoProdutor>();
  return data;
}
