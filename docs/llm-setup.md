# Activarea rezumatelor AI (Cloud Function „llm")

Rezumatele **descriptive** din tab-ul Planificare merg fără nimic. Pasul ăsta
adaugă **rezumatele narative AI** (butoanele ↻) și „Propune actualizare" pentru
caietul de atelier. Se face **o singură dată**.

## Ce e

`functions/index.js` = o funcție HTTPS pe Firebase care ține cheia API Anthropic
și cheamă Claude. Aplicația web nu poate chema Claude direct — cheia ar fi publică.

Endpoint după deploy: `https://europe-west1-atelier-m-cccb6.cloudfunctions.net/llm`
(deja pus în `index.html`, `LLM_URL`).

## Setup (Nick, în terminal, din rădăcina proiectului)

**1. Plan Blaze.** Cloud Functions nu merg pe planul gratuit Spark. Din consola
Firebase → proiectul `atelier-m-cccb6` → Upgrade → Blaze (pay-as-you-go). Ai și
un buget de alertă dacă vrei (ex. 5 USD/lună — n-o să-l atingi).

**2. Cheia API.** Din <https://console.anthropic.com> → API Keys → creezi una.
Apoi:
```
firebase functions:secrets:set ANTHROPIC_API_KEY
```
Lipești cheia când o cere. Rămâne la Google (Secret Manager), **nu** în cod, nu
în git, nu la altcineva.

**3. Dependințe + deploy:**
```
cd functions && npm install && cd ..
firebase deploy --only functions
```
Dacă `firebase` nu e instalat: `npm install -g firebase-tools` apoi `firebase login`.

**4. Gata.** În tab-ul Planificare apar butoanele **↻** pe fiecare rând care „cere
atenție" + **↻ rezumă tot** în cap. Click → rezumatul narativ. Se regenerează doar
când faptele proiectului s-au schimbat.

## Cost

Model `haiku` (în `functions/index.js`, constanta `MODEL`). ~15 apeluri per
sesiune de planificare = câțiva cenți pe zi. Dacă vrei rezumate mai bune, schimbă
`MODEL` în `claude-sonnet-5` — de câteva ori mai scump, tot mărunt.

## Dacă nu faci pasul ăsta

Nimic nu se strică. Butoanele ↻ apar dar dau „apel eșuat" la click, iar rezumatul
determinist rămâne — care oricum e ~70% din valoare.

## Contract (dacă vrei să modifici funcția)

`POST` cu unul din:
- `{ task: "summary", cod, facts, playbook }` → `{ text }` (2–4 propoziții)
- `{ task: "playbook", events, playbook }` → `{ text }` (caietul actualizat)

`facts` = `{ dl, late, phaseName, phaseKey, nP, nMon, nEx, nPre, ordTotal, ordRecv, ordPend[], openReps }`.
