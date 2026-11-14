import { Selo, Vazio, dataBR } from "@/components/ui";
import { responderOcorrencia } from "@/app/tecnico/actions";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Ocorrencia, Talhao } from "@/lib/tipos";

export async function AbaCampo({ talhao, ocorrencias }: { talhao: Talhao; ocorrencias: Ocorrencia[] }) {
  if (!ocorrencias.length) return <Vazio titulo="Nenhum relato do produtor">Quando o produtor relatar algo pelo celular (praga, chuva forte, erosão), aparece aqui com foto e localização.</Vazio>;
  const supabase = await supabaseServidor();
  const paths = ocorrencias.flatMap((o) => (o.foto_path ? [o.foto_path] : []));
  const { data: urls } = paths.length ? await supabase.storage.from("arquivos").createSignedUrls(paths, 3600) : { data: [] };
  const urlDe = (p: string | null) => urls?.find((u) => u.path === p)?.signedUrl ?? undefined;

  return (
    <ul className="grid gap-3">
      {ocorrencias.map((o) => (
        <li key={o.id} className="card grid gap-3 p-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          {o.foto_path && urlDe(o.foto_path) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={urlDe(o.foto_path)} target="_blank" rel="noreferrer"><img src={urlDe(o.foto_path)} alt={`Foto: ${o.tipo}`} className="h-32 w-full rounded-lg object-cover sm:w-40" /></a>
          ) : <div className="hidden sm:block" />}
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Selo tom={o.status === "nova" ? "atencao" : o.status === "resolvida" ? "bom" : "info"}>{o.status === "nova" ? "Nova" : o.status === "vista" ? "Vista" : "Resolvida"}</Selo>
              <b>{o.tipo}</b><span className="text-sm text-muted">{dataBR(o.criado_em)}</span>
              {o.lat != null && <a className="text-sm" href={`https://www.google.com/maps?q=${o.lat},${o.lon}`} target="_blank" rel="noreferrer">ver local</a>}
            </div>
            {o.descricao && <p>{o.descricao}</p>}
            <form action={responderOcorrencia} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <input type="hidden" name="ocorrencia_id" value={o.id} /><input type="hidden" name="talhao_id" value={talhao.id} />
              <div><label className="label" htmlFor={`r-${o.id}`}>Resposta ao produtor</label><input className="input" id={`r-${o.id}`} name="resposta" defaultValue={o.resposta_tecnico ?? ""} /></div>
              <button className="btn-ghost btn-sm" name="status" value="vista">Responder</button>
              <button className="btn btn-sm" name="status" value="resolvida">Marcar resolvida</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
