# „Management atelier" + „Notițe Nick" — research & design

**Autor:** Nick (manager de atelier) + Claude
**Data:** 2026-09-09
**Stare:** research/design — decizii de luat la final (secțiunea 8)
**Frate cu:** `docs/organizare-zilnica-design.md` (tab „Planificare") și planul lui de Faza 1.

---

## 1. De ce

Nick cere două lucruri distincte, amândouă „ca să nu uit de ele":

1. **Mentenanța atelierului însuși** — mașini și scule (flexuri, laser CNC, abkant,
   fierăstrău, aparate de sudură), clădirea, consumabile/scule de inventariat
   („făcut listă șuruburi și scule și trolee"), corvezi recurente („suflat flexurile
   la final de zi", curățenie, „eliberat camera resturi metale") și reparații
   punctuale ale atelierului („dus la reparat flex — Proenerg", „peretele cu șuruburi
   de sub birou"). Nimic din asta nu e legat de un proiect de client.

2. **O listă personală de captură rapidă** pentru Nick — unde notează într-o linie
   ce-i pică peste zi, fără proiect, mereu la îndemână, promovabil într-un plan sau
   aruncat.

**Nu e** același lucru cu `state.repairs` (reparații la produse deja livrate, legate
de `projectId`, cu `client` și `pieceIds`, randate în firul din registru). Acelea au
alt ciclu de viață (garanție/refacere, față în față cu clientul). Ce urmează stă în
chei noi, separate, ca `repairs` să nu se atingă.

Din cele 6 foi ORGANIZARE reale se văd tiparele:
- Corvezi fixe în capul foii: „Suflat flexurile la final de zi", „Sa se respecte
  ordinea taskurilor!" (deja modelate ca `state.reminders`, §4.5 din doc-ul frate).
- Corvezi recurente cu proprietar: Vlad — curățenie alamă, „șuruburile de sub birou",
  „eliberat camera resturi metale" (apare marți **și** miercuri — periodic).
- Reparații atelier care se repetă zile la rând: „Dus la reparat flex — Proenerg"
  (marți 01.09 **și** joi 03.09 — nefinalizat, se târăște).
- One-off Nick: „Făcut listă șuruburi și scule și trolee" (pe **fiecare** foaie),
  „Fundamentat aplicație", „Organizat săpt asta și cealaltă".
- „Resturi" — backlog remarcabil de stabil: „Usa Traian 83-75", „Caseta Unteatru —
  Refurbish?" apar identice pe 6 foi consecutive. E o listă permanentă proiectată pe
  fiecare foaie, nu un rest al zilei respective.

## 2. Scop și ne-scop

**În scop:**
- `state.upkeep` — registru de mentenanță atelier (recurente + one-off + reparații
  atelier), cu proprietar sugerat și stare „făcut / următoarea scadență".
- Evaluarea recurenței **fără cron**, deterministă, la render, din `lastDoneDate` +
  interval.
- Un tab nou „Atelier" pentru administrarea listei.
- `deriveUpkeepTasks(state, date)` — elementele scadente devin carduri candidat în
  coloana stângă a asamblorului din „Planificare", exact ca și cardurile derivate din
  proiecte.
- `state.notite` — inbox-ul personal al lui Nick, cu adăugare într-o tastă, mereu
  accesibil dintr-un buton din bara de sus, promovabil în `plan.tasks`.
- Extinderea `logEvent` cu verbe noi (`upkeep-*`, `notita-*`).

**Ne-scop:**
- Telemetrie reală de la mașini (ore-mașină vin manual, dacă vin — vezi §7.1).
- Un motor de recurență cu semantică de calendar (RRULE, „ultima vineri din lună",
  DST). Patru cazuri simple ajung.
- Fuziunea cu `state.repairs` sau cu `state.reminders`.
- Management de personal (stă în `state.people`, deja proiectat în doc-ul frate).

---

## 3. Feature 1 — „Management atelier"

### 3.1 Model de date — `state.upkeep`

`DATA_VERSION` rămâne **8**. Cheie nouă, completată în `normalizeState` (idempotent,
determinist, fără `Date.now()` / `new Date()`).

```
state.upkeep : Array<UpkeepItem>
state.upkeepSeeded : true            // gardă anti-reseed (vezi 3.2)

UpkeepItem = {
  id,                   // 'u-' + slug(title) la seed; uid() la adăugare runtime
  title,                // etichetă scurtă: „Suflat flexurile"
  note,                 // detaliu / instrucțiuni, opțional
  kind,                 // 'masina' | 'scula' | 'cladire' | 'consumabile' | 'chore' | 'reparatie'
  asset,                // text liber de grupare: „laser CNC", „abkant", „flex #3" — opțional
  recur: {
    type,               // 'none' | 'zile' | 'sapt' | 'ore-masina'
    every,              // int ≥ 1 — la N zile / la N săptămâni / la N ore-mașină
    weekday             // 0..6 (0=duminică) când type==='sapt' și e zi fixă; null altfel
  },
  personId,             // proprietar sugerat (doar sugestie) — null = nealocat
  skill,                // vocabular ca la people.skills: 'curatenie','abkant','laser',…
  active,               // true; false = ascuns din generatoare, păstrat pentru istoric
  order,                // int, sortare manuală în listă
  lastDoneDate,         // 'YYYY-MM-DD' — setat la „bifează făcut"; motorul de recurență citește de aici
  lastDoneHours,        // citirea de ore-mașină la ultima bifare (doar 'ore-masina')
  hours,                // citirea curentă de ore-mașină, incrementată manual (doar 'ore-masina')
  snoozeUntil,          // 'YYYY-MM-DD' — „nu acum, amână" → suprimat până la data asta
  createdAt,            // ISO, doar la adăugare runtime (nu în normalizeState)
  doneAt,               // ISO al ultimei finalizări
  archived              // true doar pentru one-off (type==='none') terminate; recurentele nu se arhivează
}
```

Note de proiectare:
- `kind` = grupare grosieră pentru filtrele din UI. `skill` = fin, folosit de
  asamblor ca să sugereze cine primește cardul. `asset` = doar text, pentru gruparea
  „card de mașină" într-o fază ulterioară.
- Un element **recurent** nu se șterge când e făcut — își mută `lastDoneDate` înainte
  și reintră în calcul. Un **one-off** (`recur.type==='none'`) când e făcut primește
  `doneAt` + `archived:true` și dispare din lista activă.
- Reparațiile atelierului sunt tot `UpkeepItem` cu `kind:'reparatie'`, de obicei
  `recur.type:'none'`. Pot avea o stare `deschisă / în lucru / rezolvată` (vezi
  întrebarea 7) — dacă da, se ține în `note` un prefix sau se adaugă un câmp
  `repState`. Recomandare: doar `open/done` (arhivare), fără a treia stare, ca să
  rămână simplu; a treia stare există deja unde chiar contează (reparații de proiect).

### 3.2 `normalizeState` — backfill (idempotent, determinist)

Constantă cu seed-ul (deterministă; intervale prudente, de calibrat cu Nick — §8.4):

```js
var DEFAULT_UPKEEP = [
  { id:'u-suflat-flexuri',        title:'Suflat flexurile',                         kind:'chore',       recur:{type:'zile', every:1},               skill:'curatenie' },
  { id:'u-ordine-atelier',        title:'Făcut ordine / măturat atelier',            kind:'chore',       recur:{type:'zile', every:1},               skill:'curatenie' },
  { id:'u-camera-resturi',        title:'Eliberat camera resturi metale',           kind:'chore',       recur:{type:'sapt', every:1, weekday:5},    skill:'curatenie' },
  { id:'u-discuri-cabluri-flex',  title:'Verificat discuri și cabluri flexuri',     kind:'scula',       recur:{type:'zile', every:30} },
  { id:'u-ulei-abkant',           title:'Verificat nivel ulei abkant',              kind:'masina', asset:'abkant',   recur:{type:'zile', every:30}, skill:'abkant' },
  { id:'u-filtru-laser',          title:'Curățat filtru / lentilă laser CNC',       kind:'masina', asset:'laser CNC', recur:{type:'zile', every:30}, skill:'laser' },
  { id:'u-butelii-sudura',        title:'Verificat butelii / regulatoare sudură',   kind:'masina', asset:'sudură',   recur:{type:'zile', every:14}, skill:'sudura' },
  { id:'u-lista-suruburi-scule',  title:'Făcut listă șuruburi, scule și trolee',    kind:'consumabile', recur:{type:'none'} }
];
```

`slug()` există deja în planul Faza-1 (task 1); dacă nu e încă adăugat, îl aduce
prima implementare care are nevoie.

În `normalizeState(parsed)`, după blocul `repairs` / înainte de `checklists`:

```js
if(!parsed.upkeepSeeded && typeof parsed.upkeep === 'undefined'){
  parsed.upkeep = DEFAULT_UPKEEP.map(function(u, i){
    return { id:u.id, title:u.title, note:'', kind:u.kind||'chore', asset:u.asset||'',
      recur:{ type:(u.recur&&u.recur.type)||'none', every:(u.recur&&u.recur.every)||1,
              weekday:(u.recur&&typeof u.recur.weekday==='number')?u.recur.weekday:null },
      personId:null, skill:u.skill||'', active:true, order:i,
      lastDoneDate:null, lastDoneHours:null, hours:null, snoozeUntil:null,
      createdAt:null, doneAt:null, archived:false };
  });
  parsed.upkeepSeeded = true;
}
if(typeof parsed.upkeepSeeded === 'undefined') parsed.upkeepSeeded = Array.isArray(parsed.upkeep);
if(!Array.isArray(parsed.upkeep)) parsed.upkeep = [];
parsed.upkeep.forEach(function(u, i){
  if(typeof u.title !== 'string') u.title = '';
  if(typeof u.note  !== 'string') u.note = '';
  if(typeof u.kind  !== 'string') u.kind = 'chore';
  if(typeof u.asset !== 'string') u.asset = '';
  if(!u.recur || typeof u.recur !== 'object') u.recur = { type:'none', every:1, weekday:null };
  if(typeof u.recur.type !== 'string') u.recur.type = 'none';
  if(typeof u.recur.every !== 'number' || u.recur.every < 1) u.recur.every = 1;
  if(typeof u.recur.weekday !== 'number') u.recur.weekday = null;
  if(typeof u.personId === 'undefined') u.personId = null;
  if(typeof u.skill !== 'string') u.skill = '';
  if(typeof u.active === 'undefined') u.active = true;
  if(typeof u.order !== 'number') u.order = i;
  if(typeof u.lastDoneDate  === 'undefined') u.lastDoneDate = null;
  if(typeof u.lastDoneHours === 'undefined') u.lastDoneHours = null;
  if(typeof u.hours         === 'undefined') u.hours = null;
  if(typeof u.snoozeUntil   === 'undefined') u.snoozeUntil = null;
  if(typeof u.createdAt     === 'undefined') u.createdAt = null;
  if(typeof u.doneAt        === 'undefined') u.doneAt = null;
  if(typeof u.archived      === 'undefined') u.archived = false;
});
```

**De ce `upkeepSeeded`:** Firebase RTDB curăță array-urile goale la salvare, deci
`parsed.upkeep` poate reveni `undefined` chiar dacă a existat. Fără gardă, seed-ul
s-ar re-injecta la fiecare snapshot dacă Nick a șters toate elementele. Flag-ul
boolean `true` **nu** e curățat de RTDB (doar `null` / obiecte goale / array-uri
goale sunt), deci ține. Același tipar se poate folosi și retroactiv pentru alte
seed-uri dacă apare nevoia.

Idempotent: toate gărzile sunt `typeof === 'undefined'`; seed-ul rulează o singură
dată; niciun `Date`.

### 3.3 Recurență fără cron — `upkeepDue(item, iso)`

Funcție **pură**, evaluată la render cu `iso = currentPlanDate` (sau `isoToday()` în
tab-ul Atelier). Nu se cheamă din `normalizeState`.

| Ce vrea Nick | `recur` | „scadent pe `iso`" dacă |
|---|---|---|
| în fiecare zi | `{type:'zile', every:1}` | `!lastDoneDate` sau `daysBetween(lastDoneDate, iso) >= 1` |
| la 30 de zile | `{type:'zile', every:30}` | `!lastDoneDate` sau `daysBetween(lastDoneDate, iso) >= 30` |
| în fiecare vineri | `{type:'sapt', every:1, weekday:5}` | `weekday(iso)===5` **și** (`!lastDoneDate` sau `lastDoneDate < weekStartIso(iso)`) |
| o dată pe săptămână, orice zi | `{type:'sapt', every:1, weekday:null}` | `!lastDoneDate` sau `daysBetween(lastDoneDate, iso) >= 7` |
| după N ore-mașină | `{type:'ore-masina', every:N}` | `lastDoneHours!=null && hours!=null && (hours - lastDoneHours) >= N` (altfel nescadent) |
| one-off | `{type:'none'}` | `!archived && !doneAt` |

```js
function pad2(n){ return (n<10?'0':'')+n; }
function weekStartIso(iso){                 // luni ca început de săptămână ISO
  var d = parseDate(iso); if(!d) return iso;
  var dow = d.getDay();                      // 0=dum..6=sâm
  var m = addDays(d, -(dow===0 ? 6 : dow-1));
  return m.getFullYear()+'-'+pad2(m.getMonth()+1)+'-'+pad2(m.getDate());
}
function upkeepDue(item, iso){
  if(!item.active) return false;
  if(item.snoozeUntil && iso < item.snoozeUntil) return false;
  var r = item.recur || { type:'none' };
  if(r.type === 'none')  return !item.archived && !item.doneAt;
  if(r.type === 'zile'){
    if(!item.lastDoneDate) return true;
    return daysBetween(parseDate(item.lastDoneDate), parseDate(iso)) >= (r.every || 1);
  }
  if(r.type === 'sapt'){
    if(typeof r.weekday === 'number'){
      if(parseDate(iso).getDay() !== r.weekday) return false;
      return !item.lastDoneDate || item.lastDoneDate < weekStartIso(iso);
    }
    if(!item.lastDoneDate) return true;
    return daysBetween(parseDate(item.lastDoneDate), parseDate(iso)) >= 7 * (r.every || 1);
  }
  if(r.type === 'ore-masina'){
    if(item.lastDoneHours == null || item.hours == null) return false;
    return (item.hours - item.lastDoneHours) >= (r.every || 1);
  }
  return false;
}
function upkeepOverdueDays(item, iso){       // pentru badge-ul „restant Nz"
  if(!item.lastDoneDate) return 0;
  var r = item.recur || {};
  if(r.type !== 'zile' && r.type !== 'sapt') return 0;
  var interval = r.type === 'sapt' ? 7*(r.every||1) : (r.every||1);
  return Math.max(0, daysBetween(parseDate(item.lastDoneDate), parseDate(iso)) - interval);
}
```

Determinist: depinde doar de `item` + `iso`. Compatibil cu undo/sync (nu scrie
nimic). `weekday` fix rezolvă „în fiecare vineri" fără să re-declanșeze dacă a fost
deja bifat în săptămâna curentă.

### 3.4 Stare „făcut" și următoarea scadență

`upkeepMarkDone(item, iso)` — chemat din tab-ul Atelier sau din stratul de dimineață
(Faza 2):
- recurent: `item.lastDoneDate = iso; item.doneAt = new Date().toISOString();
  item.snoozeUntil = null;` (`new Date` e ok aici — nu e migrare). Următoarea
  scadență iese din `upkeepDue` înainte.
- `ore-masina`: în plus `item.lastDoneHours = item.hours`.
- one-off: `item.doneAt = ...; item.archived = true;`.
- în toate: `logEvent('upkeep-done', item.title, { upkeepId:item.id, kind:item.kind, on:iso });`
- `saveState()` — o singură acțiune de utilizator = un singur punct de undo.

`upkeepSnooze(item, iso, days)` → `item.snoozeUntil = <iso + days>`;
`logEvent('upkeep-snoozed', ...)`.

### 3.5 `-log` vs `state`, retenție

| Date | Unde | De ce |
|---|---|---|
| definiția elementului + `lastDoneDate` + intrările pentru calculul scadenței | `state.upkeep` | e adevărul viu, trebuie sincronizat + undoable |
| istoricul fiecărei finalizări (`upkeep-done`), `upkeep-added`, `upkeep-snoozed` | nodul `-log` (`logEvent`) | append-only, în afara lui `state` — nu umflă sync-ul/undo-ul; sursă pentru statistica din §8.1 a doc-ului frate („corveza X alunecă în medie 3 zile") |

**Retenție (fără `Date` în `normalizeState`):**
- Recurentele: mărginite (zeci). ~200 B fiecare. Rămân pe `state`.
- One-off arhivate: cresc în timp. `pruneUpkeep()` chemat din `finalizeDay()` (acolo
  `new Date()` e permis, ca la `pruneLog()` din planul frate) — păstrează ultimele
  ~40 arhivate, taie restul. Recurentele nu se taie niciodată.
- Nodul `-log`: deja are `pruneLog()` planificat (90 zile / 3000 intrări) — verbele
  `upkeep-*` intră sub aceeași curățare.

### 3.6 UI — tab nou „Atelier"

**Recomandare: tab nou de nivel superior „Atelier"**, frate cu „Hartă atelier",
„Comenzi", „Planificare".

**De ce tab, nu panou în „Planificare":**
- E un registru propriu-zis, ca „Comenzi" — o listă pe care Nick o curează, o
  filtrează pe mașină/fel, îi editează recurența. Nu încape ca sub-panou fără să
  sufoce asamblorul, care e deja dens pe 3 coloane.
- Volum real: toate mașinile + sculele + corvezile + clădirea + listele de inventar.
- Punctul de integrare cu asamblorul e un **apel de funcție**
  (`deriveUpkeepTasks(state, date)`), nu o adiacență vizuală — deci registrul nu are
  nevoie să stea lângă asamblor.

**Compromis:** încă un buton în bara de tab-uri (devin 4). Un sub-panou ar ține
mentenanța vizual lângă locul unde se consumă. Mitigare: coloana stângă din
„Planificare" arată oricum cardurile scadente inline, cu un link mic
„gestionează →" care comută pe tab-ul „Atelier".

**Layout (în cuvinte), în stilul `renderComenzi`:**
- Antet: „Management atelier" + contoare („3 scadente azi · 2 restante · 5 one-off
  deschise").
- Chips de filtru: `Toate · Mașini · Scule · Clădire · Consumabile · Corvezi ·
  Reparații`; plus toggle „Doar scadente".
- **Secțiunea „Recurente"** — listă grupată pe `kind` (sau pe `asset`). Fiecare rând:
  pastilă de stare (`la zi` / `scadent` / `restant Nz`), titlu, rezumat recurență
  („zilnic", „vinerea", „la 30 zile"), proprietar sugerat, data ultimei bifări,
  acțiuni: `[Bifează făcut] [Amână] [Editează] [×]`. „Editează" desface inline
  câmpurile: titlu, notă, `kind`, `asset`, tip recurență + `every` + `weekday`,
  proprietar, `skill`. Sub secțiune: mini-formular „+ Element recurent".
- **Secțiunea „One-off / reparații atelier"** — sus un input de-o linie
  („dus flex la reparat — Proenerg") + Enter. Elementele făcute trec într-o listă
  restrânsă „Rezolvate".

Reutilizează vizual pastila de stare și tiparul „+ adaugă" de-o linie din
`renderRegReps`, ca cele două feluri de reparații să pară frați (§3.8).

### 3.7 Integrare cu asamblorul din „Planificare"

`deriveUpkeepTasks(state, dateIso)` → array de carduri candidat, aceeași formă ca
`deriveTasks` (§5 din doc-ul frate):

```js
{ id: 'u:' + item.id,
  text: item.title + (item.asset ? ' — ' + item.asset : ''),
  hint: recurLabel(item.recur) + (od > 0 ? ' · restant ' + od + 'z' : ''),
  projectId: null, skill: item.skill, upkeepId: item.id, source: 'upkeep' }
```

- Emis pentru fiecare `item` cu `active` unde `upkeepDue(item, dateIso)` e adevărat
  **și** nu există deja un `plan.tasks[]` cu acel `id`.
- Randat în **coloana stângă**, sub cardurile derivate din proiecte, cu subtitlu
  „Mentenanță atelier" (sau intercalat, cu o cheiță 🔧). Același `.dcard`,
  `draggable`, `dragstart` → `setData('text/plain', 'DC::' + id)` — **exact**
  mecanismul din task 5. Handler-ul de `drop` rezolvă cardul scanând
  `deriveTasks(...).concat(deriveUpkeepTasks(...)).concat(deriveNotite(...))`.
- **Skill / alocare:** `item.skill` alimentează sugestia estompată din
  `peopleWithSkill(card.skill)` (ex. `curatenie` → Vlad, `abkant` → Mircea), exact ca
  la cardurile de proiect. Dacă `item.personId` e setat, omul ăla apare primul.
  Sugestie, nu forțare — Nick trage unde vrea.
- **„Promovează în plan":** drop pe un om →
  `planTaskAdd(plan, personId, card.text, 'upkeep', { upkeepId: item.id })` cu `id`
  forțat la `card.id` (nu `uid()`). De aici înainte e un `plan.tasks[]` normal —
  reordonabil, editabil, ștergibil.
- **Închiderea buclei (partea importantă):** *planificat ≠ făcut*. `lastDoneDate`
  avansează **doar** la un „bifează făcut" explicit:
  - Faza 2, stratul de dimineață: bifarea unui `plan.tasks` cu `source:'upkeep'`
    cheamă `upkeepMarkDone(itemById(task.upkeepId), plan.date)`.
  - Faza 1, până există stratul de dimineață: la `finalizeDay()`, un prompt mic
    „Ce mentenanță s-a făcut azi?" cu bifă pe elementele `source:'upkeep'` de pe
    foaie; ce bifează Nick primește `upkeepMarkDone`.
  Dacă am avansa scadența la simpla așezare pe foaie, o corvează planificată dar
  săltată ar părea la zi — exact pe dos față de ce vrea Nick (capcana 2, §7).

### 3.8 Relația cu `state.reminders` și cu reparațiile de proiect

**Cu `state.reminders` (§4.5 doc frate):** „Suflat flexurile la final de zi" e
**și** reminder de antet, **și** un element de mentenanță zilnică evident. Dacă ard
amândouă, fiecare foaie îl primește de două ori. Rezolvare:
- `state.reminders` rămân rândurile mereu-pe-foaie, fără proprietar.
- Elementele `state.upkeep` de tip corvează zilnică fără `personId` sunt **carduri
  candidat** pe care Nick le pune pe un om când vrea ca cineva anume să le țină în
  ziua aia.
- Dedupe: dacă titlul unui card de mentenanță (normalizat) se potrivește cu o linie
  din `state.reminders`, cardul **nu** se mai adaugă automat pe foaie. Nick decide,
  per element, dacă e reminder de antet sau card alocabil — nu ambele.

**Cu `state.repairs` (reparații de proiect): rămân separate.**

| | `state.repairs` | `state.upkeep` (kind `reparatie`) |
|---|---|---|
| legătură | `projectId`, `client`, `pieceIds` | niciun proiect |
| unde se vede | firul din rândul de registru (`renderRegReps`) | tab-ul „Atelier" |
| ciclu | garanție / refacere, față-n față cu clientul | scula/clădirea atelierului |
| stare | `deschisa` / `in-lucru` / `rezolvata` | `open` / `done` (arhivare) |

- **UI / vocabular comun:** aceeași pastilă de stare, același input „+ de-o linie",
  aceeași familie de verbe `logEvent` (`reparatie-*` vs `upkeep-*`).
- **NU** se fuzionează într-un singur array cu `projectId` nullable: randarea
  registrului, reconcilierea `pieceIds` din `normalizeState` și contoarele
  „Reparații (N)" presupun toate reparație-cu-proiect. Un `projectId` nullable acolo
  e magnet de regresii (capcana 6, §7).
- O reparație de sculă care ajunge să ceară o comandă la furnizor devine un
  **necesar** în „Comenzi", nu o punte între cele două liste.

---

## 4. Feature 2 — „Notițe Nick" (captură rapidă)

### 4.1 Model de date — `state.notite`

Cheie nouă, deliberat minusculă. Fără seed (pornește goală).

```
state.notite : Array<Notita>

Notita = {
  id,                   // uid()
  text,                 // „sunat la Tanti Vitan RAL 5011"
  ownerId,              // null = lista globală a lui Nick (Faza 1); personId mai târziu
  createdAt,            // ISO, doar runtime
  order,                // int, sortare manuală
  status,               // 'open' | 'planned' | 'done' | 'dropped'
  plannedDate,          // 'YYYY-MM-DD' când e promovată într-un plan
  plannedTaskId,        // plan.tasks[].id în care a devenit — pentru back-ref / de-promovare
  doneAt                // ISO
}
```

Fără `kind`, fără `tags` în Faza 1. Dacă apar, sunt aditive.

### 4.2 `normalizeState` — backfill

```js
if(!Array.isArray(parsed.notite)) parsed.notite = [];
parsed.notite.forEach(function(n, i){
  if(typeof n.text          !== 'string') n.text = '';
  if(typeof n.ownerId       === 'undefined') n.ownerId = null;
  if(typeof n.createdAt     === 'undefined') n.createdAt = null;
  if(typeof n.order         !== 'number') n.order = i;
  if(typeof n.status        !== 'string') n.status = 'open';
  if(typeof n.plannedDate   === 'undefined') n.plannedDate = null;
  if(typeof n.plannedTaskId === 'undefined') n.plannedTaskId = null;
  if(typeof n.doneAt        === 'undefined') n.doneAt = null;
});
```

Fără seed → fără problema de reseed. Idempotent, determinist.

### 4.3 `-log` și retenție

- `state.notite` ține lista (trebuie editabilă, reordonabilă, undoable, sincronizată
  ca să apară pe telefonul și pe desktopul lui Nick).
- `-log`: opțional `logEvent('notita-promovata', text, { toDate, personId })` și
  `'notita-close'`. Valoare mică în Faza 1 — se poate sări.
- `pruneNotite()` din `finalizeDay()`: taie `status` `done`/`dropped` mai vechi de
  ~30 zile (după `doneAt`); plafon ~300 linii (cele mai vechi rezolvate cad). `open`
  nu se taie niciodată.

### 4.4 Relația cu `plan.resturi` — recomandare

Cele trei variante din temă: „același lucru / supraset / separat".

**Recomandare: `state.notite` e supersetul (inbox permanent); `plan.resturi` e o
proiecție per zi, înghețată cu foaia.**

- `plan.resturi` = blocul „Resturi" **al foii unei zile anume** — backlog care n-a
  fost dat nimănui în ziua aia, se tipărește pe acea foaie, e legat de acel `date`.
  Rămâne în model pentru **arhiva tipărită** (foaia finalizată trebuie să rămână așa
  cum a ieșit).
- `state.notite` = inbox-ul **permanent** al lui Nick, independent de zi, mereu
  vizibil indiferent ce dată de plan e pe ecran.
- Din dumpuri: „Resturi" e aproape identic 6 zile la rând („Usa Traian 83-75",
  „Caseta Unteatru"). Ăsta e comportament de **listă permanentă proiectată pe fiecare
  foaie**, nu de rest-al-zilei. Deci: cât timp Nick construiește ziua N, blocul
  „Resturi" **viu** de pe foaia crem se randează din `state.notite` filtrat
  `status:'open' && ownerId==null`. La `finalizeDay(N)`, acele linii se **copiază**
  în `plan.resturi` al zilei N (snapshot). Liniile rămân `open` în `state.notite` și
  reapar pe foaia zilei N+1 până Nick le bifează/aruncă.
- **Nu** același array: `resturi` trebuie înghețat cu foaia lui; `notite` trebuie să
  rămână viu și fără dată. (Asta ajustează ușor §3.3/§4.2 din doc-ul frate — de
  confirmat cu Nick, întrebarea 2.)

### 4.5 Nick-only vs per-persoană

Nick a zis „eu" → **implicit: o singură listă globală (`ownerId:null`), inbox-ul
managerului.** Cel mai simplu, exact cererea.

Compromisul per-persoană:
- **Plus:** fiecare om și-ar nota ale lui („Hadi: disc nou la flex"); roster-ul are
  deja `id`-uri.
- **Minus:** nu există auth per-user (toți intră pe `echipa@atelier-moldoveanu.local`),
  deci „a cui listă" e o etichetă, nu o graniță; 15 liste sunt o suprafață pe care
  Nick trebuie s-o monitorizeze; scope creep pe un feature „doar să nu uit".
- **Recomandare:** livrează global (Nick) în Faza 1; **păstrează `ownerId` în formă**
  ca o fază ulterioară să adauge un selector de persoană și o căsuță de captură în
  fiecare rând din roster, fără migrare. Când `ownerId` e setat, notițele omului apar
  ca linii estompate sub cardul lui în coloana din mijloc a asamblorului.

### 4.6 UI — buton în bara de sus + modal (Faza 1), drawer ulterior

Cerința: „mereu la îndemână, o linie o tastă". Un tab **nu** satisface „mereu la
îndemână" (trebuie să fii pe el).

**Recomandare:**
- Un **buton permanent în `.topbar`** — `📝 Notițe`, lângă `btn-feedback` /
  `btn-undo` — cu un **badge** cu numărul de `open`. Accesibil din orice tab.
- Faza 1: butonul deschide un **modal** (reutilizează infrastructura
  `openFeedbackModal`), cu inputul focusat: `Enter` = adaugă + golește câmpul +
  păstrează focusul (Nick înșiră 5 la rând); `Esc` închide. Listă cu editare inline /
  reordonare / `✓ făcut` / `× aruncă`.
- Faza ulterioară: convertește modalul într-un **drawer** lateral neblocant (mai
  potrivit pentru „notează și pleacă"), plus **același** `renderNotite()` montat și
  în coloana stângă din „Planificare", acolo unde se promovează.
- Hotkey global opțional (ex. `Ctrl+I`): posibil, dar aplicația își dispută deja
  `Ctrl+Z/Y` cu browserul și lasă inputurile cu undo nativ — un buton mereu-prezent e
  mai sigur decât încă un chord. Se oferă ca opțiune, nu default.

**Compromis:** modalul blochează ecranul pe durata scrisului; drawerul nu. Dar
drawerul e un tipar CSS nou într-o aplicație altfel full-page. Modal în Faza 1,
drawer când se dovedește necesar.

### 4.7 Integrare cu asamblorul

- `state.notite` cu `status:'open'` și `ownerId==null` → linii candidat în **coloana
  stângă** din „Planificare", secțiune „Notițe Nick", lângă cardurile derivate +
  mentenanță. Același `.dcard`, `draggable`, id `n:<noteId>`, **fără** `skill` (Nick
  alege omul).
- Drop pe un om → `planTaskAdd(plan, personId, note.text, 'capture', {})`, apoi
  `note.status='planned'; note.plannedDate=plan.date; note.plannedTaskId=<idNou>`.
  Cardul iese din coloana stângă cât timp `status!=='open'`.
- **De-promovare:** ștergerea `plan.tasks`-ului respectiv, sau un buton pe notița
  planificată, readuce `status='open'` și scoate task-ul din plan (match pe
  `plannedTaskId`).
- `ownerId` setat (fază ulterioară) → linii estompate sub omul respectiv în coloana
  din mijloc.

---

## 5. Fazare

În stilul §10 din `docs/organizare-zilnica-design.md` — fiecare fază = software
funcțional, testabil singur.

| Fază | Management atelier | Notițe Nick |
|---|---|---|
| **1 — feliuța utilă** | `state.upkeep` + `upkeepSeeded` + backfill + seed. Tab „Atelier": listă Recurente + listă One-off, CRUD, „bifează făcut" (setează `lastDoneDate`), `upkeepDue()` determinist pentru `none` / `zile` / `sapt`(+`weekday`). Contoare în antet. **Fără** legătură cu planul — Nick are deja un „ce e scadent" viu. | `state.notite` + backfill. Buton `📝 Notițe` în topbar → modal cu input focusat (Enter adaugă și rămâne), listă cu editare / reordonare / `✓` / `×`. Listă globală. Sincronizat (e pe `state`). **Fără** legătură cu planul. |
| **2 — hrănește planul** | `deriveUpkeepTasks()` → carduri în coloana stângă; drop-to-assign → `plan.tasks` cu `source:'upkeep'`; `finalizeDay()` / stratul de dimineață scrie înapoi `lastDoneDate`. Dedupe cu `state.reminders`. | Linii candidat în coloana stângă + drop-to-assign → `plan.tasks` (`source:'capture'`); de-promovare. „Resturi" viu de pe foaia crem citește `notite` deschise (§4.4). |
| **3 — mai fin** | `ore-masina` + câmp/contor de ore; vedere grupată pe `asset` („card de mașină"). Amânare (`snooze`). | `ownerId` + căsuță de captură per rând în roster; linii estompate per om în coloana din mijloc. |
| **4 — învață** | Statistică din `-log`: „corveza X se face în medie la 9 zile, deși e setată la 7"; „filtrul laser — ultima curățare acum 41 zile". Sugestii estompate, ca §8.1 din doc-ul frate. | Drawer neblocant în loc de modal; hotkey opțional; `logEvent` + nudge „tot re-adaugi X". |

Feliuța minimă absolută dacă trebuie tăiat și mai mult: **Faza 1 Management atelier
fără one-off** (doar recurente + „bifează făcut") + **Faza 1 Notițe** (modal, listă
globală). Amândouă fără planul. Restul sunt incremente curate.

---

## 6. Migrări și constrângeri (recap)

- `DATA_VERSION` = **8**, neschimbat. `state.upkeep`, `state.upkeepSeeded`,
  `state.notite` completate în `normalizeState` cu gărzi `typeof === 'undefined'`,
  idempotent, determinist, **fără** `Date.now()` / `new Date()` / `uid()`.
- id-uri: `uid()` la runtime; string determinist (`'u-' + slug(title)`) la seed;
  `'u:' + item.id` / `'n:' + note.id` pentru cardurile derivate.
- Nu se ating: `stableStringify`, sync-ul live (`.on('value')`, echo suppression via
  `recentLocalSigs`, `remoteDirty`, `flushRemote`), `saveState`, `noteUndoPoint`,
  undo/redo.
- `state.upkeep` și `state.notite` **intră** în `state` → se sincronizează și sunt
  undoable. O acțiune de utilizator = un `saveState()` = un punct de undo.
- Jurnalul (`-log`) rămâne în afara lui `state`. `logEvent` e best-effort, nu
  blochează. Verbele noi: `upkeep-done`, `upkeep-added`, `upkeep-snoozed`,
  `notita-promovata`, `notita-close`.
- Creșterea payload-ului (tot se sincronizează la fiecare schimbare):
  - Recurente: mărginite (zeci de elemente). OK.
  - One-off arhivate + notițe rezolvate: `pruneUpkeep()` / `pruneNotite()` chemate din
    `finalizeDay()` (unde `new Date()` e permis), ca `pruneLog()` din planul frate.
- Cod ES5-ish: `var`, `function`, fără arrow / `const` / `let`, concatenare de
  string pentru HTML, `esc()` pe tot ce vine din date. Un singur IIFE, fără build.

---

## 7. Capcane / ce aș evita

1. **Recurența „după N ore-mașină".** Nicio telemetrie de la mașini; cineva trebuie
   să introducă manual orele sau câmpul e greutate moartă, iar atelierul nu ține
   asta acum. Modelează câmpul, dar toate default-urile pe recurență calendaristică;
   `ore-masina` = Faza 3 și doar pentru 1–2 mașini (laser) unde chiar contează. Nu
   construi UI care presupune că citirile de ore există.
2. **Avansarea „următoarei scadențe" când o corvează e doar programată pe foaie.**
   Planificat ≠ făcut. Dacă scadența se resetează la așezarea pe foaie, mentenanța
   săltată pare la zi în tăcere — pe dos față de ce vrea Nick. Doar un „bifează
   făcut" explicit (pe tab-ul Atelier sau bifă de dimineață) poate avansa
   `lastDoneDate`. Are nevoie de stratul de dimineață sau de un confirm la finalize.
3. **Dublarea corvezilor zilnice care sunt deja `state.reminders`.** „Suflat
   flexurile" e reminder de antet ȘI element de mentenanță evident. Dacă ard
   amândouă, foaia îl primește de două ori. Dedupe pe titlu normalizat; per element,
   ori e reminder de antet (mereu, fără proprietar), ori card alocabil (un om anume
   în ziua aia) — nu ambele.
4. **Liste de captură per-persoană în Faza 1.** Nick a cerut „eu". 15 liste fără
   identitate reală per-user (login comun) = overhead de monitorizare și scope creep.
   Păstrează câmpul `ownerId`, livrează global.
5. **`plan.resturi` și `state.notite` ca același store.** `resturi` trebuie înghețat
   cu foaia tipărită; `notite` trebuie să rămână viu și fără dată. Același array
   strică arhiva. Proiectează-le, nu le fuziona.
6. **Fuziunea mentenanței cu `state.repairs` printr-un `projectId` nullable.** Firul
   din registru, reconcilierea `pieceIds` din `normalizeState` și contoarele
   „Reparații (N)" presupun toate reparație-cu-proiect. `projectId` nullable acolo e
   magnet de regresii. Array-uri separate, aceeași înfățișare.
7. **Un motor de recurență cu semantică reală de calendar** (RRULE, „ultima vineri
   din lună", DST). Exagerat pentru 15 oameni. Patru cazuri (zilnic / săptămânal-în-zi
   / la-N-zile / la-N-ore) evaluate ca `upkeepDue(item, iso)` pur la render — atât e
   nevoie, și rămâne determinist pentru `normalizeState`/undo/sync.
8. **Un card pe zi pentru fiecare mașină.** 6 flexuri × verificare zilnică = zgomot
   care îl învață pe Nick să ignore coloana stângă. Recurentele trebuie să fie rare;
   bazează-te pe „Doar scadente" și scoate în față doar ce e chiar scadent pe data
   țintă.

---

## 8. Întrebări deschise pentru Nick

**Primele 3 (blochează Faza 1):**

1. **Când contează un element de mentenanță drept „făcut"** — când îl pui pe cineva
   pentru mâine, sau doar când cineva îl bifează? (Decide dacă Faza 1 are nevoie de
   bifă de dimineață / un confirm „s-a făcut?" la finalizarea zilei, sau poate avansa
   scadența la programare.)
2. **„Resturi" de pe foaia crem: viu sau înghețat?** Blocul „Resturi" de pe foaie e
   inbox-ul tău permanent de notițe (deci „Usa Traian 83-75" tot apare până îl
   omori), sau o listă per zi pe care o reumpli în fiecare seară? (Schimbă dacă
   `plan.resturi` e store-ul viu sau doar un snapshot la finalize — §4.4.)
3. **Captura rapidă: rămâne doar-Nick, sau per-persoană de la început?** (Ai zis „eu"
   — confirmă; per-persoană e ieftin de adăugat mai târziu, dar schimbă UI-ul din
   roster.)

**Restul:**

4. Ce mașini/scule primesc chiar mentenanță programată azi și la ce interval?
   (flexuri, laser CNC, abkant, fierăstrău, aparate de sudură, compresor, trolee?)
   Fără lista reală cu intervale, seed-ul din §3.2 sunt presupuneri.
5. Vrei urmărire de ore-mașină deloc, sau calendaristic e destul? Dacă da — cine
   introduce orele și cât de des?
6. „Atelier" ca tab propriu (recomandat), sau panou în „Planificare"? Ești ok cu al
   4-lea tab în bară?
7. Reparațiile atelierului: vrei trei stări `deschisă / în lucru / rezolvată` (ca la
   reparațiile de proiect), sau doar `open / done`?
8. Retenție: cât ținem one-off-urile rezolvate și notițele închise înainte de
   curățare automată — 30 / 60 / 90 zile?
9. Un card scadent de mentenanță poartă un proprietar implicit (Vlad pentru
   curățenie, Mircea pentru abkant), sau aterizează mereu nealocat ca să-l pui tu?
10. Vocabular: elementele astea sunt „lucrări de atelier" / „mentenanță" — confirmă
    că nu vrei cuvântul „piesă" nicăieri (piesele sunt ansambluri de proiect).
