// Níveis de risco (0 nenhum, 1 baixo, 2 médio, 3 alto) calculados com dados da NASA
// e ajustados pelo que o técnico observou na visita.
import type { ClimaTalhao } from "@/lib/nasa/power";
import type { RelevoTalhao } from "@/lib/nasa/relevo";
import type { CondicoesVisita } from "@/lib/tipos";

export type ChaveRisco = "alagamento" | "erosao" | "geada" | "seca" | "calor";
export type Riscos = Record<ChaveRisco, number>;
export interface RiscoExplicado { nivel: number; motivo: string; fonte: string }

export const NIVEL = ["Nenhum", "Baixo", "Médio", "Alto"];
export const NOME_RISCO: Record<ChaveRisco, string> = {
  alagamento: "Alagamento",
  erosao: "Erosão",
  geada: "Geada",
  seca: "Falta de chuva",
  calor: "Calor extremo",
};

export type Cenario = "seco" | "normal" | "chuvoso";
export const CENARIOS: Record<Cenario, { nome: string; enso: string }> = {
  seco: { nome: "Abaixo da média", enso: "La Niña" },
  normal: { nome: "Normal", enso: "Neutro" },
  chuvoso: { nome: "Acima da média", enso: "El Niño" },
};

const somaAno = (v: number[]) => v.reduce((a, b) => a + b, 0);
const f1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function calcularRiscos(
  clima: ClimaTalhao,
  relevo: RelevoTalhao | null,
  visita: CondicoesVisita | null,
): Record<ChaveRisco, RiscoExplicado> {
  const geadaAno = somaAno(clima.geada_dias);
  const calorAno = somaAno(clima.calor_dias);
  const mesesSecos = clima.chuva_mm.filter((v) => v < 50).length;
  const ext = clima.chuva_extrema_dias_ano;
  const nivelExtrema = ext < 1 ? 0 : ext < 3 ? 1 : ext < 6 ? 2 : 3;

  const geada = geadaAno === 0 ? 0 : geadaAno < 3 ? 1 : geadaAno < 10 ? 2 : 3;
  const calor = calorAno < 2 ? 0 : calorAno < 10 ? 1 : calorAno < 30 ? 2 : 3;
  let seca = mesesSecos >= 4 ? 3 : mesesSecos >= 2 ? 2 : clima.maior_estiagem_dias >= 15 ? 1 : 0;
  if (clima.maior_estiagem_dias >= 25) seca = Math.max(seca, 2);

  let erosao = nivelExtrema >= 2 ? 1 : 0;
  let motivoErosao = `${f1(ext)} dias por ano com chuva acima de 50 mm.`;
  if (relevo) {
    const d = relevo.declividade_media;
    const nivelDecl = d < 3 ? 0 : d < 8 ? 1 : d < 13 ? 2 : 3;
    erosao = Math.min(3, nivelDecl + (nivelExtrema >= 2 ? 1 : 0));
    motivoErosao = `Declividade média de ${f1(d)}% (${relevo.classe.toLowerCase()}) e ${f1(ext)} dias por ano com chuva acima de 50 mm.`;
  }
  if (visita?.erosao === "sulcos" || visita?.erosao === "vocorocas") erosao = 3;
  else if (visita?.erosao === "laminar") erosao = Math.max(erosao, 2);

  let alagamento = 0;
  let motivoAlag = "Sem sinais de alagamento.";
  if (visita?.alagamento) {
    alagamento = visita.alagamento === "frequente" ? 3 : visita.alagamento === "as_vezes" ? 2 : 0;
    motivoAlag = visita.alagamento === "nao" ? "O técnico não viu sinais de alagamento na visita." : "Informado na visita técnica.";
  } else if (relevo && relevo.declividade_media < 2 && nivelExtrema >= 2) {
    alagamento = 1;
    motivoAlag = "Área plana numa região de chuvas fortes. Confirme na visita se a água acumula.";
  }

  return {
    alagamento: { nivel: alagamento, motivo: motivoAlag, fonte: visita?.alagamento ? "Visita técnica" : "SRTM + NASA POWER" },
    erosao: { nivel: erosao, motivo: motivoErosao + (visita?.erosao && visita.erosao !== "nenhuma" ? " Erosão observada na visita." : ""), fonte: relevo ? "SRTM + NASA POWER" : "NASA POWER" },
    geada: { nivel: geada, motivo: geadaAno ? `Em média ${f1(geadaAno)} dias por ano com mínima até 2 °C.` : "Sem mínimas abaixo de 2 °C no período.", fonte: "NASA POWER" },
    seca: { nivel: seca, motivo: `${mesesSecos} meses com menos de 50 mm; maior sequência sem chuva de ${clima.maior_estiagem_dias} dias por ano, em média.`, fonte: "NASA POWER" },
    calor: { nivel: calor, motivo: `Em média ${f1(calorAno)} dias por ano com máxima acima de 35 °C.`, fonte: "NASA POWER" },
  };
}

export function niveis(r: Record<ChaveRisco, RiscoExplicado>): Riscos {
  return { alagamento: r.alagamento.nivel, erosao: r.erosao.nivel, geada: r.geada.nivel, seca: r.seca.nivel, calor: r.calor.nivel };
}

/** Ajuste pela previsão de El Niño / La Niña. No Sul o efeito é forte; no Cerrado é fraco. */
export function aplicarCenario(r: Riscos, chuva: number[], cenario: Cenario, sul: boolean) {
  const out = { ...r };
  const d = sul ? 1 : 0;
  const f = cenario === "normal" ? 1 : sul ? (cenario === "chuvoso" ? 1.25 : 0.75) : cenario === "chuvoso" ? 1.1 : 0.9;
  if (cenario === "chuvoso") { if (out.alagamento > 0) out.alagamento = Math.min(3, out.alagamento + d); out.seca = Math.max(0, out.seca - d); }
  if (cenario === "seco") { out.seca = Math.min(3, out.seca + d); if (out.alagamento > 0) out.alagamento = Math.max(1, out.alagamento - d); }
  return { riscos: out, chuva: chuva.map((v, i) => (i >= 8 || i <= 1 ? Math.round(v * f) : v)) };
}
