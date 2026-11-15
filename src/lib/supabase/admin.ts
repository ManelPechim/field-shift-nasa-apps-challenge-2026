import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave administrativa (service_role). Ignora as regras de acesso (RLS):
 * use SOMENTE no servidor e só depois de conferir quem está pedindo.
 * Usado para o técnico criar e redefinir o acesso do produtor e para entrar com o celular.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
