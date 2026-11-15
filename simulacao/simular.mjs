// Simulação do fluxo completo do Field Shift, do técnico ao produtor, clicando no app de verdade.
//
// Uso (com o servidor rodando: npm run dev -- -p 3123):
//   npm run simulacao                 abre o Chrome e mostra cada passo devagar
//   npm run simulacao -- --rapido     sem janela e sem pausas (bom para conferir se nada quebrou)
//   npm run simulacao -- --manter     não apaga os dados no fim (para apresentar ou explorar à mão)
//   npm run simulacao -- --exemplo    monta os dados de exemplo fixos (uma técnica, dois produtores) e os mantém
//   npm run simulacao -- --limpar     apaga os dados de todas as simulações anteriores (não mexe no exemplo)
//   npm run simulacao -- --url http://localhost:3000
//
// Na simulação comum, cria um técnico e um produtor novos (e-mails com carimbo de tempo) e, no fim,
// apaga tudo o que criou. Com --exemplo, usa logins fixos, recria o exemplo do zero e não apaga.
// Fotos de cada passo e um relatório em HTML ficam em simulacao/saida/<data>/.

import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opcao = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const URL_BASE = opcao("--url") ?? "http://localhost:3123";
const RAPIDO = args.includes("--rapido");
const MANTER = args.includes("--manter");
const SO_LIMPAR = args.includes("--limpar");
const EXEMPLO = args.includes("--exemplo");
const CHROME = opcao("--chrome") ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const carimbo = Date.now().toString(36);
const DIGITOS = String(Date.now()).slice(-8);
const marca = EXEMPLO ? "" : " (simulação)";
const TECNICO = EXEMPLO
  ? { nome: "Marina Souza", email: "exemplo.tecnico@field.test", telefone: "(55) 99111-2233", registro: "CREA-RS 123456", instituicao: "Emater/RS-Ascar", senha: "exemplo-2026" }
  : { nome: "Marina Souza (simulação)", email: `sim.tecnico.${carimbo}@field.test`, telefone: "(55) 99111-2233", registro: "CREA-RS 123456", instituicao: "Emater/RS-Ascar", senha: "simulacao-123" };

/**
 * Clientes da técnica. O primeiro faz o ciclo inteiro (plano, dúvida, tarefa, relato).
 * O segundo (só no exemplo) fica com tudo cadastrado, esperando o plano.
 * Ambos no Planalto Médio gaúcho (Cruz Alta - RS), em lavouras de soja e trigo.
 */
