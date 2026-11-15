// Siglas e termos técnicos explicados em uma frase, para quem não é da área entender a tela de cara.
export const GLOSSARIO = {
  "NASA POWER": "Banco de dados de clima da NASA, feito com satélites e modelos. Dá chuva e temperatura de qualquer ponto do mundo, dia a dia, desde 1981.",
  SRTM: "Mapa de altitude da Terra feito pela NASA. Com ele o app calcula o quanto o terreno é inclinado.",
  NDVI: "Índice que mede o quanto a vegetação está verde e viva, visto por satélite. Mais verde, planta mais vigorosa.",
  SMAP: "Satélite da NASA que mede a umidade do solo: se a terra está seca ou molhada.",
  HLS: "Foto de satélite com detalhe de 30 metros, de dois satélites (NASA e Europa) juntos.",
  Declividade: "Quanto o terreno sobe ou desce. 9% quer dizer que sobe 9 metros a cada 100 metros andados. Quanto mais inclinado, mais a chuva leva a terra.",
  Erosão: "Terra levada pela água da chuva. Leva junto o adubo e a parte mais fértil do solo.",
  Talhão: "Pedaço da propriedade plantado com a mesma cultura e manejado do mesmo jeito.",
  Rotação: "A sequência de culturas plantadas no mesmo talhão ao longo dos anos (por exemplo, soja no verão e trigo no inverno).",
  "Planta de cobertura": "Planta cultivada para proteger e melhorar o solo, não para vender (aveia, ervilhaca, nabo).",
  "El Niño / La Niña": "Aquecimento (El Niño) ou resfriamento (La Niña) do oceano Pacífico. No Sul do Brasil, El Niño costuma trazer mais chuva e La Niña, seca.",
  ZARC: "Zoneamento Agrícola de Risco Climático, do Ministério da Agricultura. Diz em que datas plantar cada cultura em cada município com menos risco. Também é exigido no seguro e no crédito rural.",
  INMET: "Instituto Nacional de Meteorologia, que faz a previsão do tempo oficial do Brasil.",
  NOAA: "Agência de clima dos Estados Unidos. Publica todo mês a previsão de El Niño e La Niña.",
  pH: "Mede a acidez do solo. Solo ácido (pH baixo) prende os nutrientes e a planta não consegue usar.",
  "V%": "Saturação por bases: quanto do espaço de nutrientes do solo está ocupado por nutrientes bons (cálcio, magnésio, potássio). Soja e trigo pedem perto de 70%.",
  CTC: "Capacidade de troca de cátions: o tamanho da \"caixa\" de nutrientes do solo. Solo argiloso tem caixa maior.",
  "M.O.": "Matéria orgânica: restos de plantas e vida do solo. Guarda água e nutrientes.",
  SMP: "Índice do laudo usado para calcular quanto calcário pôr.",
  Calagem: "Pôr calcário no solo para tirar a acidez.",
  COT: "Carbono orgânico total: quanto carbono (matéria orgânica) o solo guarda. É um termômetro da saúde do solo.",
  AEEM: "Atividade de duas enzimas do solo (β-glicosidase e arilsulfatase). Mostra se a vida do solo está ativa.",
  BioAS: "Análise biológica do solo da Embrapa: mede as enzimas, a \"vida\" do solo. Laboratórios credenciados fazem junto com a análise comum.",
  "Plantio direto": "Plantar sem arar nem gradear, em cima da palha da cultura anterior. Protege o solo.",
} as const;

export type Termo = keyof typeof GLOSSARIO;
