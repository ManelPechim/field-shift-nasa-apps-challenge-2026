import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 120;

const Amostra = z.object({
  codigo: z.string().nullable(),
  descricao: z.string().nullable(),
  profundidade: z.string().nullable(),
  ph_cacl2: z.number().nullable(),
  ph_agua: z.number().nullable(),
  smp: z.number().nullable(),
  p: z.number().nullable(),
  p_metodo: z.enum(["resina", "mehlich"]).nullable(),
  k: z.number().nullable(),
  ca: z.number().nullable(),
  mg: z.number().nullable(),
  al: z.number().nullable(),
  h_al: z.number().nullable(),
  mo: z.number().nullable(),
  argila: z.number().nullable(),
  un_k: z.string().nullable(),
  un_bases: z.string().nullable(),
  un_mo: z.string().nullable(),
});
const Laudo = z.object({
  laboratorio: z.string().nullable(),
  data: z.string().nullable(),
  amostras: z.array(Amostra),
  observacoes: z.string().nullable(),
});
type AmostraLida = z.infer<typeof Amostra>;

const INSTRUCOES = `Você está lendo um laudo de análise química de solo de um laboratório brasileiro (foto ou PDF).
Extraia TODAS as amostras da tabela, uma por linha. Para cada amostra devolva os valores exatamente como impressos e as unidades usadas:
- un_k: unidade do potássio (ex.: "mmolc/dm3", "cmolc/dm3", "mg/dm3")
- un_bases: unidade de Ca, Mg, Al e H+Al (ex.: "mmolc/dm3" ou "cmolc/dm3")
- un_mo: unidade da matéria orgânica (ex.: "g/dm3", "g/kg", "%", "dag/kg")
- p_metodo: "resina" ou "mehlich", conforme a coluna de fósforo preenchida.
Use null quando o valor estiver vazio, "n.s." ou não existir. Não invente nem estime valores.
Em "observacoes", anote em uma frase o que estiver ilegível ou ambíguo; senão, null.`;

function normalizar(a: AmostraLida) {
  const unB = (a.un_bases ?? "").toLowerCase(), unK = (a.un_k ?? a.un_bases ?? "").toLowerCase(), unMo = (a.un_mo ?? "").toLowerCase();
  const fb = unB.includes("cmol") ? 10 : 1;
  let k = a.k;
  if (k != null) { if (unK.includes("cmol")) k *= 10; else if (unK.includes("mg")) k /= 39.1; }
  let mo = a.mo;
  if (mo != null && (unMo.includes("%") || unMo.includes("dag"))) mo *= 10;
  const b = (v: number | null) => (v == null ? null : Math.round(v * fb * 1000) / 1000);
  return {
    codigo: a.codigo, descricao: a.descricao, profundidade: a.profundidade,
    valores: { ph: a.ph_cacl2, ph_agua: a.ph_agua, smp: a.smp, p: a.p, p_metodo: a.p_metodo ?? "resina", k: k == null ? null : Math.round(k * 1000) / 1000, ca: b(a.ca), mg: b(a.mg), al: b(a.al), hal: b(a.h_al), mo, argila: a.argila },
  };
}

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

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

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const ext = arquivo.type === "application/pdf" ? "pdf" : arquivo.type.split("/")[1];
  const path = `${talhao.propriedade_id}/laudos/${crypto.randomUUID()}.${ext}`;
  const { error: erroUpload } = await supabase.storage.from("arquivos").upload(path, bytes, { contentType: arquivo.type });
  if (erroUpload) return Response.json({ erro: `Não foi possível guardar o arquivo: ${erroUpload.message}` }, { status: 500 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ path, amostras: [], aviso: "Leitura por IA desligada (falta a chave da API). Preencha os valores à mão." });
  }

  const base64 = bytes.toString("base64");
  const bloco: Anthropic.Beta.BetaContentBlockParam =
    arquivo.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: arquivo.type as "image/jpeg" | "image/png" | "image/webp", data: base64 } };

  try {
    const client = new Anthropic();
    const resp = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Laudo) },
      messages: [{ role: "user", content: [bloco, { type: "text", text: INSTRUCOES }] }],
    });
    if (resp.stop_reason === "refusal" || !resp.parsed_output) {
      return Response.json({ path, amostras: [], aviso: "A IA não conseguiu ler este laudo. Preencha os valores à mão." });
    }
    const out = resp.parsed_output;
    return Response.json({ path, laboratorio: out.laboratorio, data: out.data, observacoes: out.observacoes, amostras: out.amostras.map(normalizar) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ path, amostras: [], aviso: "Muitas leituras seguidas. Espere um minuto ou preencha à mão." });
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ path, amostras: [], aviso: "A chave da API do Claude é inválida. Preencha os valores à mão." });
    if (e instanceof Anthropic.APIError) return Response.json({ path, amostras: [], aviso: `A leitura falhou (erro ${e.status}). Preencha os valores à mão.` });
    return Response.json({ path, amostras: [], aviso: "A leitura falhou por um problema de conexão. Preencha os valores à mão." });
  }
}
