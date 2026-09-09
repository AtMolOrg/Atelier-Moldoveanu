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

// Groq scoate modele des. Nu hardcodăm: cerem lista live de la Groq și alegem după
// ordinea de preferință de mai jos (primul substring care se potrivește câștigă).
const MODEL_PREF = ["llama-3.3", "llama-3.1-70", "llama-4", "llama-3.1-8", "llama", "gpt-oss", "qwen", "mixtral", "gemma"];
let cachedModels = null; // module-level: se reține între cereri cât trăiește isolate-ul

async function pickModel(key) {
  if (!cachedModels) {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { authorization: "Bearer " + key },
    });
    const d = await r.json();
    cachedModels = (d.data || [])
      .filter((m) => m.active !== false)
      .map((m) => m.id)
      .filter((id) => !/whisper|tts|guard|prompt-guard|embed/i.test(id));
  }
  for (const pref of MODEL_PREF) {
    const hit = cachedModels.find((id) => id.toLowerCase().includes(pref));
    if (hit) return hit;
  }
  return cachedModels[0] || "llama-3.3-70b-versatile";
}

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

    let model;
    try {
      model = await pickModel(env.GROQ_API_KEY);
    } catch (e) {
      return json({ error: "lista de modele Groq", detail: String(e) }, 502);
    }

    // o încercare cu modelul ales; dacă tocmai a fost scos, golim cache-ul și mai încercăm o dată
    for (let attempt = 0; attempt < 2; attempt++) {
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
        return json({ error: "fetch groq", model, detail: String(e) }, 502);
      }
      if (g.ok) {
        const text = ((((data.choices || [])[0] || {}).message || {}).content || "").trim();
        return text ? json({ text, model }) : json({ error: "gol", model, detail: data }, 502);
      }
      const decommissioned = data && data.error && data.error.code === "model_decommissioned";
      if (attempt === 0 && (g.status === 404 || decommissioned)) {
        cachedModels = null;
        model = await pickModel(env.GROQ_API_KEY);
        continue;
      }
      return json({ error: "groq", model, status: g.status, detail: data }, 502);
    }
    return json({ error: "groq: nereușit după 2 încercări", model }, 502);
  },
};
