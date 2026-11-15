-- O técnico responde a dúvida do produtor dentro do app (antes só pelo WhatsApp).
alter table public.planos
  add column resposta_tecnico text,
  add column resposta_tecnico_em timestamptz;

-- Dúvida nova do produtor apaga a resposta anterior do técnico (ela era sobre a pergunta antiga).
-- "Combinado" mantém a dúvida e a resposta, como histórico do que foi conversado.
create or replace function public.responder_plano(pid uuid, r text, texto text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if r not in ('combinado', 'duvida') then raise exception 'Resposta inválida'; end if;
  if not public.eh_produtor_do_plano(pid) then raise exception 'Plano não encontrado'; end if;
  update public.planos
  set resposta = r,
      duvida = case when r = 'duvida' then nullif(trim(texto), '') else duvida end,
      respondido_em = now(),
      visto_em = coalesce(visto_em, now()),
      resposta_tecnico = case when r = 'duvida' then null else resposta_tecnico end,
      resposta_tecnico_em = case when r = 'duvida' then null else resposta_tecnico_em end
  where id = pid;
end $$;
