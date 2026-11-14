"use server";

import area from "@turf/area";
import centroid from "@turf/centroid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Polygon } from "geojson";
import { exigirPerfil } from "@/lib/supabase/server";
import { CULTURAS, MESES_NOME, nomeCultura, rotacaoPorId } from "@/lib/agro/culturas";
import type { CondicoesVisita, ValoresSolo } from "@/lib/tipos";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v || null;
};
const numero = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function criarPropriedade(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const { data, error } = await supabase
    .from("propriedades")
    .insert({
      nome: txt(form, "nome") ?? "Propriedade sem nome",
      municipio: txt(form, "municipio"),
      uf: txt(form, "uf")?.toUpperCase().slice(0, 2),
      car_codigo: txt(form, "car"),
      produtor_nome: txt(form, "produtor_nome"),
      produtor_email: txt(form, "produtor_email")?.toLowerCase(),
      produtor_telefone: txt(form, "produtor_telefone"),
      observacoes: txt(form, "observacoes"),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível salvar a propriedade: ${error.message}`);
  redirect(`/tecnico/propriedades/${data.id}`);
}

export async function editarProdutor(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("propriedade_id"));
  await supabase.from("propriedades").update({
    produtor_nome: txt(form, "produtor_nome"),
    produtor_email: txt(form, "produtor_email")?.toLowerCase(),
    produtor_telefone: txt(form, "produtor_telefone"),
  }).eq("id", id);
  revalidatePath(`/tecnico/propriedades/${id}`);
}

export async function criarTalhao(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const propriedadeId = String(form.get("propriedade_id"));
  const geojson = JSON.parse(String(form.get("geojson") ?? "null")) as Polygon | null;
  if (!geojson || geojson.type !== "Polygon" || geojson.coordinates[0].length < 4) throw new Error("Desenhe o talhão no mapa antes de salvar.");
  const [lon, lat] = centroid(geojson).geometry.coordinates;
  const { data, error } = await supabase
    .from("talhoes")
    .insert({
      propriedade_id: propriedadeId,
      nome: txt(form, "nome") ?? "Talhão",
      geojson,
      area_ha: Math.round((area(geojson) / 10000) * 100) / 100,
      centroide_lat: lat,
      centroide_lon: lon,
      rotacao_atual: txt(form, "rotacao_atual"),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível salvar o talhão: ${error.message}`);
  redirect(`/tecnico/talhoes/${data.id}`);
}

export async function editarTalhao(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("talhao_id"));
  await supabase.from("talhoes").update({ nome: txt(form, "nome") ?? "Talhão", rotacao_atual: txt(form, "rotacao_atual") }).eq("id", id);
  revalidatePath(`/tecnico/talhoes/${id}`);
}

export async function registrarVisita(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const propriedadeId = String(form.get("propriedade_id"));
  const c: CondicoesVisita = {
    uso_atual: txt(form, "uso_atual") ?? undefined,
    cultura_atual: txt(form, "cultura_atual") ?? undefined,
    estadio: txt(form, "estadio") ?? undefined,
    historico: txt(form, "historico") ?? undefined,
    alagamento: (txt(form, "alagamento") as CondicoesVisita["alagamento"]) ?? undefined,
    erosao: (txt(form, "erosao") as CondicoesVisita["erosao"]) ?? undefined,
    compactacao: (txt(form, "compactacao") as CondicoesVisita["compactacao"]) ?? undefined,
    cobertura_solo: (txt(form, "cobertura_solo") as CondicoesVisita["cobertura_solo"]) ?? undefined,
    plantio_direto: (txt(form, "plantio_direto") as CondicoesVisita["plantio_direto"]) ?? undefined,
    pragas_doencas: txt(form, "pragas_doencas") ?? undefined,
    irrigacao: form.get("irrigacao") === "on",
    gado: form.get("gado") === "on",
    maquinario: txt(form, "maquinario") ?? undefined,
    objetivo_produtor: txt(form, "objetivo_produtor") ?? undefined,
    mercado: txt(form, "mercado") ?? undefined,
  };
  const { error } = await supabase.from("visitas").insert({
    propriedade_id: propriedadeId,
    talhao_id: txt(form, "talhao_id"),
    data: txt(form, "data") ?? new Date().toISOString().slice(0, 10),
    objetivo: txt(form, "objetivo"),
    condicoes: c,
    observacoes: txt(form, "observacoes"),
  });
  if (error) throw new Error(`Não foi possível salvar a visita: ${error.message}`);
  const talhao = txt(form, "talhao_id");
  redirect(talhao ? `/tecnico/talhoes/${talhao}` : `/tecnico/propriedades/${propriedadeId}`);
}

