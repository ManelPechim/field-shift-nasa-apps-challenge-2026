# Decisões do MVP

Registro das escolhas feitas para o protótipo e do que deve mudar numa versão de produção.

## 1. Acesso do produtor (15/11/2026)

**No MVP:** o produtor não cria conta sozinho. O técnico cadastra o cliente com nome, e-mail, celular e uma **senha definida pelo técnico**, e envia esses dados pelo WhatsApp (o app monta a mensagem). O produtor entra com o **e-mail ou o celular** e essa senha. Se ele esquecer, o técnico cria uma senha nova na página do cliente.

**Por que assim:** é o caminho mais rápido de construir e não depende de envio de e-mail ou SMS, que estão limitados no plano gratuito do Supabase.

**Problema conhecido:** o técnico fica sabendo a senha do cliente.

**O ideal (fazer depois do MVP): celular + link de primeiro acesso pelo WhatsApp.**
1. O técnico cadastra nome e celular; o e-mail passa a ser opcional (muitos produtores não usam e-mail).
2. O app gera um link de uso único e válido por pouco tempo (ex.: `supabase.auth.admin.generateLink`).
3. O botão "Enviar pelo WhatsApp" abre a conversa com o link.
4. O produtor abre o link e **ele mesmo** cria a senha. O técnico nunca vê a senha.
5. "Esqueci a senha" gera um novo link, pedido pelo próprio produtor ou pelo técnico.

## 2. Um técnico por produtor

Cada produtor pertence ao técnico que o cadastrou. Na prática há produtores atendidos por mais de um profissional (cooperativa + consultor, ou uma equipe da Emater); compartilhar clientes entre técnicos fica para depois.

## 3. Propriedade: ponto obrigatório, limite opcional

O técnico precisa marcar pelo menos o local da propriedade (toque no mapa, coordenadas ou GPS). Desenhar o limite é opcional, porque no primeiro contato nem sempre se conhecem as divisas. Próximo passo: importar o limite oficial do CAR.

## 4. Preenchimento automático pelo mapa

Município, UF e endereço vêm do OpenStreetMap (Nominatim) a partir do ponto marcado. O nome da propriedade quase nunca existe em bases públicas: só aparece se alguém cadastrou o lugar no OpenStreetMap. Por isso o técnico normalmente digita o nome.

## 5. Chave administrativa do Supabase

`SUPABASE_SERVICE_ROLE_KEY` fica apenas no servidor (variável sensível na Vercel e `.env.local`, fora do git). É usada para criar e redefinir o acesso do produtor e para trocar o celular pelo e-mail no login.

## 6. Confirmação de e-mail desligada

Desligada no Supabase durante os testes, porque o envio de e-mail padrão só chega a membros da equipe do projeto. Antes de abrir o app ao público: configurar um provedor de e-mail (SMTP) e religar a confirmação.

## 7. Sem validação de senha e de celular no app (15/11/2026)

Para não travar os testes, o app não exige tamanho mínimo de senha nem formato de celular. O celular só é limpo (ficam os dígitos; com DDD ganha o 55) para servir de login. Continua valendo o mínimo de **6 caracteres** do próprio Supabase, que não pode ser desligado. Antes de produção: voltar a validar o celular (DDD + número) e exigir uma senha mais forte.

## 8. Relato da propriedade inteira ou de um talhão, com local tirado do mapa (15/11/2026)

O produtor escolhe a propriedade e diz se o relato é da **propriedade inteira** (granizo, geada, enxurrada, seca, fogo: o que pega tudo) ou de **um talhão** (praga, doença, erosão, alagamento: o que acontece numa parte). No banco, `ocorrencias.propriedade_id` é obrigatório e `talhao_id` fica nulo no relato da propriedade inteira.

Saiu o botão "Anexar minha localização" (GPS): ele anexava um ponto que o produtor não via e que podia nem ser da propriedade, se ele relatasse de casa ou da cidade. O local agora vem da escolha: centro do talhão ou ponto cadastrado da propriedade, mostrado na tela com as coordenadas. Para indicar o ponto exato da mancha, o produtor toca no mapa, e o toque só vale dentro da área escolhida.

Praga, doença e planta daninha quase sempre começam em manchas. Quando o produtor escolhe uma delas para a propriedade inteira, o app sugere escolher o talhão onde viu primeiro, mas não obriga.

Próximo passo possível: usar o GPS só como atalho para "estou aqui", aceito apenas se o ponto cair dentro da propriedade.
