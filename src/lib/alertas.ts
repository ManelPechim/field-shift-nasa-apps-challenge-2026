import type { ClimaTalhao } from "@/lib/nasa/power";
import type { Tom } from "@/lib/agro/solo";

export interface Alerta { tom: Tom; titulo: string; texto: string }

/** Alertas em linguagem simples, a partir dos últimos 30 dias da NASA POWER. */
export function alertasDoClima(c: ClimaTalhao | null): Alerta[] {
  const r = c?.recente;
  if (!r) return [];
  const out: Alerta[] = [];
  const pct = Math.round((100 * r.chuva_30d_mm) / Math.max(1, r.chuva_30d_normal_mm));
  if (pct < 50) out.push({ tom: "atencao", titulo: "Choveu bem menos que o normal", texto: `Nos últimos 30 dias choveu ${r.chuva_30d_mm} mm, ${pct}% do normal para a época. Antes de plantar, veja se o solo tem umidade.` });
  else if (pct > 160) out.push({ tom: "atencao", titulo: "Choveu muito acima do normal", texto: `Nos últimos 30 dias choveu ${r.chuva_30d_mm} mm, ${pct}% do normal. Cuidado com encharcamento e enxurrada nas partes baixas e inclinadas.` });
  if (r.dias_sem_chuva >= 10) out.push({ tom: "atencao", titulo: `${r.dias_sem_chuva} dias seguidos sem chuva`, texto: "Se a lavoura estiver murchando nas horas quentes, relate pelo app." });
  if (r.geadas_30d > 0) out.push({ tom: "atencao", titulo: "Teve frio de geada", texto: `Em ${r.geadas_30d} dia${r.geadas_30d > 1 ? "s" : ""} a mínima chegou perto de 0 °C (menor: ${r.min_30d?.toLocaleString("pt-BR")} °C). Se viu folhas queimadas, relate.` });
  if (!out.length) out.push({ tom: "bom", titulo: "Clima dentro do normal", texto: `Nos últimos 30 dias choveu ${r.chuva_30d_mm} mm, perto do normal para a época (${r.chuva_30d_normal_mm} mm).` });
  return out;
}
