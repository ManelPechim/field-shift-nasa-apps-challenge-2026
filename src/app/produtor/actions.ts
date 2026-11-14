"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/supabase/server";

export async function concluirTarefa(form: FormData) {
  const { supabase } = await exigirPerfil();
  const feita = form.get("feita") !== "0";
  await supabase
    .from("tarefas")
    .update({ status: feita ? "feita" : "pendente", feita_em: feita ? new Date().toISOString() : null, nota_produtor: String(form.get("nota") ?? "").trim() || null })
    .eq("id", String(form.get("tarefa_id")));
  revalidatePath("/produtor", "layout");
}

export type EstadoRelato = { erro?: string } | undefined;

export async function relatar(_: EstadoRelato, form: FormData): Promise<EstadoRelato> {
  const { supabase } = await exigirPerfil();
  const talhaoId = String(form.get("talhao_id") ?? "");
  const tipo = String(form.get("tipo") ?? "").trim();
  if (!talhaoId) return { erro: "Escolha o talhão." };
  if (!tipo) return { erro: "Escolha o que aconteceu." };

  const { data: talhao } = await supabase.from("talhoes").select("propriedade_id").eq("id", talhaoId).maybeSingle();
  if (!talhao) return { erro: "Talhão não encontrado." };

  let foto_path: string | null = null;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) {
    if (foto.size > 10 * 1024 * 1024) return { erro: "A foto passou de 10 MB. Tire outra com menos zoom." };
    const ext = (foto.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    foto_path = `${talhao.propriedade_id}/ocorrencias/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("arquivos").upload(foto_path, foto, { contentType: foto.type || "image/jpeg" });
    if (error) return { erro: `Não foi possível enviar a foto: ${error.message}` };
  }
  const lat = Number(form.get("lat")), lon = Number(form.get("lon"));
  const { error } = await supabase.from("ocorrencias").insert({
    talhao_id: talhaoId,
    tipo,
    descricao: String(form.get("descricao") ?? "").trim() || null,
    foto_path,
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lon: Number.isFinite(lon) && lon !== 0 ? lon : null,
  });
  if (error) return { erro: `Não foi possível enviar: ${error.message}` };
  redirect(`/produtor/talhoes/${talhaoId}?relato=ok`);
}
