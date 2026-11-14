import Link from "next/link";
import { GraficoClima, LegendaClima } from "@/components/graficos";
import { Mapa } from "@/components/mapa";
import { Selo, Vazio, dataBR, num, tomDoNivel } from "@/components/ui";
import { NIVEL, NOME_RISCO, calcularRiscos, type ChaveRisco } from "@/lib/agro/riscos";
import type { ClimaTalhao } from "@/lib/nasa/power";
import type { RelevoTalhao } from "@/lib/nasa/relevo";
import type { Talhao, Visita } from "@/lib/tipos";

export function AbaDados({ talhao, clima, relevo, erros, visita }: { talhao: Talhao; clima: ClimaTalhao | null; relevo: RelevoTalhao | null; erros: string[]; visita: Visita | null }) {
  const riscos = clima ? calcularRiscos(clima, relevo, visita?.condicoes ?? null) : null;
  const r = clima?.recente;
  return (
    <div className="grid gap-8">
      {erros.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
          Alguns dados não carregaram: {erros.join("; ")}. <Link href={`/tecnico/talhoes/${talhao.id}?aba=dados&atualizar=1`}>Tentar de novo</Link>
        </div>
      )}

      {riscos && (
        <section>
          <h2 className="h2 mb-1">Riscos do talhão</h2>
          <p className="mb-3 text-sm text-muted">Calculados com 20 anos de dados da NASA e com o que foi registrado na visita técnica{visita ? ` de ${dataBR(visita.data)}` : ""}.</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(riscos) as ChaveRisco[]).map((k) => (
              <li key={k} className="card grid gap-1 p-3">
                <div className="flex items-center justify-between gap-2"><b>{NOME_RISCO[k]}</b><Selo tom={tomDoNivel(riscos[k].nivel)}>{NIVEL[riscos[k].nivel]}</Selo></div>
                <p className="text-sm">{riscos[k].motivo}</p>
                <span className="fonte">{riscos[k].fonte}</span>
              </li>
            ))}
          </ul>
          {!visita && <p className="mt-2 text-sm text-warn">Sem visita registrada: alagamento e erosão vêm só dos dados de satélite. <Link href={`/tecnico/propriedades/${talhao.propriedade_id}/visita?talhao=${talhao.id}`}>Registrar visita</Link></p>}
        </section>
      )}

      {r && (
        <section>
          <h2 className="h2 mb-1">Últimos 30 dias</h2>
          <p className="mb-3 text-sm text-muted">Dados até {dataBR(r.ate)}. A NASA POWER publica com 2 a 3 dias de atraso.</p>
          <dl className="grid gap-2 sm:grid-cols-4">
            <div className="card p-3"><dt className="text-sm text-muted">Chuva</dt><dd className="font-display text-2xl font-extrabold">{r.chuva_30d_mm} mm</dd><dd className="text-sm">{Math.round((100 * r.chuva_30d_mm) / Math.max(1, r.chuva_30d_normal_mm))}% do normal ({r.chuva_30d_normal_mm} mm)</dd></div>
            <div className="card p-3"><dt className="text-sm text-muted">Dias seguidos sem chuva</dt><dd className="font-display text-2xl font-extrabold">{r.dias_sem_chuva}</dd></div>
            <div className="card p-3"><dt className="text-sm text-muted">Menor mínima</dt><dd className="font-display text-2xl font-extrabold">{num(r.min_30d, 1)} °C</dd></div>
            <div className="card p-3"><dt className="text-sm text-muted">Dias com risco de geada</dt><dd className="font-display text-2xl font-extrabold">{r.geadas_30d}</dd></div>
          </dl>
          <span className="fonte">NASA POWER · chuva corrigida (PRECTOTCORR), mínima a 2 m (T2M_MIN)</span>
        </section>
      )}

      {clima ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h2 className="h2 mb-1">Clima mês a mês ({clima.periodo})</h2>
            <GraficoClima chuva={clima.chuva_mm} temp={clima.temp_media} geada={clima.geada_dias} />
            <LegendaClima />
            <span className="fonte">NASA POWER, média diária de {clima.periodo} no centro do talhão (grade de cerca de 50 km)</span>
          </div>
          <dl className="card grid content-start gap-3 p-4 text-sm">
            <div><dt className="text-muted">Chuva por ano</dt><dd className="font-semibold">{clima.chuva_anual_mm} mm ({clima.chuva_decadas.map((d) => `${d.de}: ${d.mm_ano}`).join(" · ")})</dd></div>
            <div><dt className="text-muted">Dias de chuva acima de 50 mm</dt><dd className="font-semibold">{num(clima.chuva_extrema_dias_ano, 1)} por ano</dd></div>
            <div><dt className="text-muted">Maior sequência sem chuva</dt><dd className="font-semibold">{clima.maior_estiagem_dias} dias por ano (média)</dd></div>
            <div><dt className="text-muted">Umidade do ar</dt><dd className="font-semibold">{num(Math.min(...clima.umidade_ar))}% a {num(Math.max(...clima.umidade_ar))}% (médias mensais)</dd></div>
            <div><dt className="text-muted">Mínima média no mês mais frio</dt><dd className="font-semibold">{num(Math.min(...clima.temp_min), 1)} °C</dd></div>
            <div><dt className="text-muted">Máxima média no mês mais quente</dt><dd className="font-semibold">{num(Math.max(...clima.temp_max), 1)} °C</dd></div>
          </dl>
        </section>
      ) : (
        <Vazio titulo="Clima indisponível">A NASA POWER não respondeu. Tente atualizar em alguns minutos.</Vazio>
      )}

      {relevo && (
        <section>
          <h2 className="h2 mb-1">Relevo</h2>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <dl className="card grid grid-cols-2 gap-3 p-4 text-sm">
              <div><dt className="text-muted">Classe</dt><dd className="font-display text-lg font-bold">{relevo.classe}</dd></div>
              <div><dt className="text-muted">Declividade média</dt><dd className="font-display text-lg font-bold">{num(relevo.declividade_media, 1)}%</dd></div>
              <div><dt className="text-muted">Parte mais inclinada (10%)</dt><dd className="font-semibold">acima de {num(relevo.declividade_p90, 1)}%</dd></div>
              <div><dt className="text-muted">Altitude</dt><dd className="font-semibold">{relevo.altitude_min} a {relevo.altitude_max} m</dd></div>
            </dl>
            <div className="card p-4 text-sm">
              <span className="eyebrow">Área por classe de relevo</span>
              <ul className="mt-2 grid gap-1.5">
                {relevo.distribuicao.map((d) => (
                  <li key={d.nome} className="grid grid-cols-[150px_minmax(0,1fr)_40px] items-center gap-2">
                    <span>{d.nome}</span>
                    <span className="h-2 rounded bg-surface-2"><span className="block h-2 rounded bg-soil" style={{ width: `${d.pct}%` }} /></span>
                    <span className="text-right font-mono text-xs">{d.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">Classes de declividade da Embrapa. A partir de 13% (ondulado) a mecanização fica difícil e a erosão aumenta; acima de 20% a área tende a pasto, silvicultura ou mata.</p>
          <span className="fonte">{relevo.fonte} · pixel de {relevo.pixel_m} m, {relevo.pontos} pontos dentro do talhão. O SRTM tem resolução original de 30 m.</span>
        </section>
      )}

      <section>
        <h2 className="h2 mb-1">Imagens de satélite</h2>
        <p className="mb-3 text-sm text-muted">Escolha uma camada da NASA para ver vegetação (NDVI), umidade do solo (SMAP) ou a imagem HLS de 30 m numa data.</p>
        <Mapa talhoes={[{ id: talhao.id, nome: talhao.nome, geojson: talhao.geojson }]} camadaInicial="ndvi" altura="h-[380px]" />
      </section>
      <p className="text-sm"><Link href={`/tecnico/talhoes/${talhao.id}?aba=dados&atualizar=1`}>Atualizar dados da NASA agora</Link></p>
    </div>
  );
}
