# Registru pliabil pentru desfășurătoare — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Înlocuiește canvas-ul liber din tab-ul „Hartă atelier" cu o listă verticală de rânduri
pliabile (un proiect = un rând), eliminând cartonașul mare care re-listează piesele, fără să
piardă vreo funcție sau vreo dată.

**Architecture:** Schimbare de afișare într-un singur fișier (`index.html`, IIFE, vanilla ES5-ish
JS). `renderHala()` construiește un registru în loc de un canvas. Piesele devin plasabile în orice
etapă (inclusiv etape de proiectare), ceea ce elimină starea `stationId === null`. Logica de faze,
Gantt, avertismente, sync și undo rămân neatinse pentru că se uită doar la cartonașul de proiect
și la piesele din etape de tip `piesa`.

**Tech Stack:** HTML/CSS/JS într-un fișier, fără build, fără `node`. Firebase RTDB + Auth din CDN.
Testare: copie locală servită static (PowerShell `HttpListener`), `localStorage` populat manual,
asserții pe DOM prin consolă / `javascript_tool`.

**Spec:** [docs/superpowers/specs/2026-09-05-registru-desfasurator-design.md](../specs/2026-09-05-registru-desfasurator-design.md)

## Global Constraints

- Stil de cod: vanilla ES5-ish — `var`, `function`, fără arrow functions; un singur IIFE; se
  respectă idiomul din jur.
- `DATA_VERSION` NU se incrementează. Câmpuri noi se backfill-uiesc în `normalizeState`; câmpuri
  stale se șterg tot acolo.
- `stableStringify` trebuie să rămână stabilă (semnătura locală = echo-ul de la Firebase), altfel
  fiecare salvare se auto-detectează ca schimbare remotă și resetează istoricul de undo.
- `saveState()` = `refreshPhaseStamps(); noteUndoPoint(); prevStateJson = JSON.stringify(state);`
  — orice mutație nouă trebuie să treacă prin `saveState(); render();` ca să fie undo-abilă.
- Nicio operație nu se face pe `main`. Ramura de lucru: `redesign/registru`. Nimic nu se
  împinge (`push`) până când utilizatorul nu validează testul pe date reale (Task 7).
- Backup live: tag `live-2026-09-05` / branch `backup/live-2026-09-05` (commit `fb6a96d`).

## Decizii (din spec §9, confirmate)

