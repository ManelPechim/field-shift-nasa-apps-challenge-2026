import Link from "next/link";

export interface Passo { rotulo: string; tipo?: string; href?: string }

/** Caminho de navegação. O último passo é a página atual e fica destacado. */
export function Trilha({ passos }: { passos: Passo[] }) {
  return (
    <nav aria-label="Caminho" className="mb-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {passos.map((p, i) => {
          const atual = i === passos.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted" aria-hidden="true">›</span>}
              {atual ? (
                <span aria-current="page" className="rounded-full bg-brand-soft px-2.5 py-0.5 font-semibold text-brand">
                  {p.tipo && <span className="font-normal">{p.tipo}: </span>}{p.rotulo}
                </span>
              ) : (
                <Link href={p.href ?? "#"} className="text-ink hover:text-brand">
                  {p.tipo && <span className="text-muted">{p.tipo}: </span>}{p.rotulo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
