# Tab „Planificare" — Faza 1 · plan de implementare

> **Pentru executanți:** implementare task cu task. Codebase fără framework de
> teste (un singur fișier, fără build) — pasul „scrie testul care pică" se
> înlocuiește cu **Verificare**: server local `:8777`, seed din `_livedata.json`,
> aserții pe DOM + verificare consolă (fără erori). Fiecare task se termină cu un
> commit.

**Scop:** nucleul utilizabil al tab-ului de organizare zilnică — roster,
asamblor pe 3 coloane, rollup Narcis/Gabi, foaia crem, export PDF/Word, jurnal
extins. Fără învățare.

**Arhitectură:** un tab nou frate cu „Hartă atelier" / „Comenzi", randat de
`renderPlanificare()` din `render()`. Date noi pe `state` (`people`, `plans`,
`reminders`) + două câmpuri de proiect, toate completate în `normalizeState`.
Jurnalul rămâne pe nodul separat `-log`, în afara lui `state`.

**Tehnologii:** vanilla ES5-ish (`var`, `function`), un singur IIFE în
`index.html`, CSS în `app.css`. Google Fonts pentru fontul serif al foii. Fără npm.

**Spec:** `docs/organizare-zilnica-design.md` (deciziile în §11).

## Constrângeri globale

- `DATA_VERSION` rămâne **8**. Tot ce e nou se completează în `normalizeState`:
  `typeof x === 'undefined'` guard, **idempotent**, **determinist**, **fără**
  `Date.now()` / `new Date()` / `uid()`.
- Nu se ating: `stableStringify`, sincronizarea live (`.on('value')`, echo
  suppression, `remoteDirty`, `flushRemote`), `saveState`, `noteUndoPoint`,
  undo/redo.
- `state.plans` intră în `state` → o singură acțiune de utilizator = un singur
  `saveState()` = un singur punct de undo.
- Jurnalul (`-log`) NU intră în `state`. `logEvent` e best-effort, nu blochează.
- Cod în stilul din jur: `var`, `function`, fără arrow, fără `const/let`,
  concatenare de string-uri pentru HTML, `esc()` pe tot ce vine din date.
- id-uri runtime: `uid()`. id-uri din migrare / derivare: string determinist
  (`'p-' + slug(nume)`, `'d:' + projectId + ':' + rule`).
- Verificare după fiecare task: `node scratchpad/serve.ps1` rulează deja pe
  `:8777`; în consolă zero erori; reload de 2× nu dublează date.

---

## Task 1 — Model de date: `normalizeState` + pre-seed roster

**Files:**
- Modify: `index.html` — `normalizeState()` (~linia 265–360), lista de constante de sus

**Interfaces:**
- Produces:
  - `state.people: Array<{id, name, active, role, order, awayDates}>`
    — `role ∈ 'atelier'|'coord'|'birou'|'proiectant'`
  - `state.plans: Array<Plan>` (gol la început; formă în Task 3)
  - `state.reminders: Array<string>`
  - `p.adresaMontaj: string`, `p.telClient: string` pe fiecare proiect
  - `function slug(s)` — `s.toLowerCase()` fără diacritice, `[^a-z0-9]+` → `-`
- Consumes: `stationsFor`, `bucketFor` (există)

**Pași:**

1. Adaugă `slug()` lângă `esc()` (funcție pură, fără efecte):

```js
function slug(s){
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[ăâ]/g,'a').replace(/[î]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
```

2. Constantă cu roster-ul implicit (deterministă, ordinea din foi):

```js
var DEFAULT_PEOPLE = [
  { name:'Andrei', role:'atelier' }, { name:'Dic', role:'atelier' },
  { name:'Hadi', role:'atelier' }, { name:'Eugen', role:'atelier' },
  { name:'Alin', role:'atelier' }, { name:'Mihăiță', role:'atelier' },
  { name:'Dorin', role:'atelier' }, { name:'Nea Marian', role:'atelier' },
  { name:'Mircea', role:'atelier' }, { name:'Mihai', role:'atelier' },
  { name:'Vlad', role:'atelier' }, { name:'Bianca', role:'proiectant' },
  { name:'Radian', role:'proiectant' }, { name:'Nick', role:'coord' },
  { name:'Narcis', role:'coord' }, { name:'Gabi', role:'coord' }
];
var DEFAULT_REMINDERS = ['Suflat flexurile la final de zi', 'Sa se respecte ordinea taskurilor!'];
```

