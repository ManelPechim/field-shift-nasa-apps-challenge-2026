import { concluirTarefa } from "@/app/produtor/actions";
import type { Tarefa } from "@/lib/tipos";
import { dataBR } from "./ui";

/** Tarefa vista pelo produtor: um botão grande para marcar como feita. */
export function TarefaProdutor({ t, talhao }: { t: Tarefa; talhao?: string }) {
  const feita = t.status === "feita";
  return (
    <li className={`card grid gap-2 p-4 ${feita ? "opacity-70" : ""}`}>
      <div>
        <b className={`font-display text-lg leading-tight ${feita ? "line-through" : ""}`}>{t.titulo}</b>
        <p className="text-sm text-muted">{[talhao, t.quando].filter(Boolean).join(" · ")}</p>
        {t.descricao && <p className="mt-1 text-sm">{t.descricao}</p>}
      </div>
      {feita ? (
        <form action={concluirTarefa} className="flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="tarefa_id" value={t.id} /><input type="hidden" name="feita" value="0" />
          <span className="font-semibold text-ok">Feita em {dataBR(t.feita_em)}</span>
          <button className="text-muted underline">Desfazer</button>
        </form>
      ) : (
        <form action={concluirTarefa} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input type="hidden" name="tarefa_id" value={t.id} />
          <input className="input" name="nota" aria-label="Comentário (opcional)" placeholder="Comentário para o técnico (opcional)" />
          <button className="btn">Marquei como feito</button>
        </form>
      )}
    </li>
  );
}
