-- O produtor vê o plano publicado e responde: "combinado" ou "tenho dúvida" (com o texto).
alter table public.planos
  add column visto_em timestamptz,
  add column resposta text check (resposta in ('combinado', 'duvida')),
  add column duvida text,
  add column respondido_em timestamptz;

-- O produtor não pode editar o plano (a política de update é só do técnico).
-- Estas funções mexem apenas nos campos de resposta, e só para o produtor dono da propriedade.
create function public.eh_produtor_do_plano(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.planos pl
    join public.talhoes t on t.id = pl.talhao_id
    join public.propriedades p on p.id = t.propriedade_id
    join public.produtores pr on pr.id = p.produtor_id
    where pl.id = pid and pl.status = 'publicado' and pr.usuario_id = auth.uid()
  )
$$;

create function public.marcar_plano_visto(pid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.planos set visto_em = coalesce(visto_em, now())
  where id = pid and public.eh_produtor_do_plano(pid)
$$;

create function public.responder_plano(pid uuid, r text, texto text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if r not in ('combinado', 'duvida') then raise exception 'Resposta inválida'; end if;
  if not public.eh_produtor_do_plano(pid) then raise exception 'Plano não encontrado'; end if;
  update public.planos
  set resposta = r,
      duvida = case when r = 'duvida' then nullif(trim(texto), '') end,
      respondido_em = now(),
      visto_em = coalesce(visto_em, now())
  where id = pid;
end $$;

revoke execute on function public.eh_produtor_do_plano(uuid), public.marcar_plano_visto(uuid), public.responder_plano(uuid, text, text) from public, anon;
grant execute on function public.eh_produtor_do_plano(uuid), public.marcar_plano_visto(uuid), public.responder_plano(uuid, text, text) to authenticated;
