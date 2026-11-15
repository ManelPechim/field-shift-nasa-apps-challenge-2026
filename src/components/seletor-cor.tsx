"use client";

/** Cores que aparecem bem sobre a imagem de satélite */
export const PALETA = [
  ["#f2c94c", "Amarelo"], ["#ff8a3d", "Laranja"], ["#ef4444", "Vermelho"], ["#ec4899", "Rosa"], ["#a855f7", "Roxo"],
  ["#38bdf8", "Azul"], ["#22d3ee", "Ciano"], ["#a3e635", "Verde-limão"], ["#ffffff", "Branco"],
] as const;

/** Primeira cor da paleta que nenhum outro talhão usa */
export function corLivre(usadas: Set<string>) {
  return PALETA.find(([c]) => !usadas.has(c))?.[0] ?? PALETA[0][0];
}

/** Paleta + "outra" (seletor nativo). `usadas`: cores dos outros talhões da mesma propriedade, em minúsculas. */
export function SeletorDeCor({ cor, aoMudar, usadas, nome = "cor_opcao" }: { cor: string; aoMudar: (c: string) => void; usadas: Set<string>; nome?: string }) {
  return (
    <fieldset>
      <legend className="label">Cor no mapa</legend>
      <div className="flex flex-wrap items-center gap-2">
        {PALETA.map(([c, rotulo]) => (
          <label key={c} className="cursor-pointer" title={rotulo + (usadas.has(c) ? " (já usada)" : "")}>
            <input type="radio" name={nome} value={c} checked={cor === c} onChange={() => aoMudar(c)} className="peer sr-only" />
            <span className="block size-7 rounded-full border-2 border-black/15 ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-sat" style={{ background: c }} />
            <span className="sr-only">{rotulo}{usadas.has(c) ? " (já usada)" : ""}</span>
          </label>
        ))}
        <label className="flex items-center gap-1 text-xs text-muted" title="Outra cor">
          <input type="color" value={cor} onChange={(e) => aoMudar(e.target.value)} className="size-7 cursor-pointer rounded border border-line bg-transparent p-0" aria-label="Escolher outra cor" />
          outra
        </label>
      </div>
      <p className="mt-1 text-xs text-muted">
        {usadas.has(cor.toLowerCase()) ? "Outro talhão desta propriedade já usa essa cor: no mapa vai ficar difícil distinguir os dois." : "Prefira uma cor diferente da dos outros talhões."}
      </p>
    </fieldset>
  );
}
