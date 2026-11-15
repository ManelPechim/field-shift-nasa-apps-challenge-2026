# Terrana

**Crop rotation planning with NASA data, made for the agricultural technician and the farmer.**

NASA Space Apps Challenge 2026 · Challenge 6: *Field Shift: Adapting Farms with NASA Data* · Team 08 · Manut(h)on (Brazil)

Terrana helps an agricultural technician choose, together with each farmer, the crop rotation that best protects a field in a changing climate. It combines 20 years of NASA climate data, NASA terrain data, the field visit and the soil test. It compares the current rotation with the two best alternatives and tests each one in a normal, dry (La Niña) and wet (El Niño) season before planting.

The app interface is in Brazilian Portuguese, because its users are Brazilian technicians and farmers.

## Why

- In the 2021/22 season, NOAA issued a La Niña advisory in October, and La Niña usually brings drought to southern Brazil. Rio Grande do Sul harvested less than half of the soybeans it expected (Emater/RS).
- Drought cannot be avoided, but a farm can be prepared. Keeping the soil covered and diversifying crops are two ways, and crop rotation is a key tool for both.
- The data to decide better already exists, much of it from NASA, but it does not reach the people who decide what to plant. Only about 1 in 5 Brazilian farms receives technical assistance (IBGE, Agricultural Census 2017), so each technician's time matters.

## How it works

There are two sides to the app.

**Technician** (agronomist, agricultural technician, extension agent):

1. Registers the farmers they serve and creates their access.
2. Marks the property and draws each field (*talhão*) on a satellite image.
3. Terrana fetches 20 years of NASA POWER daily climate and SRTM slope for that field and computes its risks: flooding, erosion, frost, drought and extreme heat.
4. Records the field visit (5 one-tap questions: standing water, erosion, compaction, ground cover, no-till) and the lab soil test, which Terrana translates into plain language.
5. Opens the **Summary and recommendation** tab, which already holds the analysis: the recommended rotation, what improves, what gets worse, the risks that weigh on the decision and what to confirm before talking to the farmer.
6. Compares the current rotation with the two best alternatives, scored on soil health, erosion protection, climate fit, income potential, water use and forage, weighted by the farmer's priorities. Each option can be tested in a dry or wet season.
7. Generates a one-page **decision report** and publishes the plan.

**Farmer:** does not create an account. They sign in with the phone number and password the technician sends, see their properties, fields and weather, and read the plan in plain language with the options that were compared. They answer "agreed" or "I have a question", and the conversation continues with the technician on WhatsApp.

The technician stays in the middle on purpose: the rotation is decided by someone who knows the land, together with the farmer. Terrana does not estimate yield and does not replace the technician or the agronomist.

**Every number is labelled** as one of four sources: NASA data, local information (visit, soil test, farmer), agronomic rule, or scenario hypothesis.

## Retrospective test: the 2021/22 drought

The page "Volta no tempo" (*back in time*), at `/tecnico/talhoes/[id]/retroanalise`, runs the decision engine as if it were **15 October 2021**. It uses only the 2001–2020 climate and the La Niña forecast, then compares the result with what NASA POWER measured from November 2021 to February 2022. For the example field in Cruz Alta (RS):

| Question | Terrana in Oct 2021 (La Niña scenario) | What happened | Result |
|---|---|---|---|
| Direction of rain | Less rain than normal | Less rain than normal | Correct |
| Size of the drought | 75% of normal | 38% of normal | Real drought was stronger |
| Drought risk | Raised from low to medium | Up to 12 days in a row without rain | Alert raised |
| Extreme heat | Low (the scenario does not change heat) | 46 days above 35 °C (normal: 5) | Not anticipated |
| Recommendation | Switched to a sorghum-based, more drought-tolerant rotation | — | — |

The test shows what to calibrate next: the strength of the dry scenario and heat risk in La Niña years.

## NASA data used

| Source | What for | Access |
|---|---|---|
| **NASA POWER**, daily point data (PRECTOTCORR, T2M, T2M_MIN, T2M_MAX, RH2M) | Climate normals per field (2005–2024), last 30 days, frost, extreme heat, extreme rain, dry spells; 2001–2020 normals and the 2021/22 season in the retrospective test | Public API, no key |
| **SRTM** elevation, through AWS Open Data Terrain Tiles | Slope, slope classes (Embrapa) and altitude inside each field | Public |
| **NASA GIBS**: MODIS Terra NDVI 8-day, SMAP L4 root-zone soil moisture, HLS 30 m reflectance | Map layers for vegetation vigor, soil moisture and recent imagery | Public |

