# Activarea rezumatelor AI — Cloudflare Worker + Groq (tot gratis)

Rezumatele **descriptive** din tab-ul Planificare merg fără nimic. Pasul ăsta
adaugă **rezumatele narative AI** (butoanele ↻) și „Propune actualizare" pentru
caietul de atelier. **0 lei**, fără card nicăieri.

## De ce așa

O aplicație web nu poate chema direct un LLM — cheia API ar fi vizibilă oricui.
Deci trece printr-un mic server care ține cheia: un **Cloudflare Worker** (free,
fără card) care cheamă **Groq** (free tier, rapid, stabil — rulează modele Llama).

`worker/src/index.js` = codul. Contractul e simplu (`POST {task, ...} → {text}`),
se poate schimba oricând pe alt LLM.

## Setup (din Cloudflare dashboard, fără să instalezi nimic)

**1. Cheie Groq.** <https://console.groq.com> → API Keys → Create API Key.
Gratis, fără card.

**2. Worker în Cloudflare.** [dash.cloudflare.com](https://dash.cloudflare.com) →
Workers & Pages → Create → Worker → nume `atelier-llm` → Deploy (stub).

**3. Codul.** Worker → **Edit code** → șterge tot → lipești conținutul din
`worker/src/index.js` → **Deploy**.

**4. Secretul.** Worker → **Settings** → **Variables and Secrets** → **Add** →
tip **Secret**, nume `GROQ_API_KEY`, valoarea = cheia → **Deploy**.

**5. URL în aplicație.** Din capul paginii worker-ului iei URL-ul
(`atelier-llm.NUMELE-TAU.workers.dev`). În `index.html`, la `var LLM_URL = ''`,
lipești URL-ul între ghilimele. Commit + push.

**6. Gata.** În tab-ul Planificare apar butoanele **↻** pe rândurile care „cer
atenție" + **↻ rezumă tot**. Se regenerează doar când faptele proiectului s-au
schimbat.

## Limite / model

- **Cloudflare Workers:** 100.000 cereri/zi. Nici pe departe o problemă.
- **Groq free tier:** ~30 cereri/minut, mii/zi. Pentru ~15 rezumate per sesiune,
  mult peste nevoie.
- Model: `llama-3.3-70b-versatile` (bun pentru română + rezumate scurte). Worker-ul
  are o listă de rezervă (`llama-3.1-8b-instant`, `gemma2-9b-it`) și trece automat
  pe următorul dacă unul e deprecated sau serverul e ocupat.

## Dacă nu faci pasul ăsta

Nimic nu se strică. `LLM_URL` gol → butoanele ↻ nici nu apar, rămâne rezumatul
determinist (~70% din valoare).

## Contract (dacă modifici worker-ul)

`POST` cu unul din:
- `{ task: "summary", cod, facts, playbook }` → `{ text }` (2–4 propoziții)
- `{ task: "playbook", events, playbook }` → `{ text }` (caietul actualizat)

`facts` = `{ dl, late, phaseName, phaseKey, nP, nMon, nEx, nPre, ordTotal, ordRecv, ordPend[], openReps }`.
