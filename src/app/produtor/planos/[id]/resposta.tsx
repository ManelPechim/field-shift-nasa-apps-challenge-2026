"use client";

import { useActionState, useEffect, useState } from "react";
import { marcarPlanoVisto, responderPlano } from "@/app/produtor/actions";

/** Marca o plano como visto quando a tela abre de verdade (o prefetch de links não dispara efeitos). */
export function MarcarVisto({ planoId }: { planoId: string }) {
  useEffect(() => { void marcarPlanoVisto(planoId); }, [planoId]);
  return null;
}

/** "Combinado" ou "Tenho dúvida"; depois de responder, mostra a resposta e deixa mudar.
 *  Use com key={respondidoEm}: a resposta nova remonta o componente e limpa o estado do formulário. */
export function RespostaAoPlano({ planoId, resposta, duvida, respondidoEm }: {
  planoId: string;
  resposta: "combinado" | "duvida" | null;
  duvida: string | null;
  respondidoEm: string | null;
}) {
  const [estado, acao, enviando] = useActionState(responderPlano, undefined);
  const [escrevendo, setEscrevendo] = useState(false);
  const [mudando, setMudando] = useState(false);

  if (resposta && !mudando) {
    return (
      <div className={`grid gap-2 rounded-2xl p-4 ${resposta === "combinado" ? "bg-ok-soft" : "bg-sat-soft"}`} role="status">
        <b className="font-display text-lg">{resposta === "combinado" ? "Você combinou este plano com o técnico." : "Você mandou uma dúvida ao técnico."}</b>
        {resposta === "duvida" && duvida && <p className="text-sm">“{duvida}”</p>}
        {respondidoEm && <p className="text-sm text-muted">Em {new Date(respondidoEm).toLocaleDateString("pt-BR")}. {resposta === "duvida" ? "Ele vai responder por aqui ou pelo WhatsApp." : "As tarefas abaixo seguem valendo."}</p>}
        <button type="button" className="justify-self-start text-sm font-semibold text-brand underline" onClick={() => setMudando(true)}>Mudar minha resposta</button>
      </div>
    );
  }

  return (
    <form action={acao} className="card grid gap-3 p-4">
      <input type="hidden" name="plano_id" value={planoId} />
      <b className="font-display text-lg">O que você acha deste plano?</b>
      <p className="text-sm text-muted">Sua resposta vai para o técnico. Se algo não encaixa (máquina, dinheiro, mercado, mão de obra), conte: ele ajusta o plano.</p>
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
            <button type="button" className="btn-ghost" onClick={() => setEscrevendo(false)} disabled={enviando}>Voltar</button>
          </div>
        </div>
      )}
      {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
    </form>
  );
}
