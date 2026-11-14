// Base simplificada de culturas e rotações. Notas de 0 a 3 (água de 1 a 4).
// PRECISA DE VALIDAÇÃO AGRONÔMICA: valores de referência para comparar opções, não para recomendar sozinho.
// Fontes a consultar para calibrar: FAO ECOCROP, Embrapa, ZARC (MAPA).

export type Regiao = "sul" | "cerrado";
export type TipoCultura = "grao" | "cobertura" | "forragem";

export interface Cultura {
  nome: string;
  curto?: string;
  sigla: string;
  tipo: TipoCultura;
  familias: string[];
  meses: Partial<Record<Regiao, [number, number]>>; // mês de plantio e de colheita/manejo (1–12)
  agua: number;
  renda: number;
  rendaComGado?: number;
  forragem: number;
  fixaN: number;
  palha: number;
  raizProfunda: number;
  tolEncharcamento: number;
  tolSeca: number;
  tolGeada: number;
  tolCalor: number;
  vIdeal: number; // saturação por bases desejada (%), Boletim 100 IAC
}

export const CULTURAS: Record<string, Cultura> = {
  soja: { nome: "Soja", sigla: "Soja", tipo: "grao", familias: ["leguminosa"], meses: { sul: [11, 3], cerrado: [10, 2] }, agua: 3, renda: 3, forragem: 0, fixaN: 1, palha: 1, raizProfunda: 0, tolEncharcamento: 1, tolSeca: 1, tolGeada: 0, tolCalor: 2, vIdeal: 60 },
  milho: { nome: "Milho", sigla: "Milho", tipo: "grao", familias: ["gramínea"], meses: { sul: [10, 2], cerrado: [10, 2] }, agua: 3, renda: 2, forragem: 2, fixaN: 0, palha: 3, raizProfunda: 0, tolEncharcamento: 1, tolSeca: 1, tolGeada: 0, tolCalor: 2, vIdeal: 70 },
  arroz: { nome: "Arroz irrigado", sigla: "Arroz", tipo: "grao", familias: ["gramínea"], meses: { sul: [10, 3] }, agua: 4, renda: 2, forragem: 0, fixaN: 0, palha: 2, raizProfunda: 0, tolEncharcamento: 3, tolSeca: 0, tolGeada: 0, tolCalor: 2, vIdeal: 50 },
  feijao: { nome: "Feijão", sigla: "Feij", tipo: "grao", familias: ["leguminosa"], meses: { sul: [9, 12], cerrado: [3, 6] }, agua: 2, renda: 2, forragem: 0, fixaN: 1, palha: 1, raizProfunda: 0, tolEncharcamento: 0, tolSeca: 1, tolGeada: 0, tolCalor: 1, vIdeal: 70 },
  sorgo: { nome: "Sorgo", sigla: "Sorgo", tipo: "grao", familias: ["gramínea"], meses: { sul: [11, 3], cerrado: [2, 6] }, agua: 1, renda: 1, forragem: 2, fixaN: 0, palha: 3, raizProfunda: 1, tolEncharcamento: 1, tolSeca: 3, tolGeada: 0, tolCalor: 3, vIdeal: 60 },
  trigo: { nome: "Trigo", sigla: "Trigo", tipo: "grao", familias: ["gramínea"], meses: { sul: [6, 10] }, agua: 2, renda: 2, forragem: 1, fixaN: 0, palha: 2, raizProfunda: 0, tolEncharcamento: 1, tolSeca: 1, tolGeada: 2, tolCalor: 0, vIdeal: 70 },
  aveiaErvilhaca: { nome: "Aveia-preta + ervilhaca", curto: "Aveia + ervilhaca", sigla: "Av+Er", tipo: "cobertura", familias: ["gramínea", "leguminosa"], meses: { sul: [4, 9] }, agua: 1, renda: 0, forragem: 2, fixaN: 1, palha: 3, raizProfunda: 0, tolEncharcamento: 2, tolSeca: 1, tolGeada: 3, tolCalor: 0, vIdeal: 60 },
  azevem: { nome: "Azevém para pastejo", curto: "Azevém", sigla: "Azev", tipo: "forragem", familias: ["gramínea"], meses: { sul: [4, 10] }, agua: 2, renda: 1, rendaComGado: 2, forragem: 3, fixaN: 0, palha: 2, raizProfunda: 0, tolEncharcamento: 3, tolSeca: 1, tolGeada: 3, tolCalor: 0, vIdeal: 60 },
  nabo: { nome: "Nabo forrageiro", sigla: "Nabo", tipo: "cobertura", familias: ["brássica"], meses: { sul: [4, 7] }, agua: 1, renda: 0, forragem: 1, fixaN: 0, palha: 2, raizProfunda: 1, tolEncharcamento: 1, tolSeca: 2, tolGeada: 2, tolCalor: 0, vIdeal: 60 },
  milhoSafrinha: { nome: "Milho safrinha", sigla: "Milho", tipo: "grao", familias: ["gramínea"], meses: { cerrado: [2, 6] }, agua: 3, renda: 2, forragem: 1, fixaN: 0, palha: 3, raizProfunda: 0, tolEncharcamento: 1, tolSeca: 1, tolGeada: 0, tolCalor: 2, vIdeal: 70 },
  milhoBraquiaria: { nome: "Milho safrinha + braquiária", curto: "Milho + braquiária", sigla: "Mi+Br", tipo: "grao", familias: ["gramínea"], meses: { cerrado: [2, 9] }, agua: 3, renda: 2, forragem: 3, fixaN: 0, palha: 3, raizProfunda: 1, tolEncharcamento: 1, tolSeca: 2, tolGeada: 0, tolCalor: 3, vIdeal: 70 },
  crotalaria: { nome: "Crotalária", sigla: "Crot", tipo: "cobertura", familias: ["leguminosa"], meses: { cerrado: [2, 6] }, agua: 1, renda: 0, forragem: 0, fixaN: 1, palha: 2, raizProfunda: 1, tolEncharcamento: 1, tolSeca: 2, tolGeada: 0, tolCalor: 3, vIdeal: 60 },
  milheto: { nome: "Milheto", sigla: "Milh", tipo: "cobertura", familias: ["gramínea"], meses: { cerrado: [3, 7] }, agua: 1, renda: 0, forragem: 2, fixaN: 0, palha: 3, raizProfunda: 1, tolEncharcamento: 1, tolSeca: 3, tolGeada: 0, tolCalor: 3, vIdeal: 50 },
};

