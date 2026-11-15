"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeInicio, IconeRelatar, IconeTarefas } from "@/components/icones";

/** Barra fixa no rodapé do celular: o produtor usa o app no campo, muitas vezes com uma mão só. */
export function BarraCelular() {
  const caminho = usePathname();
  const propriedade = caminho.match(/^\/produtor\/propriedades\/([^/]+)/)?.[1];
  const talhao = caminho.match(/^\/produtor\/talhoes\/([^/]+)/)?.[1];
  // Dentro de uma propriedade ou talhão, o relato já abre com o lugar escolhido
  const relatar = propriedade ? `/produtor/propriedades/${propriedade}/relatar` : talhao ? `/produtor/relatar?talhao=${talhao}` : "/produtor/relatar";
  const tarefas = (propriedade || talhao) && !caminho.endsWith("/relatar") ? "#tarefas" : "/produtor#tarefas";
  const emRelato = caminho.endsWith("/relatar");

  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold no-underline";
  return (
    <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-[max(12px,env(safe-area-inset-left,0px))] pt-2 pb-[max(8px,env(safe-area-inset-bottom,0px))] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch gap-2">
        <Link href="/produtor" className={`${item} ${caminho === "/produtor" ? "text-brand" : "text-ink"}`} aria-current={caminho === "/produtor" ? "page" : undefined}>
          <IconeInicio />Início
        </Link>
        <Link href={tarefas} className={`${item} text-ink`}>
          <IconeTarefas />Tarefas
        </Link>
        <Link href={relatar} className={`${item} ${emRelato ? "bg-brand-soft text-brand" : "bg-brand text-brand-ink"}`} aria-current={emRelato ? "page" : undefined}>
          <IconeRelatar />Relatar
        </Link>
      </div>
    </nav>
  );
}
