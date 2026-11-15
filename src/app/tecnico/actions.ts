"use server";

import area from "@turf/area";
import centroid from "@turf/centroid";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Polygon } from "geojson";
import { exigirPerfil } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { erroDeSenha, mensagemDeAcesso, normalizarCelular } from "@/lib/contato";
import { CULTURAS, MESES_NOME, nomeCultura, rotacaoPorId } from "@/lib/agro/culturas";
import type { CondicoesVisita, Produtor, ValoresSolo } from "@/lib/tipos";

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

async function siteAtual() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export type EstadoAcesso =
  | { erro?: string; ok?: undefined; valores?: Record<string, string> }
  | { ok: true; produtorId: string; nome: string; email: string; celular: string; senha: string; mensagem: string }
  | undefined;

/**
 * O técnico cadastra o cliente e cria o login dele (e-mail ou celular + senha).
 * MVP: o técnico define a senha. O ideal (ver docs/decisoes.md) é um link de primeiro acesso pelo WhatsApp.
 */
export async function criarProdutor(_: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  const { supabase, perfil } = await exigirPerfil("tecnico");
  const nome = txt(form, "nome");
  const email = txt(form, "email")?.toLowerCase();
  const celular = normalizarCelular(txt(form, "celular"));
  const senha = String(form.get("senha") ?? "");
  const falha = (erro: string) => ({ erro, valores: { nome: nome ?? "", email: email ?? "", celular: txt(form, "celular") ?? "", observacoes: txt(form, "observacoes") ?? "" } });
  if (!nome) return falha("Informe o nome do produtor.");
  if (!email || !email.includes("@")) return falha("Informe um e-mail válido.");
  if (!celular) return falha("Informe o celular.");
  if (!senha) return falha("Informe a senha.");

  const admin = supabaseAdmin();
  const { data: mesmoCelular } = await admin.from("perfis").select("id").eq("telefone", celular).limit(1).maybeSingle();
  if (mesmoCelular) return falha("Já existe uma conta com esse celular.");

  const { data: criado, error: erroConta } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, papel: "produtor", telefone: celular },
  });
  if (erroConta || !criado.user) {
    return falha(erroDeSenha(erroConta?.message ?? "") ?? (erroConta?.message.includes("already") ? "Já existe uma conta com esse e-mail." : `Não foi possível criar o acesso: ${erroConta?.message}`));
  }
  const { data: produtor, error } = await supabase
    .from("produtores")
    .insert({ tecnico_id: perfil.id, usuario_id: criado.user.id, nome, email, telefone: celular, observacoes: txt(form, "observacoes") })
    .select("id")
    .single();
  if (error) {
    await admin.auth.admin.deleteUser(criado.user.id);
    return falha(`Não foi possível salvar o cliente: ${error.message}`);
  }
  revalidatePath("/tecnico");
  return { ok: true, produtorId: produtor.id, nome, email, celular, senha, mensagem: mensagemDeAcesso({ nome, email, celular, senha, site: await siteAtual() }) };
}

export async function redefinirSenha(_: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  const { supabase } = await exigirPerfil("tecnico");
  const senha = String(form.get("senha") ?? "");
  if (!senha) return { erro: "Informe a senha nova." };
  // A leitura passa pela regra de acesso: só encontra se o produtor for deste técnico
  const { data: p } = await supabase.from("produtores").select("*").eq("id", String(form.get("produtor_id"))).maybeSingle<Produtor>();
  if (!p?.usuario_id) return { erro: "Cliente não encontrado." };
  const { error } = await supabaseAdmin().auth.admin.updateUserById(p.usuario_id, { password: senha });
  if (error) return { erro: erroDeSenha(error.message) ?? `Não foi possível trocar a senha: ${error.message}` };
  return { ok: true, produtorId: p.id, nome: p.nome, email: p.email, celular: p.telefone, senha, mensagem: mensagemDeAcesso({ nome: p.nome, email: p.email, celular: p.telefone, senha, site: await siteAtual() }) };
}

export async function editarProdutor(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("produtor_id"));
  await supabase.from("produtores").update({ nome: txt(form, "nome") ?? "Produtor", observacoes: txt(form, "observacoes") }).eq("id", id);
  revalidatePath(`/tecnico/produtores/${id}`);
}

