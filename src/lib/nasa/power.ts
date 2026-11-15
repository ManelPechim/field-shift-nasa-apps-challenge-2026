// NASA POWER (Prediction Of Worldwide Energy Resources): clima diário por ponto, desde 1981, sem cadastro.
// https://power.larc.nasa.gov/docs/services/api/

const BASE = "https://power.larc.nasa.gov/api/temporal/daily/point";
const PARAMS = "T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,RH2M";
const ANO_INICIO_PADRAO = 2005;
const ANO_FIM_PADRAO = 2024;

export interface ClimaTalhao {
  fonte: "NASA POWER";
  lat: number;
  lon: number;
  periodo: string;
  chuva_mm: number[]; // média por mês
  temp_media: number[];
  temp_min: number[];
  temp_max: number[];
  umidade_ar: number[];
  geada_dias: number[]; // dias por mês com mínima ≤ 2 °C (média dos anos)
  calor_dias: number[]; // dias por mês com máxima ≥ 35 °C
  chuva_anual_mm: number;
  chuva_extrema_dias_ano: number; // dias com ≥ 50 mm
  maior_estiagem_dias: number; // média anual da maior sequência de dias com < 1 mm
  chuva_decadas: { de: string; mm_ano: number }[];
  recente: {
    ate: string;
    chuva_30d_mm: number;
    chuva_30d_normal_mm: number;
    min_30d: number | null;
    geadas_30d: number;
    dias_sem_chuva: number;
  } | null;
  atualizado_em: string;
}

type Serie = Record<string, number>;

async function buscar(lat: number, lon: number, inicio: string, fim: string) {
  const url = `${BASE}?parameters=${PARAMS}&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${inicio}&end=${fim}&format=JSON`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`NASA POWER respondeu ${res.status}`);
  const json = await res.json();
  return json.properties.parameter as Record<string, Serie>;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const ok = (v: number | undefined): v is number => typeof v === "number" && v > -990;

