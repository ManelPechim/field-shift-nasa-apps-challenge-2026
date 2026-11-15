import { LETRAS, analisar, parametros, resumoDasOpcoes } from "@/lib/agro/decisao";
import { CRITERIOS, type Avaliacao } from "@/lib/agro/rotacao";
import { criarPlano } from "@/app/tecnico/actions";
import type { Talhao } from "@/lib/tipos";

/** Botão que escolhe uma das três opções e monta o plano, guardando como a decisão foi tomada. */
export function EscolherRotacao({ talhao, a, i, correcoes, par, analise, rotulo }: {
  talhao: Talhao; a: Avaliacao; i: number; correcoes: string[];
  par: ReturnType<typeof parametros>; analise: ReturnType<typeof analisar>; rotulo: string;
}) {
  const { cmp, riscos } = analise;
  const notas = (x: Avaliacao) => Object.fromEntries(CRITERIOS.map(([k]) => [k, Math.round(x[k])]));
  const dados = {
    cenario: par.cenario, prioridades: par.pri, gado: par.gado, irrigacao: par.irrigacao, riscos,
    notas: notas(a), combina: Math.round(a.combina), atual: cmp.atual.nome, notas_atual: notas(cmp.atual),
    opcoes: resumoDasOpcoes(cmp.top, cmp.atual, par.pri), escolhida: LETRAS[i],
  };
  return (
    <form action={criarPlano} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="talhao_id" value={talhao.id} />
      <input type="hidden" name="rotacao_id" value={a.rotacao.id} />
      <input type="hidden" name="rotacao_nome" value={a.nome} />
      <input type="hidden" name="correcoes" value={JSON.stringify(correcoes)} />
      <input type="hidden" name="dados" value={JSON.stringify(dados)} />
      <div><label className="label" htmlFor={`safra-${i}`}>Safra</label><input className="input w-28" id={`safra-${i}`} name="safra" defaultValue="2026/27" /></div>
      <button className="btn btn-sm">{rotulo}</button>
    </form>
  );
}
