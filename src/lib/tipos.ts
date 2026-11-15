import type { Polygon } from "geojson";

export type Papel = "tecnico" | "produtor";

export interface Perfil {
  id: string;
  nome: string;
  papel: Papel;
  email: string | null;
  telefone: string | null;
  registro_profissional: string | null;
  instituicao: string | null;
}

/** Cliente do técnico. O acesso (login) é criado pelo técnico. */
export interface Produtor {
  id: string;
  tecnico_id: string;
  usuario_id: string | null;
  nome: string;
  email: string;
  telefone: string;
  observacoes: string | null;
  criado_em: string;
}

export interface Propriedade {
  id: string;
  tecnico_id: string;
  produtor_id: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  endereco: string | null;
  car_codigo: string | null;
  lat: number;
  lon: number;
  limite: Polygon | null;
  area_ha: number | null;
  observacoes: string | null;
  criado_em: string;
}

export interface Talhao {
  id: string;
  propriedade_id: string;
  nome: string;
  geojson: Polygon;
  area_ha: number | null;
  centroide_lat: number | null;
  centroide_lon: number | null;
  rotacao_atual: string | null;
  cultura_atual: string | null;
  criado_em: string;
}

/** Checklist da visita técnica. Tudo opcional: o técnico preenche o que observou. */
export interface CondicoesVisita {
  uso_atual?: string;
  cultura_atual?: string;
  estadio?: string;
  historico?: string;
  alagamento?: "nao" | "as_vezes" | "frequente";
  erosao?: "nenhuma" | "laminar" | "sulcos" | "vocorocas";
  compactacao?: "nao" | "suspeita" | "confirmada";
  cobertura_solo?: "descoberto" | "parcial" | "palhada";
  plantio_direto?: "sim" | "nao" | "parcial";
  pragas_doencas?: string;
  irrigacao?: boolean;
  gado?: boolean;
  maquinario?: string;
  objetivo_produtor?: string;
  mercado?: string;
}

export interface Visita {
  id: string;
  propriedade_id: string;
  talhao_id: string | null;
  data: string;
  objetivo: string | null;
  condicoes: CondicoesVisita;
  observacoes: string | null;
  criado_em: string;
}

/** Valores do laudo normalizados: bases em mmolc/dm³, P em mg/dm³, MO em g/dm³. */
export interface ValoresSolo {
  ph?: number | null;
  ph_agua?: number | null;
  smp?: number | null;
  p?: number | null;
  p_metodo?: "resina" | "mehlich" | null;
  k?: number | null;
  ca?: number | null;
  mg?: number | null;
  al?: number | null;
  hal?: number | null;
  mo?: number | null;
  argila?: number | null;
}

/** Enzimas em mg de p-nitrofenol por kg de solo por hora; COT em g/kg. */
export interface Enzimas {
  beta?: number | null;
  aril?: number | null;
  cot?: number | null;
}

export interface Amostra {
  id: string;
  talhao_id: string;
  data_coleta: string | null;
  profundidade: string | null;
  codigo_lab: string | null;
  laboratorio: string | null;
  valores: ValoresSolo;
  enzimas: Enzimas | null;
  laudo_path: string | null;
  fonte: string;
  criado_em: string;
}

export interface Plano {
  id: string;
  talhao_id: string;
  safra: string;
  rotacao_id: string;
  rotacao_nome: string;
  resumo_produtor: string | null;
  justificativa: string | null;
  dados: Record<string, unknown>;
  status: "rascunho" | "publicado";
  publicado_em: string | null;
  criado_em: string;
}

export interface Tarefa {
  id: string;
  talhao_id: string;
  plano_id: string | null;
  titulo: string;
  descricao: string | null;
  quando: string | null;
  prazo: string | null;
  status: "pendente" | "feita";
  feita_em: string | null;
  nota_produtor: string | null;
  criado_em: string;
}

export interface Ocorrencia {
  id: string;
  talhao_id: string;
  autor_id: string;
  tipo: string;
  descricao: string | null;
  foto_path: string | null;
  lat: number | null;
  lon: number | null;
  status: "nova" | "vista" | "resolvida";
  resposta_tecnico: string | null;
  criado_em: string;
}
