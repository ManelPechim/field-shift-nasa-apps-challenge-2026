"use client";

import { useState } from "react";
import { formatarCelular, linkWhatsApp, sugerirSenha } from "@/lib/contato";

/** `inicial` vem do servidor, para o valor não mudar entre a renderização no servidor e no navegador. */
export function CampoSenha({ inicial, id = "senha", rotulo = "Senha de acesso" }: { inicial: string; id?: string; rotulo?: string }) {
  const [senha, setSenha] = useState(inicial);
  return (
    <div>
      <label className="label" htmlFor={id}>{rotulo}</label>
      <div className="flex gap-2">
        <input className="input font-mono" id={id} name="senha" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="off" />
        <button type="button" className="btn-ghost btn-sm whitespace-nowrap" onClick={() => setSenha(sugerirSenha())}>Outra</button>
      </div>
      <p className="mt-1 text-xs text-muted">Sugerimos uma senha fácil de ditar. Pode trocar por outra.</p>
    </div>
  );
}

/** Mostra o acesso criado e manda pelo WhatsApp. A senha só aparece agora; o app não guarda. */
export function PainelAcesso({ nome, email, celular, senha, mensagem }: { nome: string; email: string; celular: string; senha: string; mensagem: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(mensagem); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { setCopiado(false); }
  }
  return (
    <div className="grid gap-3 rounded-2xl border border-ok bg-ok-soft p-4">
      <b className="font-display text-lg">Acesso de {nome.split(" ")[0]} criado</b>
      <dl className="grid gap-1 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">Login</dt><dd className="font-semibold break-all">{email}</dd></div>
        <div><dt className="text-muted">Ou celular</dt><dd className="font-semibold">{formatarCelular(celular)}</dd></div>
        <div><dt className="text-muted">Senha</dt><dd className="font-mono font-semibold">{senha}</dd></div>
      </dl>
      <pre className="whitespace-pre-wrap rounded-lg bg-surface p-3 font-sans text-sm">{mensagem}</pre>
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-sm no-underline" href={linkWhatsApp(celular, mensagem)} target="_blank" rel="noreferrer">Enviar pelo WhatsApp</a>
        <button type="button" className="btn-ghost btn-sm" onClick={copiar}>{copiado ? "Copiado" : "Copiar mensagem"}</button>
      </div>
      <p className="text-xs text-muted">Anote ou envie agora: a senha não fica guardada para consulta. Se o produtor esquecer, crie uma nova na página dele.</p>
    </div>
  );
}