1. Rândul pliat arată `cod` + `client` (fără câmp „nume" nou).
2. Fără coloană „De pornit"; piese noi apar în prima etapă a proiectului.
3. `state.checklists` rămâne inert în date (nu se șterge), doar nu mai e randat.
4. Comutator de sortare: două butoane vizibile (termen / urgență).

## File Structure

- `index.html` — singurul fișier atins. Zonele:
  - CSS `<style>` (~L10–L470): se adaugă blocul `.reg*`; se șterge blocul `.canvas-*`,
    `.harta-grid`, `.note-*`, `.piece-sublist`, `.side-panel.side-left`.
  - JS state/normalize (~L760–L1010): `normalizeState`, constante.
  - JS helpers stații (~L1110–L1160): se adaugă `pieceFlowFor`, `bucket`.
  - JS render (~L1435–L1985): `renderOrdersPanel`, `renderChecklistCard`, `renderProjectCard`,
    `renderPieceCard`, `renderHartaPeProiecte`, `renderHala`.
  - JS handlers (~L1987–L2680): `attachHalaEvents`, `data-piece-move`, drop zones,
    `attachCanvasEvents`, `attachCanvasNodeDrag`.
- `docs/superpowers/plans/2026-09-05-registru-desfasurator.md` — acest plan.
- Fișiere de test (necomise): `scratchpad/serve.ps1`, `scratchpad/seed.js`.

---

## Task 1: Ramură + harness de test + baseline

**Files:**
- Create: `scratchpad/serve.ps1`, `scratchpad/seed.js` (necomise)
- Branch: `redesign/registru` din `main`

**Interfaces:**
- Produces: ramura `redesign/registru`; un `localStorage['atelier-board-v1']` (cheia reală se
  citește din cod) cu o stare-fixture; o listă de „comportamente baseline" observate pe app-ul
  ACTUAL, folosită ca oracol de regresie în task-urile următoare.

- [ ] **Step 1: Creează ramura**

```bash
cd "C:/Users/Proiectare/Desktop/App"
git checkout -b redesign/registru
```

- [ ] **Step 2: Găsește cheia de localStorage și forma stării**

Caută în `index.html` apelul `localStorage.getItem(...)` / `setItem(...)` din bootstrap. Notează
cheia exactă (ex. `STORAGE_KEY`). Notează structura `state`: `projects[]`, `workers[]`,
`assignments[]`, `checklists[]`, `stations[]`, `settings?`, `version`.

- [ ] **Step 3: Scrie `scratchpad/serve.ps1`**

```powershell
$port = 8777
$root = "C:/Users/Proiectare/Desktop/App"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "http://localhost:$port/index.html"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = $ctx.Request.Url.AbsolutePath.TrimStart('/')
  if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
  $path = Join-Path $root $rel
  if (Test-Path $path) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $ext = [System.IO.Path]::GetExtension($path)
    $ctx.Response.ContentType = if ($ext -eq ".html") { "text/html; charset=utf-8" } elseif ($ext -eq ".js") { "text/javascript" } else { "application/octet-stream" }
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
```

- [ ] **Step 4: Scrie `scratchpad/seed.js`** — o stare-fixture care acoperă toate cazurile

Construiește un obiect `state` cu (adaptează numele câmpurilor la cele reale din cod):
- `P-ante`: proiect cu `stationId` pe „Ofertare"; 3 piese, una cu `stationId: null`; 0 comenzi.
- `P-exec`: proiect cu `stationId` pe „Proiectare"; 5 piese, 2 în „Debitare", 1 în „Sudură",
  2 `null`; 2 comenzi (una `primit`, una nu); 1 worker atribuit pe o piesă; 1 furnizor cu
  `sentAt` fără `receivedAt`.
- `P-montaj`: proiect cu `stationId` pe „Montaj"; 4 piese în `PIECE_MONTAJ`; echipă montaj cu
  2 persoane (`MONTAJ_TEAM`).
- `P-lanes`: proiect cu o etapă `piesa` care are `laneDefs` cu 3 lane-uri și piese pe lane-uri
  diferite; o etapă `proiect` adăugată manual la început („Anteproiect").
- `P-reparatie`: proiect pe „Proiectare"; o piesă „Reparație balustradă" cu `stationId: null`
  (va fi parcată în „Măsurători" în teste).
- `state.checklists`: 1 listă cu 2 iteme.
- `state.version = 8` (sau valoarea reală).

Print `JSON.stringify(state)` → se lipește în consola browserului cu
`localStorage.setItem('<KEY>', '<json>'); location.reload()`.

- [ ] **Step 5: Pornește serverul, încarcă app-ul ACTUAL, notează baseline-ul**

Run: `powershell -File scratchpad/serve.ps1` apoi deschide `http://localhost:8777/index.html`,
injectează seed-ul.

Notează (screenshot + text) pentru starea ACTUALĂ, ca oracol:
- pastila de fază + culoarea halo pentru fiecare din cele 6 proiecte;
- ce scrie `projectWarnings` pe fiecare;
- rândul Gantt pentru `P-exec` (fazele derivate);
- că undo (`↶`) e activ după o editare de proiect.

- [ ] **Step 6: Commit (doar planul, dacă nu e deja)**

```bash
git add docs/superpowers/plans/2026-09-05-registru-desfasurator.md
git commit -m "docs: plan implementare registru pliabil"
```

---

## Task 2: Helperi de flux + piese în etape de proiectare + eliminarea stării `null`

Cea mai riscantă bucată („legăturile"). Se face sub UI-ul vechi (canvas-ul încă randează), ca să
fie izolată și testabilă înainte de schimbarea de layout.

**Files:**
- Modify: `index.html` — helperi stații (~L1117), `renderPieceCard` (~L1962),
  `renderHartaPeProiecte` per-station render (~L1822 și ~L1842), handler `data-piece-move`
  (~L2224), handler `drop` pe `.col-body` (~L2636), `renderProjectCard` sublistă (~L1928),
  `normalizeState` (~L996), creare piesă în `openProjectModal` (~L3379).

**Interfaces:**
- Produces:
  - `pieceFlowFor(p) -> Array<station>` — etapele `proiect` de dinaintea primei etape `piesa`,
    urmate de toate etapele `piesa`. NU include Montaj / etape post-execuție.
  - `bucket(stationId) -> 'pregatire' | 'exec' | 'montaj'`.
  - Invariant nou: nicio piesă nu mai are `stationId == null` după `normalizeState`.

- [ ] **Step 1: Adaugă `bucket` și `pieceFlowFor`** (după `piesaStationsFor`, ~L1117)

```js
function bucket(stationId){
  if(stationId === PIECE_MONTAJ) return 'montaj';
  var s = state.stations ? null : null; // placeholder, vezi mai jos
  return 'pregatire';
}
```

De fapt `bucket` are nevoie de proiect ca să știe tipul etapei. Semnătură corectă:

```js
function bucketFor(p, stationId){
  if(stationId === PIECE_MONTAJ) return 'montaj';
  var st = stationByIdFor(p, stationId);
  return (st && st.type === 'piesa') ? 'exec' : 'pregatire';
}
function pieceFlowFor(p){
  var a = stationsFor(p);
  var fp = firstPiesaIndexFor(p);
  var pre = fp === -1 ? [] : a.slice(0, fp).filter(function(s){ return s.type === 'proiect'; });
  return pre.concat(piesaStationsFor(p));
}
```

- [ ] **Step 2: `renderPieceCard` — starea „în etapă de proiect"** (~L1962)

Azi: `var ps = piesaStationsFor(project); var psIdx = ps.findIndex(...); var isBack = psIdx === -1;`

Înlocuiește logica `isBack` cu poziția reală în `pieceFlowFor`:

```js
var flow = pieceFlowFor(project);
var flowIdx = flow.findIndex(function(s){ return s.id === piece.stationId; });
var curStation = stationByIdFor(project, piece.stationId);
var inProiectStage = curStation && curStation.type === 'proiect';
var isBack = flowIdx === 0 && inProiectStage; // la prima etapă din flux, etapă de proiect
```

- pentru `inProiectStage`: afișează numele etapei ca badge; buton `→` = `data-piece-move` `next`;
  buton `↺` = `data-piece-demote` doar dacă `flowIdx > 0`.
- pentru etapă `piesa`: comportamentul actual (`↺` + `📦`).
- `piece.rep` (dacă seed-ul îl are): border-left roșu + tag „rep" (cosmetic, opțional).

- [ ] **Step 3: Randează piese în coloanele `proiect`** (`renderHartaPeProiecte`)

La ~L1838 (`if(station.type === 'proiect')`), după `renderProjectCard`, adaugă piesele parcate:

```js
if(station.type === 'proiect'){
  if(p.stationId === station.id) out += renderProjectCard(p, station);
  var parked = (p.pieces||[]).filter(function(pc){ return pc.stationId === station.id; });
  parked.forEach(function(pc){ out += renderPieceCard(pc, p); });
  if(p.stationId !== station.id && !parked.length) out += '<div class="col-empty">—</div>';
}
```

Analog în ramura cu lanes (~L1822): pentru `station.type === 'proiect'`, pe lângă `p` pe lane-ul
lui, adaugă piesele cu `pc.stationId === station.id && (pc.lane||default) === lane.id`.

- [ ] **Step 4: `data-piece-move` pe `pieceFlowFor`** (~L2231)

```js
var flow = pieceFlowFor(p);
var idx = flow.findIndex(function(s){ return s.id === pc.stationId; });
var newIdx = btn.dataset.dir === 'next' ? idx + 1 : idx - 1;
if(newIdx >= 0 && newIdx < flow.length){
  pc.stationId = flow[newIdx].id; pc.lane = null;
  saveState(); render();
}
```

`data-piece-demote` (~L2241): în loc de `pc.stationId = null`, mută un pas înapoi pe `flow`
(dacă `idx > 0`), altfel no-op.

- [ ] **Step 5: `drop` — parcare piesă pe etapă `proiect` timpurie** (~L2648)

Azi: `if(kind === 'piesa'){ pc.stationId = zone.dataset.station; ... }` și `else if(kind === 'proiect' && isPostExecStationFor(...))` mută proiectul.

Adaugă între ele:

```js
} else if(kind === 'proiect'){
  var st = stationByIdFor(p, zone.dataset.station);
  var fp = firstPiesaIndexFor(p);
  var stIdx = stationsFor(p).findIndex(function(s){ return s.id === zone.dataset.station; });
  if(isPostExecStationFor(p, zone.dataset.station)){
    p.stationId = zone.dataset.station; p.lane = zone.dataset.lane || null;
    saveState(); render();
  } else if(fp === -1 || stIdx < fp){
    pc.stationId = zone.dataset.station; pc.lane = zone.dataset.lane || null; // parcare
    saveState(); render();
  }
}
```

`dragover` pe `.col-body` (~L2630) deja acceptă orice non-`WRK::` — nu trebuie schimbat.

- [ ] **Step 6: `renderProjectCard` sublistă — `→` pentru piesă în etapă de proiect** (~L1928)

În ramura `else if(st){ ... }` (piesa are stație): dacă `st.type === 'proiect'` și
`pieceFlowFor(p)` are un pas următor, adaugă și butonul `→` `data-piece-move` `next` pe lângă `↺`.

- [ ] **Step 7: `normalizeState` — migrare `null` → prima etapă** (~L996, în `parsed.projects.forEach`)

```js
(p.pieces||[]).forEach(function(pc){
  if(pc.stationId == null){
    var a = Array.isArray(p.stations) ? p.stations : (parsed.stations||[]);
    pc.stationId = a[0] ? a[0].id : null;
    pc.lane = null;
  }
});
```

- [ ] **Step 8: Piesă nouă în modal → prima etapă** (~L3379)

Azi: `pieces.push({id: ..., name: ..., stationId: row.dataset.stationId || null, colorCode: ...})`.
Schimbă `|| null` în `|| (firstStationIdOf(proj))` unde:

```js
function firstStationIdOf(proj){
  var a = stationsFor(proj);
  return a[0] ? a[0].id : null;
}
```

(dacă la momentul creării `proj` nu există încă, folosește `state.stations[0].id`).

- [ ] **Step 9: Test manual (app vechi, canvas)** 

Injectează seed-ul. Verifică:
1. Nicio piesă „La proiectare" fără stație — toate apar sub o coloană.
2. `P-reparatie`: trage „Reparație balustradă" pe coloana „Măsurători" → apare acolo; pastila
   proiectului rămâne **albastră** (nu „Execuție"); Gantt-ul lui neschimbat.
3. Pe piesa din „Măsurători": `→` o duce în „Debitare" (prima etapă `piesa`).
4. `↶` (undo) e activ după fiecare din pașii 2–3 și îi anulează corect.
5. `P-exec` pastila = „Execuție" (portocaliu) ca în baseline; `P-montaj` = roșu; `P-ante` =
   albastru „Ofertare".
6. Drag piesă între „Debitare" și „Sudură" merge; drag piesă pe „Montaj" mută tot proiectul.

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "Piese plasabile în etape de proiectare; elimină starea stationId=null"
```

---

## Task 3: `normalizeState` — `registrySort` + curăță `x/y`

**Files:**
- Modify: `index.html` — `normalizeState` (~L996–L1010).

**Interfaces:**
- Produces: `state.registrySort ∈ {'termen','urgenta'}` (implicit `'termen'`); `p.x/p.y/cl.x/cl.y`
  garantat absente.

- [ ] **Step 1: Adaugă în `normalizeState`**

```js
if(parsed.registrySort !== 'termen' && parsed.registrySort !== 'urgenta') parsed.registrySort = 'termen';
(parsed.projects||[]).forEach(function(p){ delete p.x; delete p.y; });
(parsed.checklists||[]).forEach(function(c){ delete c.x; delete c.y; }); // datele listelor rămân
```

- [ ] **Step 2: Test** — injectează seed cu `x/y` pe proiecte; reload; în consolă
  `JSON.parse(localStorage['<KEY>']).projects[0].x === undefined` → `true`;
  `...registrySort` → `'termen'`; `...checklists.length` neschimbat.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "normalizeState: registrySort implicit + curăță x/y (checklists rămân)"
```

---

## Task 4: Registru — schelet (toolbar + rânduri pliate), canvas eliminat

**Files:**
- Modify: `index.html` — `renderHala` (~L1738–L1779), `renderHartaPeProiecte` → `renderRegistru`
  (~L1780+), CSS (adaugă `.reg*`), variabilă modul `registryOpen`.

**Interfaces:**
- Consumes: `currentStageInfo`, `projectWarnings`, `urgencyOf`, `urgencyGradient`,
  `urgencyValue`, `bucketFor`, `stationsFor`.
- Produces:
  - `renderRegistru() -> string` (înlocuiește `renderHartaPeProiecte`).
  - `renderRegRow(p) -> string` — rândul pliat.
  - `registryOpen` — `Object` folosit ca set (`registryOpen[p.id] === true`).
  - Toolbar cu `[data-regsort="termen"|"urgenta"]`.

- [ ] **Step 1: Variabilă modul** (lângă celelalte `var` de sus, ~L768)

```js
var registryOpen = {};
```

- [ ] **Step 2: CSS `.reg*`** (în `<style>`, după blocul `.proj-*`)

```css
.reg-toolbar{ display:flex; gap:6px; align-items:center; margin:0 0 12px; font-size:12px; color:var(--ink-dim); }
.reg-toolbar button{ background:var(--panel-2); border:1px solid var(--border); color:var(--ink-dim); border-radius:999px; padding:4px 10px; font-size:12px; }
.reg-toolbar button[aria-pressed="true"]{ color:var(--ink); border-color:var(--ink); }
.reg{ border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--panel); }
.reg-row{ display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:none; border:0; border-top:1px solid var(--border); padding:9px 12px; }
.reg-row:first-child{ border-top:0; }
.reg-row:hover{ background:var(--panel-2); }
.reg-row .rr-cod{ font-family:var(--mono, monospace); font-weight:700; font-size:12.5px; }
.reg-row .rr-cli{ font-weight:600; min-width:90px; }
.reg-bar{ display:flex; height:7px; width:120px; border-radius:4px; overflow:hidden; background:var(--panel-3); flex:none; }
.reg-bar i{ display:block; }
.reg-bar i.pregatire{ background:var(--phase-ante, #3b7bbf); }
.reg-bar i.exec{ background:var(--phase-exec, #d9772f); }
.reg-bar i.montaj{ background:var(--phase-montaj, #c0453a); }
.reg-count{ font-family:var(--mono, monospace); font-size:11px; color:var(--ink-dim); white-space:nowrap; }
.reg-term{ font-family:var(--mono, monospace); font-size:12px; color:var(--ink-dim); white-space:nowrap; margin-left:auto; }
.reg-term.late{ color:#c0453a; font-weight:700; }
.reg-warn{ width:8px; height:8px; border-radius:50%; background:#c0453a; flex:none; }
.reg-chev{ color:var(--ink-dim); transition:transform .15s; flex:none; }
.reg-row[aria-expanded="true"] .reg-chev{ transform:rotate(90deg); }
.reg-detail{ border-top:1px solid var(--border); background:var(--panel-2); padding:12px; }
```

(Refolosește tokenii reali de culoare de fază din temă dacă există — verifică numele în `:root`.)

- [ ] **Step 3: `renderHala` — construiește registrul**

Înlocuiește tot blocul `html += '<div class="canvas-viewport" ...` … `</div> // .canvas-viewport`
cu:

```js
html += '<div class="reg-toolbar">Sortare: ';
html += '<button data-regsort="termen" aria-pressed="' + (state.registrySort !== 'urgenta') + '">după termen</button>';
html += '<button data-regsort="urgenta" aria-pressed="' + (state.registrySort === 'urgenta') + '">după urgență</button>';
html += '</div>';
html += '<div class="reg">' + renderRegistru() + '</div>';
```

Șterge apelurile `attachCanvasEvents()` și `attachCanvasNodeDrag()` din `renderHala`
(rămân `renderTeamSidebar()` și `attachHalaEvents()`).

- [ ] **Step 4: `renderRegistru`** (din `renderHartaPeProiecte`)

```js
function renderRegistru(){
  var list = state.projects.filter(function(p){ return !p.finalizat && matchesSearch(p.cod, p.client); });
  if(state.registrySort === 'urgenta'){
    list.sort(function(a,b){ return (urgencyValue(b) - urgencyValue(a)) || ((a.termen||'9999') < (b.termen||'9999') ? -1 : 1); });
  } else {
    list.sort(function(a,b){ return (a.termen||'9999') < (b.termen||'9999') ? -1 : 1; });
  }
  if(!list.length) return '<div class="empty-state" style="margin:20px;"><p>Niciun proiect activ.</p></div>';
  var out = '';
  list.forEach(function(p){
    out += renderRegRow(p);
    if(registryOpen[p.id]) out += '<div class="reg-detail">(desfășurătorul vine în Task 5–6)</div>';
  });
  return out;
}
```

- [ ] **Step 5: `renderRegRow`**

```js
function renderRegRow(p){
  var stg = currentStageInfo(p);
  var warns = projectWarnings(p);
  var grad = urgencyGradient(p);
  var nP = 0, nE = 0, nM = 0;
  (p.pieces||[]).forEach(function(pc){ var b = bucketFor(p, pc.stationId); if(b==='exec') nE++; else if(b==='montaj') nM++; else nP++; });
  var tot = Math.max(1, nP + nE + nM);
  var late = p.termen && p.termen < todayIso();  // folosește helperul de dată existent
  var h = '<button class="reg-row" data-toggle-reg="' + p.id + '" aria-expanded="' + (!!registryOpen[p.id]) + '">';
  h += '<span class="rr-cod">' + esc(p.cod) + '</span>';
  h += '<span class="rr-cli">' + esc(p.client) + '</span>';
  if(stg) h += '<span class="pct-stage ' + stg.cls + '">' + esc(stg.name) + '</span>';
  h += '<span class="reg-bar" title="' + nP + ' pregătire · ' + nE + ' execuție · ' + nM + ' montaj">'
     + '<i class="pregatire" style="width:' + (100*nP/tot) + '%"></i>'
     + '<i class="exec" style="width:' + (100*nE/tot) + '%"></i>'
     + '<i class="montaj" style="width:' + (100*nM/tot) + '%"></i></span>';
  h += '<span class="reg-count">' + nE + '/' + (nP+nE+nM) + ' exec · ' + nM + ' mtj</span>';
  h += '<span class="reg-term' + (late ? ' late' : '') + '">' + esc(fmtTermen(p.termen)) + (late ? ' ⚠' : '') + '</span>';
  if(warns.length) h += '<span class="reg-warn" title="' + esc(warns.join(' · ')) + '"></span>';
  h += '<span class="reg-chev">▸</span>';
  h += '</button>';
  return h;
}
```

Verifică numele reale ale helperilor de dată (`todayIso`, `fmtTermen`) — adaptează la ce există
în cod (caută `toISOString` / formatare `termen`).

- [ ] **Step 6: Handlerele toolbar + toggle** (în `attachHalaEvents`)

```js
document.querySelectorAll('[data-regsort]').forEach(function(b){
  b.addEventListener('click', function(){
    state.registrySort = b.dataset.regsort;
    saveState(); render();
  });
});
document.querySelectorAll('[data-toggle-reg]').forEach(function(b){
  b.addEventListener('click', function(){
    var id = b.dataset.toggleReg;
    if(registryOpen[id]) delete registryOpen[id]; else registryOpen[id] = true;
    render();
  });
});
```

- [ ] **Step 7: Neutralizează canvas-ul pe moment**

`attachCanvasEvents` / `attachCanvasNodeDrag` — lasă definițiile (se șterg în Task 6), doar nu se
mai apelează. `renderHartaPeProiecte` rămâne definit dar neapelat (se șterge în Task 6).

- [ ] **Step 8: Test**

Injectează seed. Verifică:
1. Câte un rând pentru fiecare din cele 6 proiecte, în ordinea termenului.
2. „după urgență" reordonează; reload → alegerea persistă (`state.registrySort`).
3. Pastila + mini-bara + contoarele arată corect (compară cu baseline).
4. Click pe rând → apare `.reg-detail` „(...)" ; click iar → dispare.
5. Nu mai există zoom / pan / scroll orizontal. Tab-urile Gantt/Comenzi/Reparații/Finalizate
   se randează în continuare.
6. `↶` NU trebuie să apară din simplul toggle (nu cheamă `saveState`); DAR apare după schimbarea
   sortării — accept, e o preferință salvată. (Dacă vrei ca sortarea să nu polueze undo-ul,
   notează-l ca ajustare ulterioară.)

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "Registru: toolbar sortare + rânduri pliate; canvas scos din randare"
```

---

## Task 5: Rândul desfăcut — antet de proiect

**Files:**
- Modify: `index.html` — `renderRegistru` (înlocuiește placeholder-ul `.reg-detail`),
  adaugă `renderRegHead`; `attachHalaEvents` (bind pe controalele din detail).

**Interfaces:**
- Consumes: markup-ul slider-ului de urgență (~L1895–L1899), `renderOrdersPanel` rows,
  `nextProiectStationFor`, `isPostExecStationFor`, `firstProiectAfterLastPiesaFor`,
  `renderAssignedPeople(p.id, MONTAJ_TEAM)`.
- Produces: `renderRegHead(p) -> string` cu `.reg-detail-head`.

- [ ] **Step 1: `renderRegHead`** — portează conținutul non-piese din `renderProjectCard`

Reia din `renderProjectCard` (~L1890–L1958) exact aceste bucăți, fără `.piece-sublist`:
- `.urgency-slider-row` (slider + reset) — copiază markup-ul 1:1 (are `data-project`,
  `data-automin`).
- badge urgență (`urgencyLabel`).
- linia „📋 Materiale N/T · complet|incomplet" — dar fă-o buton `data-toggle-orders="p.id"`.
- sub ea, `<div class="reg-orders" hidden>` + rândurile din `renderOrdersPanel(p)` (extrage
  doar `<div class="side-list">…</div>` + butonul „+ Adaugă comandă", fără `renderSidePanel`).
- „📦 Necesar montaj notat" dacă `p.montajNotes`.
- cutia `<div class="montaj-team" data-montaj-team="p.id">` (copiază din ~L1936–L1942).
- `.card-actions` cu `data-advance` (dacă `nextProiectStationFor`), `data-close-project` (dacă
  `isPostExecStationFor` sau flux fără etape `piesa`), `data-edit`, `data-del` (copiază din
  ~L1943–L1957).

- [ ] **Step 2: `renderRegistru` — folosește antetul**

```js
if(registryOpen[p.id]){
  out += '<div class="reg-detail">' + renderRegHead(p) + '</div>';
}
```

- [ ] **Step 3: Handler toggle comenzi** (în `attachHalaEvents`)

```js
document.querySelectorAll('[data-toggle-orders]').forEach(function(b){
  b.addEventListener('click', function(){
    var box = document.getElementById('reg-orders-' + b.dataset.toggleOrders);
    if(box) box.hidden = !box.hidden;
  });
});
```

(dă id `reg-orders-<pid>` la `<div class="reg-orders">`.)

- [ ] **Step 4: Verifică bind-urile existente**

`attachHalaEvents` conține deja handlere pentru `data-advance`, `data-close-project`, `data-edit`,
`data-del`, slider `urgency-slider`, `urgency-reset`, `data-montaj-team` (drop), și pentru
rândurile de comandă (`data-order-status`, `data-order-edit`, `data-order-del`, `data-order-add`).
Confirmă că `document.querySelectorAll` din ele prinde și elementele din `.reg-detail` (da, sunt
în DOM după `render()`). Dacă vreun handler era atașat doar în `attachCanvasEvents`, mută-l în
`attachHalaEvents`.

- [ ] **Step 5: Test**

1. Desfă `P-exec`. Slider-ul de urgență se mișcă și salvează (`↶` activ). Reset `↺` apare/merge.
2. „📋 Materiale" → deschide rândurile; schimbă starea unei comenzi; adaugă/șterge un rând.
3. „Avansează →" mută proiectul în etapa de proiect următoare; „Editează" deschide modalul;
   „Finalizează ✓" apare la `P-montaj` și mută proiectul în Finalizate.
4. Trage o persoană din sidebar pe cutia „🔧 Echipă montaj" a lui `P-montaj` → se adaugă.
5. `↶` anulează fiecare din 1–4.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Registru: antet de proiect în rândul desfăcut (slider, comenzi, montaj, acțiuni)"
```

---

## Task 6: Rândul desfăcut — pipeline-ul de etape

**Files:**
- Modify: `index.html` — `renderRegHead`/`renderRegistru` (adaugă zona pipeline), CSS
  (`.reg-detail-pipe` overflow).

**Interfaces:**
- Consumes: markup-ul `.proj-cluster-stages` din `renderHartaPeProiecte` (~L1806–L1849),
  `renderPieceCard`, `projectLanesFor`, `renderProjToken`.
- Produces: `renderRegPipe(p) -> string`; `renderProjToken(p) -> string`.

- [ ] **Step 1: `renderProjToken`**

```js
function renderProjToken(p){
  return '<div class="proj-token"><span class="mono">' + esc(p.cod) + '</span> proiect</div>';
}
```

CSS:
```css
.reg-detail-pipe{ display:flex; gap:8px; overflow-x:auto; padding-top:10px; }
.reg-detail-pipe .proj-stage-box{ flex:0 0 150px; }
.proj-token{ display:flex; align-items:center; gap:6px; padding:5px 8px; border-radius:7px; background:var(--panel-3); border:1px dashed var(--ink-dim); font-weight:700; font-size:12px; }
```

- [ ] **Step 2: `renderRegPipe`** — portează `.proj-cluster-stages`

Copiază blocul `out += '<div class="proj-cluster-stages">'; var pStations = stationsFor(p); ...`
din `renderHartaPeProiecte` (~L1806–L1849) într-o funcție `renderRegPipe(p)` care întoarce string.
Schimbări față de original:
- containerul: `<div class="reg-detail-pipe">` în loc de `.proj-cluster-stages`.
- în coloana `proiect`: randează `renderProjToken(p)` dacă `p.stationId === station.id`, **plus**
  piesele parcate acolo (deja adăugate în Task 2 Step 3 — asigură-te că logica e aceeași aici).
- păstrează `.proj-stage-head` cu `‹ › ⊞ ✕`, redenumire, `data-add-stage`.

- [ ] **Step 3: Leagă în detail**

```js
out += '<div class="reg-detail">' + renderRegHead(p) + renderRegPipe(p) + '</div>';
```

- [ ] **Step 4: Verifică handlerele de etapă/lane/drop**

`attachHalaEvents` are deja `col-title`, `lane-title`, `lane-del`, `data-add-stage`, `data-act`
(left/right/addlane/del), și drop-zones pe `.col-body`. Toate prind elementele din
`.reg-detail-pipe` după `render()`. Confirmă că `attachHalaEvents` apelează și partea de drop
(azi drop-zones se leagă în `attachHalaEvents`? verifică — la ~L2629 e într-o funcție; dacă e
`attachHalaEvents`, ok; dacă nu, cheam-o din `renderHala`).

- [ ] **Step 5: Test — regresie completă pe pipeline**

1. `P-lanes`: cele 3 lane-uri apar; piesele pe lane-ul corect; `⊞` adaugă lane; `lane-del` pe
   un lane cu piese → piesele trec pe lane-ul rămas.
2. `‹ ›` reordonează o etapă; `✕` șterge o etapă (piesele ei trec pe fallback); `+ etapă
   execuție` adaugă.
3. Drag piesă „Debitare"→„Sudură"; drag piesă → „Montaj" mută proiectul; drag proiect
   („PRJ::") între etape de proiect; drag persoană pe o piesă.
4. `P-reparatie`: piesa „Reparație balustradă" e vizibilă în coloana „Măsurători" din pipeline;
   `→` o duce în „Debitare"; pastila proiectului rămâne albastră.
5. `↶` anulează fiecare acțiune.
6. Toate cele 6 proiecte: numărul de coloane = `stationsFor(p).length`; fiecare piesă apare
   exact o dată.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Registru: pipeline de etape în rândul desfăcut (drag&drop, lanes, +etapă)"
```

---

## Task 7: Curățare cod mort + test pe date live + STOP înainte de push

**Files:**
- Modify: `index.html` — ștergeri.

- [ ] **Step 1: Șterge `renderProjectCard`** (~L1962 în numerotarea veche) — verifică zero
  referințe: `grep -n "renderProjectCard" index.html` → doar definiția. Șterge. Șterge CSS
  `.piece-sublist`, `.card` dacă nu mai e folosit (verifică).

- [ ] **Step 2: Șterge canvas-ul**
  - funcții: `applyCanvasTransform`, `zoomAtPoint`/wheel handler, `fitToScreen`,
    `attachCanvasEvents`, `attachCanvasNodeDrag`, `updateZoomLabel`.
  - variabile: `canvasZoom`, `canvasPanX`, `canvasPanY`, `canvasStart*`, `nodeDrag*`.
  - constante: `CANVAS_MIN_ZOOM`, `CANVAS_MAX_ZOOM`, orice `CANVAS_*`.
  - CSS: `.canvas-viewport`, `.canvas-content`, `.canvas-zoom-controls`, `.harta-grid`.
  - `renderHartaPeProiecte` — șterge (înlocuit de `renderRegistru`).
  - `grep -nE "canvas|harta-grid|HartaPeProiecte|ganttDrag" index.html` → curat.

- [ ] **Step 3: Șterge checklists (UI, nu datele)**
  - funcții: `renderChecklistCard`, `renderChecklistRow`, `addChecklist`, `findChecklistItem`,
    `checklistById`.
  - handlere: `data-note-*` din `attachHalaEvents`.
  - butoane „+ Listă" din topbar și din empty-state; `empty-add-list`.
  - CSS `.note-*`, `.note-item*`.
  - `normalizeState`: PĂSTREAZĂ `parsed.checklists` (nu-l șterge) — doar `c.x/c.y` se curăță
    (Task 3). Confirmă: `grep -n "checklists" index.html` → rămâne doar în `normalizeState` /
    `defaultState`.

- [ ] **Step 4: Șterge side-panel-ul de comenzi pe margine**
  - dacă `renderOrdersPanel` nu mai e apelat nicăieri (comenzile-s în `renderRegHead` acum),
    șterge-l și `renderSidePanel` DACĂ nu mai e folosit de sidebar-ul din dreapta
    (`grep -n "renderSidePanel" index.html`). Dacă e folosit — lasă-l.
  - CSS `.side-panel.side-left` (păstrează `.side-panel` generic dacă sidebar-ul dreapta îl
    folosește).

- [ ] **Step 5: Test regresie completă** (checklistul din spec §8, toate cele 9 puncte) pe
  seed-ul-fixture. Plus: toate cele 5 tab-uri; căutarea din topbar filtrează registrul;
  empty-state când nu e niciun proiect.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Curățare: șterge renderProjectCard, canvas-ul, UI-ul de checklists"
```

- [ ] **Step 7: Test pe DATE LIVE**

Cere utilizatorului blob-ul real din Firebase (Realtime DB → export JSON al nodului
`workshop-board`). Încarcă-l în `localStorage` pe copia locală. Rulează spec §8 punct 1
(nimic pierdut): fiecare proiect are rând; desfăcut are `stationsFor(p).length` coloane; fiecare
piesă / comandă / persoană atribuită apare o dată; nicio piesă fără stație; pastilele de fază
identice cu ce e live acum (deschide `atelier-moldoveanu.web.app` în paralel pentru comparație).

- [ ] **Step 8: STOP** — raportează utilizatorului rezultatul testului pe date live cu
  screenshot-uri. NU face merge în `main`, NU face push. Așteaptă „ok, dă drumul".

- [ ] **Step 9 (după OK-ul utilizatorului): merge + push**

```bash
git checkout main
git merge --no-ff redesign/registru -m "Registru pliabil: înlocuiește canvas-ul din Hartă atelier"
git push origin main
```

(push-ul pe `main` declanșează deploy-ul GitHub Actions → `atelier-moldoveanu.web.app`.)

---

## Self-Review

**Spec coverage:**
- §3 eliminări → Task 4 (canvas din randare), Task 7 (ștergere efectivă). ✅
- §4 contract „nimic pierdut" → verificat în testele Task 2/5/6 + §8 în Task 7. ✅
- §5.1 container / `registryOpen` la nivel de modul → Task 4 Step 1. ✅
- §5.2 rând pliat → Task 4 Step 5 (`renderRegRow`). ✅
- §5.3 antet + pipeline → Task 5 + Task 6. ✅
- §5.4 comutator sortare + `state.registrySort` → Task 3 + Task 4. ✅
- §6 piese în etape de proiect + fără `null` → Task 2. ✅
- §7 harta modificărilor → acoperită de Task 2–7. ✅
- §8 plan de testare → Task 7 Step 5 + Step 7. ✅
- §9 puncte deschise → rezolvate în „Decizii" de mai sus. ✅

**Placeholder scan:** `bucket` din Task 2 Step 1 e prezentat greșit intenționat, apoi corectat
imediat cu `bucketFor(p, stationId)` — executantul folosește `bucketFor`. Referințele la helperi
de dată (`todayIso`, `fmtTermen`) sunt marcate explicit „verifică numele real în cod". Restul
pașilor au cod concret.

**Type consistency:** `bucketFor(p, stationId)` folosit consecvent în Task 2 și Task 4
(`renderRegRow`). `pieceFlowFor(p)` folosit în Task 2 (renderPieceCard, data-piece-move) cu
aceeași semnătură. `registryOpen` folosit ca obiect-set peste tot (`registryOpen[id] = true` /
`delete registryOpen[id]`). `renderProjToken(p)` definit în Task 6, folosit doar acolo.