/** Clima normal do ponto. Por padrão, 2005–2024 e os últimos 30 dias até hoje; a retroanálise passa outro período e outro "hoje". */
export async function climaDoPonto(lat: number, lon: number, opcoes: { de?: number; ate?: number; hoje?: Date } = {}): Promise<ClimaTalhao> {
  const ANO_INICIO = opcoes.de ?? ANO_INICIO_PADRAO, ANO_FIM = opcoes.ate ?? ANO_FIM_PADRAO;
  const hoje = opcoes.hoje ?? new Date();
  const inicioRecente = new Date(hoje.getTime() - 50 * 86400_000);
  const [hist, rec] = await Promise.all([
    buscar(lat, lon, `${ANO_INICIO}0101`, `${ANO_FIM}1231`),
    buscar(lat, lon, ymd(inicioRecente), ymd(hoje)).catch(() => null),
  ]);

  const anos = ANO_FIM - ANO_INICIO + 1;
  const soma = { chuva: Array(12).fill(0), t: Array(12).fill(0), tmin: Array(12).fill(0), tmax: Array(12).fill(0), rh: Array(12).fill(0) };
  const n = { t: Array(12).fill(0), tmin: Array(12).fill(0), tmax: Array(12).fill(0), rh: Array(12).fill(0) };
  const geada = Array(12).fill(0);
  const calor = Array(12).fill(0);
  let extremas = 0;
  const estiagens: number[] = [];
  const chuvaAno: Record<number, number> = {};
  let anoAtual = ANO_INICIO, seca = 0, maiorSeca = 0;

  for (const dia of Object.keys(hist.PRECTOTCORR).sort()) {
    const ano = Number(dia.slice(0, 4));
    const m = Number(dia.slice(4, 6)) - 1;
    if (ano !== anoAtual) { estiagens.push(maiorSeca); maiorSeca = 0; seca = 0; anoAtual = ano; }
    const p = hist.PRECTOTCORR[dia], t = hist.T2M[dia], tmin = hist.T2M_MIN[dia], tmax = hist.T2M_MAX[dia], rh = hist.RH2M[dia];
    if (ok(p)) {
      soma.chuva[m] += p;
      chuvaAno[ano] = (chuvaAno[ano] ?? 0) + p;
      if (p >= 50) extremas++;
      if (p < 1) { seca++; maiorSeca = Math.max(maiorSeca, seca); } else seca = 0;
    }
    if (ok(t)) { soma.t[m] += t; n.t[m]++; }
    if (ok(tmin)) { soma.tmin[m] += tmin; n.tmin[m]++; if (tmin <= 2) geada[m]++; }
    if (ok(tmax)) { soma.tmax[m] += tmax; n.tmax[m]++; if (tmax >= 35) calor[m]++; }
    if (ok(rh)) { soma.rh[m] += rh; n.rh[m]++; }
  }
  estiagens.push(maiorSeca);

  const r1 = (v: number) => Math.round(v * 10) / 10;
  const chuva_mm = soma.chuva.map((v) => Math.round(v / anos));
  const media = (k: "t" | "tmin" | "tmax" | "rh") => soma[k].map((v, i) => r1(v / Math.max(1, n[k][i])));
  const decadas = [ANO_INICIO, ANO_INICIO + 10].map((de) => {
    const vals = Object.entries(chuvaAno).filter(([a]) => Number(a) >= de && Number(a) < de + 10).map(([, v]) => v);
    return { de: `${de}–${de + 9}`, mm_ano: Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)) };
  });

  let recente: ClimaTalhao["recente"] = null;
  if (rec) {
    const dias = Object.keys(rec.PRECTOTCORR).sort().filter((d) => ok(rec.PRECTOTCORR[d]));
    const ult = dias.slice(-30);
    if (ult.length >= 20) {
      const chuva30 = ult.reduce((a, d) => a + rec.PRECTOTCORR[d], 0);
      const mins = ult.map((d) => rec.T2M_MIN[d]).filter(ok);
      // Normal para os mesmos dias: chuva média diária de cada mês × dias
      const normal = ult.reduce((a, d) => {
        const m = Number(d.slice(4, 6)) - 1;
        const diasMes = new Date(2001, m + 1, 0).getDate();
        return a + chuva_mm[m] / diasMes;
      }, 0);
      let semChuva = 0;
      for (let i = dias.length - 1; i >= 0 && rec.PRECTOTCORR[dias[i]] < 1; i--) semChuva++;
      const ultimo = ult[ult.length - 1];
      recente = {
        ate: `${ultimo.slice(0, 4)}-${ultimo.slice(4, 6)}-${ultimo.slice(6, 8)}`,
        chuva_30d_mm: Math.round(chuva30),
        chuva_30d_normal_mm: Math.round(normal),
        min_30d: mins.length ? r1(Math.min(...mins)) : null,
        geadas_30d: mins.filter((v) => v <= 2).length,
        dias_sem_chuva: semChuva,
      };
    }
  }

  return {
    fonte: "NASA POWER",
    lat, lon,
    periodo: `${ANO_INICIO}–${ANO_FIM}`,
    chuva_mm,
    temp_media: media("t"),
    temp_min: media("tmin"),
    temp_max: media("tmax"),
    umidade_ar: media("rh"),
    geada_dias: geada.map((v) => r1(v / anos)),
    calor_dias: calor.map((v) => r1(v / anos)),
    chuva_anual_mm: chuva_mm.reduce((a, b) => a + b, 0),
    chuva_extrema_dias_ano: r1(extremas / anos),
    maior_estiagem_dias: Math.round(estiagens.reduce((a, b) => a + b, 0) / estiagens.length),
    chuva_decadas: decadas,
    recente,
    atualizado_em: new Date().toISOString(),
  };
}

export interface MesObservado { mes: string; chuva: number; diasCalor: number; tmaxMedia: number; maiorEstiagem: number }

/** Chuva e calor observados mês a mês num período (para comparar uma safra passada com o normal). */
export async function safraObservada(lat: number, lon: number, inicio: string, fim: string): Promise<MesObservado[]> {
  const d = await buscar(lat, lon, inicio, fim);
  const meses = new Map<string, { chuva: number; calor: number; tmax: number; n: number; seca: number; maior: number }>();
  for (const dia of Object.keys(d.PRECTOTCORR).sort()) {
    const k = dia.slice(0, 6);
    const m = meses.get(k) ?? { chuva: 0, calor: 0, tmax: 0, n: 0, seca: 0, maior: 0 };
    const p = d.PRECTOTCORR[dia], tmax = d.T2M_MAX[dia];
    if (ok(p)) { m.chuva += p; if (p < 1) { m.seca++; m.maior = Math.max(m.maior, m.seca); } else m.seca = 0; }
    if (ok(tmax)) { m.tmax += tmax; m.n++; if (tmax >= 35) m.calor++; }
    meses.set(k, m);
  }
  return [...meses].map(([k, m]) => ({ mes: k, chuva: Math.round(m.chuva), diasCalor: m.calor, tmaxMedia: Math.round((m.tmax / Math.max(1, m.n)) * 10) / 10, maiorEstiagem: m.maior }));
}
