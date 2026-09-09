/**
 * Atelier Moldoveanu — Cloudflare Worker care ține cheia API și cheamă LLM-ul (Groq).
 * Aplicația web nu poate chema direct un LLM (cheia ar fi publică) — trece prin aici.
 *
 * TOT GRATIS: Cloudflare Workers (free, fără card) + Groq API (free tier, fără card).
 *
 * Setup o singură dată:
 *   1. Cheie Groq: https://console.groq.com  → API Keys → Create  (gratis, fără card)
 *   2. În Cloudflare, Worker → Settings → Variables and Secrets → Add:
 *        tip Secret, nume  GROQ_API_KEY , valoarea = cheia
 *   3. Deploy.
 *   4. Pui URL-ul worker-ului în index.html, constanta LLM_URL, și dai push.
 *
 * Contract:
 *   POST { task:"summary", cod, facts, playbook }  -> { text }   (2–4 propoziții)
 *   POST { task:"playbook", events, playbook }      -> { text }   (caietul actualizat)
 */

// Se încearcă pe rând; dacă unul dă 404 (deprecated) sau 5xx, trece la următorul.
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

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
    if (!env.GROQ_API_KEY) return json({ error: "GROQ_API_KEY nesetat (Worker → Settings → Variables and Secrets)" }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: "body invalid" }, 400); }

    const task = body.task || (body.events ? "playbook" : "summary");
    let system, user, maxTokens;

    if (task === "summary") {
      maxTokens = 400;
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
      maxTokens = 1600;
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

    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    let lastErr = null;
    for (const model of MODELS) {
      let g, data;
      try {
        g = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer " + env.GROQ_API_KEY,
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
        });
        data = await g.json();
      } catch (e) {
        lastErr = { error: "fetch", model, detail: String(e) };
        continue;
      }
      if (g.status === 404 || g.status >= 500) {
        lastErr = { error: "groq", model, status: g.status, detail: data };
        continue; // model dispărut sau server ocupat -> încearcă următorul
      }
      if (!g.ok) return json({ error: "groq", model, status: g.status, detail: data }, 502);
      const text = ((((data.choices || [])[0] || {}).message || {}).content || "").trim();
      if (text) return json({ text, model });
      lastErr = { error: "gol", model, detail: data };
    }
    return json(lastErr || { error: "toate modelele au eșuat" }, 502);
  },
};
