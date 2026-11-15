import type { Ocorrencia } from "./tipos";

/** Ponto clicável no mapa (ex.: um relato no local anexado). */
export interface PinoNoMapa { id: string; lon: number; lat: number; cor: string; titulo: string; href: string }

/** Cores fixas: os pinos ficam sobre a imagem de satélite, que não muda com o tema. */
export const COR_DA_SITUACAO: Record<Ocorrencia["status"], string> = { nova: "#f59e0b", vista: "#38bdf8", resolvida: "#22c55e" };
export const NOME_DA_SITUACAO: Record<Ocorrencia["status"], string> = { nova: "Novo, ainda não visto", vista: "Visto pelo técnico", resolvida: "Resolvido" };

/** Relatos com local viram pinos; `href` diz para onde o toque leva. */
export function pinosDosRelatos(relatos: Ocorrencia[], nomeDoTalhao: (id: string) => string | undefined, href: (o: Ocorrencia) => string): PinoNoMapa[] {
  return relatos.flatMap((o) => {
    if (o.lat == null || o.lon == null) return [];
    const [a, m, d] = o.criado_em.slice(0, 10).split("-");
    const onde = o.talhao_id ? nomeDoTalhao(o.talhao_id) ?? "talhão" : "propriedade inteira";
    return [{ id: o.id, lon: o.lon, lat: o.lat, cor: COR_DA_SITUACAO[o.status], titulo: `${o.tipo} · ${d}/${m}/${a} · ${onde} · ${NOME_DA_SITUACAO[o.status]}`, href: href(o) }];
  });
}
