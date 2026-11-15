"use client";

import Link from "next/link";
import { useActionState } from "react";
import { criarProdutor } from "@/app/tecnico/actions";
import { CampoSenha, PainelAcesso } from "../acesso";

export function FormularioProdutor({ senhaSugerida }: { senhaSugerida: string }) {
  const [estado, acao, salvando] = useActionState(criarProdutor, undefined);

  if (estado?.ok) {
    return (
      <div className="grid max-w-3xl gap-4">
        <PainelAcesso {...estado} />
        <div className="flex flex-wrap gap-2">
          <Link href={`/tecnico/produtores/${estado.produtorId}/propriedades/nova`} className="btn no-underline">Cadastrar a propriedade de {estado.nome.split(" ")[0]}</Link>
          <Link href={`/tecnico/produtores/${estado.produtorId}`} className="btn-ghost no-underline">Ir para a página do cliente</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={acao} className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label" htmlFor="nome">Nome do produtor</label><input className="input" id="nome" name="nome" defaultValue={estado?.valores?.nome} required autoComplete="off" /></div>
      <div>
        <label className="label" htmlFor="celular">Celular (WhatsApp)</label>
        <input className="input" id="celular" name="celular" type="tel" defaultValue={estado?.valores?.celular} required placeholder="(51) 99999-8888" autoComplete="off" />
        <p className="mt-1 text-xs text-muted">O produtor também entra com o celular.</p>
      </div>
      <div><label className="label" htmlFor="email">E-mail</label><input className="input" id="email" name="email" type="email" defaultValue={estado?.valores?.email} required autoComplete="off" /></div>
      <div className="sm:col-span-2"><CampoSenha inicial={senhaSugerida} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="observacoes">Observações (só você vê)</label><textarea className="input min-h-20" id="observacoes" name="observacoes" defaultValue={estado?.valores?.observacoes} placeholder="Como conheceu, o que ele planta, preferências de contato…" /></div>
      {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad sm:col-span-2">{estado.erro}</p>}
      <div className="sm:col-span-2"><button className="btn" disabled={salvando}>{salvando ? "Criando acesso…" : "Salvar cliente e criar acesso"}</button></div>
    </form>
  );
}
