# Field Shift

Planejamento de rotação de culturas com dados da NASA, com dois lados:

- **Técnico** (agrônomo, técnico agrícola, extensionista): cadastra os produtores que atende (e cria o acesso deles), marca as propriedades no mapa, desenha talhões, registra visitas, envia o laudo de solo por foto, compara rotações e publica o plano.
- **Produtor**: não cria conta sozinho. Entra com e-mail ou celular e a senha enviada pelo técnico; vê o plano em linguagem simples, marca as tarefas feitas, recebe alertas de clima e relata problemas com foto e GPS.

Estrutura: técnico → produtores → propriedades → talhões. Decisões do MVP em [`docs/decisoes.md`](docs/decisoes.md).

NASA Space Apps Challenge 2026 · desafio *Field Shift: Adapting Farms with NASA Data*. Contexto do agro brasileiro em [`docs/fluxo-agro.md`](docs/fluxo-agro.md).

## Dados usados

| Fonte | Para quê | Acesso |
|---|---|---|
| NASA POWER (diário, 2005–2024 + últimos 50 dias) | Chuva, temperatura, umidade do ar, geada, calor, estiagem, alertas | API pública, sem chave |
| SRTM (NASA) via AWS Terrain Tiles | Altitude e declividade por talhão, classes de relevo da Embrapa | Público, sem chave |
| NASA GIBS: MODIS NDVI 8 dias, SMAP L4, HLS 30 m | Camadas visuais no mapa | Público, sem chave |
| OpenStreetMap (Nominatim) | Busca de lugares e município/UF/endereço do ponto marcado | Público, uso leve |
| Imagem Esri World Imagery | Desenhar os talhões (a NASA não tem imagem fina o bastante) | Público, com atribuição |
| Claude (Anthropic) | **Planejado, não integrado.** Ler o laudo por foto/PDF e escrever o texto do plano para o produtor. No app, esses botões mostram um aviso | — |

O desenho da integração com IA está em `docs/decisoes.md` (item 9).

## Rodar localmente

```bash
npm install
# preencha .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# e SUPABASE_SERVICE_ROLE_KEY (só servidor)
npm run dev
```

## Simulação do fluxo completo

Com o servidor rodando (`npm run dev -- -p 3123`), `npm run simulacao` abre duas janelas do Chrome, uma do técnico e outra do produtor no tamanho de celular, e percorre o app clicando de verdade. São 21 passos, nesta ordem:

1. **Técnico:** cria a conta, cadastra o produtor, marca a propriedade e dois talhões, lê os dados da NASA, registra a visita e a análise de solo, escolhe a rotação e publica o plano.
2. **Produtor:** entra pelo celular, abre o plano e manda uma dúvida.
3. **Técnico:** responde a dúvida.
4. **Produtor:** combina o plano, marca uma tarefa como feita e relata uma praga com foto e ponto no mapa.
5. **Técnico:** vê o relato no mapa, responde e acompanha o plano.
6. **Produtor:** recebe a resposta do relato.

| Comando | O que faz |
|---|---|
| `npm run simulacao` | Mostra cada passo devagar, com as janelas abertas |
| `npm run simulacao -- --rapido` | Roda sem janela e sem pausas, para conferir se nada quebrou |
| `npm run simulacao -- --manter` | Não apaga os dados no fim; imprime os logins para explorar à mão |
| `npm run simulacao -- --limpar` | Apaga os dados de todas as simulações anteriores (e-mails `sim.*@field.test`). Não mexe no exemplo |
| `npm run simulacao -- --exemplo` | Monta os **dados de exemplo** (abaixo) e os mantém. Rodar de novo recria do zero |

### Dados de exemplo

Uma técnica e dois produtores, todos em Cruz Alta (RS). Servem de referência de como fica o app preenchido do jeito certo.

| Quem | Login | Senha | Situação |
|---|---|---|---|
| Marina Souza (técnica, Emater/RS-Ascar) | `exemplo.tecnico@field.test` | `exemplo-2026` | Atende os dois produtores |
| Joaquim Pereira, Sítio Boa Esperança | `(55) 99876-0001` ou `exemplo.produtor1@field.test` | `lavoura-2026` | Ciclo completo (detalhes abaixo) |
| Ana Lúcia Ferreira, Fazenda Santa Rita | `(55) 99876-0002` ou `exemplo.produtor2@field.test` | `lavoura-2026` | Esperando o plano |

- **Joaquim:** visita e análise de solo registradas; plano publicado, com uma dúvida do Joaquim respondida pela técnica e depois combinado; uma tarefa feita, com comentário; um relato de praga com foto, já resolvido.
- **Ana Lúcia:** dois talhões, visita com alagamento frequente, erosão em sulcos e compactação, e análise de solo ácida, mas ainda sem plano.

Cada execução cria um técnico e um produtor novos e, no fim, apaga tudo o que criou. As fotos de cada passo e um `relatorio.html` ficam em `simulacao/saida/<data>/`, que não vai para o git. O relatório também lista os erros que aparecerem no console do navegador. Usa o Chrome instalado (`playwright-core`, sem baixar navegador). O banco é o mesmo da produção, por isso a limpeza no fim importa.

## Banco (Supabase)

Esquema em `supabase/migrations/`. Tabelas: `perfis`, `produtores`, `propriedades`, `talhoes`, `visitas`, `amostras`, `dados_nasa`, `planos`, `tarefas`, `ocorrencias`, mais o bucket privado `arquivos`. Todas com RLS: o técnico vê os clientes que cadastrou; o produtor vê só as próprias propriedades e os planos publicados.

## Estrutura

- `src/lib/nasa/` — NASA POWER e relevo SRTM
- `src/lib/agro/` — culturas, riscos, comparação de rotações, interpretação do laudo, modelo de 4 quadrantes
- `src/app/tecnico/` — telas do técnico
- `src/app/produtor/` — telas do produtor (pensadas para celular)
- `src/app/api/laudo` — guarda a foto ou o PDF do laudo no Storage

## Limitações conhecidas (antes de usar com produtores reais)

- Base de culturas e regras de pontuação simplificadas: precisam de validação agronômica por região.
- Faixas do laudo: Boletim 100 (IAC). RS/SC usam o Manual CQFS-RS/SC (P e K dependem da argila); ainda não implementado.
- Modelo de 4 quadrantes com referência de pomares de pêssego (Melo, 2026); fórmula da AEEM a conferir com o autor.
- ZARC, importação do polígono do CAR e séries de NDVI/SMAP por talhão (AppEEARS) ficam para a próxima fase.
