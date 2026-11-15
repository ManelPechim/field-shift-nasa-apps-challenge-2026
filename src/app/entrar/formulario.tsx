"use client";

import { useActionState, useState } from "react";
import { criarConta, entrar } from "./actions";

export function FormularioEntrar({ modoInicial }: { modoInicial: "entrar" | "criar" }) {
  const [modo, setModo] = useState(modoInicial);
  const [estadoEntrar, acaoEntrar, entrando] = useActionState(entrar, undefined);
  const [estadoCriar, acaoCriar, criando] = useActionState(criarConta, undefined);
  const estado = modo === "entrar" ? estadoEntrar : estadoCriar;

  return (
    <div className="card p-5">
      <div className="mb-5 grid grid-cols-2 rounded-lg border border-line p-1 text-sm font-semibold" role="tablist">
        {(["entrar", "criar"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => setModo(m)}
            className={`rounded-md py-2 ${modo === m ? "bg-brand text-brand-ink" : "text-muted"}`}>
            {m === "entrar" ? "Entrar" : "Sou técnico, criar conta"}
          </button>
        ))}
      </div>

      {modo === "entrar" ? (
        <form action={acaoEntrar} className="grid gap-4">
          <div>
            <label className="label" htmlFor="login">E-mail ou celular</label>
            <input className="input" id="login" name="login" autoComplete="username" inputMode="email" required placeholder="voce@email.com ou (51) 99999-8888" />
          </div>
          <div><label className="label" htmlFor="senha">Senha</label><input className="input" id="senha" name="senha" type="password" autoComplete="current-password" required /></div>
          <button className="btn" disabled={entrando}>{entrando ? "Entrando…" : "Entrar"}</button>
          <p className="text-sm text-muted">É produtor? Seu acesso é criado pelo seu técnico. Use o login e a senha que ele mandou.</p>
        </form>
      ) : (
        <form action={acaoCriar} className="grid gap-4">
          <p className="text-sm text-muted">Conta para agrônomos, técnicos agrícolas e extensionistas. Os produtores que você atende são cadastrados por você, dentro do app.</p>
          <div><label className="label" htmlFor="nome">Nome</label><input className="input" id="nome" name="nome" autoComplete="name" required /></div>
          <div><label className="label" htmlFor="email2">E-mail</label><input className="input" id="email2" name="email" type="email" autoComplete="email" required /></div>
          <div><label className="label" htmlFor="telefone">Celular (WhatsApp)</label><input className="input" id="telefone" name="telefone" type="tel" autoComplete="tel" placeholder="(51) 99999-8888" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="registro">Registro (CREA/CFTA)</label><input className="input" id="registro" name="registro" /></div>
            <div><label className="label" htmlFor="instituicao">Empresa ou instituição</label><input className="input" id="instituicao" name="instituicao" placeholder="Emater, cooperativa, consultoria…" /></div>
          </div>
          <div><label className="label" htmlFor="senha2">Senha</label><input className="input" id="senha2" name="senha" type="password" autoComplete="new-password" minLength={8} required /><p className="mt-1 text-xs text-muted">Pelo menos 8 caracteres.</p></div>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="consentimento" className="mt-1" required />
            <span>Concordo que meus dados e os dos produtores que eu cadastrar (nome, contato e localização das áreas) sejam guardados para o funcionamento do Field Shift durante o período de testes, conforme a LGPD. Tenho autorização dos produtores para cadastrá-los. A exclusão pode ser pedida a qualquer momento.</span>
          </label>
          <button className="btn" disabled={criando}>{criando ? "Criando…" : "Criar conta de técnico"}</button>
        </form>
      )}
      {estado?.erro && <p role="alert" className="mt-4 rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
      {estado?.aviso && <p role="status" className="mt-4 rounded-lg bg-ok-soft p-3 text-sm text-ok">{estado.aviso}</p>}
    </div>
  );
}