3. În `normalizeState(parsed)`, după blocul de `repairs`, adaugă:

```js
if(typeof parsed.people === 'undefined'){
  parsed.people = DEFAULT_PEOPLE.map(function(p, i){
    return { id:'p-'+slug(p.name), name:p.name, active:true, role:p.role, order:i, awayDates:[] };
  });
}
if(!Array.isArray(parsed.people)) parsed.people = [];
parsed.people.forEach(function(p, i){
  if(typeof p.active === 'undefined') p.active = true;
  if(typeof p.role !== 'string') p.role = 'atelier';
  if(typeof p.order !== 'number') p.order = i;
  if(!Array.isArray(p.awayDates)) p.awayDates = [];
});
if(!Array.isArray(parsed.plans)) parsed.plans = [];
if(!Array.isArray(parsed.reminders)) parsed.reminders = DEFAULT_REMINDERS.slice();
```

4. În bucla `parsed.projects.forEach` din `normalizeState`, lângă `montajNotes`:

```js
if(typeof p.adresaMontaj !== 'string') p.adresaMontaj = '';
if(typeof p.telClient !== 'string') p.telClient = '';
```

5. Tăiere `plans` la 30 de zile (idempotent, comparație de string ISO — fără
   `Date`): păstrează intrările cu `date` în top 30 sortat descrescător.

**Verificare:**
- Reîncarcă app-ul cu `localStorage` gol → în consolă:
  `JSON.parse(localStorage['workshop-board']).people.length === 16` după prima
  salvare; `reminders.length === 2`.
- Seed din `_livedata.json`, reload → fiecare proiect are `adresaMontaj:''`,
  `telClient:''`.
- Reload de 2× → `people` nu se dublează, `order` rămâne 0..15.

**Commit:** `feat(plan): model people/plans/reminders + campuri proiect`

---

## Task 2 — Sub-panoul „Angajați" (CRUD roster)

**Files:**
- Modify: `index.html` — funcție nouă `renderRoster()`, handleri; `app.css` — stiluri `.rst-*`

**Interfaces:**
- Consumes: `state.people`, `saveState`, `render`, `uid`
- Produces:
  - `function peopleSorted()` → `state.people.filter(active || includeInactive).sort(order)`
  - `function personById(id)`
  - marker DOM: `<div id="roster-panel">` randat în tab-ul Planificare (Task 3 îl montează)

**Pași:**

1. `peopleSorted(includeInactive)` și `personById(id)` lângă celelalte helper-e de
   proiect.
2. `renderRoster()` → string HTML: listă de rânduri, fiecare cu input de nume
   (`data-person-name="id"`), select de rol (`atelier/proiectant/coord/birou`),
   buton „dezactivează" / „activează" (`data-person-toggle`), buton „șterge"
   (`data-person-del`, cu `confirm()`), mânere de reordonare (drag pe rând,
   `data-person-drag`). Sub listă: input + buton „+ Adaugă".
3. Handleri (delegați pe containerul tab-ului, ca la Comenzi):
   - name `input` → `personById(id).name = val; saveState()` fără re-render (caret)
   - rol `change` → set `role`; `saveState(); render()`
   - toggle → flip `active`; dacă devine inactiv, task-urile lui din planul curent
     merg în `resturi` (vezi Task 4 pentru `moveTasksToResturi(personId, plan)`);
     `saveState(); render()`
   - del → `confirm`, scoate din `state.people`, `saveState(); render()`
   - add → push `{ id:uid(), name:val.trim(), active:true, role:'atelier',
     order: state.people.length, awayDates:[] }`; `saveState(); render()`
   - drag reorder → rescrie `order` pe toți după poziția nouă
