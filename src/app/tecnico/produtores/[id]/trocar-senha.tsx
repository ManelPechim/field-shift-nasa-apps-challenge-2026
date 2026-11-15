"use client";

import { useActionState, useState } from "react";
import { redefinirSenha } from "@/app/tecnico/actions";
import { CampoSenha, PainelAcesso } from "../acesso";

export function TrocarSenha({ produtorId, senhaSugerida }: { produtorId: string; senhaSugerida: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, salvando] = useActionState(redefinirSenha, undefined);
  if (estado?.ok) return <PainelAcesso {...estado} />;
  if (!aberto) return <button type="button" className="btn-ghost btn-sm" onClick={() => setAberto(true)}>Criar senha nova</button>;
  return (
    <form action={acao} className="grid gap-3">
      <input type="hidden" name="produtor_id" value={produtorId} />
      <CampoSenha inicial={senhaSugerida} id="nova-senha" rotulo="Senha nova" />
      {estado?.erro && <p role="alert" className="text-sm text-bad">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="btn btn-sm" disabled={salvando}>{salvando ? "Salvando…" : "Trocar senha"}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
