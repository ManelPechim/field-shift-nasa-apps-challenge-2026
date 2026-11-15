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
| Claude (Anthropic), modelo `claude-opus-5-5` | Ler o laudo por foto/PDF; escrever o texto do plano para o produtor | `ANTHROPIC_API_KEY` |

As chamadas ao Claude usam `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): se o modelo recusar um pedido, a API tenta outro modelo automaticamente.

## Rodar localmente

```bash
npm install
# preencha .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY (só servidor) e ANTHROPIC_API_KEY
npm run dev
```

## Banco (Supabase)

Esquema em `supabase/migrations/`. Tabelas: `perfis`, `produtores`, `propriedades`, `talhoes`, `visitas`, `amostras`, `dados_nasa`, `planos`, `tarefas`, `ocorrencias`, mais o bucket privado `arquivos`. Todas com RLS: o técnico vê os clientes que cadastrou; o produtor vê só as próprias propriedades e os planos publicados.

## Estrutura

- `src/lib/nasa/` — NASA POWER e relevo SRTM
- `src/lib/agro/` — culturas, riscos, comparação de rotações, interpretação do laudo, modelo de 4 quadrantes
- `src/app/tecnico/` — telas do técnico
- `src/app/produtor/` — telas do produtor (pensadas para celular)
- `src/app/api/laudo`, `src/app/api/resumo` — chamadas ao Claude

## Limitações conhecidas (antes de usar com produtores reais)

- Base de culturas e regras de pontuação simplificadas: precisam de validação agronômica por região.
- Faixas do laudo: Boletim 100 (IAC). RS/SC usam o Manual CQFS-RS/SC (P e K dependem da argila); ainda não implementado.
- Modelo de 4 quadrantes com referência de pomares de pêssego (Melo, 2026); fórmula da AEEM a conferir com o autor.
- ZARC, importação do polígono do CAR e séries de NDVI/SMAP por talhão (AppEEARS) ficam para a próxima fase.
