"use client";

import { useActionState, useState } from "react";
import { relatar } from "../actions";

const TIPOS = ["Praga", "Doença", "Planta daninha", "Chuva forte / enxurrada", "Alagamento", "Erosão", "Seca / lavoura murcha", "Geada", "Granizo", "Colheita", "Outro"];

export function FormularioRelato({ talhoes, inicial }: { talhoes: { id: string; nome: string }[]; inicial: string }) {
  const [estado, acao, enviando] = useActionState(relatar, undefined);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsMsg, setGpsMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  function gps() {
    setGpsMsg("Pegando a localização…");
    navigator.geolocation?.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude }); setGpsMsg("Localização anexada."); },
      () => setGpsMsg("Não foi possível pegar a localização. O relato vai sem ela."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <form action={acao} className="grid max-w-xl gap-5">
      <div>
        <label className="label" htmlFor="talhao_id">Talhão</label>
        <select className="input" id="talhao_id" name="talhao_id" defaultValue={inicial}>{talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
      </div>
      <fieldset>
        <legend className="label">O que aconteceu?</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <label key={t} className="cursor-pointer">
              <input type="radio" name="tipo" value={t} className="peer sr-only" required />
              <span className="inline-block rounded-full border border-line px-3 py-2 text-sm peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:outline-2 peer-focus-visible:outline-sat">{t}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <span className="label">Foto</span>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-5 text-center hover:border-brand">
          <input type="file" name="foto" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="Foto escolhida" className="max-h-48 rounded-lg" /> : <b className="font-display">Tirar foto</b>}
          <span className="text-sm text-muted">{preview ? "Toque para trocar" : "Opcional, mas ajuda muito o técnico"}</span>
        </label>
      </div>
      <div>
        <label className="label" htmlFor="descricao">Conte o que viu</label>
        <textarea className="input min-h-28" id="descricao" name="descricao" placeholder="Onde no talhão, desde quando, quanto da lavoura…" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost btn-sm" onClick={gps}>Anexar minha localização</button>
        {gpsMsg && <span className="text-sm text-muted">{gpsMsg}</span>}
        <input type="hidden" name="lat" value={pos?.lat ?? ""} />
        <input type="hidden" name="lon" value={pos?.lon ?? ""} />
      </div>
      {estado?.erro && <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{estado.erro}</p>}
      <button className="btn" disabled={enviando}>{enviando ? "Enviando…" : "Enviar para o técnico"}</button>
    </form>
  );
}
