"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Polygon } from "geojson";
import { Area, UnidadeDeArea } from "./area";
import { IconeCancelar, IconeEditar } from "./icones";
import { Mapa, type TalhaoNoMapa } from "./mapa";
import { SeletorDeCor } from "./seletor-cor";
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
  vinculos: { amostras: number; planos: number; tarefas: number };
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Botão "Editar" que abre a edição do talhão num modal (nome, o que se planta, cor, contorno e exclusão). */
export function EditarTalhao({ dados, rotulo = "Editar talhão" }: { dados: DadosDaEdicao; rotulo?: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    // O showModal põe o foco no primeiro botão (o X); o nome é o campo mais editado
    if (aberto && !el.open) { el.showModal(); el.querySelector<HTMLInputElement>("input[name=nome]")?.focus(); }
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <>
      <button type="button" className="btn-ghost btn-sm" onClick={() => { setSalvo(false); setAberto(true); }} aria-haspopup="dialog">
        <IconeEditar />{rotulo}
      </button>
      {salvo && <span role="status" className="text-sm text-ok">Alterações salvas.</span>}
      {/* <dialog> nativo: bloqueia o fundo, prende o foco e fecha com Esc */}
      <dialog ref={dialogo} onClose={() => setAberto(false)} aria-labelledby={`editar-${dados.id}`}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(60rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-bg p-0 text-ink shadow-2xl backdrop:bg-black/60">
        {aberto && <Formulario d={dados} aoFechar={() => setAberto(false)} aoSalvar={() => { setSalvo(true); setAberto(false); }} />}
      </dialog>
    </>
  );
}

function Formulario({ d, aoFechar, aoSalvar }: { d: DadosDaEdicao; aoFechar: () => void; aoSalvar: () => void }) {
  const [novaCor, setNovaCor] = useState(d.cor);
  const [redesenhar, setRedesenhar] = useState(false);
  const [contorno, setContorno] = useState<{ poligono: Polygon; ha: number } | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [estado, acao, salvando] = useActionState(editarTalhao, undefined);
  // Fecha só quando o resultado chega junto com a página já atualizada (mesma transição), não antes
  useEffect(() => { if (estado?.ok) aoSalvar(); }, [estado, aoSalvar]);
  const usadas = new Set(d.vizinhos.map((v) => (v.cor ?? "").toLowerCase()));
  const v = d.vinculos;
  const apagaJunto = [
    v.amostras && plural(v.amostras, "análise de solo", "análises de solo"),
    v.planos && plural(v.planos, "plano", "planos"),
    v.tarefas && plural(v.tarefas, "tarefa", "tarefas"),
  ].filter(Boolean) as string[];
  const ocupado = salvando || excluindo;

  return (
    <UnidadeDeArea>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3 sm:px-5">
        <h2 id={`editar-${d.id}`} className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
          <span className="size-4 shrink-0 rounded-full border border-black/20" style={{ background: novaCor }} aria-hidden="true" />
          <span className="truncate">Editar talhão: {d.nome}</span>
        </h2>
        <button type="button" className="btn-ghost btn-sm" onClick={aoFechar} disabled={ocupado} aria-label="Fechar sem salvar"><IconeCancelar /></button>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <form action={acao} className="card grid gap-5 p-4 sm:p-5">
          <input type="hidden" name="talhao_id" value={d.id} />
          <input type="hidden" name="cor" value={novaCor} />
          <input type="hidden" name="geojson" value={contorno ? JSON.stringify(contorno.poligono) : ""} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor={`nome-${d.id}`}>Nome do talhão</label>
              <input className="input" id={`nome-${d.id}`} name="nome" defaultValue={d.nome} required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor={`rotacao-${d.id}`}>O que se planta hoje</label>
              <select className="input" id={`rotacao-${d.id}`} name="rotacao_atual" defaultValue={d.rotacaoAtual ?? ""}>
                <option value="">Não sei ainda</option>
                {d.rotacoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted">É o ponto de partida da aba Rotações: as sugestões comparam com o que já se faz.</p>
            </div>
          </div>

          <SeletorDeCor cor={novaCor} aoMudar={setNovaCor} usadas={usadas} nome={`cor-${d.id}`} />

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
                  desenhar={(p, ha) => setContorno(p ? { poligono: p, ha } : null)} altura="h-[380px]" />
                <button type="button" className="btn-ghost btn-sm justify-self-start" onClick={() => { setRedesenhar(false); setContorno(null); }}>Manter o contorno atual</button>
              </>
            )}
          </fieldset>

          {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={ocupado}>{salvando ? "Salvando…" : "Salvar alterações"}</button>
            <button type="button" className="btn-ghost" disabled={ocupado} onClick={aoFechar}>Cancelar</button>
          </div>
        </form>

        <section className="rounded-2xl border border-bad/40 p-4 sm:p-5" aria-labelledby={`excluir-${d.id}`}>
          <h3 id={`excluir-${d.id}`} className="font-display font-bold text-bad">Excluir talhão</h3>
          {!confirmarExclusao ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Use quando o talhão foi desenhado errado ou deixou de existir. Não dá para desfazer.</p>
              <button type="button" className="btn-ghost btn-sm border-bad text-bad hover:bg-bad-soft" disabled={ocupado} onClick={() => setConfirmarExclusao(true)}>Excluir este talhão</button>
            </div>
          ) : (
            <form action={excluirTalhao} onSubmit={() => setExcluindo(true)} className="mt-2 grid gap-3">
              <input type="hidden" name="talhao_id" value={d.id} />
              <p className="text-sm">
                Excluir <b>{d.nome}</b>?{" "}
                {apagaJunto.length
                  ? <>Também serão apagados: <b>{apagaJunto.join(", ")}</b>.</>
                  : "Não há análises, planos nem tarefas ligados a ele."}
                {" "}As visitas técnicas ficam, como visitas da propriedade.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm border-bad bg-bad text-surface" disabled={ocupado}>{excluindo ? "Excluindo…" : "Sim, excluir"}</button>
                <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => setConfirmarExclusao(false)}>Não, manter</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </UnidadeDeArea>
  );
}
