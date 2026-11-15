"use client";

import { useActionState, useEffect, useState } from "react";
import { marcarPlanoVisto, responderPlano } from "@/app/produtor/actions";

/** Marca o plano como visto quando a tela abre de verdade (o prefetch de links não dispara efeitos). */
export function MarcarVisto({ planoId }: { planoId: string }) {
  useEffect(() => { void marcarPlanoVisto(planoId); }, [planoId]);
  return null;
}

const data = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");

/** "Combinado" ou "Tenho dúvida"; depois de responder, mostra a conversa e deixa mudar.
 *  Use com key={respondidoEm}: a resposta nova remonta o componente e limpa o estado do formulário. */
export function RespostaAoPlano({ planoId, resposta, duvida, respondidoEm, respostaTecnico, respostaTecnicoEm, nomeTecnico }: {
  planoId: string;
  resposta: "combinado" | "duvida" | null;
  duvida: string | null;
  respondidoEm: string | null;
  respostaTecnico: string | null;
  respostaTecnicoEm: string | null;
  nomeTecnico: string;
}) {
  const [estado, acao, enviando] = useActionState(responderPlano, undefined);
  const [escrevendo, setEscrevendo] = useState(false);
  const [mudando, setMudando] = useState(false);

  // A conversa (dúvida e resposta do técnico) aparece enquanto existir, também depois de combinar
  const conversa = duvida && (
    <div className="grid gap-2 text-sm">
      <p className="rounded-lg bg-surface px-3 py-2"><b>Você</b>{resposta === "duvida" && respondidoEm && <span className="text-muted"> · {data(respondidoEm)}</span>}<br />“{duvida}”</p>
      {respostaTecnico
        ? <p className="rounded-lg border-l-4 border-brand bg-surface px-3 py-2"><b>{nomeTecnico}</b> <span className="text-muted">· {data(respostaTecnicoEm)}</span><br />“{respostaTecnico}”</p>
        : resposta === "duvida" && <p className="text-muted">{nomeTecnico} ainda não respondeu. A resposta aparece aqui, ou chega pelo WhatsApp.</p>}
    </div>
  );

  if (resposta && !mudando) {
    // Dúvida respondida: a próxima ação é do produtor
    if (resposta === "duvida" && respostaTecnico) {
      return (
        <form action={acao} className="grid gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4">
          <input type="hidden" name="plano_id" value={planoId} />
          <b className="font-display text-lg">{nomeTecnico} respondeu sua dúvida</b>
          {conversa}
          <p className="text-sm">Com essa resposta, o plano fica combinado?</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" name="resposta" value="combinado" disabled={enviando}>{enviando ? "Enviando…" : "Combinado"}</button>
            <button type="button" className="btn-ghost" onClick={() => { setMudando(true); setEscrevendo(true); }} disabled={enviando}>Ainda tenho dúvida</button>
          </div>
          {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
        </form>
      );
    }
    return (
      <div className={`grid gap-2 rounded-2xl p-4 ${resposta === "combinado" ? "bg-ok-soft" : "bg-sat-soft"}`} role="status">
        <b className="font-display text-lg">{resposta === "combinado" ? "Você combinou este plano com o técnico." : "Você mandou uma dúvida ao técnico."}</b>
        {resposta === "combinado" && respondidoEm && <p className="text-sm text-muted">Em {data(respondidoEm)}. As tarefas abaixo seguem valendo.</p>}
        {conversa}
        <button type="button" className="justify-self-start text-sm font-semibold text-brand underline" onClick={() => setMudando(true)}>Mudar minha resposta</button>
      </div>
    );
  }

  return (
    <form action={acao} className="card grid gap-3 p-4">
      <input type="hidden" name="plano_id" value={planoId} />
      <b className="font-display text-lg">O que você acha deste plano?</b>
      <p className="text-sm text-muted">Sua resposta vai para o técnico. Se algo não encaixa (máquina, dinheiro, mercado, mão de obra), conte: o plano pode ser ajustado.</p>
      {!escrevendo ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn" name="resposta" value="combinado" disabled={enviando}>{enviando ? "Enviando…" : "Combinado"}</button>
          <button type="button" className="btn-ghost" onClick={() => setEscrevendo(true)} disabled={enviando}>Tenho dúvida</button>
          {mudando && <button type="button" className="btn-ghost" onClick={() => setMudando(false)}>Cancelar</button>}
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="label" htmlFor="duvida">Sua dúvida</label>
          <textarea className="input min-h-24" id="duvida" name="duvida" autoFocus placeholder="Não tenho plantadeira para milho, dá para trocar? Quanto custa o calcário?" />
          <div className="flex flex-wrap gap-2">
            <button className="btn" name="resposta" value="duvida" disabled={enviando}>{enviando ? "Enviando…" : "Enviar dúvida"}</button>
            <button type="button" className="btn-ghost" onClick={() => { setEscrevendo(false); setMudando(false); }} disabled={enviando}>Voltar</button>
          </div>
        </div>
      )}
      {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
    </form>
  );
}
