# Activarea rezumatelor AI — Cloudflare Worker + Gemini (tot gratis)

Rezumatele **descriptive** din tab-ul Planificare merg fără nimic. Pasul ăsta
adaugă **rezumatele narative AI** (butoanele ↻) și „Propune actualizare" pentru
caietul de atelier. **0 lei**, fără card nicăieri. Se face **o singură dată**.

## De ce așa

O aplicație web nu poate chema direct un LLM — cheia API ar fi vizibilă oricui.
Deci trece printr-un mic server care ține cheia. Alegerea: **Cloudflare Worker**
(free, fără card) care cheamă **Gemini API** (free tier, fără card). Zero Firebase
Blaze, zero facturare.

`worker/src/index.js` = codul. Contractul e același ca înainte
(`POST {task, ...} → {text}`), deci se poate schimba oricând pe alt LLM.

## Setup (Nick, din folderul `worker/`)

**1. Cheie Gemini.** <https://aistudio.google.com/apikey> → „Create API key".
Gratis, fără card, fără proiect de facturare.

**2. Wrangler (CLI Cloudflare):**
```
npm install -g wrangler
```
(sau folosești `npx wrangler ...` peste tot mai jos, fără install)

**3. Login + secret + deploy:**
```
cd worker
npx wrangler login
npx wrangler secret put GEMINI_API_KEY     # lipești cheia când o cere
npx wrangler deploy
```
Ultima comandă afișează URL-ul, de forma:
`https://atelier-llm.NUMELE-TAU.workers.dev`

**4. Pui URL-ul în aplicație.** În `index.html`, constanta `LLM_URL` (caută
`var LLM_URL`), lipești URL-ul între ghilimele. Commit + push.

**5. Gata.** În tab-ul Planificare apar butoanele **↻** pe rândurile care „cer
atenție" + **↻ rezumă tot** în cap. Se regenerează doar când faptele proiectului
s-au schimbat.

## Limite free tier

- **Cloudflare Workers:** 100.000 cereri/zi. Nici pe departe o problemă.
- **Gemini `gemini-2.5-flash`:** ~10 cereri/minut, câteva sute/zi pe free tier.
  Pentru ~15 rezumate per sesiune de planificare e mult peste nevoie. Dacă vreodată
  atingi limita, schimbă `MODEL` în `worker/src/index.js` pe `gemini-2.0-flash` sau
  `gemini-2.5-flash-lite` (limite mai mari).

## Dacă nu faci pasul ăsta

Nimic nu se strică. `LLM_URL` gol → butoanele ↻ nici nu apar, rămâne rezumatul
determinist (care e ~70% din valoare).

## Contract (dacă modifici worker-ul)

`POST` cu unul din:
- `{ task: "summary", cod, facts, playbook }` → `{ text }` (2–4 propoziții)
- `{ task: "playbook", events, playbook }` → `{ text }` (caietul actualizat)

`facts` = `{ dl, late, phaseName, phaseKey, nP, nMon, nEx, nPre, ordTotal, ordRecv, ordPend[], openReps }`.