const CLIENTES = [
  {
    produtor: {
      nome: `Joaquim Pereira${marca}`,
      email: EXEMPLO ? "exemplo.produtor1@field.test" : `sim.produtor.${carimbo}@field.test`,
      celular: EXEMPLO ? "(55) 99876-0001" : `(55) 9${DIGITOS.slice(0, 4)}-${DIGITOS.slice(4)}`,
      senha: "lavoura-2026",
    },
    observacoes: "Soja e trigo há 10 anos. Quer recuperar o solo e reduzir adubo.",
    propriedade: `Sítio Boa Esperança${marca}`,
    local: "-28.5795, -53.6630",
    talhoes: [{ nome: "Talhão da coxilha", cor: "Laranja", dx: -1, rotacao: 1 }, { nome: "Talhão da sanga", cor: "Azul", dx: 1 }],
    visita: {
      objetivo: "Diagnóstico inicial e coleta de solo", uso: "Lavoura de grãos", cultura: "Soja recém-emergida", historico: "Soja/trigo há 10 anos, plantio direto",
      opcoes: ["Às vezes, em chuva forte", "Laminar", "Suspeita", "Parcial", "Sim"],
      maquinario: "Plantadeira de plantio direto, pulverizador", mercado: "Cooperativa", objetivoProdutor: "Recuperar o solo e gastar menos com adubo",
    },
    solo: { valores: { ph: 4.8, p: 7, k: 1.6, ca: 21, mg: 7, al: 5, hal: 55, mo: 26, argila: 48 }, laboratorio: "Laboratório de Solos UFSM" },
  },
  {
    produtor: { nome: "Ana Lúcia Ferreira", email: "exemplo.produtor2@field.test", celular: "(55) 99876-0002", senha: "lavoura-2026" },
    observacoes: "Arrendou a área há dois anos. Lavoura convencional, com enxurrada na baixada.",
    propriedade: "Fazenda Santa Rita",
    local: "-28.5480, -53.7020",
    talhoes: [{ nome: "Talhão da baixada", cor: "Roxo", dx: -1, rotacao: 2 }, { nome: "Talhão do galpão", cor: "Verde-limão", dx: 1 }],
    visita: {
      objetivo: "Primeira visita: enxurrada e queda de produtividade", uso: "Lavoura de grãos", cultura: "Soja em emergência", historico: "Soja no verão e solo descoberto no inverno há 5 anos; revolve o solo",
      opcoes: ["Com frequência", "Sulcos", "Confirmada", "Descoberto", "Não, revolve o solo"],
      maquinario: "Grade, plantadeira convencional", mercado: "Cerealista da cidade", objetivoProdutor: "Parar de perder terra com a chuva e melhorar a produtividade",
    },
    solo: { valores: { ph: 4.5, p: 4, k: 1.1, ca: 14, mg: 5, al: 9, hal: 72, mo: 18, argila: 55 }, laboratorio: "Laboratório de Solos UFSM" },
  },
];
const PRODUTOR = CLIENTES[0].produtor;
const CLIENTES_DA_EXECUCAO = EXEMPLO ? CLIENTES : CLIENTES.slice(0, 1);
/** Contas desta execução (técnico e produtores). */
const EMAILS = [TECNICO.email, ...CLIENTES_DA_EXECUCAO.map((c) => c.produtor.email)];
const DE_SIMULACOES = /^sim\.(tecnico|produtor)\.[a-z0-9]+@field\.test$/;

const quando = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const SAIDA = path.join(RAIZ, "simulacao", "saida", EXEMPLO ? `${quando}-exemplo` : quando);
mkdirSync(SAIDA, { recursive: true });

const passos = [];
const errosNoNavegador = [];
const pausa = (ms) => (RAPIDO ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
/** Espera de verdade, também no modo rápido: o mapa leva uns segundos para voar até o ponto. */
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lê "12,3 ha" de um texto. */
async function lerArea(local) {
  const texto = await local.innerText();
  const m = texto.match(/([\d.]+(?:,\d+)?)\s*ha/);
  return m ? Number(m[1].replace(/\./g, "").replace(",", ".")) : NaN;
}

/**
 * Desenha uma área e confere o tamanho. O mapa leva um tempo variável para voar até o ponto;
 * se o desenho sair com o mapa ainda longe (milhares de ha), espera mais e desenha de novo.
 */
async function desenharArea(pagina, escopo, pontos, textoDaArea, [minimo, maximo], reposicionar) {
  const mapa = escopo.locator(".maplibregl-canvas");
  let ha = NaN;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    // Um toque durante o voo do mapa interrompe o voo: antes de tentar de novo, manda o mapa voltar ao ponto
    if (tentativa > 1 && reposicionar) await reposicionar();
    await esperar(reposicionar ? 5000 : 1500 * tentativa);
    await escopo.getByRole("toolbar").getByRole("button", { name: /Desenhar/ }).first().click();
    await tocarNoMapa(pagina, mapa, pontos);
    await escopo.getByRole("button", { name: "Concluir desenho" }).click();
    ha = await lerArea(escopo.getByText(textoDaArea));
    if (ha >= minimo && ha <= maximo) return ha;
  }
  throw new Error(`Área desenhada de ${ha} ha, fora do esperado (${minimo} a ${maximo} ha), mesmo esperando o mapa`);
}

