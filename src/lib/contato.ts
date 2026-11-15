/** Celular só com dígitos; com DDD (10 ou 11 dígitos) ganha o DDI 55. Sem validação de formato (decisão do MVP). */
export function normalizarCelular(v: string | null | undefined) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d || null;
}

/** 5551999998888 → (51) 99999-8888 */
export function formatarCelular(d: string | null | undefined) {
  if (!d) return "";
  const n = d.startsWith("55") ? d.slice(2) : d;
  return n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : d;
}

const PALAVRAS = ["milho", "soja", "trigo", "aveia", "sorgo", "feijao", "arroz", "chuva", "safra", "campo", "palha", "semente"];

/** Senha fácil de ditar por telefone: palavra-1234 */
export function sugerirSenha() {
  const n = new Uint32Array(2);
  crypto.getRandomValues(n);
  return `${PALAVRAS[n[0] % PALAVRAS.length]}-${1000 + (n[1] % 9000)}`;
}

/** O Supabase exige no mínimo 6 caracteres na senha; traduz o erro dele. */
export function erroDeSenha(mensagem: string) {
  return /password/i.test(mensagem) && /(6|characters|weak)/i.test(mensagem) ? "A senha precisa ter pelo menos 6 caracteres (exigência do sistema de login)." : null;
}

export function linkWhatsApp(celular: string, texto?: string) {
  return `https://wa.me/${celular}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function mensagemDeAcesso(o: { nome: string; email: string; celular: string; senha: string; site: string }) {
  return [
    `Olá, ${o.nome.split(" ")[0]}! Seu acesso ao Field Shift está pronto.`,
    "",
    `Entre em: ${o.site}/entrar`,
    `Login: ${o.email} ou o seu celular ${formatarCelular(o.celular)}`,
    `Senha: ${o.senha}`,
    "",
    "Lá você vê o plano da sua lavoura, as tarefas da safra e pode me mandar fotos do que acontecer no campo.",
  ].join("\n");
}