4. `moveTasksToResturi` se stub-uiește aici cu `if(typeof moveTasksToResturi==='function')`
   până la Task 4 (sau se implementează Task 4 înainte — ordinea 2↔4 e liberă).

**Verificare:**
- Adaugă „Test Ion" → apare, reload → persistă cu `role:'atelier'`.
- Redenumește, schimbă rol, reload → persistă.
- Dezactivează → dispare din lista activă; reactivează → revine.
- Reordonează prin drag → `order` nou, reload → ordinea ținută.
- Șterge → `confirm`, dispare definitiv.
- Consolă fără erori; un singur punct de undo per acțiune (butonul ↶ se
  activează o dată).

**Commit:** `feat(plan): administrare angajati (CRUD roster)`

---

## Task 3 — Shell-ul tab-ului + navigația pe zile

**Files:**
- Modify: `index.html` — `#tabs` markup, `render()` dispatch, `renderPlanificare()`, `setAddButton`
- Modify: `app.css` — layout `.plan-wrap`, `.plan-cols`, `.plan-col`, `.plan-datebar`

**Interfaces:**
- Produces:
  - `var currentPlanDate` (string ISO, init `isoToday()` + 1 zi = mâine)
  - `function planFor(dateIso)` → obiectul din `state.plans` cu acel `date`,
    creat dacă lipsește: `{ date, tasks:[], resturi:[], edits:{}, finalizedAt:null }`
    (fără push în `state` până nu se scrie efectiv ceva — vezi nota)
  - `function renderPlanificare()` — montează `.plan-wrap` în `#board`
  - `function attachPlanEvents()`
- Consumes: `render`, tab switch handler (~linia 2422)

**Pași:**

