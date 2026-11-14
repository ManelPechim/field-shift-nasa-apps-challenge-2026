"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoEntrar = { erro?: string; aviso?: string } | undefined;

async function destino() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "/entrar";
  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", data.user.id).single();
  return perfil?.papel === "tecnico" ? "/tecnico" : "/produtor";
}

export async function entrar(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("senha") ?? ""),
  });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect(await destino());
}

export async function criarConta(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const papel = form.get("papel") === "tecnico" ? "tecnico" : "produtor";
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!nome) return { erro: "Informe seu nome." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (form.get("consentimento") !== "on") return { erro: "Para criar a conta, aceite o uso dos dados descrito abaixo." };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome,
        papel,
        telefone: String(form.get("telefone") ?? "").trim() || null,
        registro_profissional: String(form.get("registro") ?? "").trim() || null,
        instituicao: String(form.get("instituicao") ?? "").trim() || null,
      },
    },
  });
  if (error) return { erro: error.message.includes("registered") ? "Já existe uma conta com esse e-mail. Use Entrar." : `Não foi possível criar a conta: ${error.message}` };
  if (!data.session) return { aviso: "Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre." };
  redirect(papel === "tecnico" ? "/tecnico" : "/produtor");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