/** Rotação em ciclo de dois anos: [verão ano 1, 2ª safra ano 1, verão ano 2, 2ª safra ano 2] */
export interface Rotacao {
  id: string;
  slots: (string | null)[];
  regiao: Regiao;
  ideia: string;
  atual?: boolean; // aparece como opção de "o que planta hoje"
  naoSugerir?: boolean;
  precisa?: "irrigacao" | "gado";
}

export const ROTACOES: Rotacao[] = [
  { id: "soja-trigo", regiao: "sul", slots: ["soja", "trigo", "soja", "trigo"], atual: true, ideia: "O sistema mais comum no Sul: duas safras de grão por ano." },
  { id: "soja-pousio", regiao: "sul", slots: ["soja", null, "soja", null], atual: true, naoSugerir: true, ideia: "Só a safra de verão; a terra fica parada no inverno." },
  { id: "milho-soja-trigo", regiao: "sul", slots: ["milho", "trigo", "soja", "trigo"], atual: true, ideia: "Alterna milho e soja no verão, com trigo no inverno." },
  { id: "soja-aveia", regiao: "sul", slots: ["soja", "aveiaErvilhaca", "soja", "aveiaErvilhaca"], atual: true, ideia: "Soja no verão e cobertura no inverno." },
  { id: "cobertura-milho", regiao: "sul", slots: ["soja", "aveiaErvilhaca", "milho", "trigo"], ideia: "Troca um inverno de trigo por cobertura que fixa nitrogênio para o milho seguinte." },
  { id: "diversa", regiao: "sul", slots: ["soja", "nabo", "milho", "aveiaErvilhaca"], ideia: "Três famílias de plantas e raízes profundas, para recuperar o solo." },
  { id: "pastejo", regiao: "sul", slots: ["soja", "azevem", "milho", "azevem"], precisa: "gado", ideia: "Usa o inverno para pasto do gado (integração lavoura-pecuária)." },
  { id: "sorgo", regiao: "sul", slots: ["sorgo", "aveiaErvilhaca", "soja", "trigo"], ideia: "Coloca sorgo, que aguenta melhor a falta de chuva, no lugar de uma soja." },
  { id: "arroz-soja", regiao: "sul", slots: ["arroz", "azevem", "soja", "azevem"], precisa: "irrigacao", ideia: "Rotação típica de várzea: arroz irrigado e soja, com azevém no inverno." },
  { id: "soja-milho", regiao: "cerrado", slots: ["soja", "milhoSafrinha", "soja", "milhoSafrinha"], atual: true, ideia: "O sistema mais comum no Cerrado: soja e milho safrinha." },
  { id: "soja-pousio-c", regiao: "cerrado", slots: ["soja", null, "soja", null], atual: true, naoSugerir: true, ideia: "Só a soja; a terra fica parada na seca." },
  { id: "braquiaria", regiao: "cerrado", slots: ["soja", "milhoBraquiaria", "soja", "milhoBraquiaria"], ideia: "Planta braquiária junto com o milho safrinha para cobrir o solo durante a seca." },
  { id: "crotalaria", regiao: "cerrado", slots: ["soja", "crotalaria", "soja", "milhoBraquiaria"], ideia: "Um ano de crotalária, que fixa nitrogênio e ajuda a controlar nematoides." },
  { id: "sorgo-c", regiao: "cerrado", slots: ["soja", "sorgo", "soja", "milhoBraquiaria"], ideia: "Sorgo na safrinha, mais tolerante à seca que o milho." },
  { id: "milheto", regiao: "cerrado", slots: ["soja", "milhoSafrinha", "soja", "milheto"], ideia: "Milheto como cobertura depois da soja, para palhada no plantio direto." },
];

export const MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function regiaoDe(lat: number): Regiao {
  return lat < -24 ? "sul" : "cerrado";
}

export function nomeCultura(id: string | null) {
  if (!id) return "Pousio";
  const c = CULTURAS[id];
  return c.curto ?? c.nome;
}

const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function nomeRotacao(r: Rotacao) {
  const s = r.slots;
  if (s[0] === s[2] && s[1] === s[3]) return `${nomeCultura(s[0])} → ${minus(nomeCultura(s[1]))} (todo ano)`;
  return `${nomeCultura(s[0])} → ${minus(nomeCultura(s[1]))} → ${minus(nomeCultura(s[2]))} → ${minus(nomeCultura(s[3]))}`;
}

export function rotacaoPorId(id: string | null | undefined) {
  return ROTACOES.find((r) => r.id === id);
}
