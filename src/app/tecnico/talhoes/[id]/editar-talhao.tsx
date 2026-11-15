"use client";

import { useActionState, useState } from "react";
import type { Polygon } from "geojson";
import { Area, UnidadeDeArea } from "@/components/area";
import { IconeEditar } from "@/components/icones";
import { Mapa, type TalhaoNoMapa } from "@/components/mapa";
import { SeletorDeCor } from "@/components/seletor-cor";
import { editarTalhao, excluirTalhao } from "@/app/tecnico/actions";

export interface DadosDaEdicao {
  id: string;
  nome: string;
  cor: string;
  rotacaoAtual: string | null;
  areaHa: number | null;
  geojson: Polygon;
  /** Outros talhões da propriedade: cores (aviso de repetida) e contornos (referência no mapa) */
  vizinhos: TalhaoNoMapa[];
  limite: Polygon | null;
  ponto: [number, number];
  rotacoes: { id: string; nome: string }[];
  /** O que é apagado junto com o talhão */
  vinculos: { amostras: number; planos: number; tarefas: number; relatos: number };
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Cabeçalho do talhão. Em edição: nome, cor, o que se planta hoje, contorno e exclusão. */
export function CabecalhoDoTalhao({ dados: d, detalhes, rotacaoTexto }: { dados: DadosDaEdicao; detalhes: React.ReactNode; rotacaoTexto: string }) {
  const [editando, setEditando] = useState(false);
  const [novaCor, setNovaCor] = useState(d.cor);
  const [redesenhar, setRedesenhar] = useState(false);
  const [contorno, setContorno] = useState<{ poligono: Polygon; ha: number } | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [estado, acao, salvando] = useActionState(async (anterior: Awaited<ReturnType<typeof editarTalhao>>, form: FormData) => {
    const r = await editarTalhao(anterior, form);
    if (r?.ok) { setEditando(false); setRedesenhar(false); setContorno(null); }
    return r;
  }, undefined);
  const usadas = new Set(d.vizinhos.map((v) => (v.cor ?? "").toLowerCase()));
  const v = d.vinculos;
  const apagaJunto = [
    v.amostras && plural(v.amostras, "análise de solo", "análises de solo"),
    v.planos && plural(v.planos, "plano", "planos"),
    v.tarefas && plural(v.tarefas, "tarefa", "tarefas"),
    v.relatos && plural(v.relatos, "relato do produtor", "relatos do produtor"),
  ].filter(Boolean) as string[];

  if (!editando) {
    return (
      <div>
        {detalhes}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="h1 flex items-center gap-2.5">
            <span className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: d.cor }} aria-hidden="true" />
            {d.nome}
          </h1>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setNovaCor(d.cor); setEditando(true); }}><IconeEditar />Editar talhão</button>
        </div>
        <p className="text-muted">Hoje: {rotacaoTexto}</p>
        {estado?.ok && <p role="status" className="text-sm text-ok">Alterações salvas.</p>}
      </div>
    );
  }

  return (
    <UnidadeDeArea>
      <div className="grid w-full gap-4">
        <form action={acao} className="card grid gap-5 p-4 sm:p-5">
          <h2 className="h2">Editar talhão</h2>
          <input type="hidden" name="talhao_id" value={d.id} />
          <input type="hidden" name="cor" value={novaCor} />
          <input type="hidden" name="geojson" value={contorno ? JSON.stringify(contorno.poligono) : ""} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="nome-talhao">Nome do talhão</label>
              <input className="input" id="nome-talhao" name="nome" defaultValue={d.nome} required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="rotacao-talhao">O que se planta hoje</label>
              <select className="input" id="rotacao-talhao" name="rotacao_atual" defaultValue={d.rotacaoAtual ?? ""}>
                <option value="">Não sei ainda</option>
                {d.rotacoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted">É o ponto de partida da aba Rotações: as sugestões comparam com o que já se faz.</p>
            </div>
          </div>

          <SeletorDeCor cor={novaCor} aoMudar={setNovaCor} usadas={usadas} />

          <fieldset className="grid gap-3">
            <legend className="label">Contorno</legend>
            <p className="text-sm">
              {contorno
                ? <>Contorno novo: <b><Area ha={contorno.ha} /></b> (antes: <Area ha={d.areaHa} />). Salve para trocar.</>
                : <>Área atual: <b><Area ha={d.areaHa} /></b>.</>}
            </p>
            {!redesenhar ? (
              <button type="button" className="btn-ghost btn-sm justify-self-start" onClick={() => setRedesenhar(true)}>Redesenhar contorno no mapa</button>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Desenhe o contorno novo por cima do atual. Os outros talhões aparecem como referência.
                  Ao salvar, a área é recalculada e o relevo e o clima da NASA são buscados de novo para o contorno novo.
                </p>
                <Mapa talhoes={[{ id: d.id, nome: d.nome, geojson: d.geojson, cor: novaCor }, ...d.vizinhos]} limite={d.limite} ponto={d.ponto}
                  foco={null} destaque={d.id} corDesenho={novaCor} rotuloDesenho="Desenhar contorno novo" busca={false} camadas={false}
                  desenhar={(p, ha) => setContorno(p ? { poligono: p, ha } : null)} altura="h-[420px]" />
                <button type="button" className="btn-ghost btn-sm justify-self-start" onClick={() => { setRedesenhar(false); setContorno(null); }}>Manter o contorno atual</button>
              </>
            )}
          </fieldset>

          {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar alterações"}</button>
            <button type="button" className="btn-ghost" disabled={salvando} onClick={() => { setEditando(false); setRedesenhar(false); setContorno(null); setConfirmarExclusao(false); }}>Cancelar</button>
          </div>
        </form>

        <section className="rounded-2xl border border-bad/40 p-4 sm:p-5" aria-labelledby="excluir-titulo">
          <h2 id="excluir-titulo" className="font-display font-bold text-bad">Excluir talhão</h2>
          {!confirmarExclusao ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Use quando o talhão foi desenhado errado ou deixou de existir. Não dá para desfazer.</p>
              <button type="button" className="btn-ghost btn-sm border-bad text-bad hover:bg-bad-soft" onClick={() => setConfirmarExclusao(true)}>Excluir este talhão</button>
            </div>
          ) : (
            <form action={excluirTalhao} onSubmit={() => setExcluindo(true)} className="mt-2 grid gap-3">
              <input type="hidden" name="talhao_id" value={d.id} />
              <p className="text-sm">
                Excluir <b>{d.nome}</b>?{" "}
                {apagaJunto.length
                  ? <>Também serão apagados: <b>{apagaJunto.join(", ")}</b>.</>
                  : "Não há análises, planos, tarefas nem relatos ligados a ele."}
                {" "}As visitas técnicas ficam, como visitas da propriedade.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm border-bad bg-bad text-surface" disabled={excluindo}>{excluindo ? "Excluindo…" : "Sim, excluir"}</button>
                <button type="button" className="btn-ghost btn-sm" disabled={excluindo} onClick={() => setConfirmarExclusao(false)}>Não, manter</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </UnidadeDeArea>
  );
}
