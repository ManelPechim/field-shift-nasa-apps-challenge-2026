// Motor de comparação de rotações. Regras simples e visíveis para o técnico conferir.
import { CULTURAS, ROTACOES, nomeCultura, nomeRotacao, type Regiao, type Rotacao } from "./culturas";
import { NIVEL, type Riscos } from "./riscos";

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const CRITERIOS = [
  ["solo", "Saúde do solo"],
  ["erosao", "Proteção contra erosão"],
  ["clima", "Segurança climática"],
  ["renda", "Renda esperada"],
  ["agua", "Economia de água"],
  ["forragem", "Forragem para o gado"],
] as const;
export type Criterio = (typeof CRITERIOS)[number][0];
export type Prioridades = Record<Exclude<Criterio, "clima">, number>; // 1 pouco, 2 médio, 3 muito

export interface Contexto {
  regiao: Regiao;
  riscos: Riscos;
  chuva: number[];
  geadaDias: number[];
  gado: boolean;
  irrigacao: boolean;
}

interface Penalidade { id: string; slot: number; meses: number[]; alag: number; seca: number; geada: number; calor: number; total: number }

export interface Avaliacao extends Record<Criterio, number> {
  rotacao: Rotacao;
  nome: string;
  ocupacao: (string | null)[][];
  mesesDescobertos: number[][];
  descobertoMedio: number;
  chuvaDescoberto: number;
  aguaMedia: number;
  rendaBase: number;
  penalidades: Penalidade[];
  nFamilias: number;
  alternaVerao: boolean;
  combina: number;
  bloqueio: string | null;
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const meses = (id: string, r: Regiao) => CULTURAS[id].meses[r] ?? CULTURAS[id].meses.sul!;
const cobre = (a: [number, number], m: number) => (a[0] <= a[1] ? m >= a[0] && m <= a[1] : m >= a[0] || m <= a[1]);
function listaMeses(id: string, r: Regiao) {
  const out: number[] = [];
  for (let m = 1; m <= 12; m++) if (cobre(meses(id, r), m)) out.push(m - 1);
  return out;
}

/** O que ocupa o talhão em cada mês, nos dois anos do ciclo. */
export function ocupacao(rot: Rotacao, r: Regiao) {
  const rows: (string | null)[][] = [[], []];
  for (let y = 0; y < 2; y++) {
    for (let m = 1; m <= 12; m++) {
      const cand: string[] = [];
      const agora = rot.slots[y * 2], proximo = rot.slots[((y + 1) % 2) * 2], segunda = rot.slots[y * 2 + 1];
      if (agora) { const a = meses(agora, r); if (a[0] > a[1]) { if (m <= a[1]) cand.push(agora); } else if (cobre(a, m)) cand.push(agora); }
      if (proximo) { const b = meses(proximo, r); if (b[0] > b[1] && m >= b[0]) cand.push(proximo); }
      if (segunda && cobre(meses(segunda, r), m)) cand.push(segunda);
      rows[y].push(cand.find((id) => meses(id, r)[0] === m) ?? cand[0] ?? null);
    }
  }
  return rows;
}

export function avaliar(rot: Rotacao, c: Contexto, pri: Prioridades): Avaliacao {
  const { regiao: r, riscos: R, chuva } = c;
  const s = rot.slots;
  const occ = ocupacao(rot, r);
  const desc = occ.map((row) => row.flatMap((id, i) => (id ? [] : [i])));
  const descMedio = (desc[0].length + desc[1].length) / 2;
  const chuvaDesc = [...desc[0], ...desc[1]].reduce((a, i) => a + chuva[i], 0) / 2;

  const aguaMedia = s.reduce((a, id) => a + (id ? CULTURAS[id].agua : 1), 0) / 4;
  const agua = clamp(100 - (aguaMedia - 1) * 30);

  const penalidades: Penalidade[] = [];
  s.forEach((id, k) => {
    if (!id) return;
    const cu = CULTURAS[id], verao = k % 2 === 0, ms = listaMeses(id, r);
    const alag = R.alagamento * (3 - cu.tolEncharcamento) * 4 * (verao ? 1 : 0.6);
    const fracSeca = ms.filter((i) => chuva[i] < 100).length / ms.length;
    const seca = R.seca * (3 - cu.tolSeca) * 4 * (0.5 + fracSeca);
    const diasGeada = ms.reduce((a, i) => a + c.geadaDias[i], 0);
    const geada = R.geada * (3 - cu.tolGeada) * 4 * Math.min(1, diasGeada / 4);
    const calor = verao ? R.calor * (3 - cu.tolCalor) * 3 : 0;
    penalidades.push({ id, slot: k, meses: ms, alag, seca, geada, calor, total: alag + seca + geada + calor });
  });
  const penMedia = penalidades.length ? penalidades.reduce((a, p) => a + p.total, 0) / penalidades.length : 0;
  const clima = clamp(100 - penMedia * 2.2);

  const rendaBase = (s.reduce((a, id) => (id ? a + (c.gado && CULTURAS[id].rendaComGado != null ? CULTURAS[id].rendaComGado! : CULTURAS[id].renda) : a), 0) / 12) * 100;
  const renda = clamp(rendaBase * (0.55 + (0.45 * clima) / 100));
  const forragem = clamp((s.reduce((a, id) => a + (id ? CULTURAS[id].forragem : 0), 0) / 12) * 100);

  let nfix = 0, palha = 0, raiz = 0;
  const fams = new Set<string>();
  s.forEach((id) => { if (!id) return; const cu = CULTURAS[id]; nfix += cu.fixaN; palha += cu.palha; raiz += cu.raizProfunda; cu.familias.forEach((f) => fams.add(f)); });
  const alterna = s[0] !== s[2];
  const solo = clamp(10 + 8 * nfix + 4 * palha + 8 * raiz + 8 * (fams.size - 1) + (alterna ? 8 : 0) - 7 * descMedio);

  const fatorDecl = [0.6, 0.8, 1.1, 1.4][R.erosao];
  const fatorChuva = descMedio > 0 ? clamp(chuvaDesc / descMedio / 120, 0.6, 1.5) : 1;
  const erosao = clamp(100 - descMedio * 12 * fatorDecl * fatorChuva - (3 - palha / 4) * 8);

  const av = { solo, erosao, clima, renda, agua, forragem };
  const w = { ...pri, clima: 2 };
  const combina = (Object.keys(w) as Criterio[]).reduce((a, k) => a + av[k] * w[k], 0) / Object.values(w).reduce((a, b) => a + b, 0);
  const bloqueio = rot.precisa === "irrigacao" && !c.irrigacao ? "Precisa de irrigação" : rot.precisa === "gado" && !c.gado ? "Precisa de gado ou de quem compre o pasto" : null;

  return {
    rotacao: rot, nome: nomeRotacao(rot), ocupacao: occ, mesesDescobertos: desc, descobertoMedio: descMedio, chuvaDescoberto: chuvaDesc,
    aguaMedia, rendaBase, penalidades, nFamilias: fams.size, alternaVerao: alterna, ...av, combina, bloqueio,
  };
}

export function comparar(atualId: string | null, c: Contexto, pri: Prioridades) {
  const lista = ROTACOES.filter((r) => r.regiao === c.regiao);
  const avs = lista.map((r) => avaliar(r, c, pri));
  const atual = avs.find((a) => a.rotacao.id === atualId) ?? avs.find((a) => a.rotacao.atual)!;
  const alternativas = avs.filter((a) => a !== atual && !a.bloqueio && !a.rotacao.naoSugerir).sort((a, b) => b.combina - a.combina);
  return {
    atual,
    top: [atual, ...alternativas.slice(0, 2)],
    outras: [...alternativas.slice(2), ...avs.filter((a) => a !== atual && a.bloqueio)],
  };
}

// ---------- Textos explicativos ----------
const lista = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}`);
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
function nomes(av: Avaliacao, f: (id: string) => boolean) {
  return [...new Set(av.rotacao.slots.filter((x): x is string => !!x))].filter(f).map((id) => nomeCultura(id));
}
export function mesesTexto(idx: number[]) {
  return [...new Set(idx)].sort((a, b) => a - b).map((i) => MESES[i]).join(", ");
}

export function porQue(av: Avaliacao, atual: Avaliacao, pri: Prioridades) {
  if (av === atual) return "É o que se planta hoje. Serve de base para comparar.";
  const w = { ...pri, clima: 2 } as Record<Criterio, number>;
  const ds = CRITERIOS.map(([k, n]) => ({ n, d: av[k] - atual[k], w: w[k] }))
    .filter((d) => d.d >= 4)
    .sort((a, b) => b.d * b.w - a.d * a.w)
    .slice(0, 2);
  if (!ds.length) return av.rotacao.ideia;
  const imp = ds.filter((d) => d.w >= 3).length;
  return `${av.rotacao.ideia} Melhora ${lista(ds.map((d) => `${minus(d.n)} (+${Math.round(d.d)})`))}${imp ? `, prioridade${imp > 1 ? "s" : ""} marcada${imp > 1 ? "s" : ""} como muito importante${imp > 1 ? "s" : ""}` : ""}.`;
}

export function evidencias(av: Avaliacao, R: Riscos) {
  const out: { texto: string; fonte: string }[] = [];
  const todos = [...av.mesesDescobertos[0], ...av.mesesDescobertos[1]];
  if (av.descobertoMedio > 0) out.push({ texto: `Solo descoberto em média ${av.descobertoMedio.toLocaleString("pt-BR")} meses por ano (${mesesTexto(todos)}), quando caem cerca de ${Math.round(av.chuvaDescoberto)} mm de chuva.`, fonte: "NASA POWER" });
  else out.push({ texto: "Solo coberto o ano todo pelo calendário de plantio.", fonte: "Calendário da rotação" });
  const pior = [...av.penalidades].sort((a, b) => b.total - a.total)[0];
  if (pior && pior.total >= 10) {
    const comp = ([..."alag seca geada calor".split(" ")] as ("alag" | "seca" | "geada" | "calor")[]).sort((a, b) => pior[b] - pior[a])[0];
    const chave = { alag: "alagamento", seca: "seca", geada: "geada", calor: "calor" } as const;
    const nome = { alag: "alagamento", seca: "falta de chuva", geada: "geada", calor: "calor" }[comp];
    out.push({ texto: `${nomeCultura(pior.id)} fica no campo de ${MESES[pior.meses[0]]} a ${MESES[pior.meses[pior.meses.length - 1]]}, numa área com risco ${minus(NIVEL[R[chave[comp]]])} de ${nome}.`, fonte: comp === "alag" ? "Visita + SRTM" : "NASA POWER" });
  }
  out.push({ texto: `Demanda de água das culturas: ${av.aguaMedia <= 1.6 ? "baixa" : av.aguaMedia <= 2.4 ? "média" : "alta"}.`, fonte: "Base de culturas" });
  return out;
}

export function beneficios(av: Avaliacao) {
  const out: string[] = [];
  const nf = nomes(av, (id) => !!CULTURAS[id].fixaN); if (nf.length) out.push(`${lista(nf)} ${nf.length > 1 ? "fixam" : "fixa"} nitrogênio do ar: menos adubo nitrogenado na cultura seguinte.`);
  const cb = nomes(av, (id) => CULTURAS[id].tipo === "cobertura"); if (cb.length) out.push(`${lista(cb)} ${cb.length > 1 ? "protegem" : "protege"} o solo e deixa${cb.length > 1 ? "m" : ""} palhada para o plantio direto.`);
  const rz = nomes(av, (id) => !!CULTURAS[id].raizProfunda); if (rz.length) out.push(`${lista(rz)} ${rz.length > 1 ? "têm" : "tem"} raízes profundas, que ajudam a romper camadas compactadas.`);
  if (av.alternaVerao && av.nFamilias >= 2) out.push("Alterna culturas no verão e quebra o ciclo de pragas e doenças.");
  const ts = nomes(av, (id) => CULTURAS[id].tolSeca >= 3); if (ts.length) out.push(`${lista(ts)} aguenta${ts.length > 1 ? "m" : ""} melhor a falta de chuva.`);
  const te = nomes(av, (id) => CULTURAS[id].tolEncharcamento >= 3); if (te.length) out.push(`${lista(te)} ${te.length > 1 ? "toleram" : "tolera"} solo encharcado.`);
  if (av.forragem >= 40) out.push("Produz pasto ou silagem para o gado.");
  if (av.rendaBase >= 75) out.push("Duas safras comerciais por ano.");
  return out.length ? out : ["Sistema conhecido, sem mudança de máquinas ou de manejo."];
}

export function riscosDaRotacao(av: Avaliacao, R: Riscos) {
  const out: string[] = [];
  [...av.penalidades].sort((a, b) => b.total - a.total).forEach((p) => {
    if (out.length >= 2) return;
    const risco = p.alag >= 12 ? `${nomeCultura(p.id)} sofre com solo encharcado${R.alagamento >= 3 ? "; o risco de perda é alto nesta área" : ""}.`
      : p.seca >= 12 ? `${nomeCultura(p.id)} sente a falta de chuva no período em que fica no campo.`
      : p.geada >= 8 ? `${nomeCultura(p.id)} pode perder produção com geada na floração.`
      : null;
    // A mesma cultura aparece nos dois anos da rotação: conta o risco uma vez só
    if (risco && !out.includes(risco)) out.push(risco);
  });
  const s = av.rotacao.slots;
  if (!av.alternaVerao && s[0]) out.push(`Mesma cultura todo verão: pragas e doenças da ${minus(nomeCultura(s[0]))} se acumulam.`);
  if (av.descobertoMedio >= 3) out.push("Muitos meses sem cobertura: perda de solo e de umidade.");
  if (s.includes("azevem")) out.push("Gado demais no pasto compacta o solo. Controle a lotação.");
  if (s.some((id) => id && CULTURAS[id].tipo === "cobertura")) out.push("A cobertura não dá renda direta e tem custo de semente.");
  if (s.includes("arroz")) out.push("Exige irrigação e terreno nivelado.");
  return out;
}

export function lacunas(temLaudo: boolean) {
  const out = ["Preço e compradores locais de cada cultura.", "Histórico de pragas e doenças do talhão.", "Janela de plantio oficial do ZARC (MAPA) para o município e o tipo de solo."];
  if (!temLaudo) out.push("Análise de solo ainda não registrada.");
  return out;
}
