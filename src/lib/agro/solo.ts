// Interpretação do laudo de solo e diagnóstico de saúde do solo.
import { CULTURAS, nomeCultura, type Rotacao } from "./culturas";
import type { Enzimas, ValoresSolo } from "@/lib/tipos";

export type Tom = "ruim" | "atencao" | "bom" | "info";
export interface Indicador { nome: string; valor: string; classe: string; tom: Tom; explicacao: string }

const NB = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"];
const faixa = (v: number, cortes: number[]) => { for (let i = 0; i < cortes.length; i++) if (v < cortes[i]) return i; return cortes.length; };
const fmt = (v: number, d: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function somaBases(v: ValoresSolo) { return (v.k ?? 0) + (v.ca ?? 0) + (v.mg ?? 0); }
export function ctc(v: ValoresSolo) { return somaBases(v) + (v.hal ?? 0); }
export function saturacaoBases(v: ValoresSolo) { const t = ctc(v); return t > 0 ? (100 * somaBases(v)) / t : null; }

export interface Interpretacao {
  sb: number; ctc: number; v: number | null; ph: number | null;
  classeP: number | null; classeK: number | null; moBaixa: boolean; alToxico: boolean;
  indicadores: Indicador[];
}

/** Faixas para culturas anuais do Boletim 100 (IAC); matéria orgânica pela referência RS/SC. */
export function interpretar(val: ValoresSolo): Interpretacao {
  const sb = somaBases(val), t = ctc(val), v = saturacaoBases(val);
  const ph = val.ph ?? (val.ph_agua != null ? val.ph_agua - 0.6 : null);
  const m = (val.al ?? 0) > 0 ? (100 * val.al!) / (sb + val.al!) : 0;
  const ind: Indicador[] = [];
  let classeP: number | null = null, classeK: number | null = null;

  if (ph != null) {
    const i = ph <= 4.3 ? 0 : ph <= 5.0 ? 1 : ph <= 5.5 ? 2 : ph <= 6.0 ? 3 : 4;
    ind.push({ nome: val.ph == null ? "pH (CaCl₂) estimado" : "pH (CaCl₂)", valor: fmt(ph, 1), classe: ["Acidez muito alta", "Acidez alta", "Acidez média", "Acidez baixa", "Acidez muito baixa"][i], tom: i <= 1 ? "ruim" : i === 2 ? "atencao" : "bom", explicacao: "Solo ácido prende nutrientes e pode soltar alumínio tóxico." });
  }
  if (v != null) {
    const i = faixa(v, [26, 51, 71, 91]);
    ind.push({ nome: "Saturação por bases (V%)", valor: `${fmt(v, 0)}%`, classe: NB[i], tom: (["ruim", "atencao", "bom", "bom", "info"] as Tom[])[i], explicacao: "Quanto da capacidade do solo está ocupada por nutrientes. Cada cultura tem um ideal." });
  }
  if (val.p != null) {
    if (val.p_metodo === "mehlich") {
      ind.push({ nome: "Fósforo (P Mehlich)", valor: `${fmt(val.p, 1)} mg/dm³`, classe: "Depende da argila", tom: "info", explicacao: "Com Mehlich-1, a faixa depende do teor de argila (Manual CQFS-RS/SC). Informe a argila para interpretar." });
    } else {
      classeP = faixa(val.p, [7, 16, 41, 81]);
      ind.push({ nome: "Fósforo (P resina)", valor: `${fmt(val.p, 1)} mg/dm³`, classe: NB[classeP], tom: (["ruim", "atencao", "bom", "bom", "info"] as Tom[])[classeP], explicacao: "Ajuda a raiz e a formação dos grãos. Baixo pede adubação." });
    }
  }
  if (val.k != null) {
    classeK = faixa(val.k, [0.8, 1.6, 3.1, 6.1]);
    ind.push({ nome: "Potássio (K)", valor: `${fmt(val.k, 2)} mmolc/dm³`, classe: NB[classeK], tom: (["ruim", "atencao", "bom", "bom", "info"] as Tom[])[classeK], explicacao: "Ajuda no enchimento dos grãos e na resistência à seca." });
  }
  if (val.ca != null) { const i = faixa(val.ca, [4, 8]); ind.push({ nome: "Cálcio (Ca)", valor: `${fmt(val.ca, 1)} mmolc/dm³`, classe: ["Baixo", "Médio", "Alto"][i], tom: (["atencao", "bom", "bom"] as Tom[])[i], explicacao: "Forma raízes e a estrutura da planta." }); }
  if (val.mg != null) { const i = faixa(val.mg, [5, 9]); ind.push({ nome: "Magnésio (Mg)", valor: `${fmt(val.mg, 1)} mmolc/dm³`, classe: ["Baixo", "Médio", "Alto"][i], tom: (["atencao", "bom", "bom"] as Tom[])[i], explicacao: "Faz parte da clorofila, o verde da folha." }); }
  if (val.mo != null) { const i = faixa(val.mo, [26, 51]); ind.push({ nome: "Matéria orgânica (M.O.)", valor: `${fmt(val.mo, 1)} g/dm³`, classe: ["Baixa", "Média", "Alta"][i], tom: (["atencao", "bom", "bom"] as Tom[])[i], explicacao: "Guarda água e nutrientes e alimenta a vida do solo. Sobe devagar, com palhada e plantio direto." }); }
  const alToxico = m > 20;
  ind.push({ nome: "Alumínio (Al)", valor: `${fmt(val.al ?? 0, 2)} mmolc/dm³`, classe: alToxico ? "Tóxico" : "Sem toxidez", tom: alToxico ? "ruim" : "bom", explicacao: alToxico ? `Ocupa ${fmt(m, 0)}% da CTC efetiva e trava as raízes. O calcário corrige.` : "Não chega a prejudicar as raízes." });
  ind.push({ nome: "CTC (pH 7)", valor: `${fmt(t, 1)} mmolc/dm³`, classe: "Calculada", tom: "info", explicacao: "Tamanho da “caixa” de nutrientes do solo: K + Ca + Mg + (H + Al)." });

  return { sb, ctc: t, v, ph, classeP, classeK, moBaixa: val.mo != null && val.mo < 26, alToxico, indicadores: ind };
}

export function prontidao(rot: Rotacao, I: Interpretacao) {
  const ids = [...new Set(rot.slots.filter((x): x is string => !!x))];
  const calagem = ids.filter((id) => I.v != null && I.v < CULTURAS[id].vIdeal - 5);
  const correcoes: string[] = [];
  if (calagem.length) {
    const alvo = Math.max(...calagem.map((id) => CULTURAS[id].vIdeal));
    correcoes.push(`Calagem para subir o V% de ${Math.round(I.v!)}% para cerca de ${alvo}% (${calagem.map((id) => nomeCultura(id).toLowerCase()).join(", ")})`);
  }
  if (I.alToxico && !calagem.length) correcoes.push("Calcário para neutralizar o alumínio tóxico");
  if (I.classeP != null && I.classeP <= 1) correcoes.push(`Adubação de fósforo (P ${I.classeP === 0 ? "muito baixo" : "baixo"})`);
  if (I.classeK != null && I.classeK <= 1) correcoes.push(`Adubação de potássio (K ${I.classeK === 0 ? "muito baixo" : "baixo"})`);
  const status: "pronto" | "corrigir" | "recuperar" = I.moBaixa && I.v != null && I.v < 50 ? "recuperar" : correcoes.length ? "corrigir" : "pronto";
  return { status, correcoes, nCalagem: calagem.length };
}

export const STATUS_SOLO = {
  pronto: { nome: "Solo pronto", tom: "bom" as Tom },
  corrigir: { nome: "Precisa de correção", tom: "atencao" as Tom },
  recuperar: { nome: "Recuperar o solo primeiro", tom: "ruim" as Tom },
};

// ---------- Saúde do solo: Modelo de Quatro Quadrantes (4QM) ----------
// Método da dissertação de Melo (2026, UFPel): eixo Y = carbono orgânico total (COT, g/kg),
// eixo X = atividade enzimática específica média (AEEM = média de β-glicosidase/COT e
// arilsulfatase/COT). Cada eixo vira nota de 0 a 100 pela distribuição normal cumulativa (CND)
// da população de referência; a nota 50 é o corte entre "alto" e "baixo".

export interface Referencia4QM { nome: string; cot: { media: number; dp: number }; aeem: { media: number; dp: number } }

/** Pomares de pessegueiro, Pelotas-RS (Melo, 2026, Tabela 6). Cortes na nota 50: COT 25,48 g/kg; AEEM 24,78. */
export const REFERENCIA_PESSEGO_PELOTAS: Referencia4QM = {
  nome: "Pomares de pêssego, Pelotas-RS (Melo, 2026)",
  cot: { media: 25.48, dp: 9.81 },
  aeem: { media: 24.78, dp: 7.58 },
};

/** Função de distribuição normal acumulada (aproximação de Abramowitz-Stegun). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** COT a partir da matéria orgânica (fator de Van Bemmelen, 1,724). Aproximação: g/dm³ ≈ g/kg. */
export function cotDaMO(mo: number) { return mo / 1.724; }

export function aeem(enz: Enzimas, cot: number) {
  const partes = [enz.beta, enz.aril].filter((v): v is number => typeof v === "number" && v > 0).map((v) => v / cot);
  return partes.length ? partes.reduce((a, b) => a + b, 0) / partes.length : null;
}

export type Quadrante = "saudavel" | "adoecendo" | "doente" | "recuperacao";

export function diagnostico4QM(cot: number, aeemValor: number | null, ref = REFERENCIA_PESSEGO_PELOTAS) {
  const notaCot = Math.round(100 * phi((cot - ref.cot.media) / ref.cot.dp));
  const notaAeem = aeemValor == null ? null : Math.round(100 * phi((aeemValor - ref.aeem.media) / ref.aeem.dp));
  let quadrante: Quadrante | null = null;
  if (notaAeem != null) {
    quadrante = notaCot >= 50 ? (notaAeem >= 50 ? "saudavel" : "adoecendo") : notaAeem >= 50 ? "recuperacao" : "doente";
  }
  return { notaCot, notaAeem, quadrante, referencia: ref.nome };
}

export const QUADRANTES: Record<Quadrante, { nome: string; tom: Tom; descricao: string; plano: string[] }> = {
  saudavel: { nome: "Saudável", tom: "bom", descricao: "Carbono alto e vida do solo ativa. Estado estável.", plano: ["Manter a rotação diversificada e a palhada.", "Dá para priorizar renda sem perder a saúde do solo.", "Refazer a análise em 2 a 3 anos."] },
  adoecendo: { nome: "Adoecendo", tom: "atencao", descricao: "O carbono ainda está alto, mas a vida do solo caiu. Tendência de perder carbono.", plano: ["Revolver o solo o mínimo possível.", "Manter o solo coberto o ano todo e variar as culturas.", "Refazer a análise biológica em 1 a 2 anos para ver se a atividade voltou."] },
  doente: { nome: "Doente", tom: "ruim", descricao: "Pouco carbono e pouca vida no solo. Estado estável em nível baixo.", plano: ["Antes de buscar renda máxima, recuperar a matéria orgânica.", "Plantas de cobertura e plantio direto: é o caminho mais barato. Esterco e cama de aviário em toneladas custam caro.", "Refazer a análise química e biológica em 2 anos."] },
  recuperacao: { nome: "Em recuperação", tom: "bom", descricao: "A vida do solo está ativa e o carbono deve subir. Tendência de ganhar carbono.", plano: ["O manejo está funcionando: manter.", "Refazer a análise em 2 anos para confirmar o ganho de carbono."] },
};
