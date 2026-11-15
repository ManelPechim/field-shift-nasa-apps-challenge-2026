"use client";

import { useActionState, useRef, useState } from "react";
import type { Polygon } from "geojson";
import { Mapa, type Foco } from "@/components/mapa";
import { bboxDe, coordenadasBR, dentroDe } from "@/lib/geometria";
import { relatar } from "../actions";

const TIPOS = ["Praga", "Doença", "Planta daninha", "Chuva forte / enxurrada", "Alagamento", "Erosão", "Seca / lavoura murcha", "Geada", "Granizo", "Fogo", "Animais na lavoura", "Colheita", "Outro"];
/** Costumam começar em manchas: o talhão (e o ponto) ajudam o técnico a ir direto ao lugar */
const COMECAM_EM_MANCHAS = ["Praga", "Doença", "Planta daninha"];

export interface PropriedadeRelato { id: string; nome: string; local: string; lat: number; lon: number; limite: Polygon | null }
export interface TalhaoRelato { id: string; nome: string; propriedadeId: string; geojson: Polygon; cor: string; lat: number; lon: number }
type Escopo = "" | "propriedade" | "talhao";
type Ponto = { lon: number; lat: number };

function focoDe(p: PropriedadeRelato | undefined, t: TalhaoRelato | undefined, n: number): Foco | null {
  if (t) return { lon: t.lon, lat: t.lat, bbox: bboxDe(t.geojson), n };
  if (p) return p.limite ? { lon: p.lon, lat: p.lat, bbox: bboxDe(p.limite), n } : { lon: p.lon, lat: p.lat, zoom: 16, n };
  return null;
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="card grid gap-3 p-4 sm:p-5">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-bold">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm text-brand-ink">{n}</span>{titulo}
      </h2>
      {children}
    </section>
  );
}

