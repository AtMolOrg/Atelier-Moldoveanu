/**
 * Atelier Moldoveanu — o singură funcție HTTPS „llm" care ține cheia API
 * și cheamă Claude. Aplicația web nu poate chema Claude direct (cheia ar fi
 * publică), de aceea trece prin funcția asta.
 *
 * Endpoint (după deploy): https://europe-west1-atelier-m-cccb6.cloudfunctions.net/llm
 *
 * Setup o singură dată (Nick, în terminal, din rădăcina proiectului):
 *   1. Planul Blaze (pay-as-you-go) activat pe proiectul Firebase — Cloud
 *      Functions nu merg pe planul gratuit Spark.
 *   2. firebase functions:secrets:set ANTHROPIC_API_KEY
 *      (lipești cheia când o cere — rămâne la Google, nu în cod, nu la nimeni altcineva)
 *   3. cd functions && npm install && cd ..
 *   4. firebase deploy --only functions
 *
 * Cost: model haiku, ~15 apeluri per sesiune de planificare = câțiva cenți pe zi.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// haiku = ieftin + rapid, ajunge pentru 2–4 propoziții. Pune "claude-sonnet-5" dacă vrei rezumate mai bune.
const MODEL = "claude-haiku-4-5-20251001";

exports.llm = onRequest(
  {
    region: "europe-west1",
    secrets: [ANTHROPIC_API_KEY],
    cors: true,
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 5,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "doar POST" }); return; }

    try {
      const body = req.body || {};
      const task = body.task || (body.events ? "playbook" : "summary");
      let system, user, maxTokens;

      if (task === "summary") {
        maxTokens = 320;
        system =
          "Ești asistentul unui manager de atelier de metal (tâmplărie metalică, balustrade, " +
          "structuri). Primești starea unui proiect ca date structurate. Rezumă în 2–4 propoziții " +
          "scurte, în română. Reguli stricte: (a) DESCRIPTIV, nu la imperativ — spui ce se vede din " +
          "date; (b) dacă tragi o concluzie, o formulezi cu «pare» / «s-ar putea» / «probabil», " +
          "niciodată «fă X» sau «mută Y»; (c) nu inventa nimic ce nu e în date; (d) fără liste, fără " +
          "titluri, doar propoziții; (e) nu explica ce faci, dă direct rezumatul.";
        user =
          "Proiect: " + (body.cod || "?") + "\n\n" +
          "Date (facts):\n" + JSON.stringify(body.facts || {}, null, 1) +
          (body.playbook ? "\n\nContext general (caiet de atelier):\n" + body.playbook : "");
      } else {
        maxTokens = 1400;
        system =
          "Ești asistentul unui manager de atelier. Primești «caietul de atelier» curent (reguli și " +
          "preferințe învățate în timp) și o listă de evenimente recente din aplicație. Propune o " +
          "versiune actualizată a caietului: păstrează ce e încă valid, adaugă tiparele noi pe care le " +
          "vezi în evenimente, formulează scurt și concret, în română. Întoarce DOAR textul noului " +
          "caiet, fără explicații, fără introducere.";
        user =
          "Caiet curent:\n" + (body.playbook || "(gol)") +
          "\n\nEvenimente recente:\n" + JSON.stringify(body.events || [], null, 1);
      }

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system: system,
          messages: [{ role: "user", content: user }],
        }),
      });

      const data = await anthropicRes.json();
      if (!anthropicRes.ok) {
        res.status(502).json({ error: "anthropic", status: anthropicRes.status, detail: data });
        return;
      }
      const text = (data.content || []).map((b) => b.text || "").join("").trim();
      res.json({ text: text });
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  }
);
