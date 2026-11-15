/**
 * Tipo de cada afirmação do app, para separar o que é medido do que é suposto:
 * dado da NASA, informação local (visita, laudo, produtor), regra agronômica do app ou hipótese de cenário.
 */
export type TipoEvidencia = "nasa" | "local" | "regra" | "hipotese";

export const TIPOS_EVIDENCIA: Record<TipoEvidencia, { nome: string; explicacao: string }> = {
  nasa: { nome: "Dado NASA", explicacao: "Medido por satélite ou modelo da NASA (NASA POWER, SRTM)." },
  local: { nome: "Informação local", explicacao: "Visto na visita, medido no laudo ou informado pelo produtor." },
  regra: { nome: "Regra agronômica", explicacao: "Base de culturas e regras do app, visíveis no código; precisam de validação regional." },
  hipotese: { nome: "Hipótese de cenário", explicacao: "Suposição sobre a próxima safra (El Niño, La Niña); não é previsão." },
};

/** Tipos pela fonte que a evidência já declara ("Visita + SRTM" é informação local e dado NASA). */
export function tiposDaFonte(fonte: string): TipoEvidencia[] {
  const tipos: TipoEvidencia[] = [];
  if (/visita|laudo|produtor/i.test(fonte)) tipos.push("local");
  if (/NASA|SRTM/.test(fonte)) tipos.push("nasa");
  if (/base de culturas|calendário|regra/i.test(fonte)) tipos.push("regra");
  if (/cenário|hipótese/i.test(fonte)) tipos.push("hipotese");
  return tipos.length ? tipos : ["regra"];
}
