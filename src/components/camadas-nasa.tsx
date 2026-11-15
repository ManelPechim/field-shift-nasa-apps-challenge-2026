// Camadas da NASA (GIBS / Worldview) mostradas sobre o mapa, com a explicação de uso e a legenda de cores.
// As cores das escalas foram tiradas dos mapas de cor oficiais do GIBS:
//   NDVI: https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml
//   SMAP: https://gibs.earthdata.nasa.gov/colormaps/v1.3/SMAP_Analyzed_Soil_Moisture.xml

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

interface Parada { valor: number; cor: string }
interface Faixa { ate: number; texto: string }

interface Escala {
  tipo: "escala";
  min: number;
  max: number;
  paradas: Parada[];
  marcas: { valor: number; rotulo: string }[];
  faixas: Faixa[];
  unidade: string;
  /** Rótulos das pontas da escala, na legenda sobre o mapa */
  pontas: [string, string];
}
interface Amostras { tipo: "amostras"; itens: { cor: string; curto: string; texto: string }[] }

export interface Camada {
  nome: string;
  curto: string;
  url: (data: string) => string;
  maxzoom: number;
  opacidade: number;
  paraQue: string;
  quandoUsar: string[];
  detalhes: string;
  legenda: Escala | Amostras;
}

export const CAMADAS_NASA = {
  ndvi: {
    nome: "Vegetação (NDVI MODIS, 8 dias)",
    curto: "Vegetação (NDVI)",
    url: (d: string) => `${GIBS}/MODIS_Terra_NDVI_8Day/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
    maxzoom: 9,
    opacidade: 0.75,
    paraQue: "Mostra o quanto há de planta verde e viva em cada ponto. Quanto mais verde-escuro, mais vigorosa a vegetação.",
    quandoUsar: [
      "Comparar datas para ver a lavoura crescer, chegar ao auge e secar na colheita.",
      "Confirmar se o solo ficou descoberto na entressafra (cor marrom).",
      "Ver se a região está mais seca ou mais verde que em outros anos na mesma época.",
    ],
    detalhes: "Satélite Terra (MODIS). Cada quadradinho tem 250 m: um talhão pequeno vira um ou dois pontos. Média dos últimos 8 dias, o que elimina parte das nuvens.",
    legenda: {
      tipo: "escala",
      min: 0,
      max: 1,
      unidade: "índice de 0 a 1",
      pontas: ["Sem planta", "Muito verde"],
      paradas: [
        { valor: 0, cor: "#f1ecec" }, { valor: 0.07, cor: "#e5dbcd" }, { valor: 0.14, cor: "#c8b5a5" }, { valor: 0.21, cor: "#b0957d" },
        { valor: 0.2999, cor: "#965a47" }, { valor: 0.3, cor: "#bfde77" }, { valor: 0.375, cor: "#96ba20" }, { valor: 0.48, cor: "#5da300" },
        { valor: 0.585, cor: "#3e8a00" }, { valor: 0.72, cor: "#197300" }, { valor: 0.86, cor: "#005a00" }, { valor: 1, cor: "#001801" },
      ],
      marcas: [{ valor: 0, rotulo: "0" }, { valor: 0.2, rotulo: "0,2" }, { valor: 0.4, rotulo: "0,4" }, { valor: 0.6, rotulo: "0,6" }, { valor: 0.8, rotulo: "0,8" }, { valor: 1, rotulo: "1" }],
      faixas: [
        { ate: 0.2, texto: "Solo exposto, palhada seca, estrada ou cidade" },
        { ate: 0.4, texto: "Pouca planta: lavoura nascendo, secando ou pasto ralo" },
        { ate: 0.6, texto: "Lavoura ou pasto em crescimento" },
        { ate: 1, texto: "Vegetação densa: lavoura no auge ou mata" },
      ],
    },
  },
  smap: {
    nome: "Umidade da zona das raízes (SMAP L4)",
    curto: "Umidade do solo (SMAP)",
    url: (d: string) => `${GIBS}/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/${d}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
    maxzoom: 6,
    opacidade: 0.65,
    paraQue: "Mostra quanta água há no solo até cerca de 1 m de profundidade, onde ficam as raízes. Laranja é seco; verde, intermediário; azul, muito úmido.",
    quandoUsar: [
      "Antes de plantar: ver se a região tem umidade para a semente germinar.",
      "Durante uma estiagem: acompanhar, dia a dia, se o solo está secando.",
      "Depois de chuva forte: ver se a região ficou encharcada.",
    ],
    detalhes: "Satélite SMAP combinado com modelo da NASA, atualizado todo dia. Cada quadradinho tem 9 km: mostra a situação da região, não de um talhão. O valor bom depende do solo: em solo argiloso, 30% ainda é normal; em solo arenoso, 15% já é bastante.",
    legenda: {
      tipo: "escala",
      min: 0,
      max: 0.7,
      unidade: "% do volume do solo ocupado por água",
      pontas: ["Seco", "Encharcado"],
      paradas: [
        { valor: 0, cor: "#ffa200" }, { valor: 0.072, cor: "#ffe000" }, { valor: 0.143, cor: "#c4e100" }, { valor: 0.215, cor: "#2a9400" },
        { valor: 0.287, cor: "#00ba76" }, { valor: 0.358, cor: "#00f3ff" }, { valor: 0.43, cor: "#0059ff" }, { valor: 0.502, cor: "#0000d7" },
        { valor: 0.573, cor: "#00007a" }, { valor: 0.645, cor: "#28285a" }, { valor: 0.7, cor: "#505050" },
      ],
      marcas: [{ valor: 0, rotulo: "0%" }, { valor: 0.1, rotulo: "10%" }, { valor: 0.2, rotulo: "20%" }, { valor: 0.3, rotulo: "30%" }, { valor: 0.4, rotulo: "40%" }, { valor: 0.5, rotulo: "50%" }, { valor: 0.6, rotulo: "60%" }, { valor: 0.7, rotulo: "70%+" }],
      faixas: [
        { ate: 0.1, texto: "Muito seco" },
        { ate: 0.2, texto: "Seco" },
        { ate: 0.35, texto: "Umidade intermediária" },
        { ate: 0.7, texto: "Muito úmido ou encharcado" },
      ],
    },
  },
  hls: {
    nome: "Foto recente de satélite (HLS, 30 m)",
    curto: "Foto recente (HLS)",
    url: (d: string) => `${GIBS}/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default/${d}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`,
    maxzoom: 12,
    opacidade: 1,
    paraQue: "Foto em cores reais tirada no dia escolhido. A imagem de fundo do mapa é mais nítida, mas pode ter anos; esta mostra como a área estava naquela data.",
    quandoUsar: [
      "Ver se a lavoura já foi plantada ou colhida.",
      "Conferir alagamento ou solo exposto depois de uma chuva forte.",
      "Comparar a mesma área em datas diferentes da safra.",
    ],
    detalhes: "Landsat e Sentinel-2 harmonizados pela NASA. Cada pixel tem 30 m. O satélite passa a cada 2 ou 3 dias e as nuvens escondem a imagem: se aparecer vazio ou branco, escolha outra data.",
    legenda: {
      tipo: "amostras",
      itens: [
        { cor: "#3f7d2c", curto: "Planta viva", texto: "Verde: planta viva (lavoura, pasto, mata)" },
        { cor: "#a8875e", curto: "Solo exposto ou palha", texto: "Marrom ou bege: solo exposto ou palhada seca" },
        { cor: "#1d2a3a", curto: "Água ou sombra", texto: "Escuro ou azulado: água, área encharcada ou sombra" },
        { cor: "#f2f2f2", curto: "Nuvem", texto: "Branco: nuvem" },
      ],
    },
  },
} satisfies Record<string, Camada>;

