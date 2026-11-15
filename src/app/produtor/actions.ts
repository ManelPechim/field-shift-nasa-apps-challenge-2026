"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/supabase/server";

/** Chamado quando o produtor abre a tela do plano (não no prefetch do link). */
export async function marcarPlanoVisto(planoId: string) {
  const { supabase } = await exigirPerfil("produtor");
  await supabase.rpc("marcar_plano_visto", { pid: planoId });
}

export type EstadoRespostaPlano = { erro?: string; ok?: boolean } | undefined;

export async function responderPlano(_: EstadoRespostaPlano, form: FormData): Promise<EstadoRespostaPlano> {
  const { supabase } = await exigirPerfil("produtor");
  const planoId = String(form.get("plano_id"));
  const resposta = String(form.get("resposta"));
  const duvida = String(form.get("duvida") ?? "").trim();
  if (resposta === "duvida" && !duvida) return { erro: "Escreva sua dúvida para o técnico entender." };
  const { error } = await supabase.rpc("responder_plano", { pid: planoId, r: resposta, texto: duvida });
  if (error) return { erro: `Não foi possível enviar: ${error.message}` };
  revalidatePath("/produtor", "layout");
  return { ok: true };
}
