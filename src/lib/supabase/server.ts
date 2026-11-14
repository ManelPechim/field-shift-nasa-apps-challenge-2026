import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "@/lib/tipos";

export async function supabaseServidor() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}

/** Usuário logado + perfil. Redireciona para /entrar se não houver sessão. */
export async function exigirPerfil(papel?: Perfil["papel"]) {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", data.user.id).single<Perfil>();
  if (!perfil) redirect("/entrar");
  if (papel && perfil.papel !== papel) redirect(perfil.papel === "tecnico" ? "/tecnico" : "/produtor");
  return { supabase, user: data.user, perfil };
}
