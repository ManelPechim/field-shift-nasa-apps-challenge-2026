import Link from "next/link";
import { CalendarioRotacao } from "@/components/graficos";
import { Selo, Vazio, dataBR } from "@/components/ui";
import { regiaoDe, rotacaoPorId } from "@/lib/agro/culturas";
import { ocupacao } from "@/lib/agro/rotacao";
import { adicionarTarefa, excluirPlano, removerTarefa, salvarPlano } from "@/app/tecnico/actions";
import type { Plano, Talhao, Tarefa } from "@/lib/tipos";
import { CampoResumo } from "./resumo";

export function AbaPlano({ talhao, planos, tarefas }: { talhao: Talhao; planos: Plano[]; tarefas: Tarefa[] }) {
  const plano = planos[0];
  if (!plano) {
    return (
      <Vazio titulo="Nenhum plano ainda">
        Compare as rotações e escolha uma para montar o plano.
        <div className="mt-3"><Link href={`/tecnico/talhoes/${talhao.id}?aba=rotacoes`} className="btn btn-sm">Comparar rotações</Link></div>
      </Vazio>
    );
  }
  const rot = rotacaoPorId(plano.rotacao_id);
  const minhas = tarefas.filter((t) => t.plano_id === plano.id || !t.plano_id);

  return (
    <div className="grid gap-8">
      <section className="card grid gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Safra {plano.safra}</span>
          <Selo tom={plano.status === "publicado" ? "bom" : "atencao"}>{plano.status === "publicado" ? `Publicado em ${dataBR(plano.publicado_em)}` : "Rascunho: o produtor ainda não vê"}</Selo>
        </div>
        <h2 className="font-display text-xl font-bold">{plano.rotacao_nome}</h2>
        {rot && <CalendarioRotacao ocupacao={ocupacao(rot, regiaoDe(talhao.centroide_lat!))} />}
        <form action={salvarPlano} className="grid gap-4">
          <input type="hidden" name="plano_id" value={plano.id} />
          <input type="hidden" name="talhao_id" value={talhao.id} />
          <div><label className="label" htmlFor="safra">Safra</label><input className="input w-32" id="safra" name="safra" defaultValue={plano.safra} /></div>
          <CampoResumo planoId={plano.id} inicial={plano.resumo_produtor ?? ""} />
          <div>
            <label className="label" htmlFor="justificativa">Justificativa técnica (só o técnico vê)</label>
            <textarea className="input min-h-24" id="justificativa" name="justificativa" defaultValue={plano.justificativa ?? ""} placeholder="Por que esta rotação, premissas, o que precisa ser confirmado." />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost btn-sm" name="publicar" value="0">Salvar rascunho</button>
            <button className="btn btn-sm" name="publicar" value="1">{plano.status === "publicado" ? "Salvar e manter publicado" : "Publicar para o produtor"}</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="h2 mb-1">Tarefas do produtor</h2>
        <p className="mb-3 text-sm text-muted">Geradas a partir do calendário da rotação e do laudo. Ajuste o texto para a realidade da propriedade.</p>
        <ul className="grid gap-2">
          {minhas.map((t) => (
            <li key={t.id} className="card flex flex-wrap items-start gap-3 p-3">
              <Selo tom={t.status === "feita" ? "bom" : "neutro"}>{t.status === "feita" ? `Feita ${dataBR(t.feita_em)}` : "Pendente"}</Selo>
              <div className="min-w-0 flex-1">
                <b>{t.titulo}</b>
                {t.quando && <span className="text-sm text-muted"> · {t.quando}</span>}
                {t.descricao && <p className="text-sm text-muted">{t.descricao}</p>}
                {t.nota_produtor && <p className="mt-1 rounded-md bg-sat-soft px-2 py-1 text-sm">Produtor: {t.nota_produtor}</p>}
              </div>
              <form action={removerTarefa}><input type="hidden" name="tarefa_id" value={t.id} /><input type="hidden" name="talhao_id" value={talhao.id} /><button className="text-sm text-bad underline">Remover</button></form>
            </li>
          ))}
        </ul>
        <form action={adicionarTarefa} className="card mt-3 grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="talhao_id" value={talhao.id} />
          <input type="hidden" name="plano_id" value={plano.id} />
          <div><label className="label" htmlFor="titulo">Nova tarefa</label><input className="input" id="titulo" name="titulo" placeholder="Coletar solo para análise" required /></div>
          <div><label className="label" htmlFor="quando">Quando</label><input className="input" id="quando" name="quando" placeholder="Em março" /></div>
          <button className="btn-ghost btn-sm">Adicionar</button>
        </form>
      </section>

      <form action={excluirPlano} className="text-sm">
        <input type="hidden" name="plano_id" value={plano.id} /><input type="hidden" name="talhao_id" value={talhao.id} />
        <button className="text-bad underline">Excluir este plano e as tarefas dele</button>
      </form>
    </div>
  );
}
