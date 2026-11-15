// Simulação do fluxo completo do Field Shift, do técnico ao produtor, clicando no app de verdade.
//
// Uso (com o servidor rodando: npm run dev -- -p 3123):
//   npm run simulacao                 abre o Chrome e mostra cada passo devagar
//   npm run simulacao -- --rapido     sem janela e sem pausas (bom para conferir se nada quebrou)
//   npm run simulacao -- --manter     não apaga os dados no fim (para apresentar ou explorar à mão)
//   npm run simulacao -- --url http://localhost:3000
//
// Cria um técnico e um produtor novos a cada execução (e-mails com carimbo de tempo) e, no fim,
// apaga tudo o que criou. Fotos de cada passo e um relatório em HTML ficam em simulacao/saida/<data>/.

import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { PNG } from "pngjs";
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
const CHROME = opcao("--chrome") ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

// Lavoura de soja e trigo no Planalto Médio gaúcho (Cruz Alta - RS)
const LOCAL = "-28.5795, -53.6630";
const carimbo = Date.now().toString(36);
const DIGITOS = String(Date.now()).slice(-8);
const TECNICO = { nome: "Marina Souza (simulação)", email: `sim.tecnico.${carimbo}@field.test`, telefone: "(55) 99111-2233", registro: "CREA-RS 123456", instituicao: "Emater/RS-Ascar", senha: "simulacao-123" };
const PRODUTOR = { nome: "Joaquim Pereira (simulação)", email: `sim.produtor.${carimbo}@field.test`, celular: `(55) 9${DIGITOS.slice(0, 4)}-${DIGITOS.slice(4)}`, senha: "lavoura-2026" };
const PROPRIEDADE = "Sítio Boa Esperança (simulação)";
const TALHOES = [
  { nome: "Talhão da coxilha", cor: "Laranja", dx: -1 },
  { nome: "Talhão da sanga", cor: "Azul", dx: 1 },
];

const quando = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const SAIDA = path.join(RAIZ, "simulacao", "saida", quando);
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

function fotoDaLavoura() {
  // Imagem gerada (folhas com manchas), só para o relato ter uma foto anexada
  const png = new PNG({ width: 480, height: 360 });
  for (let y = 0; y < 360; y++) for (let x = 0; x < 480; x++) {
    const i = (480 * y + x) << 2;
    const ruido = Math.sin(x / 9) * Math.cos(y / 11) * 30;
    const mancha = (x - 300) ** 2 + (y - 160) ** 2 < 2600 || (x - 140) ** 2 + (y - 240) ** 2 < 1500;
    png.data[i] = mancha ? 150 + ruido : 60 + ruido;
    png.data[i + 1] = mancha ? 110 + ruido : 140 + ruido;
    png.data[i + 2] = mancha ? 40 : 50;
    png.data[i + 3] = 255;
  }
  const arquivo = path.join(SAIDA, "foto-da-lavoura.png");
  writeFileSync(arquivo, PNG.sync.write(png));
  return arquivo;
}