export function FormularioRelato({ propriedades, talhoes, inicial }: {
  propriedades: PropriedadeRelato[];
  talhoes: TalhaoRelato[];
  inicial: { propriedade?: string; talhao?: string };
}) {
  const [estado, acao, enviando] = useActionState(relatar, undefined);
  const [propId, setPropId] = useState(inicial.propriedade ?? (propriedades.length === 1 ? propriedades[0].id : ""));
  const [escopo, setEscopo] = useState<Escopo>(inicial.talhao ? "talhao" : "");
  const [talhaoId, setTalhaoId] = useState(inicial.talhao ?? "");
  const [marcado, setMarcado] = useState<Ponto | null>(null);
  const [aviso, setAviso] = useState("");
  const [tipo, setTipo] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const n = useRef(0);
  // Vindo da página do talhão, o mapa já abre nele; senão se enquadra sozinho na propriedade
  const [foco, setFoco] = useState<Foco | null>(() => {
    const t = talhoes.find((x) => x.id === inicial.talhao);
    return t ? focoDe(undefined, t, -1) : null;
  });

  const prop = propriedades.find((p) => p.id === propId);
  const daProp = talhoes.filter((t) => t.propriedadeId === propId);
  const talhao = escopo === "talhao" ? daProp.find((t) => t.id === talhaoId) : undefined;
  const centro: Ponto | null = talhao ? { lon: talhao.lon, lat: talhao.lat } : escopo === "propriedade" && prop ? { lon: prop.lon, lat: prop.lat } : null;
  const local = centro ? marcado ?? centro : null;

  function focar(p: PropriedadeRelato | undefined, t: TalhaoRelato | undefined) {
    setFoco(focoDe(p, t, ++n.current));
  }
  function escolherPropriedade(id: string) {
    setPropId(id); setEscopo(""); setTalhaoId(""); setMarcado(null); setAviso("");
    // O mapa é recriado para a nova propriedade e se enquadra sozinho nela
    setFoco(null);
  }
  function escolherEscopo(e: Escopo) {
    setEscopo(e); setMarcado(null); setAviso("");
    if (e === "propriedade") focar(prop, undefined);
    else if (talhaoId) focar(prop, daProp.find((t) => t.id === talhaoId));
  }
  function escolherTalhao(id: string) {
    setTalhaoId(id); setMarcado(null); setAviso("");
    focar(prop, daProp.find((t) => t.id === id));
  }
  function tocarNoMapa(lon: number, lat: number) {
    const tocado = daProp.find((t) => dentroDe([lon, lat], t.geojson));
    if (escopo === "propriedade") {
      if (prop?.limite && !dentroDe([lon, lat], prop.limite)) { setAviso("Esse ponto fica fora do limite da propriedade (linha branca tracejada)."); return; }
      setMarcado({ lon, lat }); setAviso("");
      return;
    }
    if (!tocado) {
      setAviso(escopo === ""
        ? "Para relatar a propriedade inteira, escolha “A propriedade inteira”. Para um talhão, toque dentro dele."
        : daProp.length ? "Esse ponto fica fora dos talhões. Toque dentro de um talhão colorido." : "Esta propriedade ainda não tem talhões desenhados.");
      return;
    }
    // Tocar num talhão já escolhe "um talhão específico"
    setEscopo("talhao"); setTalhaoId(tocado.id); setMarcado({ lon, lat }); setAviso("");
  }

  const descricaoLocal = marcado ? "Ponto que você marcou no mapa" : talhao ? "Centro do talhão" : "Local cadastrado da propriedade";

  return (
    <form action={acao} className="grid max-w-5xl gap-5">
      <input type="hidden" name="propriedade_id" value={propId} />
      <input type="hidden" name="escopo" value={escopo} />
      <input type="hidden" name="talhao_id" value={talhao?.id ?? ""} />
      <input type="hidden" name="lat" value={local?.lat ?? ""} />
      <input type="hidden" name="lon" value={local?.lon ?? ""} />

      <Passo n={1} titulo="Em qual propriedade?">
        {propriedades.length === 1 ? (
          <p><b>{propriedades[0].nome}</b>{propriedades[0].local && <span className="text-muted"> · {propriedades[0].local}</span>}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {propriedades.map((p) => (
              <label key={p.id} className="cursor-pointer">
                <input type="radio" name="propriedade_opcao" checked={propId === p.id} onChange={() => escolherPropriedade(p.id)} className="peer sr-only" />
                <span className="card block p-3 peer-checked:border-brand peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:outline-2 peer-focus-visible:outline-sat">
                  <b className="block font-display">{p.nome}</b>
                  <span className="text-sm text-muted">{p.local || "Local não informado"}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Passo>

      {prop && (
        <Passo n={2} titulo="Onde aconteceu?">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="grid content-start gap-3">
              <fieldset className="grid gap-2">
                <legend className="sr-only">O relato é sobre</legend>
                {([
                  ["propriedade", "A propriedade inteira", "Pegou tudo ou quase tudo: granizo, geada, enxurrada, seca, fogo."],
                  ["talhao", "Um talhão específico", "Aconteceu numa parte da lavoura: praga, doença, erosão, alagamento."],
                ] as const).map(([v, titulo, ajuda]) => {
                  const semTalhoes = v === "talhao" && !daProp.length;
                  return (
                    <label key={v} className={semTalhoes ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
                      <input type="radio" name="escopo_opcao" checked={escopo === v} disabled={semTalhoes} onChange={() => escolherEscopo(v)} className="peer sr-only" />
                      <span className="card block p-3 peer-checked:border-brand peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:outline-2 peer-focus-visible:outline-sat">
                        <b className="block font-display">{titulo}</b>
                        <span className="text-sm text-muted">{semTalhoes ? "Seu técnico ainda não desenhou os talhões desta propriedade." : ajuda}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {escopo === "talhao" && (
                <fieldset>
                  <legend className="label">Qual talhão? <span className="font-normal text-muted">Escolha aqui ou toque nele no mapa.</span></legend>
                  <div className="flex flex-wrap gap-2">
                    {daProp.map((t) => (
                      <label key={t.id} className="cursor-pointer">
                        <input type="radio" name="talhao_opcao" checked={talhaoId === t.id} onChange={() => escolherTalhao(t.id)} className="peer sr-only" />
                        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold peer-checked:text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-sat">
                          <span className="size-3.5 rounded-full border border-black/20" style={{ background: t.cor }} aria-hidden="true" />{t.nome}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div role="status" className={`rounded-xl p-3 text-sm ${local ? "bg-ok-soft" : "bg-surface-2 text-muted"}`}>
                {local ? (
                  <div className="grid gap-1">
                    <b className="text-ink">Local anexado: {talhao ? `talhão ${talhao.nome}` : `${prop.nome} (propriedade inteira)`}</b>
                    <span className="text-ink">{descricaoLocal}</span>
                    <span className="font-mono text-xs text-muted">{coordenadasBR(local.lat, local.lon)}</span>
                    {marcado ? (
                      <button type="button" className="justify-self-start text-sm font-semibold text-brand underline" onClick={() => setMarcado(null)}>Voltar para o {talhao ? "centro do talhão" : "local da propriedade"}</button>
                    ) : (
                      <span className="text-xs text-muted">Sabe o ponto exato? Toque no mapa dentro da área para marcar.</span>
                    )}
                  </div>
                ) : escopo === "talhao" ? "Escolha o talhão para anexar o local." : "Escolha acima se é a propriedade inteira ou um talhão. O local é anexado sozinho."}
              </div>
              {aviso && <p role="alert" className="rounded-lg bg-warn-soft p-2.5 text-sm text-warn">{aviso}</p>}
            </div>

            <Mapa key={prop.id} talhoes={daProp.map((t) => ({ id: t.id, nome: t.nome, geojson: t.geojson, cor: t.cor }))}
              limite={prop.limite} ponto={local ? [local.lon, local.lat] : null} foco={foco}
              destaque={talhao?.id ?? null} aoTocar={tocarNoMapa} busca={false} altura="h-[380px]" />
          </div>
        </Passo>
      )}

      {prop && (
        <Passo n={3} titulo="O que aconteceu?">
          <fieldset>
            <legend className="sr-only">Tipo do relato</legend>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="peer sr-only" required />
                  <span className="inline-block rounded-full border border-line px-3 py-2 text-sm peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:outline-2 peer-focus-visible:outline-sat">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {escopo === "propriedade" && COMECAM_EM_MANCHAS.includes(tipo) && daProp.length > 0 && (
            <p className="rounded-lg bg-sat-soft p-3 text-sm">
              {tipo === "Planta daninha" ? "Planta daninha" : tipo === "Doença" ? "Doença" : "Praga"} quase sempre começa em manchas.
              Se souber em qual talhão viu primeiro, <button type="button" className="font-semibold text-brand underline" onClick={() => escolherEscopo("talhao")}>escolha o talhão</button>: o técnico vai direto ao lugar.
              Se já está espalhada por tudo, pode seguir com a propriedade inteira.
            </p>
          )}
        </Passo>
      )}

      {prop && (
        <Passo n={4} titulo="Foto e detalhes">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-5 text-center hover:border-brand">
              <input type="file" name="foto" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="Foto escolhida" className="max-h-48 rounded-lg" /> : <b className="font-display">Tirar foto</b>}
              <span className="text-sm text-muted">{preview ? "Toque para trocar" : "Opcional, mas ajuda muito o técnico"}</span>
            </label>
            <div>
              <label className="label" htmlFor="descricao">Conte o que viu</label>
              <textarea className="input min-h-36" id="descricao" name="descricao" placeholder="Desde quando, quanto da lavoura pegou, se está aumentando…" />
            </div>
          </div>
        </Passo>
      )}

      {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
      {prop && <button className="btn justify-self-start" disabled={enviando || !local}>{enviando ? "Enviando…" : "Enviar para o técnico"}</button>}
    </form>
  );
}
