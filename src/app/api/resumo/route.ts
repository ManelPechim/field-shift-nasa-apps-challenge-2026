import Anthropic from "@anthropic-ai/sdk";
import { supabaseServidor } from "@/lib/supabase/server";
import { NOME_RISCO, NIVEL, type ChaveRisco } from "@/lib/agro/riscos";

export const maxDuration = 120;

/** Escreve o texto do plano para o produtor, em linguagem simples, a partir dos números do plano. O técnico revisa antes de publicar. */
export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erro: "A IA está desligada (falta a chave da API). Escreva o texto à mão." }, { status: 503 });

  const { planoId } = await req.json();
  const { data: plano } = await supabase.from("planos").select("*, talhoes(nome, area_ha)").eq("id", planoId).maybeSingle();
  if (!plano) return Response.json({ erro: "Plano não encontrado." }, { status: 404 });
  const { data: tarefas } = await supabase.from("tarefas").select("titulo, quando").eq("plano_id", planoId);

  const d = plano.dados as { cenario?: string; riscos?: Record<ChaveRisco, number>; notas?: Record<string, number>; notas_atual?: Record<string, number>; atual?: string };
  const riscos = d.riscos ? (Object.keys(d.riscos) as ChaveRisco[]).map((k) => `${NOME_RISCO[k]}: ${NIVEL[d.riscos![k]]}`).join("; ") : "não informado";
  const dados = [
    `Talhão: ${plano.talhoes?.nome} (${plano.talhoes?.area_ha} ha). Safra ${plano.safra}.`,
    `Rotação escolhida pelo técnico: ${plano.rotacao_nome}.`,
    `Rotação atual: ${d.atual ?? "não informada"}.`,
    `Riscos da área: ${riscos}. Previsão de chuva: ${d.cenario ?? "normal"}.`,
    `Notas (0 a 100) da escolhida: ${JSON.stringify(d.notas ?? {})}. Da atual: ${JSON.stringify(d.notas_atual ?? {})}.`,
    `Justificativa do técnico: ${plano.justificativa ?? "não escrita"}.`,
    `Tarefas: ${(tarefas ?? []).map((t) => `${t.titulo} (${t.quando ?? "sem data"})`).join("; ")}.`,
  ].join("\n");

  const prompt = `Você escreve para um agricultor brasileiro com pouca leitura técnica. Com os dados abaixo, escreva o texto que ele vai ler no celular explicando o plano da próxima safra.
Regras: português simples e direto, frases curtas, no máximo 120 palavras, sem markdown, sem siglas sem explicar. Diga o que vai plantar e quando, por que essa escolha é boa para ele e o principal cuidado. Use só as informações abaixo; não invente números, doses ou produtos. Termine lembrando que qualquer dúvida é com o técnico.

${dados}`;

  try {
    const client = new Anthropic();
    const resp = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });
    if (resp.stop_reason === "refusal") return Response.json({ erro: "A IA não escreveu o texto. Escreva à mão." }, { status: 422 });
    const texto = resp.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return Response.json({ texto });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ erro: "Muitos pedidos seguidos. Espere um minuto." }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ erro: `A IA falhou (erro ${e.status}). Escreva à mão.` }, { status: 502 });
    return Response.json({ erro: "Sem conexão com a IA. Tente de novo." }, { status: 502 });
  }
}