function supabaseAdmin() {
  const env = Object.fromEntries(readFileSync(path.join(RAIZ, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/**
 * Apaga o que a simulação criou: usuários, propriedades dos técnicos e os arquivos delas.
 * Por padrão só os desta execução; com todas = true, os de todas as simulações (e-mails sim.*@field.test).
 */
async function limpar(todas = false) {
  const sb = supabaseAdmin();
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const daSimulacao = (e = "") => (todas ? /^sim\.(tecnico|produtor)\.[a-z0-9]+@field\.test$/.test(e) : e === TECNICO.email || e === PRODUTOR.email);
  const usuarios = data.users.filter((u) => daSimulacao(u.email));
  for (const tecnico of usuarios.filter((u) => u.email?.startsWith("sim.tecnico."))) {
    const { data: props } = await sb.from("propriedades").select("id").eq("tecnico_id", tecnico.id);
    for (const p of props ?? []) {
      const { data: arquivos } = await sb.storage.from("arquivos").list(`${p.id}/ocorrencias`);
      if (arquivos?.length) await sb.storage.from("arquivos").remove(arquivos.map((a) => `${p.id}/ocorrencias/${a.name}`));
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
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Simulação Field Shift · ${quando}</title>
<style>
:root{--bg:#f4f1e8;--fg:#1d2a1f;--muted:#5b6b5d;--line:#d9d3c2;--card:#fffdf7;--tec:#1d5fa6;--prod:#2f7d4a;--bad:#b23b2c}
@media (prefers-color-scheme:dark){:root{--bg:#141a15;--fg:#e8efe6;--muted:#9fb0a2;--line:#2c372e;--card:#1b231c;--tec:#7fb0ec;--prod:#6cc28a;--bad:#ec7a6a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left))}
h1{font-size:1.8rem;margin:0 0 4px;text-wrap:balance}p.sub{color:var(--muted);margin:0 0 24px}
.resumo{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px}.resumo div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}
.resumo b{display:block;font-size:1.3rem}ol{list-style:none;padding:0;margin:0;display:grid;gap:18px}
li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
@media (min-width:800px){li{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)}}
.ator{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:99px;color:var(--card)}
.Técnico{background:var(--tec)}.Produtor{background:var(--prod)}h2{font-size:1.1rem;margin:6px 0 4px}.meta{color:var(--muted);font-size:.85rem}
.erro{color:var(--bad);font-weight:600}img{width:100%;border-radius:10px;border:1px solid var(--line);display:block}
.cel img{max-width:300px;margin:0 auto}
</style></head><body><main>
<h1>Simulação do fluxo Field Shift</h1>
<p class="sub">${esc(quando.replace(/-(\d\d)-(\d\d)$/, " $1:$2"))} · ${esc(URL_BASE)} · técnico ${esc(TECNICO.email)} · produtor ${esc(PRODUTOR.email)}</p>
<div class="resumo"><div><b>${okTodos ? "Tudo certo" : "Falhou"}</b>resultado</div><div><b>${passos.filter((p) => p.ok).length}/${passos.length}</b>passos concluídos</div><div><b>${total} s</b>duração</div><div><b>${errosNoNavegador.length}</b>erros no console</div></div>
<ol>${passos.map((p) => `<li${p.ator === "Produtor" ? ' class="cel"' : ""}><div><span class="ator ${p.ator}">${p.ator}</span><h2>${p.n}. ${esc(p.titulo)}</h2><p>${esc(p.descricao)}</p><p class="meta">${(p.ms / 1000).toFixed(1)} s</p>${p.erro ? `<p class="erro">${esc(p.erro)}</p>` : ""}</div><img src="${p.foto}" alt="Tela do passo ${p.n}: ${esc(p.titulo)}" loading="lazy"></li>`).join("")}</ol>
${errosNoNavegador.length ? `<h2>Erros no console do navegador</h2><pre>${esc(errosNoNavegador.join("\n"))}</pre>` : ""}
</main></body></html>`;
  writeFileSync(path.join(SAIDA, "relatorio.html"), html);
  return path.join(SAIDA, "relatorio.html");
}

async function main() {
  if (SO_LIMPAR) {
    console.log(`Apagados ${await limpar(true)} usuários de simulações anteriores e tudo ligado a eles.`);
    return;
  }
  const inicio = Date.now();
  const resposta = await fetch(`${URL_BASE}/entrar`).catch(() => null);
  if (!resposta?.ok) throw new Error(`O app não respondeu em ${URL_BASE}. Rode antes: npm run dev -- -p 3123`);
  console.log(`Simulação em ${URL_BASE}\nTécnico: ${TECNICO.email}\nProdutor: ${PRODUTOR.email} · ${PRODUTOR.celular}\nSaída: ${SAIDA}\n`);

  const abrir = (x, largura, altura) => chromium.launch({
    executablePath: CHROME, headless: RAPIDO, slowMo: RAPIDO ? 0 : 60,
    args: [`--window-position=${x},0`, `--window-size=${largura},${altura}`],
  });
  const navTecnico = await abrir(0, 1300, 960);
  const navProdutor = await abrir(1310, 440, 960);
  const tec = await (await navTecnico.newContext({ viewport: { width: 1280, height: 860 }, locale: "pt-BR" })).newPage();
  // O produtor usa o celular
  const prod = await (await navProdutor.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-BR" })).newPage();
  for (const [pagina, quem] of [[tec, "técnico"], [prod, "produtor"]]) {
    pagina.setDefaultTimeout(90_000);
    pagina.on("console", (m) => { if (m.type() === "error") errosNoNavegador.push(`[${quem}] ${m.text().slice(0, 300)}`); });
  }

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

    await passo(tec, "Técnico", "Cadastra o produtor e cria o acesso dele", "Não existe cadastro aberto para produtor: o técnico cria o login (e-mail e celular) e a senha, e manda pelo WhatsApp.", async () => {
      await tec.getByRole("link", { name: "Novo cliente" }).first().click();
      await tec.waitForURL("**/tecnico/produtores/novo");
      await tec.fill('input[name="nome"]', PRODUTOR.nome);
      await tec.fill('input[name="celular"]', PRODUTOR.celular);
      await tec.fill('input[name="email"]', PRODUTOR.email);
      await tec.fill('input[name="senha"]', PRODUTOR.senha);
      await tec.fill('textarea[name="observacoes"]', "Soja e trigo há 10 anos. Quer recuperar o solo e reduzir adubo.").catch(() => {});
      await tec.getByRole("button", { name: "Salvar cliente e criar acesso" }).click();
      await tec.getByRole("link", { name: /Cadastrar a propriedade de/ }).waitFor();
    });

    await passo(tec, "Técnico", "Marca a propriedade no mapa", "Busca pelas coordenadas: o mapa marca o ponto e preenche município, UF e endereço. O técnico desenha o limite e dá o nome.", async () => {
      await tec.getByRole("link", { name: /Cadastrar a propriedade de/ }).click();
      await tec.waitForURL("**/propriedades/nova");
      await tec.getByPlaceholder(/coordenadas/).fill(LOCAL);
      await tec.getByRole("button", { name: "Buscar" }).click();
      await tec.getByText(/Preenchido pelo mapa|não achou o município|Preencha à mão/).waitFor();
      // Retângulo de 520 × 340 px: cerca de 75 ha no zoom 16, 19 ha no 17. Milhares de ha = mapa ainda longe
      await desenharArea(tec, tec.locator("main"), [[-260, -170], [260, -170], [260, 170], [-260, 170]], /limite de/, [10, 250],
        () => tec.getByRole("button", { name: "Buscar" }).click());
      await tec.fill('input[name="nome"]', PROPRIEDADE);
      await pausa(600);
      await Promise.all([tec.waitForURL(/\/tecnico\/propriedades\/[^/]+$/), tec.getByRole("button", { name: "Salvar e desenhar os talhões" }).click()]);
    });
    const urlPropriedadeTec = tec.url();

    for (const [i, t] of TALHOES.entries()) {
      await passo(tec, "Técnico", `Desenha o ${t.nome.toLowerCase()}`, `Contorno desenhado sobre a imagem de satélite, cor ${t.cor.toLowerCase()} e o que se planta hoje. Ao salvar, o app busca 20 anos de clima (NASA POWER) e o relevo (SRTM).`, async () => {
        if (i > 0) await tec.goto(urlPropriedadeTec);
        const secao = tec.locator("section", { hasText: "Cadastrar novo talhão" });
        await secao.locator(".maplibregl-canvas").waitFor();
        await desenharArea(tec, secao, [[t.dx * 20, -110], [t.dx * 200, -110], [t.dx * 200, 120], [t.dx * 20, 120]], /Área desenhada/, [1, 80]);
        await secao.locator("#nome").fill(t.nome);
        await secao.locator(`label[title^="${t.cor}"]`).click();
        if (i === 0) await secao.locator("#rotacao_atual").selectOption({ index: 1 });
        await Promise.all([tec.waitForURL("**/tecnico/talhoes/**", { timeout: 120_000 }), secao.getByRole("button", { name: "Salvar talhão" }).click()]);
        await tec.getByRole("heading", { name: "Riscos do talhão" }).waitFor({ timeout: 120_000 });
      });
    }

    await tec.goto(urlPropriedadeTec);
    await tec.locator("li", { hasText: TALHOES[0].nome }).getByRole("link", { name: "Abrir talhão" }).click();
    await tec.waitForURL("**/tecnico/talhoes/**");
    const urlTalhaoTec = tec.url().split("?")[0];

    await passo(tec, "Técnico", "Lê os dados da NASA do talhão", "Riscos de alagamento, erosão, geada, seca e calor calculados com 20 anos de NASA POWER e o relevo do SRTM.", async () => {
      await tec.getByRole("heading", { name: "Riscos do talhão" }).waitFor();
      await tec.getByRole("heading", { name: "Clima mês a mês (2005–2024)" }).scrollIntoViewIfNeeded();
    });

    await passo(tec, "Técnico", "Registra a visita técnica", "O que o satélite não vê: alagamento, erosão, compactação, manejo, máquinas e o que o produtor quer.", async () => {
      await tec.getByRole("link", { name: "Registrar visita" }).first().click();
      await tec.waitForURL("**/visita?talhao=**");
      await tec.fill("#objetivo", "Diagnóstico inicial e coleta de solo");
      await tec.fill("#uso_atual", "Lavoura de grãos");
      await tec.fill("#cultura_atual", "Soja recém-emergida");
      await tec.fill("#historico", "Soja/trigo há 10 anos, plantio direto");
      for (const opcao of ["Às vezes, em chuva forte", "Laminar", "Suspeita", "Parcial", "Sim"]) {
        await tec.locator("label", { hasText: new RegExp(`^${opcao}$`) }).first().click();
      }
      await tec.fill("#maquinario", "Plantadeira de plantio direto, pulverizador");
      await tec.fill("#mercado", "Cooperativa");
      await tec.fill("#objetivo_produtor", "Recuperar o solo e gastar menos com adubo");
      await Promise.all([tec.waitForURL("**/tecnico/talhoes/**"), tec.getByRole("button", { name: "Salvar visita" }).click()]);
    });

    await passo(tec, "Técnico", "Registra a análise de solo", "Valores do laudo do laboratório. O app interpreta pela tabela do IAC (Boletim 100) e mostra o que precisa de correção.", async () => {
      await tec.goto(`${urlTalhaoTec}?aba=solo`);
      const valores = { ph: 4.8, p: 7, k: 1.6, ca: 21, mg: 7, al: 5, hal: 55, mo: 26, argila: 48 };
      for (const [k, v] of Object.entries(valores)) await tec.fill(`#f-${k}`, String(v));
      await tec.fill('input[name="laboratorio"]', "Laboratório de Solos UFSM").catch(() => {});
      await tec.getByRole("button", { name: "Salvar amostra" }).click();
      await tec.waitForURL("**aba=solo");
      await tec.getByRole("button", { name: "Excluir" }).first().waitFor();
    });

    await passo(tec, "Técnico", "Compara as rotações e escolhe uma", "As rotações possíveis para a região, com notas de solo, erosão, clima, renda, água e forragem. O técnico escolhe e o app monta o plano com as tarefas.", async () => {
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

    // ───────── Produtor: recebe o plano e tira uma dúvida ─────────
    await passo(prod, "Produtor", "Entra pelo celular", "Login com o número de celular e a senha que o técnico mandou. Com uma propriedade só, o app abre direto nela.", async () => {
      await prod.goto(`${URL_BASE}/entrar`);
      await prod.fill('input[name="login"]', PRODUTOR.celular);
      await prod.fill('input[name="senha"]', PRODUTOR.senha);
      await Promise.all([prod.waitForURL("**/produtor/propriedades/**"), prod.getByRole("button", { name: "Entrar", exact: true }).click()]);
      await prod.getByText("Plano novo").waitFor();
    });
    const urlPropriedadeProd = prod.url();

    await passo(prod, "Produtor", "Abre o plano novo", "O plano contado em quatro partes: o que muda, por quê, quando (calendário) e o que fazer.", async () => {
      await prod.getByRole("link", { name: "Ver o plano" }).click();
      await prod.waitForURL("**/produtor/planos/**");
      await prod.getByRole("heading", { name: "1. O que muda" }).waitFor();
    });
    const urlPlanoProd = prod.url();

    await passo(prod, "Produtor", "Manda uma dúvida sobre o plano", "Algo não encaixa na realidade dele? Ele pergunta, e o técnico vê na hora.", async () => {
      await prod.getByRole("button", { name: "Tenho dúvida" }).click();
      await prod.fill("#duvida", "Não tenho semeadora para aveia. Dá para jogar a lanço?");
      await prod.getByRole("button", { name: "Enviar dúvida" }).click();
      await prod.getByText("Você mandou uma dúvida ao técnico.").waitFor();
    });

    // ───────── Técnico responde ─────────
    await passo(tec, "Técnico", "Responde a dúvida pelo app", "A dúvida aparece na tela inicial do técnico. A resposta vai para a tela do plano do produtor.", async () => {
      await tec.goto(`${URL_BASE}/tecnico`);
      await tec.locator("section", { hasText: "Dúvidas sobre planos para responder" }).first().locator("a").first().click();
      await tec.waitForURL("**aba=plano");
      await tec.fill('textarea[name="resposta_tecnico"]', "Dá sim: a lanço, logo antes de uma chuva, com um pouco mais de semente (uns 20% a mais). Passo aí para regular a máquina com você.");
      await tec.getByRole("button", { name: "Enviar resposta" }).click();
      await tec.getByText(/Você respondeu a dúvida de/).waitFor();
    });

    // ───────── Produtor combina, trabalha e relata ─────────
    await passo(prod, "Produtor", "Vê a resposta e combina o plano", "O aviso volta à propriedade com a resposta. Ele lê a conversa e confirma.", async () => {
      await prod.goto(urlPropriedadeProd);
      await prod.getByRole("link", { name: "Ver a resposta" }).click();
      await prod.waitForURL("**/produtor/planos/**");
      await prod.getByRole("button", { name: "Combinado" }).click();
      await prod.getByText("Você combinou este plano com o técnico.").waitFor();
    });

    await passo(prod, "Produtor", "Marca uma tarefa como feita", "Cada tarefa do plano tem um botão grande. O comentário vai para o técnico.", async () => {
      await prod.goto(urlPlanoProd);
      // Acha a tarefa pelo título, não pela posição
      const titulo = await prod.locator("#tarefas li b").first().innerText();
      const tarefa = prod.locator("#tarefas li", { hasText: titulo });
      await tarefa.scrollIntoViewIfNeeded();
      await tarefa.locator('input[name="nota"]').fill("Feito no sábado, comprei na cooperativa.");
      await tarefa.getByRole("button", { name: "Marquei como feito" }).click();
      await tarefa.getByText(/Feita em/).waitFor();
    });

    await passo(prod, "Produtor", "Relata uma praga com foto", "Pela barra do celular: escolhe o talhão, toca no ponto exato no mapa, tira a foto e conta o que viu.", async () => {
      await prod.goto(urlPropriedadeProd);
      await prod.getByRole("navigation", { name: "Atalhos" }).getByRole("link", { name: "Relatar" }).click();
      await prod.waitForURL("**/relatar");
      await prod.getByText("Um talhão específico", { exact: true }).click();
      await prod.locator("label", { hasText: TALHOES[0].nome }).click();
      await esperar(2500);
      await tocarNoMapa(prod, prod.locator(".maplibregl-canvas"), [[-15, 20]]);
      await prod.getByText("Ponto que você marcou no mapa").waitFor();
      await prod.getByText("Praga", { exact: true }).click();
      await prod.setInputFiles('input[name="foto"]', fotoDaLavoura());
      await prod.fill("#descricao", "Lagarta comendo as folhas numa mancha perto da cerca, desde segunda.");
      await Promise.all([prod.waitForURL("**/produtor/talhoes/**?relato=ok"), prod.getByRole("button", { name: "Enviar para o técnico" }).click()]);
    });

    // ───────── Técnico fecha o ciclo ─────────
    await passo(tec, "Técnico", "Vê o relato no mapa da propriedade", "Cada relato vira um pino no local anexado, na cor da situação (laranja: novo).", async () => {
      await tec.goto(urlPropriedadeTec);
      const pino = tec.locator('.maplibregl-marker[aria-label^="Praga"]');
      await pino.waitFor();
      await tec.locator("section", { hasText: "Cadastrar novo talhão" }).locator(".maplibregl-canvas").scrollIntoViewIfNeeded();
    });

    await passo(tec, "Técnico", "Responde o relato e marca resolvido", "Abre o relato com a foto, orienta o produtor e marca como resolvido.", async () => {
      await tec.locator('.maplibregl-marker[aria-label^="Praga"]').click();
      await tec.waitForURL("**aba=campo");
      await tec.locator('input[name="resposta"]').first().fill("Pela foto é lagarta-falsa-medideira. Passo amanhã cedo para contar e decidir se precisa aplicar.");
      await tec.getByRole("button", { name: "Marcar resolvida" }).first().click();
      await tec.getByText("Resolvida", { exact: true }).first().waitFor();
    });

    await passo(tec, "Técnico", "Acompanha o plano combinado e a tarefa feita", "Na aba Plano: o produtor combinou (com a conversa guardada) e a tarefa aparece como feita, com o comentário dele.", async () => {
      await tec.goto(`${urlTalhaoTec}?aba=plano`);
      await tec.getByText(/combinou o plano/).waitFor();
      await tec.getByText(/Produtor: Feito no sábado/).scrollIntoViewIfNeeded();
    });

    await passo(prod, "Produtor", "Recebe a resposta do relato", "Na página do talhão, o relato aparece como resolvido, com a orientação do técnico.", async () => {
      await prod.goto(urlPropriedadeProd);
      await prod.locator("li", { hasText: TALHOES[0].nome }).getByRole("link", { name: "Abrir talhão" }).click();
      await prod.waitForURL("**/produtor/talhoes/**");
      const relato = prod.getByText(/Técnico:/).first();
      await relato.waitFor();
      await relato.scrollIntoViewIfNeeded();
    });
    ok = true;
  } catch (e) {
    console.error(`\n${e instanceof Error ? e.message : e}`);
  } finally {
    const arquivo = relatorio(inicio);
    console.log(`\nRelatório: ${arquivo}`);
    if (!RAPIDO) await pausa(2500);
    await navTecnico.close();
    await navProdutor.close();
    if (MANTER) {
      console.log(`Dados mantidos. Técnico: ${TECNICO.email} / ${TECNICO.senha} · Produtor: ${PRODUTOR.celular} / ${PRODUTOR.senha}`);
    } else {
      const n = await limpar();
      console.log(`Dados da simulação apagados (${n} usuários e tudo ligado a eles).`);
    }
  }
  process.exitCode = ok ? 0 : 1;
}

await main();
