import Link from "next/link";
import { Logo } from "@/components/ui";

const PASSOS = [
  ["1", "Visita e mapa", "O técnico desenha os talhões sobre a imagem de satélite e registra o que viu no campo: relevo, erosão, alagamento, manejo e objetivos do produtor."],
  ["2", "Dados da NASA", "Para cada talhão, o app busca 20 anos de clima diário (NASA POWER), o relevo (SRTM) e camadas de vegetação e umidade do solo (MODIS, SMAP, HLS)."],
  ["3", "Laudo de solo", "O técnico fotografa o laudo do laboratório. A IA lê os números, o técnico confere e o app interpreta a fertilidade e a saúde do solo."],
  ["4", "Plano para o produtor", "O app compara a rotação atual com alternativas. O técnico escolhe, ajusta e publica um plano com tarefas em linguagem simples."],
  ["5", "Campo e acompanhamento", "O produtor vê o que fazer, marca o que fez e relata problemas com foto. Os alertas usam os dados recentes da NASA."],
];

export default function Inicio() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2"><Logo /><b className="font-display text-xl font-extrabold">Field Shift</b></span>
          <Link href="/entrar" className="btn-ghost btn-sm">Entrar</Link>
        </div>
        <span className="eyebrow">NASA Space Apps Challenge 2026 · Desafio Field Shift</span>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          O técnico planeja com dados da NASA. O produtor recebe o que fazer.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          As informações para escolher uma boa rotação de culturas já existem, mas estão espalhadas: clima num lugar, relevo em outro, laudo de solo no papel.
          O Field Shift junta tudo por talhão e transforma em um plano que o produtor entende.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/entrar?modo=criar" className="btn">Criar conta</Link>
          <Link href="/entrar" className="btn-ghost">Já tenho conta</Link>
        </div>

        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PASSOS.map(([n, t, d]) => (
            <li key={n} className="card p-4">
              <span className="mb-2 grid size-8 place-items-center rounded-full bg-brand-soft font-display font-extrabold text-brand">{n}</span>
              <b className="block font-display text-lg">{t}</b>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-2xl text-sm text-muted">
          O Field Shift apoia a decisão; não substitui o técnico nem o agrônomo responsável. Recomendações de adubação e de defensivos continuam exigindo um profissional habilitado.
        </p>
      </div>
    </main>
  );
}
