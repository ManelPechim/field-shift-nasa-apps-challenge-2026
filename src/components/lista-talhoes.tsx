"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Polygon } from "geojson";
import { Area } from "./area";
import { IconeVerNoMapa } from "./icones";
import { Selo } from "./ui";

export { bboxDe } from "@/lib/geometria";

export interface TalhaoDaLista {
  id: string;
  nome: string;
  geojson: Polygon;
  area_ha: number | null;
  cor: string;
  /** Linha abaixo do nome: rotação (técnico) ou plano da safra (produtor) */
  descricao: string;
  pendentes?: number;
}

/** Cartões dos talhões com a cor do mapa, "Ver no mapa" e "Abrir talhão". */
export function ListaDeTalhoes({
  talhoes, destaque, aoVerNoMapa, hrefTalhao, vazio, acoes,
}: {
  talhoes: TalhaoDaLista[];
  destaque: string | null;
  aoVerNoMapa: (t: TalhaoDaLista) => void;
  hrefTalhao: string;
  vazio: string;
  /** Botões a mais no card (ex.: "Editar", só para o técnico) */
  acoes?: (t: TalhaoDaLista) => ReactNode;
}) {
  if (!talhoes.length) {
    return <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-5 text-center text-sm text-muted">{vazio}</div>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {talhoes.map((t) => (
        <li key={t.id} className={`card grid content-between gap-2 p-3 ${destaque === t.id ? "border-brand ring-1 ring-brand" : ""}`}>
          <div className="flex items-start gap-2.5">
            <span className="mt-1 size-4 shrink-0 rounded-full border border-black/20" style={{ background: t.cor }} aria-hidden="true" />
            <div className="min-w-0">
              <b className="block font-display leading-tight">{t.nome}</b>
              <span className="text-sm text-muted"><Area ha={t.area_ha} /> · {t.descricao}</span>
              {!!t.pendentes && <div className="mt-1"><Selo tom="atencao">{t.pendentes} tarefa{t.pendentes > 1 ? "s" : ""} pendente{t.pendentes > 1 ? "s" : ""}</Selo></div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => aoVerNoMapa(t)}><IconeVerNoMapa />Ver no mapa</button>
            <Link href={`${hrefTalhao}${t.id}`} className="btn btn-sm no-underline">Abrir talhão</Link>
            {acoes?.(t)}
          </div>
        </li>
      ))}
    </ul>
  );
}