export type ChaveCamada = keyof typeof CAMADAS_NASA;

function gradiente(e: Escala) {
  return `linear-gradient(to right, ${e.paradas.map((p) => `${p.cor} ${((100 * (p.valor - e.min)) / (e.max - e.min)).toFixed(2)}%`).join(", ")})`;
}
const pos = (e: Escala, v: number) => `${(100 * (v - e.min)) / (e.max - e.min)}%`;

/** Legenda compacta, por cima do mapa. */
export function LegendaSobreMapa({ chave }: { chave: ChaveCamada }) {
  const c: Camada = CAMADAS_NASA[chave];
  const l = c.legenda;
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-10 w-[min(260px,calc(100%-1rem))] rounded-lg bg-black/70 px-2.5 py-2 text-[0.7rem] text-white">
      <b className="mb-1 block text-xs">{c.curto}</b>
      {l.tipo === "escala" ? (
        <>
          <div className="h-2.5 rounded-sm" style={{ background: gradiente(l) }} />
          <div className="mt-0.5 flex justify-between">
            <span>{l.pontas[0]}</span>
            <span>{l.pontas[1]}</span>
          </div>
        </>
      ) : (
        <ul className="grid gap-0.5">
          {l.itens.map((i) => <li key={i.texto} className="flex items-center gap-1.5"><i className="inline-block size-2.5 shrink-0 rounded-sm border border-white/40" style={{ background: i.cor }} />{i.curto}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Explicação completa: para que serve, quando usar e a leitura de cada cor. */
export function SobreCamada({ chave, data }: { chave: ChaveCamada | ""; data: string }) {
  if (!chave) {
    return (
      <div className="rounded-xl bg-surface-2 p-3 text-sm">
        <b>Imagem de fundo (Esri)</b>
        <p className="mt-1 text-muted">Foto de alta resolução, boa para desenhar talhões e reconhecer estradas, casas e açudes. A data da foto varia e pode ter alguns anos. Para ver como a área está agora, escolha uma camada da NASA.</p>
      </div>
    );
  }
  const c: Camada = CAMADAS_NASA[chave];
  const l = c.legenda;
  return (
    <div className="grid gap-3 rounded-xl bg-surface-2 p-3 text-sm">
      <div>
        <span className="eyebrow">Para que serve</span>
        <p className="mt-0.5">{c.paraQue}</p>
      </div>
      <div>
        <span className="eyebrow">Como ler as cores</span>
        {l.tipo === "escala" ? (
          <div className="mt-1.5">
            <div className="h-4 rounded" style={{ background: gradiente(l) }} role="img" aria-label={`Escala de cores de ${l.min} a ${l.max}`} />
            <div className="relative mt-1 h-4 font-mono text-[0.7rem] text-muted">
              {l.marcas.map((m, i) => (
                <span key={m.valor} className="absolute -translate-x-1/2" style={{ left: pos(l, m.valor), transform: i === 0 ? "none" : i === l.marcas.length - 1 ? "translateX(-100%)" : undefined }}>{m.rotulo}</span>
              ))}
            </div>
            <p className="mt-0.5 text-xs text-muted">{l.unidade}</p>
            <ul className="mt-2 grid gap-1">
              {l.faixas.map((f, i) => {
                const de = i ? l.faixas[i - 1].ate : l.min;
                const meio = (de + f.ate) / 2;
                const cor = [...l.paradas].reverse().find((p) => p.valor <= meio)?.cor ?? l.paradas[0].cor;
                return (
                  <li key={f.texto} className="flex items-center gap-2">
                    <i className="inline-block size-3.5 shrink-0 rounded-sm border border-line" style={{ background: cor }} />
                    <span>{f.texto}</span>
                  </li>
                );
              })}
              {chave === "ndvi" && <li className="flex items-center gap-2 text-muted"><i className="inline-block size-3.5 shrink-0 rounded-sm border border-dashed border-line" />Sem cor: água, nuvem ou sem dado</li>}
            </ul>
          </div>
        ) : (
          <ul className="mt-1.5 grid gap-1">
            {l.itens.map((i) => (
              <li key={i.texto} className="flex items-center gap-2"><i className="inline-block size-3.5 shrink-0 rounded-sm border border-line" style={{ background: i.cor }} /><span>{i.texto}</span></li>
            ))}
            <li className="flex items-center gap-2 text-muted"><i className="inline-block size-3.5 shrink-0 rounded-sm border border-dashed border-line" />Sem imagem: o satélite não passou ou havia nuvem nessa data</li>
          </ul>
        )}
      </div>
      <div>
        <span className="eyebrow">Quando usar</span>
        <ul className="mt-0.5 list-disc pl-5">{c.quandoUsar.map((q) => <li key={q}>{q}</li>)}</ul>
      </div>
      <p className="fonte">{c.detalhes} Data mostrada: {data.split("-").reverse().join("/")}. Fonte: NASA GIBS / Worldview.</p>
    </div>
  );
}
