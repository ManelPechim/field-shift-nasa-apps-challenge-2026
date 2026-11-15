import { supabaseServidor } from "@/lib/supabase/server";

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/**
 * Guarda a foto ou o PDF do laudo de solo no Storage para anexar à amostra.
 * A leitura automática dos valores por IA está planejada (docs/decisoes.md, item 9), mas não integrada neste protótipo.
 */
export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ erro: "Entre na sua conta de novo." }, { status: 401 });

  const form = await req.formData();
  const arquivo = form.get("arquivo");
  const talhaoId = String(form.get("talhao_id") ?? "");
  if (!(arquivo instanceof File) || !TIPOS.has(arquivo.type)) return Response.json({ erro: "Envie uma foto JPG, PNG ou WebP, ou o PDF do laudo." }, { status: 400 });
  if (arquivo.size > 10 * 1024 * 1024) return Response.json({ erro: "Arquivo acima de 10 MB. Tire uma foto menor." }, { status: 400 });

  const { data: talhao } = await supabase.from("talhoes").select("propriedade_id").eq("id", talhaoId).maybeSingle();
  if (!talhao) return Response.json({ erro: "Talhão não encontrado." }, { status: 404 });

  const ext = arquivo.type === "application/pdf" ? "pdf" : arquivo.type.split("/")[1];
  const path = `${talhao.propriedade_id}/laudos/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("arquivos").upload(path, Buffer.from(await arquivo.arrayBuffer()), { contentType: arquivo.type });
  if (error) return Response.json({ erro: `Não foi possível guardar o arquivo: ${error.message}` }, { status: 500 });
  return Response.json({ path });
}