HLS (Harmonized Landsat Sentinel-2) includes data from **ESA Sentinel-2**.

## Other data and references

- **Maps and search:**
  - NOAA Climate Prediction Center, ENSO Diagnostic Discussion of October 2021 (La Niña Advisory).
  - Esri World Imagery basemap, used for drawing fields (Esri, Maxar, Earthstar Geographics).
  - OpenStreetMap / Nominatim, for place search. © OpenStreetMap contributors.
- **Statistics used in the pitch:**
  - Emater/RS (2022): 2021/22 soybean losses.
  - IBGE, Agricultural Census 2017.
  - Bragantia / IAC (2015): soil loss by erosion in Brazil.
- **Agronomic references:**
  - Embrapa slope classes.
  - IAC Boletim 100 (soil test interpretation).
  - Four-quadrant soil health model, organic carbon × enzyme activity (Melo, 2026, M.Sc. thesis in Soil Management, UFPel).

## Use of AI

**The app uses no AI.** No recommendation, score or text shown to technicians or farmers is generated by AI. Scores come from transparent rules over NASA data, the visit and the soil test (`src/lib/agro`).

The team used Claude (Anthropic), through Claude Code, as an assistant for:

- **Prototyping the MVP:** writing and reviewing code.
- **Research:** the challenge, Brazilian farming practice and comparable products.
- **Data analysis and comparison:** including the 2021/22 retrospective test.
- **Writing:** drafting and translating the presentation and submission texts.

The team reviewed and decided everything, with advice from a soil management specialist. No AI-generated images, video or audio were used.

**Planned, not integrated:** reading lab soil reports from a photo and writing the plan summary for the farmer. The buttons for these show a "coming soon" notice (`docs/decisoes.md`, item 9).

## Tech stack

TypeScript · Next.js 16 (App Router) · React · Supabase (PostgreSQL, Auth, Storage, row-level security) · MapLibre GL JS · Tailwind CSS · hosted on Vercel.

## Run locally

```bash
npm install
# create .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# and SUPABASE_SERVICE_ROLE_KEY (server only)
npm run dev
```

The database schema is in `supabase/migrations/`. Every table uses row-level security: a technician sees only the farmers they registered, and a farmer sees only their own properties and published plans.

## End-to-end simulation and example data

With the dev server running (`npm run dev -- -p 3123`), `npm run simulacao` opens two Chrome windows, one for the technician and one for the farmer at phone size. It goes through the whole flow by clicking in the real app: 17 steps, from the technician's sign-up to the farmer agreeing to the plan.

| Command | What it does |
|---|---|
| `npm run simulacao` | Shows each step slowly, with the windows open |
| `npm run simulacao -- --rapido` | Runs headless and fast, to check that nothing broke |
| `npm run simulacao -- --manter` | Keeps the data at the end and prints the logins |
| `npm run simulacao -- --limpar` | Deletes data from previous simulations (`sim.*@field.test`) |
| `npm run simulacao -- --exemplo` | Builds the example data below, rebuilding it from scratch if it already exists |

Example data (all in Cruz Alta, RS):

| Who | Login | Password | Status |
|---|---|---|---|
| Marina Souza, technician | `exemplo.tecnico@field.test` | `exemplo-2026` | Serves both farmers |
| Joaquim Pereira, Sítio Boa Esperança | `(55) 99876-0001` or `exemplo.produtor1@field.test` | `lavoura-2026` | Full cycle: visit, soil test, comparison, report, plan agreed |
| Ana Lúcia Ferreira, Fazenda Santa Rita | `(55) 99876-0002` or `exemplo.produtor2@field.test` | `lavoura-2026` | Waiting for the plan |

## Project structure

- `src/lib/nasa/`: NASA POWER and SRTM terrain.
- `src/lib/agro/`: crops, risks, rotation comparison, decision analysis, soil test interpretation, soil health model.
- `src/app/tecnico/`: technician screens, including the summary tab, the decision report (`relatorio`) and the retrospective test (`retroanalise`).
- `src/app/produtor/`: farmer screens, designed for phones.
- `simulacao/`: the end-to-end simulation.
- `docs/`: product decisions and Brazilian farming context, in Portuguese.

## Known limitations

- The crop base and scoring rules are simplified and need regional agronomic validation.
- Soil test ranges use IAC Boletim 100; the RS/SC manual (CQFS) is not implemented yet.
- The soil health model's reference comes from peach orchards and needs calibration for grain crops.
- Not integrated yet:
  - ZARC planting dates;
  - CAR boundary import;
  - per-field NDVI/SMAP time series;
  - stronger drought and heat scenarios.
