import { GLOSSARIO, type Termo } from "@/lib/glossario";

/** Siglas e termos da página, explicados em uma frase cada. */
export function Glossario({ termos, titulo = "Siglas e termos desta página" }: { termos: Termo[]; titulo?: string }) {
  return (
    <section className="card p-4">
      <h2 className="eyebrow mb-2">{titulo}</h2>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {termos.map((t) => (
          <div key={t}>
            <dt className="font-semibold">{t}</dt>
            <dd className="text-muted">{GLOSSARIO[t]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Explicação curta embaixo de um título: para que serve esta parte da tela. */
export function PraQueServe({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 max-w-3xl text-sm text-muted"><b className="text-ink">Pra que serve:</b> {children}</p>;
}
