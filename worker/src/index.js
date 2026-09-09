/**
 * Atelier Moldoveanu — Cloudflare Worker care ține cheia Gemini și cheamă LLM-ul.
 * Aplicația web nu poate chema direct un LLM (cheia ar fi publică) — trece prin aici.
 *
 * TOT GRATIS: Cloudflare Workers (free, fără card) + Gemini API (free tier, fără card).
 *
 * Setup o singură dată (Nick, din folderul `worker/`):
 *   1. Cheie Gemini: https://aistudio.google.com/apikey  (gratis, fără card)
 *   2. npx wrangler login
 *   3. npx wrangler secret put GEMINI_API_KEY     ← lipești cheia
 *   4. npx wrangler deploy                        ← afișează URL-ul (…workers.dev)
 *   5. pui URL-ul în index.html, constanta LLM_URL, și dai push
 *
 * Contract:
 *   POST { task:"summary", cod, facts, playbook }  -> { text }   (2–4 propoziții)
 *   POST { task:"playbook", events, playbook }      -> { text }   (caietul actualizat)
 */

const MODEL = "gemini-3.6-flash"; // gratis; dacă Google zice că nu mai e disponibil, pune numele pe care ți-l sugerează în eroare

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "POST") return json({ error: "doar POST" }, 405);
    if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY nesetat (npx wrangler secret put GEMINI_API_KEY)" }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: "body invalid" }, 400); }

    const task = body.task || (body.events ? "playbook" : "summary");
    let system, user, maxTokens;

    if (task === "summary") {
      maxTokens = 600;
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

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL +
      ":generateContent?key=" + env.GEMINI_API_KEY;

    let g, data;
    try {
      g = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.4,
            // modelele noi Gemini „gândesc" pe tokeni de output; fără asta iese trunchiat
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      data = await g.json();
    } catch (e) {
      return json({ error: "fetch gemini", detail: String(e) }, 502);
    }
    if (!g.ok) return json({ error: "gemini", status: g.status, detail: data }, 502);

    const cand = (data.candidates || [])[0] || {};
    const parts = (cand.content || {}).parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (!text) return json({ error: "gol", finishReason: cand.finishReason || null, detail: data }, 502);
    return json({ text });
  },
};
