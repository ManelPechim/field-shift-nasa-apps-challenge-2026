import { Vazio } from "@/components/ui";
import { RelatosParaResponder } from "@/components/relatos";
import type { Ocorrencia, Talhao } from "@/lib/tipos";

export async function AbaCampo({ talhao, ocorrencias }: { talhao: Talhao; ocorrencias: Ocorrencia[] }) {
  if (!ocorrencias.length) return <Vazio titulo="Nenhum relato do produtor">Quando o produtor relatar algo pelo celular (praga, chuva forte, erosão), aparece aqui com foto e local.</Vazio>;
  return <RelatosParaResponder ocorrencias={ocorrencias} voltar={`/tecnico/talhoes/${talhao.id}`} />;
}
