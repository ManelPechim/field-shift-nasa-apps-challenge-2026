"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { erroDeSenha, normalizarCelular } from "@/lib/contato";

export type EstadoEntrar = { erro?: string; aviso?: string } | undefined;

async function destino() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "/entrar";
  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", data.user.id).single();
  return perfil?.papel === "tecnico" ? "/tecnico" : "/produtor";
}

/** Login com e-mail ou celular. O celular é trocado pelo e-mail da conta no servidor. */
export async function entrar(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const login = String(form.get("login") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  let email = login.toLowerCase();
  if (!login.includes("@")) {
    const celular = normalizarCelular(login);
    if (!celular) return { erro: "Digite o e-mail ou o celular." };
    const { data } = await supabaseAdmin().from("perfis").select("email").eq("telefone", celular).limit(1).maybeSingle();
    if (!data?.email) return { erro: "E-mail, celular ou senha incorretos." };
    email = data.email;
  }
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail, celular ou senha incorretos." };
  redirect(await destino());
}

/** Só técnicos criam conta sozinhos. O acesso do produtor é criado pelo técnico. */
export async function criarConta(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const telefoneBruto = String(form.get("telefone") ?? "").trim();
  const telefone = telefoneBruto ? normalizarCelular(telefoneBruto) : null;
  if (!nome) return { erro: "Informe seu nome." };
  if (form.get("consentimento") !== "on") return { erro: "Para criar a conta, aceite o uso dos dados descrito abaixo." };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome,
        papel: "tecnico",
        telefone,
        registro_profissional: String(form.get("registro") ?? "").trim() || null,
        instituicao: String(form.get("instituicao") ?? "").trim() || null,
      },
    },
  });
  if (error) return { erro: erroDeSenha(error.message) ?? (error.message.includes("registered") ? "Já existe uma conta com esse e-mail. Use Entrar." : `Não foi possível criar a conta: ${error.message}`) };
  if (!data.session) return { aviso: "Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre." };
  redirect("/tecnico");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