1. `#tabs`: `<button data-tab="planificare">Planificare</button>` după „Comenzi".
2. `render()`: `else if(tab === 'planificare') renderPlanificare();`
3. `renderPlanificare()`:
   - `board.innerHTML` = date-bar + `.plan-cols` cu 3 `.plan-col` (stânga
     „Sarcini", mijloc „Oameni" + `#roster-panel` toggle, dreapta „Documentul de
     mâine") — deocamdată stânga/dreapta goale, mijloc = `renderPeopleColumn()`
     stub care listează `peopleSorted()` fără task-uri.
   - date-bar: `‹ azi luni 08.09 → plan pentru marți 09.09 ›`, butoane
     `data-plan-day="prev|next|today"`.
   - apel `attachPlanEvents()` la final.
4. `planFor`: caută în `state.plans`; dacă nu există, întoarce un obiect nou
   **fără** să-l adauge în `state`. Un helper `commitPlan(plan)` îl face push
   în `state.plans` dacă nu e deja acolo — chemat de fiecare mutație (Task 4+).
   Asta evită să umpli `state.plans` cu zile goale doar navigând.
5. `attachPlanEvents()`: handler pe `[data-plan-day]` → mută `currentPlanDate` cu
   `addDays` (prin `parseDate` → `addDays` → format ISO), `render()`.
6. `setAddButton()`: pe tab-ul planificare, ascunde „+ Proiect nou" sau lasă-l
   (decizie: lasă-l, e inofensiv).

**Verificare:**
- Click „Planificare" → 3 coloane, mijloc listează cei 16 oameni în ordine.
- `‹ ›` schimbă data din bară; `azi` revine la mâine.
- Navighează 5 zile înainte și înapoi → `state.plans` rămâne gol (nimic scris).
- Comută pe „Hartă atelier" și înapoi → tab-ul se re-randează curat.

**Commit:** `feat(plan): shell tab Planificare + navigatie zile`

---

## Task 4 — Coloana mijloc: oameni + sarcini manuale

**Files:**
- Modify: `index.html` — `renderPeopleColumn()`, task CRUD, drag reorder; `app.css` — `.ptask`, `.pcol-person`

**Interfaces:**
- Produces:
  - `function planTaskAdd(plan, personId, text, source, extra)` → push
    `{ id:uid(), text, personId, projectId:extra&&extra.projectId||null, order:<max+1>,
      done:false, doneAt:null, source:source||'manual', carriedFrom:null }`;
    `commitPlan(plan)`
  - `function planTasksFor(plan, personId)` → filtrate + sortate pe `order`
  - `function moveTasksToResturi(personId, plan)` (folosit de Task 2)
  - `function reorderPlanTasks(plan, personId, idOrder[])`
- Consumes: `planFor`, `commitPlan`, `peopleSorted`, `saveState`

**Pași:**

1. `renderPeopleColumn(plan)`: pentru fiecare `peopleSorted()` → un bloc
   `.pcol-person` cu numele + rolul + lista `planTasksFor(plan, p.id)` randată ca
   `.ptask` (text editabil inline `data-ptask-text`, buton șterge
   `data-ptask-del`, `draggable` pentru reordonare `data-ptask-drag="id"`),
   apoi un input `data-ptask-new="personId"` + enter → `planTaskAdd`.
2. Handleri delegați în `attachPlanEvents`:
   - `data-ptask-new` keydown Enter → `planTaskAdd(planFor(currentPlanDate), personId, val, 'manual')`; `saveState(); render()`
   - `data-ptask-text` input → set `.text`, `saveState()` fără re-render
   - `data-ptask-del` → scoate din `plan.tasks`, `saveState(); render()`
   - drag&drop între/în `.pcol-person` → recalculează `personId` + `order` pe
     lista țintă; `saveState(); render()`. Refolosește tiparul din pipeline
     (`dragstart` pune `setData('text/plain', 'PT::'+id)`, `drop` pe `.pcol-person`
     citește `data-person`).
3. `moveTasksToResturi(personId, plan)`: mută textul task-urilor în
   `plan.resturi` (`{id:uid(), text, order}`), le scoate din `plan.tasks`.

**Verificare:**
- Scrie „Sudat Windfang" la Andrei → apare; reload → persistă pe `plan` cu
  `date` = mâine.
- Reordonează 3 task-uri la o persoană → `order` nou; reload → ordinea ținută.
- Trage un task de la Andrei la Dic → `personId` schimbat.
- Editează textul unui task, fără re-render, caretul rămâne.
- Șterge un task. Un singur undo per acțiune.

**Commit:** `feat(plan): coloana oameni + sarcini manuale + reordonare`

---

## Task 5 — Coloana stânga: generatoare de sarcini derivate

**Files:**
- Modify: `index.html` — `deriveTasks()`, `renderDerivedColumn()`, drop-to-assign; `app.css` — `.dcard`

**Interfaces:**
- Produces:
  - `function deriveTasks(state, dateIso)` → `Array<{id, text, hint, projectId, suggestPersonRole}>`
    cu `id = 'd:'+projectId+':'+rule`
  - `function assignDerived(card, personId)` → dacă nu există deja task cu
    `plan.tasks[].id === card.id`, `planTaskAdd(plan, personId, card.text, 'derived', {projectId})`
    cu `id` forțat la `card.id` (nu `uid()`)
- Consumes: `currentStageInfo`, `bucketFor`, `projectWarnings`, `stationsFor`,
  `daysBetween`, `parseDate`

**Pași:**

1. `deriveTasks(state, dateIso)` — pentru fiecare `p` din `state.projects` cu
   `!p.finalizat`, aplică regulile (fiecare = funcție mică ce întoarce un card sau
   `null`):
   - **sudură blocată:** are piese în bucket `exec` pe stația „Debitare"* și
     niciuna mai departe → `'Sudat ' + p.cod + ' ' + p.client`
   - **gata de montaj:** `currentStageInfo(p).cls === 'phase-montaj'` și toate
     comenzile `primit` → `'Montaj ' + p.cod + (p.adresaMontaj ? ' — ' + p.adresaMontaj : '') + ralHint(p)`
   - **debitare de făcut:** există piese `pregatire` alături de piese pornite →
     `'Debitat ' + p.cod + ' (' + nPre + ' piese neîncepute)'`
   - **scos de execuție:** proiect la `proiectare` (`currentStageInfo` cls
     `phase-proiect`) și `(p.pieces||[]).length === 0` → `'Scos de execuție ' + p.cod`,
     `suggestPersonRole:'proiectant'`
   - **comandă neprimită:** `projectWarnings(p)` conține „comandă neprimită" →
     `'Urmărit comandă ' + p.cod`, `suggestPersonRole:'coord'` (Gabi)
   - **întârziat:** `p.termen` trecut și nu la montaj → `'⚠ ' + p.cod + ' întârziat ' + N + 'z'`, role `coord` (Nick)

   *„Debitare"/„Sudură" se identifică după `station.name` (case-insensitive,
   `indexOf`), nu după id — id-urile diferă per proiect.

2. `renderDerivedColumn(plan)`: cardurile din `deriveTasks` care **nu** au deja
   un task cu acel `id` în `plan.tasks`. Fiecare `.dcard` e `draggable`
   (`dragstart` → `setData('text/plain', 'DC::'+id)`), arată textul + `hint`.
3. `drop` pe `.pcol-person` acceptă și `DC::` → găsește cardul în
   `deriveTasks(...)`, `assignDerived(card, personId)`; `saveState(); render()`.
   Cardul dispare din stânga (nu se mai regenerează cât timp task-ul lipit
   există).

**Verificare:**
- Seed `_livedata.json`. Coloana stânga arată carduri pentru proiectele în
  starea potrivită (verifică 2-3 manual: 0009 la proiectare fără piese →
  „Scos de execuție 0009"; 0007 cu piese la montaj → „Montaj 0007 …").
- Trage „Montaj 0007" pe Eugen → apare la Eugen cu `source:'derived'`,
  `id` începe cu `d:`; dispare din stânga; reload → rămâne lipit.
- Nu apar dubluri la re-render.

**Commit:** `feat(plan): sarcini derivate din starea proiectelor + drop-to-assign`

---

## Task 6 — Rollup Narcis & Gabi

**Files:**
- Modify: `index.html` — `deriveNarcisTasks()`, `deriveGabiTasks()`, integrare în coloana oameni; `app.css` — `.pcol-person.coord`

**Interfaces:**
- Produces:
  - `function deriveNarcisTasks(state, dateIso)` → `Array<{id, text}>`, `id = 'd:narcis:'+key`
  - `function deriveGabiTasks(state, dateIso)` → idem, `id = 'd:gabi:'+key`
- Consumes: `allNeeds`, `supplierById`, `nextDeliveryFor`* (helper existent pentru
  `deliveryDay` — vezi ~linia 770), `state.projects`, `p.adresaMontaj`, `p.telClient`

**Pași:**

1. `deriveNarcisTasks`:
   - montajele planificate mâine (proiecte `phase-montaj` gata) cu
     `p.adresaMontaj` → `'Dus ' + p.cod + ' la ' + p.adresaMontaj + (p.telClient ? ' · ' + p.telClient : '')`
   - furnizori cu livrare mâine (`deliveryDay` = ziua lui `dateIso`) și comenzi
     deschise la ei → `'Luat de la ' + supplier.name`
2. `deriveGabiTasks`:
   - `allNeeds()` cu status „de comandat" grupate pe furnizor →
     `'Comandat ' + n + ' poziții — ' + supplierName`
   - comenzi trimise care sosesc mâine → `'Recepție ' + supplierName`
3. În `renderPeopleColumn`, pentru Narcis și Gabi (`role === 'coord'` + nume):
   randează întâi cardurile derivate (needrag, dar cu buton „scoate" =
   creează un task manual „ascuns"? — nu; păstrează simplu: derivatele sunt
   informative, cele manuale se adaugă în inputul obișnuit), apoi lista de
   task-uri manuale (`planTasksFor`), apoi inputul liber.
   - „lipirea" derivatelor: la fel ca Task 5 — dacă Nick le confirmă (click →
     `assignDerived` cu `personId` = al lui Narcis/Gabi), devin task-uri normale
     pe plan și ies din lista informativă.
