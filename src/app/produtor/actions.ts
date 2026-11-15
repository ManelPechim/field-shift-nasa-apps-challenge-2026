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
  const propriedadeId = String(form.get("propriedade_id") ?? "");
  const escopo = String(form.get("escopo") ?? "");
  const talhaoId = escopo === "talhao" ? String(form.get("talhao_id") ?? "") : null;
  const tipo = String(form.get("tipo") ?? "").trim();
  if (!propriedadeId) return { erro: "Escolha a propriedade." };
  if (escopo !== "propriedade" && escopo !== "talhao") return { erro: "Diga se o relato é da propriedade inteira ou de um talhão." };
  if (escopo === "talhao" && !talhaoId) return { erro: "Escolha o talhão, na lista ou tocando nele no mapa." };
  if (!tipo) return { erro: "Escolha o que aconteceu." };

  const { data: prop } = await supabase.from("propriedades").select("id, lat, lon").eq("id", propriedadeId).maybeSingle();
  if (!prop) return { erro: "Propriedade não encontrada." };
  let talhao: { id: string; centroide_lat: number | null; centroide_lon: number | null } | null = null;
  if (talhaoId) {
    const { data } = await supabase.from("talhoes").select("id, centroide_lat, centroide_lon").eq("id", talhaoId).eq("propriedade_id", prop.id).maybeSingle();
    if (!data) return { erro: "Esse talhão não é desta propriedade." };
    talhao = data;
  }

  let foto_path: string | null = null;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) {
    if (foto.size > 10 * 1024 * 1024) return { erro: "A foto passou de 10 MB. Tire outra com menos zoom." };
    const ext = (foto.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    foto_path = `${prop.id}/ocorrencias/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("arquivos").upload(foto_path, foto, { contentType: foto.type || "image/jpeg" });
    if (error) return { erro: `Não foi possível enviar a foto: ${error.message}` };
  }
  // O local vem do mapa (centro da área ou ponto tocado); sem ele, vale o centro do talhão ou o ponto da propriedade
  const lat = Number(form.get("lat")), lon = Number(form.get("lon"));
  const temPonto = !!form.get("lat") && !!form.get("lon") && Number.isFinite(lat) && Number.isFinite(lon);
  const { error } = await supabase.from("ocorrencias").insert({
    propriedade_id: prop.id,
    talhao_id: talhao?.id ?? null,
    tipo,
    descricao: String(form.get("descricao") ?? "").trim() || null,
    foto_path,
    lat: temPonto ? lat : talhao?.centroide_lat ?? prop.lat,
    lon: temPonto ? lon : talhao?.centroide_lon ?? prop.lon,
  });
  if (error) return { erro: `Não foi possível enviar: ${error.message}` };
  revalidatePath("/produtor", "layout");
  redirect(talhao ? `/produtor/talhoes/${talhao.id}?relato=ok` : `/produtor/propriedades/${prop.id}?relato=ok`);
}
