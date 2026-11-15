import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Tom } from "@/lib/agro/solo";
import { sair } from "@/app/entrar/actions";
import type { Perfil } from "@/lib/tipos";

const TONS: Record<Tom | "neutro", string> = {
  bom: "bg-ok-soft text-ok",
  atencao: "bg-warn-soft text-warn",
  ruim: "bg-bad-soft text-bad",
  info: "bg-sat-soft text-sat",
  neutro: "bg-surface-2 text-muted",
};

export function Selo({ tom = "neutro", children }: { tom?: Tom | "neutro"; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TONS[tom]}`}>{children}</span>;
}

export function tomDoNivel(n: number): Tom | "neutro" {
  return n >= 3 ? "ruim" : n === 2 ? "atencao" : n === 1 ? "bom" : "neutro";
}

/** Símbolo da Terrana (public/terrana-simbolo.svg). */
export function Logo() {
  return <Image src="/terrana-simbolo.svg" alt="" width={28} height={31} unoptimized aria-hidden="true" />;
}

export function Topo({ perfil, links }: { perfil: Perfil; links: { href: string; nome: string }[] }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
        <Link href={perfil.papel === "tecnico" ? "/tecnico" : "/produtor"} className="mr-auto flex items-center gap-2 no-underline">
          <Logo />
          <span className="leading-tight">
            <b className="block font-display text-lg font-extrabold text-ink">Terrana</b>
            <span className="eyebrow">{perfil.papel === "tecnico" ? "Área do técnico" : "Área do produtor"}</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="font-semibold text-ink hover:text-brand">
              {l.nome}
            </Link>
          ))}
          <span className="text-muted">{perfil.nome || perfil.email}</span>
          <form action={sair}>
            <button className="text-sm font-semibold text-brand underline">Sair</button>
          </form>
        </nav>
      </div>
    </header>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">{children}</main>;
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-6 text-center">
      <p className="font-display font-bold">{titulo}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function dataBR(d: string | null | undefined) {
  if (!d) return "—";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}

export function num(v: number | null | undefined, casas = 0) {
  return v == null || Number.isNaN(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