export async function salvarAmostra(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const talhaoId = String(form.get("talhao_id"));
  const valores: ValoresSolo = {
    ph: numero(form, "ph"), ph_agua: numero(form, "ph_agua"), smp: numero(form, "smp"), p: numero(form, "p"),
    p_metodo: form.get("p_metodo") === "mehlich" ? "mehlich" : "resina",
    k: numero(form, "k"), ca: numero(form, "ca"), mg: numero(form, "mg"), al: numero(form, "al"), hal: numero(form, "hal"),
    mo: numero(form, "mo"), argila: numero(form, "argila"),
  };
  const beta = numero(form, "beta"), aril = numero(form, "aril"), cot = numero(form, "cot");
  const { error } = await supabase.from("amostras").insert({
    talhao_id: talhaoId,
    data_coleta: txt(form, "data_coleta"),
    profundidade: txt(form, "profundidade"),
    codigo_lab: txt(form, "codigo_lab"),
    laboratorio: txt(form, "laboratorio"),
    valores,
    enzimas: beta || aril || cot ? { beta, aril, cot } : null,
    laudo_path: txt(form, "laudo_path"),
    fonte: txt(form, "fonte") ?? "manual",
  });
  if (error) throw new Error(`Não foi possível salvar a amostra: ${error.message}`);
  redirect(`/tecnico/talhoes/${talhaoId}?aba=solo`);
}

export async function excluirAmostra(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const talhaoId = String(form.get("talhao_id"));
  await supabase.from("amostras").delete().eq("id", String(form.get("amostra_id")));
  revalidatePath(`/tecnico/talhoes/${talhaoId}`);
}

/** Cria o plano (rascunho) com tarefas iniciais tiradas do calendário da rotação. */
export async function criarPlano(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const talhaoId = String(form.get("talhao_id"));
  const rot = rotacaoPorId(String(form.get("rotacao_id")));
  if (!rot) throw new Error("Rotação desconhecida.");
  const dados = JSON.parse(String(form.get("dados") ?? "{}"));
  const correcoes = JSON.parse(String(form.get("correcoes") ?? "[]")) as string[];
  const nomeRot = String(form.get("rotacao_nome"));

  const { data: plano, error } = await supabase
    .from("planos")
    .insert({ talhao_id: talhaoId, safra: txt(form, "safra") ?? "2026/27", rotacao_id: rot.id, rotacao_nome: nomeRot, justificativa: txt(form, "justificativa"), dados })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível criar o plano: ${error.message}`);

  const tarefas: { titulo: string; descricao: string | null; quando: string | null }[] = [];
  correcoes.forEach((c) => tarefas.push({ titulo: c, descricao: "Combine a dose e o produto com o técnico antes de aplicar.", quando: "Antes do próximo plantio" }));
  rot.slots.forEach((id, i) => {
    if (!id) return;
    const c = CULTURAS[id];
    const m = c.meses[rot.regiao];
    const ano = i < 2 ? "Ano 1" : "Ano 2";
    const verbo = c.tipo === "grao" ? "Plantar" : c.tipo === "cobertura" ? "Semear a cobertura" : "Semear o pasto";
    tarefas.push({
      titulo: `${verbo}: ${nomeCultura(id).toLowerCase()}`,
      descricao: c.tipo === "cobertura" ? "Não precisa colher. Deixe a palhada no chão para o plantio seguinte." : null,
      quando: m ? `${ano} · a partir de ${MESES_NOME[m[0] - 1]}` : ano,
    });
  });
  tarefas.push({ titulo: "Relatar como foi a safra", descricao: "Conte no app se teve praga, doença, chuva forte ou seca, e como foi a colheita.", quando: "Depois da colheita" });
  await supabase.from("tarefas").insert(tarefas.map((t) => ({ ...t, talhao_id: talhaoId, plano_id: plano.id })));
  redirect(`/tecnico/talhoes/${talhaoId}?aba=plano`);
}

export async function salvarPlano(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("plano_id"));
  const talhaoId = String(form.get("talhao_id"));
  const publicar = form.get("publicar") === "1";
  await supabase.from("planos").update({
    resumo_produtor: txt(form, "resumo_produtor"),
    justificativa: txt(form, "justificativa"),
    safra: txt(form, "safra") ?? "2026/27",
    ...(publicar ? { status: "publicado", publicado_em: new Date().toISOString() } : {}),
  }).eq("id", id);
  revalidatePath(`/tecnico/talhoes/${talhaoId}`);
}

export async function excluirPlano(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  await supabase.from("planos").delete().eq("id", String(form.get("plano_id")));
  revalidatePath(`/tecnico/talhoes/${String(form.get("talhao_id"))}`);
}

export async function adicionarTarefa(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const talhaoId = String(form.get("talhao_id"));
  const titulo = txt(form, "titulo");
  if (!titulo) return;
  await supabase.from("tarefas").insert({ talhao_id: talhaoId, plano_id: txt(form, "plano_id"), titulo, descricao: txt(form, "descricao"), quando: txt(form, "quando"), prazo: txt(form, "prazo") });
  revalidatePath(`/tecnico/talhoes/${talhaoId}`);
}

export async function removerTarefa(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  await supabase.from("tarefas").delete().eq("id", String(form.get("tarefa_id")));
  revalidatePath(`/tecnico/talhoes/${String(form.get("talhao_id"))}`);
}

export async function responderOcorrencia(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  await supabase.from("ocorrencias").update({ status: txt(form, "status") ?? "vista", resposta_tecnico: txt(form, "resposta") }).eq("id", String(form.get("ocorrencia_id")));
  revalidatePath(`/tecnico/talhoes/${String(form.get("talhao_id"))}`);
  revalidatePath("/tecnico");
}