/** Executa um passo, fotografa a tela e guarda o resultado para o relatório. */
async function passo(pagina, ator, titulo, descricao, acao) {
  const n = passos.length + 1;
  const inicio = Date.now();
  process.stdout.write(`${String(n).padStart(2)}. [${ator}] ${titulo}… `);
  const registro = { n, ator, titulo, descricao, ok: false, ms: 0, foto: "", erro: "" };
  passos.push(registro);
  try {
    await acao();
    registro.ok = true;
    console.log(`ok (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
  } catch (e) {
    registro.erro = e instanceof Error ? e.message.split("\n")[0] : String(e);
    console.log(`FALHOU: ${registro.erro}`);
  }
  registro.ms = Date.now() - inicio;
  registro.foto = `${String(n).padStart(2, "0")}-${ator === "Técnico" ? "tecnico" : "produtor"}.png`;
  await pausa(400);
  await pagina.screenshot({ path: path.join(SAIDA, registro.foto), fullPage: false }).catch(() => {});
  if (!registro.ok) throw new Error(`Passo ${n} falhou: ${registro.erro}`);
  await pausa(700);
}

/** Toques no mapa, em pixels a partir do centro da área visível do mapa. */
async function tocarNoMapa(pagina, mapa, pontos) {
  await mapa.scrollIntoViewIfNeeded();
  const b = await mapa.boundingBox();
  for (const [dx, dy] of pontos) {
    await pagina.mouse.click(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy);
    await pausa(150);
  }
}

function supabaseAdmin() {
  const env = Object.fromEntries(readFileSync(path.join(RAIZ, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Apaga as contas cujo e-mail passa no filtro, as propriedades dos técnicos entre elas e os arquivos dessas propriedades. */
async function limpar(filtro) {
  const sb = supabaseAdmin();
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const usuarios = data.users.filter((u) => filtro(u.email ?? ""));
  for (const tecnico of usuarios.filter((u) => u.user_metadata?.papel === "tecnico")) {
    const { data: props } = await sb.from("propriedades").select("id").eq("tecnico_id", tecnico.id);
    for (const p of props ?? []) {
      for (const pasta of ["ocorrencias", "laudos"]) {
        const { data: arquivos } = await sb.storage.from("arquivos").list(`${p.id}/${pasta}`);
        if (arquivos?.length) await sb.storage.from("arquivos").remove(arquivos.map((a) => `${p.id}/${pasta}/${a.name}`));
      }
      // Talhões levam junto análises, planos, tarefas, relatos e dados da NASA (on delete cascade)
      await sb.from("ocorrencias").delete().eq("propriedade_id", p.id);
      await sb.from("talhoes").delete().eq("propriedade_id", p.id);
      await sb.from("visitas").delete().eq("propriedade_id", p.id);
      await sb.from("propriedades").delete().eq("id", p.id);
    }
    await sb.from("produtores").delete().eq("tecnico_id", tecnico.id);
  }
  for (const u of usuarios) {
    await sb.from("perfis").delete().eq("id", u.id);
    await sb.auth.admin.deleteUser(u.id);
  }
  return usuarios.length;
}

function relatorio(inicio) {
  const total = ((Date.now() - inicio) / 1000).toFixed(0);
  const okTodos = passos.every((p) => p.ok);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const logins = [`Técnica: ${TECNICO.email} / ${TECNICO.senha}`, ...CLIENTES_DA_EXECUCAO.map((c) => `${c.produtor.nome}: ${c.produtor.celular} ou ${c.produtor.email} / ${c.produtor.senha}`)];
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${EXEMPLO ? "Exemplo" : "Simulação"} Field Shift · ${quando}</title>
<style>
:root{--bg:#f4f1e8;--fg:#1d2a1f;--muted:#5b6b5d;--line:#d9d3c2;--card:#fffdf7;--tec:#1d5fa6;--prod:#2f7d4a;--bad:#b23b2c}
@media (prefers-color-scheme:dark){:root{--bg:#141a15;--fg:#e8efe6;--muted:#9fb0a2;--line:#2c372e;--card:#1b231c;--tec:#7fb0ec;--prod:#6cc28a;--bad:#ec7a6a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left))}
h1{font-size:1.8rem;margin:0 0 4px;text-wrap:balance}p.sub{color:var(--muted);margin:0 0 24px}
.resumo{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px}.resumo div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}
.resumo b{display:block;font-size:1.3rem}ol{list-style:none;padding:0;margin:0;display:grid;gap:18px}
.logins{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:0 0 24px;font-family:ui-monospace,Consolas,monospace;font-size:.9rem}
li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
@media (min-width:800px){li{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)}}
.ator{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:99px;color:var(--card)}
.Técnico{background:var(--tec)}.Produtor{background:var(--prod)}h2{font-size:1.1rem;margin:6px 0 4px}.meta{color:var(--muted);font-size:.85rem}
.erro{color:var(--bad);font-weight:600}img{width:100%;border-radius:10px;border:1px solid var(--line);display:block}
.cel img{max-width:300px;margin:0 auto}
</style></head><body><main>
<h1>${EXEMPLO ? "Dados de exemplo do Field Shift" : "Simulação do fluxo Field Shift"}</h1>
<p class="sub">${esc(quando.replace(/-(\d\d)-(\d\d)$/, " $1:$2"))} · ${esc(URL_BASE)}</p>
<div class="resumo"><div><b>${okTodos ? "Tudo certo" : "Falhou"}</b>resultado</div><div><b>${passos.filter((p) => p.ok).length}/${passos.length}</b>passos concluídos</div><div><b>${total} s</b>duração</div><div><b>${errosNoNavegador.length}</b>erros no console</div></div>
${EXEMPLO || MANTER ? `<div class="logins">${logins.map(esc).join("<br>")}</div>` : ""}
<ol>${passos.map((p) => `<li${p.ator === "Produtor" ? ' class="cel"' : ""}><div><span class="ator ${p.ator}">${p.ator}</span><h2>${p.n}. ${esc(p.titulo)}</h2><p>${esc(p.descricao)}</p><p class="meta">${(p.ms / 1000).toFixed(1)} s</p>${p.erro ? `<p class="erro">${esc(p.erro)}</p>` : ""}</div><img src="${p.foto}" alt="Tela do passo ${p.n}: ${esc(p.titulo)}" loading="lazy"></li>`).join("")}</ol>
${errosNoNavegador.length ? `<h2>Erros no console do navegador</h2><pre>${esc(errosNoNavegador.join("\n"))}</pre>` : ""}
</main></body></html>`;
  writeFileSync(path.join(SAIDA, "relatorio.html"), html);
  return path.join(SAIDA, "relatorio.html");
}

/**
 * Do cadastro do cliente à análise de solo: produtor, propriedade, talhões, (dados da NASA), visita e solo.
 * Devolve os endereços da propriedade e do primeiro talhão na área do técnico.
 */
async function cadastrarCliente(tec, c, { mostrarNasa }) {
  const primeiroNome = c.produtor.nome.split(" ")[0];
  await passo(tec, "Técnico", `Cadastra ${primeiroNome} e cria o acesso`, "Não existe cadastro aberto para produtor: o técnico cria o login (e-mail e celular) e a senha, e manda pelo WhatsApp.", async () => {
    await tec.getByRole("link", { name: "Novo cliente" }).first().click();
    await tec.waitForURL("**/tecnico/produtores/novo");
    await tec.fill('input[name="nome"]', c.produtor.nome);
    await tec.fill('input[name="celular"]', c.produtor.celular);
    await tec.fill('input[name="email"]', c.produtor.email);
    await tec.fill('input[name="senha"]', c.produtor.senha);
    await tec.fill('textarea[name="observacoes"]', c.observacoes).catch(() => {});
    await tec.getByRole("button", { name: "Salvar cliente e criar acesso" }).click();
    await tec.getByRole("link", { name: /Cadastrar a propriedade de/ }).waitFor();
  });

  await passo(tec, "Técnico", `Marca a propriedade ${c.propriedade} no mapa`, "Busca pelas coordenadas: o mapa marca o ponto e preenche município, UF e endereço. O técnico desenha o limite e dá o nome.", async () => {
    await tec.getByRole("link", { name: /Cadastrar a propriedade de/ }).click();
    await tec.waitForURL("**/propriedades/nova");
    await tec.getByPlaceholder(/coordenadas/).fill(c.local);
    await tec.getByRole("button", { name: "Buscar" }).click();
    await tec.getByText(/Preenchido pelo mapa|não achou o município|Preencha à mão/).waitFor();
    // Retângulo de 520 × 340 px: cerca de 75 ha no zoom 16, 19 ha no 17. Milhares de ha = mapa ainda longe
    await desenharArea(tec, tec.locator("main"), [[-260, -170], [260, -170], [260, 170], [-260, 170]], /limite de/, [10, 250],
      () => tec.getByRole("button", { name: "Buscar" }).click());
    await tec.fill('input[name="nome"]', c.propriedade);
    await pausa(600);
    await Promise.all([tec.waitForURL(/\/tecnico\/propriedades\/[^/]+$/), tec.getByRole("button", { name: "Salvar e desenhar os talhões" }).click()]);
  });
  const urlPropriedade = tec.url();

  for (const [i, t] of c.talhoes.entries()) {
    await passo(tec, "Técnico", `Desenha o ${t.nome.toLowerCase()}`, `Contorno desenhado sobre a imagem de satélite, cor ${t.cor.toLowerCase()} e o que se planta hoje. Ao salvar, o app busca 20 anos de clima (NASA POWER) e o relevo (SRTM).`, async () => {
      if (i > 0) await tec.goto(urlPropriedade);
      const secao = tec.locator("section", { hasText: "Cadastrar novo talhão" });
      await secao.locator(".maplibregl-canvas").waitFor();
      await desenharArea(tec, secao, [[t.dx * 20, -110], [t.dx * 200, -110], [t.dx * 200, 120], [t.dx * 20, 120]], /Área desenhada/, [1, 80]);
      await secao.locator("#nome").fill(t.nome);
      await secao.locator(`label[title^="${t.cor}"]`).click();
      if (t.rotacao) await secao.locator("#rotacao_atual").selectOption({ index: t.rotacao });
      await Promise.all([tec.waitForURL("**/tecnico/talhoes/**", { timeout: 120_000 }), secao.getByRole("button", { name: "Salvar talhão" }).click()]);
      await tec.getByRole("heading", { name: "Riscos que pesam na decisão" }).waitFor({ timeout: 120_000 });
    });
  }

  await tec.goto(urlPropriedade);
  await tec.locator("li", { hasText: c.talhoes[0].nome }).getByRole("link", { name: "Abrir talhão" }).click();
  await tec.waitForURL("**/tecnico/talhoes/**");
  const urlTalhao = tec.url().split("?")[0];

  if (mostrarNasa) {
    await passo(tec, "Técnico", "Lê os dados da NASA do talhão", "Riscos de alagamento, erosão, geada, seca e calor calculados com 20 anos de NASA POWER e o relevo do SRTM.", async () => {
      await tec.goto(`${urlTalhao}?aba=dados`);
      await tec.getByRole("heading", { name: "Riscos do talhão" }).waitFor();
      await tec.getByRole("heading", { name: "Como é o ano neste lugar" }).scrollIntoViewIfNeeded();
    });
  }

  await passo(tec, "Técnico", "Registra a visita técnica", "O que o satélite não vê: alagamento, erosão, compactação, manejo, máquinas e o que o produtor quer.", async () => {
    await tec.getByRole("link", { name: "Registrar visita" }).first().click();
    await tec.waitForURL("**/visita?talhao=**");
    const v = c.visita;
    await tec.locator("summary", { hasText: "Mais detalhes da visita" }).click();
    await tec.fill("#objetivo", v.objetivo);
    await tec.fill("#uso_atual", v.uso);
    await tec.fill("#cultura_atual", v.cultura);
    await tec.fill("#historico", v.historico);
    for (const opcao of v.opcoes) await tec.locator("label", { hasText: new RegExp(`^${opcao}$`) }).first().click();
    await tec.fill("#maquinario", v.maquinario);
    await tec.fill("#mercado", v.mercado);
    await tec.fill("#objetivo_produtor", v.objetivoProdutor);
    await Promise.all([tec.waitForURL("**/tecnico/talhoes/**"), tec.getByRole("button", { name: "Salvar visita" }).click()]);
  });

  await passo(tec, "Técnico", "Registra a análise de solo", "Valores do laudo do laboratório. O app interpreta pela tabela do IAC (Boletim 100) e mostra o que precisa de correção.", async () => {
    await tec.goto(`${urlTalhao}?aba=solo`);
    await tec.locator("summary", { hasText: "Outros números do laudo" }).click();
    for (const [k, v] of Object.entries(c.solo.valores)) await tec.fill(`#f-${k}`, String(v));
    await tec.fill('input[name="laboratorio"]', c.solo.laboratorio).catch(() => {});
    await tec.getByRole("button", { name: "Salvar amostra" }).click();
    await tec.waitForURL("**aba=solo");
    await tec.getByRole("button", { name: "Excluir" }).first().waitFor();
  });

  return { urlPropriedade, urlTalhao };
}

async function main() {
  if (SO_LIMPAR) {
    console.log(`Apagados ${await limpar((e) => DE_SIMULACOES.test(e))} usuários de simulações anteriores e tudo ligado a eles.`);
    return;
  }
  const inicio = Date.now();
  const resposta = await fetch(`${URL_BASE}/entrar`).catch(() => null);
  if (!resposta?.ok) throw new Error(`O app não respondeu em ${URL_BASE}. Rode antes: npm run dev -- -p 3123`);
  if (EXEMPLO) {
    const n = await limpar((e) => EMAILS.includes(e));
    if (n) console.log(`Exemplo anterior apagado (${n} usuários). Montando de novo.`);
  }
  console.log(`${EXEMPLO ? "Exemplo" : "Simulação"} em ${URL_BASE}\nTécnico: ${TECNICO.email}\n${CLIENTES_DA_EXECUCAO.map((c) => `Produtor: ${c.produtor.email} · ${c.produtor.celular}`).join("\n")}\nSaída: ${SAIDA}\n`);

  const abrir = (x, largura, altura) => chromium.launch({
    executablePath: CHROME, headless: RAPIDO, slowMo: RAPIDO ? 0 : 60,
    args: [`--window-position=${x},0`, `--window-size=${largura},${altura}`],
  });
  const navTecnico = await abrir(0, 1300, 960);
  const navProdutor = await abrir(1310, 440, 960);
  const tec = await (await navTecnico.newContext({ viewport: { width: 1280, height: 860 }, locale: "pt-BR" })).newPage();
  // O produtor usa o celular
  const celular = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-BR" };
  const prod = await (await navProdutor.newContext(celular)).newPage();
  const vigiar = (pagina, quem) => {
    pagina.setDefaultTimeout(90_000);
    pagina.on("console", (m) => { if (m.type() === "error") errosNoNavegador.push(`[${quem}] ${m.text().slice(0, 300)}`); });
  };
  vigiar(tec, "técnico");
  vigiar(prod, "produtor");

  let ok = false;
  try {
    // ───────── Técnico: do cadastro ao plano publicado ─────────
    await passo(tec, "Técnico", "Cria a conta de técnico", "O técnico se cadastra com registro profissional e instituição e aceita o termo da LGPD.", async () => {
      await tec.goto(`${URL_BASE}/entrar`);
      await tec.getByRole("tab", { name: "Sou técnico, criar conta" }).click();
      await tec.fill("#nome", TECNICO.nome);
      await tec.fill("#email2", TECNICO.email);
      await tec.fill("#telefone", TECNICO.telefone);
      await tec.fill("#registro", TECNICO.registro);
      await tec.fill("#instituicao", TECNICO.instituicao);
      await tec.fill("#senha2", TECNICO.senha);
      await tec.check('input[name="consentimento"]');
      await Promise.all([tec.waitForURL(/\/tecnico$/), tec.getByRole("button", { name: "Criar conta de técnico" }).click()]);
    });

    const { urlTalhao: urlTalhaoTec } = await cadastrarCliente(tec, CLIENTES[0], { mostrarNasa: true });

    await passo(tec, "Técnico", "Compara a rotação atual com duas alternativas", "A atual e as duas que mais combinam com as prioridades, com nota por critério. Cada opção traz o porquê, as evidências com selo (dado NASA, informação local, regra, hipótese), os riscos e o que falta saber.", async () => {
      await tec.goto(`${urlTalhaoTec}?aba=rotacoes`);
      await tec.getByRole("heading", { name: "Comparação lado a lado" }).scrollIntoViewIfNeeded();
    });

    await passo(tec, "Técnico", "Testa o cenário de La Niña", "Com chuva abaixo da média na safra, o app recalcula riscos e notas. É hipótese para testar a decisão, não previsão.", async () => {
      await tec.selectOption("#cenario", "seco");
      await Promise.all([tec.waitForURL("**cenario=seco**"), tec.getByRole("button", { name: "Recalcular" }).click()]);
      await tec.getByRole("heading", { name: "Comparação lado a lado" }).scrollIntoViewIfNeeded();
    });

    await passo(tec, "Técnico", "Gera o relatório de decisão", "Uma página para imprimir ou salvar em PDF: evidência da NASA, perfil do talhão, as três opções nos três cenários, próximos passos e fontes.", async () => {
      await tec.selectOption("#cenario", "normal");
      await Promise.all([tec.waitForURL("**cenario=normal**"), tec.getByRole("button", { name: "Recalcular" }).click()]);
      await Promise.all([tec.waitForURL("**/relatorio?**"), tec.getByRole("link", { name: "Relatório de decisão" }).click()]);
      await tec.getByRole("heading", { name: "Riscos e cenários" }).scrollIntoViewIfNeeded();
    });

    await passo(tec, "Técnico", "Escolhe a alternativa e monta o plano", "O app monta o plano com as tarefas na ordem: corrigir o solo, depois plantar.", async () => {
      await tec.goto(`${urlTalhaoTec}?aba=rotacoes`);
      const escolher = tec.getByRole("button", { name: "Escolher esta e montar o plano" }).first();
      await escolher.scrollIntoViewIfNeeded();
      await pausa(800);
      await Promise.all([tec.waitForURL("**aba=plano"), escolher.click()]);
    });

    await passo(tec, "Técnico", "Escreve o resumo e publica o plano", "O resumo é o que o produtor lê. Ao publicar, o produtor recebe um aviso em destaque.", async () => {
      await tec.fill("#resumo_produtor", "Vamos colocar uma planta de cobertura no inverno no lugar de parte do trigo. Ela protege o solo da enxurrada, devolve palha e ajuda a corrigir a acidez junto com o calcário. A soja continua no verão.");
      await tec.getByRole("button", { name: "Publicar para o produtor" }).click();
      await tec.getByText(/Publicado em/).first().waitFor();
      await tec.getByText(/ainda não abriu o plano/).waitFor();
    });

    // ───────── Produtor: recebe o plano, vê as opções e responde ─────────
    await passo(prod, "Produtor", "Entra pelo celular", "Login com o número de celular e a senha que o técnico mandou. Com uma propriedade só, o app abre direto nela.", async () => {
      await prod.goto(`${URL_BASE}/entrar`);
      await prod.fill('input[name="login"]', PRODUTOR.celular);
      await prod.fill('input[name="senha"]', PRODUTOR.senha);
      await Promise.all([prod.waitForURL("**/produtor/propriedades/**"), prod.getByRole("button", { name: "Entrar", exact: true }).click()]);
      await prod.getByText("Plano novo").waitFor();
    });

    await passo(prod, "Produtor", "Abre o plano e vê as opções comparadas", "O que muda, as três opções que o técnico comparou (com a nota de cada uma), por quê, quando e o que fazer.", async () => {
      await prod.getByRole("link", { name: "Ver o plano" }).click();
      await prod.waitForURL("**/produtor/planos/**");
      await prod.getByRole("heading", { name: "2. O que mais foi comparado" }).scrollIntoViewIfNeeded();
    });

    await passo(prod, "Produtor", "Combina o plano", "O produtor decide: combinado, ou manda uma dúvida. O técnico vê a resposta.", async () => {
      await prod.getByRole("button", { name: "Combinado" }).click();
      await prod.getByText("Você combinou este plano com o técnico.").waitFor();
    });

    await passo(tec, "Técnico", "Vê que o produtor combinou o plano", "Na aba Plano, a situação com o produtor: não abriu, abriu, combinou ou tem dúvida.", async () => {
      await tec.goto(`${urlTalhaoTec}?aba=plano`);
      await tec.getByText(/combinou o plano/).waitFor();
    });

    // ───────── Exemplo: segunda cliente, tudo cadastrado e esperando o plano ─────────
    if (EXEMPLO) {
      const segunda = CLIENTES[1];
      await cadastrarCliente(tec, segunda, { mostrarNasa: false });

      await passo(tec, "Técnico", "Vê a carteira de clientes", "Dois clientes: um com o plano combinado e outra com visita e análise de solo prontas, esperando o plano.", async () => {
        await tec.goto(`${URL_BASE}/tecnico`);
        await tec.getByText(segunda.produtor.nome).first().waitFor();
      });

      const prod2 = await (await navProdutor.newContext(celular)).newPage();
      vigiar(prod2, "produtora 2");
      await passo(prod2, "Produtor", `${segunda.produtor.nome.split(" ")[0]} vê a propriedade esperando o plano`, "Antes do plano, o produtor já vê a propriedade, os talhões, o tempo dos satélites da NASA e o contato da técnica.", async () => {
        await prod2.goto(`${URL_BASE}/entrar`);
        await prod2.fill('input[name="login"]', segunda.produtor.celular);
        await prod2.fill('input[name="senha"]', segunda.produtor.senha);
        await Promise.all([prod2.waitForURL("**/produtor/propriedades/**"), prod2.getByRole("button", { name: "Entrar", exact: true }).click()]);
        await prod2.getByText("Plano ainda não publicado").first().scrollIntoViewIfNeeded();
      });
    }
    ok = true;
  } catch (e) {
    console.error(`\n${e instanceof Error ? e.message : e}`);
  } finally {
    const arquivo = relatorio(inicio);
    console.log(`\nRelatório: ${arquivo}`);
    if (!RAPIDO) await pausa(2500);
    await navTecnico.close();
    await navProdutor.close();
    if (MANTER || EXEMPLO) {
      console.log(`Dados mantidos. Técnica: ${TECNICO.email} / ${TECNICO.senha}`);
      for (const c of CLIENTES_DA_EXECUCAO) console.log(`  ${c.produtor.nome}: ${c.produtor.celular} ou ${c.produtor.email} / ${c.produtor.senha}`);
    } else {
      const n = await limpar((e) => EMAILS.includes(e));
      console.log(`Dados da simulação apagados (${n} usuários e tudo ligado a eles).`);
    }
  }
  process.exitCode = ok ? 0 : 1;
}

await main();
