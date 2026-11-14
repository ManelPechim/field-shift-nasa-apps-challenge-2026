# Como funciona o trabalho no campo (Brasil) e onde o Field Shift entra

Resumo para quem está chegando agora ao agro. Validar os detalhes com o Baeta.

## Quem é quem

| Papel | O que faz | Observação |
|---|---|---|
| **Produtor** | Decide o que plantar, executa o manejo, compra insumos, vende a safra. | Pode ser dono ou arrendatário. Em propriedades maiores há um gerente ou capataz que executa. |
| **Engenheiro agrônomo** | Diagnostica, recomenda calagem, adubação e defensivos, assina projetos. | Registro no CREA. Só ele assina a **ART** e o **receituário agronômico** (obrigatório para comprar agrotóxico). |
| **Técnico agrícola** | Acompanha a lavoura, coleta solo, orienta o manejo. | Registro no CFTA. Faz boa parte das visitas no dia a dia. |
| **Extensionista (Emater / ATER pública)** | Assistência técnica gratuita, principalmente para agricultura familiar. | Atende muitas famílias e visita poucas vezes por ano. |
| **Técnico de cooperativa ou revenda** | Assistência ligada à venda de insumos. | É o técnico mais presente para muitos produtores médios. |
| **Laboratório de solo** | Analisa as amostras e emite o laudo. | No RS e em SC, rede ROLAS. A análise biológica (BioAS) só existe em laboratórios credenciados pela Embrapa. |
| **Banco / Plano Safra** | Crédito de custeio e investimento (Pronaf para a agricultura familiar). | Exige projeto técnico e plantio dentro do **ZARC** para o seguro (Proagro). |

No app: **técnico** = agrônomo, técnico agrícola ou extensionista. **Produtor** = quem planta e maneja.

## O ciclo de uma safra (exemplo do Sul, soja no verão)

1. **Visita de diagnóstico** (qualquer época, de preferência antes do planejamento). O técnico conhece a área: histórico de uso, relevo, sinais de erosão, encharcamento, compactação, cobertura do solo, pragas recorrentes, máquinas, mão de obra, para quem o produtor vende e o que ele quer.
2. **Amostragem de solo** (logo após a colheita anterior, 3 a 6 meses antes do plantio). A área é dividida em glebas parecidas; em cada uma se juntam de 15 a 20 subamostras de 0 a 20 cm (no plantio direto, às vezes 0–10 e 10–20 cm). O laudo volta em 1 a 3 semanas.
3. **Recomendação de calagem e adubação**, seguindo o manual do estado (RS/SC: Manual de Calagem e Adubação da CQFS-RS/SC; SP: Boletim 100 do IAC). O calcário precisa de 2 a 3 meses para reagir, por isso entra antes do plantio.
4. **Planejamento da safra** (jun–set no Sul): culturas, cultivares, janela de plantio pelo **ZARC** do município, compra de insumos, crédito de custeio.
5. **Plantio** (set–dez no Sul; out–dez no Cerrado) e **condução**: monitoramento de pragas e doenças, aplicações com receituário, visitas de acompanhamento.
6. **Colheita** (fev–mai) e, em seguida, a **segunda safra** ou cultura de inverno (trigo, aveia, cobertura, pasto).
7. **Fechamento**: venda, registro do que deu certo e errado, nova amostragem. O ciclo recomeça.

## Documentos que aparecem no caminho

- **CAR** (Cadastro Ambiental Rural): obrigatório, traz o polígono da propriedade, as APPs e a reserva legal. Fonte oficial dos limites da propriedade (SICAR).
- **CCIR / ITR**: cadastro e imposto do imóvel rural.
- **CAF** (Cadastro da Agricultura Familiar, que substituiu a DAP): dá acesso ao Pronaf.
- **ART** e **receituário agronômico**: responsabilidade do agrônomo.
- **ZARC** (Zoneamento Agrícola de Risco Climático, MAPA/Embrapa): diz em quais decêndios plantar cada cultura em cada município e tipo de solo. Banco e seguro exigem.

## Onde o Field Shift entra

| Etapa do ciclo | Hoje | No Field Shift |
|---|---|---|
| Diagnóstico | Caderno, memória do técnico, WhatsApp | Visita técnica estruturada + talhões desenhados no mapa |
| Clima e relevo | Experiência local, estações distantes | NASA POWER (20 anos, diário) + SRTM por talhão, com riscos calculados |
| Laudo | Papel ou PDF, digitado à mão | Foto → IA lê → técnico confere → interpretação automática |
| Saúde do solo | Raramente medida | Modelo de 4 quadrantes (COT × enzimas), quando houver BioAS |
| Escolha da rotação | Hábito, preço do ano, conversa | Comparação de 3+ rotações com evidências, riscos e lacunas |
| Comunicação com o produtor | Visita ou WhatsApp solto | Plano publicado + tarefas + relatos com foto e GPS |
| Acompanhamento | Próxima visita | Alertas da NASA (últimos 30 dias) + histórico de relatos |

## Limites que precisam ficar claros na apresentação e nos testes

- O app **apoia** a decisão. Dose de calcário, adubo e defensivo continua com o agrônomo responsável.
- A base de culturas e as regras de pontuação são simplificadas e precisam ser calibradas por região.
- O clima da NASA POWER tem grade de cerca de 50 km: descreve a região, não o microclima do talhão.
- A referência do diagnóstico de saúde do solo foi calibrada em pomares de pêssego em Pelotas (Melo, 2026). Para grãos é preciso outra referência.
- A janela de plantio oficial (ZARC) ainda não está integrada: é a próxima prioridade.
