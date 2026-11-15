"use client";

import { useActionState, useState } from "react";
import { IconeEditar } from "@/components/icones";
import { SeletorDeCor } from "@/components/seletor-cor";
import { editarTalhao } from "@/app/tecnico/actions";

/** Nome e cor do talhão, editáveis no próprio cabeçalho. `usadas`: cores dos outros talhões da propriedade. */
export function CabecalhoDoTalhao({ id, nome, cor, usadas, detalhes }: { id: string; nome: string; cor: string; usadas: string[]; detalhes: React.ReactNode }) {
  const [editando, setEditando] = useState(false);
  const [novaCor, setNovaCor] = useState(cor);
  const [estado, acao, salvando] = useActionState(async (anterior: Awaited<ReturnType<typeof editarTalhao>>, form: FormData) => {
    const r = await editarTalhao(anterior, form);
    if (r?.ok) setEditando(false);
    return r;
  }, undefined);

  if (!editando) {
    return (
      <div>
        {detalhes}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="h1 flex items-center gap-2.5">
            <span className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: cor }} aria-hidden="true" />
            {nome}
          </h1>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setNovaCor(cor); setEditando(true); }}><IconeEditar />Editar nome e cor</button>
        </div>
        {estado?.ok && <p role="status" className="text-sm text-ok">Nome e cor salvos.</p>}
      </div>
    );
  }

  return (
    <form action={acao} className="card grid w-full max-w-xl gap-4 p-4">
      <input type="hidden" name="talhao_id" value={id} />
      <input type="hidden" name="cor" value={novaCor} />
      <div>
        <label className="label" htmlFor="nome-talhao">Nome do talhão</label>
        <input className="input" id="nome-talhao" name="nome" defaultValue={nome} required autoFocus />
      </div>
      <SeletorDeCor cor={novaCor} aoMudar={setNovaCor} usadas={new Set(usadas)} />
      {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        <button type="button" className="btn-ghost" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
      </div>
    </form>
  );
}
