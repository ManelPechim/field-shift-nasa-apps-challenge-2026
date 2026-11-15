// Análise de decisão de um talhão: a mesma conta para a aba Rotações e para o relatório de decisão.
import type { ClimaTalhao } from "@/lib/nasa/power";
import type { RelevoTalhao } from "@/lib/nasa/relevo";
import type { Talhao, Visita } from "@/lib/tipos";
import { regiaoDe } from "./culturas";
import { CENARIOS, aplicarCenario, calcularRiscos, niveis, type Cenario } from "./riscos";
import { avaliar, comparar, porQue, type Avaliacao, type Prioridades } from "./rotacao";

type Busca = Record<string, string | string[] | undefined>;

export const PRIORIDADES: [keyof Prioridades, string][] = [["renda", "Renda"], ["solo", "Melhorar o solo"], ["erosao", "Proteger contra erosão"], ["agua", "Economizar água"], ["forragem", "Forragem para o gado"]];
export const PESO = ["", "pouco", "médio", "muito"];
export const LETRAS = ["A", "B", "C"];

/** Cenário, prioridades e limitações vindos do formulário da aba Rotações (ou da visita, quando não informados). */
export function parametros(sp: Busca, visita: Visita | null) {
  const cenario = (["seco", "normal", "chuvoso"].includes(String(sp.cenario)) ? sp.cenario : "normal") as Cenario;
  const p = (k: string, d: number) => { const n = Number(sp[k]); return n >= 1 && n <= 3 ? n : d; };
  const pri: Prioridades = { renda: p("renda", 3), solo: p("solo", 2), erosao: p("erosao", 2), agua: p("agua", 1), forragem: p("forragem", 1) };
  const gado = sp.gado ? sp.gado === "1" : !!visita?.condicoes.gado;
  const irrigacao = sp.irrigacao ? sp.irrigacao === "1" : !!visita?.condicoes.irrigacao;
  return { cenario, pri, gado, irrigacao };
}

/** Os mesmos parâmetros em forma de busca, para levar da aba Rotações ao relatório. */
export function buscaDosParametros(par: ReturnType<typeof parametros>) {
  const q = new URLSearchParams({ cenario: par.cenario, gado: par.gado ? "1" : "0", irrigacao: par.irrigacao ? "1" : "0" });
  for (const [k] of PRIORIDADES) q.set(k, String(par.pri[k]));
  return q.toString();
}

export function analisar(talhao: Talhao, clima: ClimaTalhao, relevo: RelevoTalhao | null, visita: Visita | null, par: ReturnType<typeof parametros>) {
  const regiao = regiaoDe(talhao.centroide_lat!);
  const sul = regiao === "sul";
  const explicados = calcularRiscos(clima, relevo, visita?.condicoes ?? null);
  const base = niveis(explicados);
  const contexto = (c: Cenario) => {
    const { riscos, chuva } = aplicarCenario(base, clima.chuva_mm, c, sul);
    return { regiao, riscos, chuva, geadaDias: clima.geada_dias, gado: par.gado, irrigacao: par.irrigacao };
  };
  const ctx = contexto(par.cenario);
  const cmp = comparar(talhao.rotacao_atual, ctx, par.pri);
  const melhor = [...cmp.top.slice(1)].sort((a, b) => b.combina - a.combina)[0];

  /** As mesmas três rotações nos três cenários: a escolha de B e C não muda, só as notas e os riscos. */
  const porCenario = (Object.keys(CENARIOS) as Cenario[]).map((c) => {
    const cx = contexto(c);
    return { cenario: c, riscos: cx.riscos, avaliacoes: cmp.top.map((a) => avaliar(a.rotacao, cx, par.pri)) };
  });

  return { regiao, sul, explicados, base, riscos: ctx.riscos, cmp, melhor, porCenario };
}

/** Resumo das opções comparadas, guardado no plano para o produtor ver depois. */
export function resumoDasOpcoes(top: Avaliacao[], atual: Avaliacao, pri: Prioridades) {
  return top.map((a, i) => ({ letra: LETRAS[i], id: a.rotacao.id, nome: a.nome, atual: i === 0, combina: Math.round(a.combina), porque: porQue(a, atual, pri) }));
}