4. Regenerarea nu atinge task-urile deja lipite (match pe `id`).

**Verificare:**
- Setează `adresaMontaj` pe 0007 (Task 9 aduce câmpul; până atunci setează din
  consolă pe seed). Coloana Narcis arată „Dus 0007 la …".
- Un furnizor cu `deliveryDay` = mâine + comenzi deschise → „Luat de la …".
- Gabi arată „Comandat N poziții — …" din `allNeeds()`.
- Click pe un card derivat → devine task pe plan; reload → rămâne.

**Commit:** `feat(plan): rollup automat Narcis (drumuri) + Gabi (comenzi)`

---

## Task 7 — Coloana dreapta: foaia crem + randare live

**Files:**
- Modify: `index.html` — `<head>` (Google Font), `renderOrgSheet()`; `app.css` — `.org-sheet` și copiii

**Interfaces:**
- Produces:
  - `function renderOrgSheet(plan)` → HTML-ul foii
  - `function orgSheetText(plan)` → versiune text simplu (pentru Task 8 „Copiază")
  - marker: `<div id="org-sheet">` în coloana dreaptă
- Consumes: `state.reminders`, `peopleSorted`, `planTasksFor`, `plan.resturi`,
  `plan.edits`

**Pași:**

1. `<head>`: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap">`.
2. `.org-sheet` CSS: fundal `--paper:#f4f1ea`, text `--paper-ink:#202226`,
   `font-family:'Newsreader',Georgia,serif`, lățime ~600px, centrat, umbră.
   Definește `--paper*` în `:root` din `app.css`.
3. `renderOrgSheet(plan)`:
   - antet centrat „ORGANIZARE" + `state.reminders` (câte un rând italic)
   - `hr`
   - pentru fiecare `peopleSorted()` cu ≥1 task în plan: `<div class="os-who">Nume</div>`
     + `<ul>` cu task-urile în ordine; fiecare `<li contenteditable data-os-line="taskId">`.
   - la final: `Resturi:` + `plan.resturi` ca listă.
   - dacă `plan.edits[taskId]` există, folosește textul editat în loc de `task.text`.
4. Handler `data-os-line` `input` → `plan.edits[id] = el.textContent`; `saveState()`
   fără re-render (caret). „Reset editări" mic buton care golește `plan.edits`.
5. `orgSheetText(plan)` — aceleași date, format text (`  • ` bullets, ca foaia de
   hârtie).

**Verificare:**
- Repartizează 4-5 task-uri la 3 oameni → foaia arată blocurile în ordinea
  roster-ului, task-urile în ordinea lor.
- Editează o linie pe foaie → `plan.edits` primește cheia; reload → textul editat
  persistă; task-ul original în coloana mijloc e neschimbat.
- `Resturi` apare când `plan.resturi` are ceva.
- Fonturile serif se încarcă (nu fallback brut).

**Commit:** `feat(plan): foaia crem ORGANIZARE, randare live + editare pe linii`

---

## Task 8 — Export: PDF (print), Word (.doc), Copiază, Finalizează ziua

**Files:**
- Modify: `index.html` — butoane + handleri; `app.css` — `@media print`

**Interfaces:**
- Consumes: `renderOrgSheet`, `orgSheetText`, `planFor`, `commitPlan`, `saveState`, `logEvent`
- Produces: `function finalizeDay(dateIso)`

**Pași:**

1. `@media print` în `app.css`: ascunde `.topbar`, coloanele stânga/mijloc,
   restul chrome-ului; arată doar `#org-sheet` la lățime plină, fără umbră,
   `color-adjust:exact` pentru fundalul crem. `body{ background:#fff }` la print.
2. Butoane sub foaie:
   - **Descarcă PDF** → `window.print()`.
   - **Descarcă pentru Word** → construiește un string HTML complet
     (`<html><head><meta charset><style>…serif, crem…</style></head><body>` +
     `renderOrgSheet` fără atribute `contenteditable`/`data-*`), `Blob`
     `type:'application/msword'`, `URL.createObjectURL`, `<a download="ORGANIZARE-<data>.doc">`
     declanșat programatic, apoi `revokeObjectURL`.
   - **Copiază** → `navigator.clipboard.writeText(orgSheetText(plan))` cu fallback
     `document.execCommand('copy')` pe un `<textarea>` temporar; toast.
3. **Finalizează ziua** → `finalizeDay(currentPlanDate)`:
   - `plan.finalizedAt = new Date().toISOString()` (aici `new Date` e ok — nu e
     migrare)
   - `commitPlan(plan)`
   - `logEvent('plan-finalizat', dateIso, { date: dateIso, tasks: plan.tasks.length })`
   - curăță nodul `-log` (Task 11 aduce `pruneLog()`; până atunci `if(typeof pruneLog==='function') pruneLog()`)
   - `saveState()`; mută `currentPlanDate` pe ziua următoare; `render()`
   - Faza 1: fără carryover (vine în Faza 2). Doar stampilează + trece la ziua nouă.

**Verificare:**
- „Descarcă PDF" → preview de print arată **doar** foaia crem, fără bara de sus,
  fără coloanele de lucru; fontul serif păstrat.
- „Descarcă pentru Word" → se descarcă `ORGANIZARE-2026-09-09.doc`; deschis în
  Word/LibreOffice arată blocurile pe oameni, editabil.
- „Copiază" → textul e în clipboard, în stil listă.
- „Finalizează ziua" → `plan.finalizedAt` setat, `currentPlanDate` avansează,
  intrare `plan-finalizat` în nodul `-log`.

**Commit:** `feat(plan): export PDF/Word/text + finalizare zi`

---

## Task 9 — Câmpuri proiect: adresă montaj + telefon client

**Files:**
- Modify: `index.html` — `openProjectModal` (~linia 2298) + salvarea (~2354)

**Interfaces:**
- Consumes: `p.adresaMontaj`, `p.telClient` (există din Task 1)

**Pași:**

1. În `openProjectModal`, sub câmpul „Necesar montaj":

```js
html += '<div class="field-row"><div class="field"><label>Adresă montaj</label><input id="f-adresa-montaj" value="'+esc(editing?(proj.adresaMontaj||''):'')+'" placeholder="stradă, nr., bl., localitate"></div>';
html += '<div class="field"><label>Telefon client</label><input id="f-tel-client" value="'+esc(editing?(proj.telClient||''):'')+'" placeholder="07..."></div></div>';
```

2. La salvare, lângă `montajNotes`:

```js
var adresaMontaj = document.getElementById('f-adresa-montaj').value.trim();
var telClient = document.getElementById('f-tel-client').value.trim();
```

3. Setează pe `proj` (editare) și include în obiectul de proiect nou.

**Verificare:**
- Editează 0007, pune adresă + telefon, salvează, reload → persistă.
- Proiect nou cu ambele → persistă.
- Coloana Narcis (Task 6) preia adresa pentru cardul „Dus …".

**Commit:** `feat(plan): camp adresa montaj + telefon client pe proiect`

---

## Task 10 — Setări: reminder-e editabile

**Files:**
- Modify: `index.html` — un mic panou de setări (buton ⚙ în date-bar-ul tab-ului
  Planificare) → `renderReminderSettings()`; `app.css` — `.rem-set`

**Interfaces:**
- Consumes: `state.reminders`, `saveState`, `render`

**Pași:**

1. Buton `data-plan-settings` în date-bar → toggle `planSettingsOpen` (module var).
2. `renderReminderSettings()`: listă de inputuri `data-reminder="idx"` + buton
   șterge pe fiecare + „+ Adaugă rând".
3. Handleri: input → `state.reminders[idx] = val`, `saveState()` fără re-render;
   del → `splice`, `saveState(); render()`; add → `push('')`, `render()`.
4. Gol permis; rândurile goale nu se randează pe foaie.

**Verificare:**
- Adaugă „Închis buteliile" → apare pe foaia crem sub celelalte.
- Editează un rând → se reflectă pe foaie; reload → persistă.
- Șterge un rând → dispare de pe foaie.

**Commit:** `feat(plan): reminder-e editabile din setarile tab-ului`

---

## Task 11 — Extinderea jurnalului de evenimente

**Files:**
- Modify: `index.html` — `logEvent` (linia 185), apeluri noi, `fetchLog`, `pruneLog`

**Interfaces:**
- Produces:
  - `logEvent(type, text, data)` — al treilea argument opțional, obiect;
    payload devine `{ ts, type, text, data: data || null }`
  - `function fetchLog(sinceDays)` → `Promise<Array<entry>>` (GET pe `logUrl()`,
    obiect Firebase → array, filtrat pe `ts >= acum - sinceDays`)
  - `function pruneLog()` — GET, dacă > 3000 intrări sau mai vechi de 90 zile,
    `PUT` înapoi doar coada; best-effort, prins în `catch`
- Consumes: `logUrl`, `withAuth`, `hasFirebase`

**Pași:**

1. Semnătură nouă `logEvent(type, text, data)` — compatibilă înapoi (apelurile
   vechi cu 2 argumente merg mai departe).
2. Apeluri noi la punctele de tranziție:
   - drop piesă (handlerul `PC::` din pipeline): `logEvent('piesa-mutata', p.cod+' · '+pc.name, {projectId:p.id, pieceId:pc.id, to: zone.dataset.station})`
   - drop proiect (`PRJ::`): `logEvent('etapa-schimbata', p.cod, {projectId:p.id, to: zone.dataset.station})`
   - schimbare stare comandă (`data-order-status` handler): `logEvent('comanda-stare', ..., {projectId, from, to})`
   - adăugare reparație / ciclare stare: `logEvent('reparatie-adaugata'|'reparatie-stare', ...)`
   - `plan-finalizat` (din Task 8, deja)
3. `fetchLog(sinceDays)` + `pruneLog()` conform interfeței. `pruneLog()` chemat
   din `finalizeDay`.
4. Fără schimbări în `state` — totul pe nodul `-log`.

**Verificare:**
- Mută o piesă în pipeline → GET pe
  `<db>/workshop-board-log.json` conține o intrare `piesa-mutata` cu `data.projectId`.
- Schimbă starea unei comenzi → intrare `comanda-stare` cu `from`/`to`.
- `fetchLog(7)` în consolă întoarce un array cu intrările recente.
- Apelurile vechi (`logEvent('finalizat', ...)`) încă merg.

**Commit:** `feat(plan): jurnal de evenimente structurat + fetchLog/pruneLog`

---

## Auto-review (după plan, înainte de execuție)

- **Placeholder scan:** fără „TBD"/„TODO" — toate regulile din Task 5 sunt
  enumerate; codul de migrare din Task 1 e complet.
- **Consistență tipuri:** `plan` are aceeași formă în Task 3 (`planFor`), Task 4
  (`planTaskAdd`), Task 7 (`renderOrgSheet`), Task 8 (`finalizeDay`). `task` are
  aceleași câmpuri peste tot (`id, text, personId, projectId, order, done,
  doneAt, source, carriedFrom`). id derivat `d:...` folosit identic în Task 5 și 6.
- **Ordine:** Task 2 și 4 au dependență circulară moale (`moveTasksToResturi`) —
  rezolvată cu guard `typeof === 'function'`; se pot face în orice ordine, dar
  recomandat 4 înainte de 2.
- **Scop:** fiecare task are Verificare proprie în browser; niciunul nu atinge
  sync/undo/`stableStringify`.
- **Risc de urmărit la execuție:** `state.plans` crește cu istoricul — tăierea la
  30 de zile (Task 1) trebuie testată explicit; drag&drop-ul de task-uri
  refoloseşte tiparul deferat din pipeline (`setTimeout(0)` la adăugarea clasei
  care schimbă layout-ul) ca să nu rupă drag-ul.

## Execuție

După ce planul e aprobat: **subagent-driven** — un implementer per task, review
între taskuri, ca la tab-ul Comenzi. Fișierele `index.html` / `app.css` se
editează de un singur agent la un moment dat (arbore git partajat).