export async function criarPropriedade(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const produtorId = String(form.get("produtor_id"));
  const lat = numero(form, "lat"), lon = numero(form, "lon");
  if (lat == null || lon == null) throw new Error("Marque o local da propriedade no mapa.");
  const limite = JSON.parse(String(form.get("limite") || "null")) as Polygon | null;
  const valido = limite?.type === "Polygon" && limite.coordinates[0].length >= 4;
  const { data, error } = await supabase
    .from("propriedades")
    .insert({
      produtor_id: produtorId,
      nome: txt(form, "nome") ?? "Propriedade sem nome",
      municipio: txt(form, "municipio"),
      uf: txt(form, "uf")?.toUpperCase().slice(0, 2),
      endereco: txt(form, "endereco"),
      car_codigo: txt(form, "car"),
      lat,
      lon,
      limite: valido ? limite : null,
      area_ha: valido ? Math.round((area(limite!) / 10000) * 100) / 100 : null,
      observacoes: txt(form, "observacoes"),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível salvar a propriedade: ${error.message}`);
  redirect(`/tecnico/propriedades/${data.id}`);
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
      cor: /^#[0-9a-f]{6}$/i.test(String(form.get("cor"))) ? String(form.get("cor")).toLowerCase() : "#f2c94c",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível salvar o talhão: ${error.message}`);
  redirect(`/tecnico/talhoes/${data.id}`);
}

export type EstadoEdicaoTalhao = { erro?: string; ok?: boolean } | undefined;

export async function editarTalhao(_: EstadoEdicaoTalhao, form: FormData): Promise<EstadoEdicaoTalhao> {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("talhao_id"));
  const nome = txt(form, "nome");
  const cor = String(form.get("cor") ?? "").toLowerCase();
  if (!nome) return { erro: "Dê um nome ao talhão." };
  if (!/^#[0-9a-f]{6}$/.test(cor)) return { erro: "Escolha uma cor." };
  const mudancas: Record<string, unknown> = { nome, cor, rotacao_atual: txt(form, "rotacao_atual") };
  // Contorno novo: recalcula área e centro (o clima da NASA é buscado no centro, o relevo no contorno)
  const geojson = JSON.parse(String(form.get("geojson") || "null")) as Polygon | null;
  if (geojson) {
    if (geojson.type !== "Polygon" || geojson.coordinates[0].length < 4) return { erro: "O contorno precisa de pelo menos 3 cantos." };
    const [lon, lat] = centroid(geojson).geometry.coordinates;
    Object.assign(mudancas, { geojson, area_ha: Math.round((area(geojson) / 10000) * 100) / 100, centroide_lat: lat, centroide_lon: lon });
  }
  const { data, error } = await supabase.from("talhoes").update(mudancas).eq("id", id).select("propriedade_id").maybeSingle();
  if (error) return { erro: `Não foi possível salvar: ${error.message}` };
  if (!data) return { erro: "Talhão não encontrado." };
  // Envelhece o cache da NASA para recalcular relevo e clima na próxima abertura
  if (geojson) await supabase.from("dados_nasa").update({ atualizado_em: new Date(0).toISOString() }).eq("talhao_id", id);
  revalidatePath(`/tecnico/talhoes/${id}`);
  revalidatePath(`/tecnico/propriedades/${data.propriedade_id}`);
  return { ok: true };
}

export async function excluirTalhao(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("talhao_id"));
  const { data: t } = await supabase.from("talhoes").select("nome, propriedade_id").eq("id", id).maybeSingle();
  if (!t) throw new Error("Talhão não encontrado.");
  // Análises, planos, tarefas, relatos e dados da NASA saem junto (on delete cascade); visitas ficam para a propriedade
  const { error } = await supabase.from("talhoes").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir: ${error.message}`);
  revalidatePath(`/tecnico/propriedades/${t.propriedade_id}`);
  redirect(`/tecnico/propriedades/${t.propriedade_id}?excluido=${encodeURIComponent(t.nome)}`);
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
  // Inseridas juntas, teriam o mesmo criado_em e a ordem na tela mudaria a cada carga.
  // 1 ms entre elas mantém a ordem do plano: correções do solo, depois plantios, depois o relato da safra.
  const base = Date.now();
  await supabase.from("tarefas").insert(tarefas.map((t, i) => ({ ...t, talhao_id: talhaoId, plano_id: plano.id, criado_em: new Date(base + i).toISOString() })));
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
    // Publicar (de novo) é uma versão nova: o produtor vê como plano novo e responde outra vez
    ...(publicar ? { status: "publicado", publicado_em: new Date().toISOString(), visto_em: null, resposta: null, duvida: null, respondido_em: null, resposta_tecnico: null, resposta_tecnico_em: null } : {}),
  }).eq("id", id);
  revalidatePath(`/tecnico/talhoes/${talhaoId}`);
}

/** Resposta do técnico à dúvida do produtor sobre o plano; o produtor vê na tela do plano. */
export async function responderDuvidaPlano(form: FormData) {
  const { supabase } = await exigirPerfil("tecnico");
  const id = String(form.get("plano_id"));
  const talhaoId = String(form.get("talhao_id"));
  const texto = txt(form, "resposta_tecnico");
  if (!texto) return;
  await supabase.from("planos").update({ resposta_tecnico: texto, resposta_tecnico_em: new Date().toISOString() }).eq("id", id).eq("resposta", "duvida");
  revalidatePath(`/tecnico/talhoes/${talhaoId}`);
  revalidatePath("/tecnico");
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
  const voltar = String(form.get("voltar") ?? "");
  if (voltar.startsWith("/tecnico/")) revalidatePath(voltar);
  revalidatePath("/tecnico");
}
