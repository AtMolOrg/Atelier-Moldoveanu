# Design — Registru pliabil pentru desfășurătoare (varianta A)

Data: 2026-09-05
Fișier atins: `index.html` (single-file app)
Backup dinaintea lucrării: branch `backup/live-2026-09-05` + tag `live-2026-09-05` (commit `fb6a96d`), împinse pe `origin`.

## 1. Context și scop

Tab-ul „Hartă atelier" e azi un **canvas liber cu pan/zoom** pe care fiecare proiect e un
„dosar" (`.proj-wrap` / `.proj-cluster`) ce conține tot: rândul de etape, panoul de comenzi pe
margine, echipa de montaj, și un **cartonaș mare** (`renderProjectCard`) care re-listează fiecare
piesă a proiectului. Probleme confirmate cu utilizatorul:

- **Aglomerare / duplicare** — piesele apar și ca sublistă în cartonaș, și ca propriile cartonașe
  în coloanele de execuție.
- **Nu scalează** — 10–30 de proiecte active pe un canvas liber devin de negestionat.
- **Piese fără loc clar** — o piesă „la proiectare" (`stationId === null`) apare doar în sublista
  cartonașului; o piesă de reparație care are nevoie de măsurători n-are unde sta în flux.

Din 3 direcții prototipate (artifact „Trei desfășurătoare",
`https://claude.ai/code/artifact/5b82f45a-8910-45e6-90ec-e798c0751095`), utilizatorul a ales
**A — Registru pliabil**: proiectele devin rânduri într-o listă verticală; rândul pliat e un
rezumat de o linie, rândul desfăcut arată desfășurătorul (etape + piese) plus un antet de proiect
compact, fără sublista de piese.

Obiective (confirmate): mai puțină aglomerare · piese mai clare · densitate mare (multe proiecte
mici). De păstrat obligatoriu: drag & drop piese între etape · structura per proiect (etape
adăugate/șterse/reordonate + partiții).

## 2. Decizii luate cu utilizatorul

| # | Întrebare | Răspuns |
|---|-----------|---------|
| 1 | Scoatem canvas-ul complet? Checklists jos pliabil sau eliminate? | **Scoatem tot** — canvas complet eliminat; funcția de checklists eliminată din UI. |
| 2 | Sortarea listei: după termen, după urgență, sau comutator? | **Buton de comutare** termen ⇄ urgență (implicit termen, ca acum). |
| 3 | Mini-coloană „De pornit" pentru backlog? Piese parcate în etape de proiectare acum sau mai târziu? | **Piese parcate și în Măsurători/Ofertare/Proiectare — acum.** (Consecință propusă la §6: renunțăm la „De pornit" separat.) |

## 3. Ce se elimină

1. **Canvas + pan/zoom.** `.canvas-viewport`, `.canvas-content`, `.harta-grid`,
   `.canvas-zoom-controls`, `applyCanvasTransform`, `zoomAtPoint`/wheel-zoom, `fitToScreen`,
   `attachCanvasEvents`, `attachCanvasNodeDrag`, variabilele `canvasZoom/canvasPanX/canvasPanY`,
   constantele `CANVAS_*`, CSS-ul aferent.
2. **Poziționarea liberă a dosarelor.** `p.x` / `p.y` nu mai sunt citite sau scrise.
3. **Checklists ca funcție.** `renderChecklistCard`, `renderChecklistRow`, `addChecklist`,
   `findChecklistItem`, `checklistById`, handlerele `data-note-*`, butoanele „+ Listă", CSS
   `.note-*`. **Datele `state.checklists` NU se șterg** din blob-ul salvat — rămân inerte și
   recuperabile dacă utilizatorul se răzgândește; doar nu mai sunt randate/editate.
4. **Cartonașul mare ca obiect** (`renderProjectCard`). Conținutul lui non-piese se mută în
   antetul rândului desfăcut (§5.2). Sublista de piese (`.piece-sublist`) **dispare** — asta e
   duplicarea pe care o eliminăm.
5. **Panoul de comenzi pe marginea dosarului** ca element plutitor pe margine
   (`.side-panel.side-left`, hover-to-open). Conținutul (rândurile de comandă) se mută în antet
   (§5.2). Mecanismul generic `renderSidePanel` rămâne dacă mai e folosit de sidebar-ul din
   dreapta; altfel se simplifică.
6. **Starea „limbo" `stationId === null`** pentru piese (§6).

## 4. Contract „nimic pierdut" — ce se păstrează 1:1

Redesign-ul e **schimbare de afișare**, nu de schemă. Se păstrează, cu aceeași logică:

- **Proiecte:** `cod`, `client`, `termen`, `createdAt`, `notite`, `montajNotes`, `urgency` (+
  slider-ul interactiv și `urgencyGradient/urgencyValue/urgencyOf/urgencyLabel`), `finalizat`,
  `stationId`/`lane` (poziția cartonașului de proiect în etapele lui).
- **Etape per proiect:** `p.stations` (adăugare `+ etapă proiectare` / `+ etapă execuție`,
  reordonare `‹ ›`, ștergere `✕`, redenumire), toți helperii `stationsFor`, `stationByIdFor`,
  `piesaStationsFor`, `lastPiesaIndexFor`, `firstPiesaIndexFor`, `nextProiectStationFor`,
  `firstProiectAfterLastPiesaFor`, `lastProiectBeforeFirstPiesaFor`, `isPostExecStationFor`,
  `forkProjectStations`.
- **Partiții (lanes) per proiect:** `p.laneDefs`, `projectLanesFor`, adăugare `⊞`, redenumire,
  ștergere `.lane-del` cu re-atribuirea pieselor/proiectului pe lane-ul rămas.
- **Piese:** `p.pieces[]` cu `id`, `name`, `colorCode`, `stationId`, `lane`; `renderPieceCard`;
  butoanele `→` / `📦` (`data-piece-move`, `data-piece-to-montaj`); sentinela `PIECE_MONTAJ`.
  Excepție (§6.5): `↺` / `data-piece-demote` nu mai duce la `stationId = null` — merge un pas
  înapoi pe `pieceFlowFor(p)`, iar din prima etapă e inactiv.
- **Drag & drop:** piesă între `.col-body` (execuție), piesă pe Montaj → mută tot proiectul,
  proiect (`PRJ::`) între etape de proiect, persoană (`WRK::`) pe cartonaș / pe piesă / pe cutia
  „Echipă montaj", cu toate zonele `dragover/drop`.
- **Oameni & atribuiri:** `state.assignments[]`, `addAssignment`, `renderAssignedPeople`,
  `renderPieceAssignees`, sentinela `MONTAJ_TEAM`, cutia „🔧 Echipă montaj"
  (`firstProiectAfterLastPiesaFor`), sidebar-ul din dreapta (echipă internă + furnizori),
  `renderTeamSidebar`, `updateSidebarForTab`, `matchesSearch` + căutarea din topbar.
- **Furnizori:** `supplierTimeChip` (🚚 Nz / ✓), `sentAt`/`receivedAt`, log `furnizor-retur`,
  `supplierOptionsHtml`, panoul de furnizori.
- **Comenzi materiale:** `p.orders[]` (`text`, `qty`, `supplierId`, `status`),
  `ORDER_STATUS_LABEL`, adăugare/ștergere/editare rând, ciclarea stării, `p.ordersPinned`.
- **Faze:** `currentStageInfo`, `currentPhaseKind`, `refreshPhaseStamps`, `phaseKind`/`phaseSince`,
  pastila `.pct-stage` + halo-ul colorat (albastru anteproiect / portocaliu execuție / roșu
  montaj), `projectWarnings` + bara de avertisment.
- **Restul tab-urilor:** Gantt (derivat), Comenzi, Reparații, Finalizate — neatinse.
- **Undo/redo:** `saveState` → `refreshPhaseStamps(); noteUndoPoint(); prevStateJson=…`;
  `applySnapshot`; funcționează pentru orice acțiune, inclusiv cele noi din registru.
- **Sync Firebase:** `stableStringify`, echo-suppression, `flushRemote`, `resolveVersioned` →
  `normalizeState`. Fără bump de `DATA_VERSION`.

## 5. Structura nouă — Registrul

### 5.1 Container

`renderHala()` nu mai construiește canvas-ul. Construiește:

```
#board (flex column)
  .reg-toolbar        → [ Sortare: ⟳ după termen | după urgență ]   (comutator, §5.4)
  .reg                → lista de rânduri
    .reg-row[data-project] (pliat)    ─┐  un proiect nefinalizat, în ordinea sortării
    .reg-detail (dacă e desfăcut)     ─┘
    …
  (empty-state neschimbat dacă nu e nimic)
```

`renderHartaPeProiecte` → redenumit `renderRegistru`. Filtrarea rămâne
`!p.finalizat && matchesSearch(p.cod, p.client)`. Sortarea: §5.4.

Starea „ce rânduri sunt desfăcute" trăiește într-un `Set` la nivel de modul
(`registryOpen`), **nu** în `state` (e preferință de vizualizare, nu dată de business, și nu
trebuie să declanșeze sync/undo). Se păstrează între `render()`-uri în cadrul sesiunii.

### 5.2 Rândul pliat — `.reg-row`

O linie, de la stânga la dreapta:

| element | sursă |
|---|---|
| dungă urgență (culoare) | `urgencyOf(p)` / `urgencyGradient(p)` |
| `cod` (mono) | `p.cod` |
| client | `p.client` |
| nume proiect (trunchiat) | derivat: prima linie din `p.notite`? — **de decis la review**; fallback gol |
| pastilă fază | `currentStageInfo(p)` → `.phase-proiect/-piesa/-montaj` + nume |
| mini-bară piese (3 segmente: pregătire / execuție / montaj) | count pe `bucket(pc.stationId)` |
| „N/T exec · M mtj" | idem |
| termen | `p.termen` + „(Xz)" dacă ≤ 3 zile, roșu + ⚠ dacă depășit |
| punct roșu de avertisment | `projectWarnings(p).length > 0` |
| chevron | `registryOpen.has(p.id)` |

Click pe rând (nu pe un control interactiv) → toggle în `registryOpen` + `render()`.

`bucket(stationId)`: `PIECE_MONTAJ` → `montaj`; etapă de tip `piesa` → `exec`; altfel (null, etapă
`proiect`) → `pregatire`.

### 5.3 Rândul desfăcut — `.reg-detail`

Două zone.

**(a) Antet proiect** (`.reg-detail-head`) — înlocuiește conținutul non-piese al cartonașului:

- slider-ul de urgență (exact `.urgency-slider-row` de acum, cu `data-project`, `data-automin`,
  butonul de reset `↺`);
- `termen` (text) + badge-ul de urgență (`urgencyLabel`);
- „📋 materiale N/T" — click → deschide/închide o subsecțiune `.reg-orders` cu rândurile de
  comandă (același markup ca `renderOrdersPanel`, fără învelișul `renderSidePanel`);
- „📦 necesar montaj notat" dacă `(p.montajNotes||'').trim()`;
- cutia „🔧 Echipă montaj" (`data-montaj-team`, drop de persoane) — apare dacă
  `firstProiectAfterLastPiesaFor(p)` sau are deja echipă;
- butoane: `Avansează → <next>` (`data-advance`, `nextProiectStationFor`),
  `Finalizează ✓` (`data-close-project`, condiția B1 actuală),
  `Editează` (`data-edit`), `Șterge` (`data-del`).

**(b) Pipeline** (`.reg-detail-pipe`) — rândul de etape, identic ca funcționalitate cu
`.proj-cluster-stages` de acum:

- `stationsFor(p).forEach` → o coloană per etapă, cu `.proj-stage-head` (`‹ › ⊞ ✕`, redenumire),
  lanes (`projectLanesFor`), `.col-body[data-station][data-kind]` ca zonă de drop;
- într-o coloană de tip `proiect`: dacă `p.stationId === station.id` → un **jeton compact de
  proiect** („◆ proiect", nu tot cartonașul) în plus față de piesele parcate acolo (§6);
- într-o coloană de tip `piesa`: `renderPieceCard` pentru piesele cu `pc.stationId === station.id`;
- head-ul cu `+ etapă proiectare (anteproiect)` / `+ etapă execuție` (`data-add-stage`) rămâne;
- overflow-x pe container, ca să nu iasă pagina în lateral.

### 5.4 Comutatorul de sortare

`.reg-toolbar` cu două butoane (sau un toggle). Câmp nou `state.registrySort ∈ {'termen','urgenta'}`,
implicit `'termen'`. `normalizeState` îl pune dacă lipsește. Schimbarea → `saveState(); render()`.

- `'termen'`: `(a.termen||'9999') < (b.termen||'9999') ? -1 : 1` (comportamentul actual).
- `'urgenta'`: `urgencyValue(b) - urgencyValue(a)` (desc), tie-break pe termen.

> Notă: `state.registrySort` e minor, dar îl ținem în `state` (nu la nivel de modul) ca alegerea
> să persiste între sesiuni și între dispozitive. E o singură valoare scalară — impact neglijabil
> pe sync/undo.

## 6. Piese în etape de proiectare + eliminarea stării `null`

Azi o piesă poate fi la: `null` (limbo, doar în sublistă), o etapă `piesa`, sau `PIECE_MONTAJ`.

**Nou:** o piesă poate sta în **orice etapă**, inclusiv etapele de tip `proiect` de dinaintea
primei etape de execuție (Ofertare / Măsurători / Proiectare / etape de anteproiect adăugate).
Cazul concret: o piesă de reparație parcată în „Măsurători" cât se iau măsurătorile, apoi trimisă
în execuție.

De ce nu strică legăturile:

- `piesaStationsFor` rămâne „doar etape `piesa`" → `currentStageInfo` NU numără o piesă din
  „Măsurători" ca execuție (verifică `piesaIds[pc.stationId]`), deci pastila rămâne albastră.
- Gantt, `projectWarnings`, stampilele de fază — toate se uită la cartonașul de proiect + piese
  în etape `piesa`. O piesă parcată în etapă de proiect e invizibilă pentru ele. Neschimbat.
- `PIECE_MONTAJ` e deja precedentul: o „stare" de piesă care nu e etapă `piesa`, tratată în ~4
  locuri. Adăugăm simetric etapele de proiect ca destinații valide.

Schimbări concrete:

1. **Randare în coloană `proiect`** (`renderRegistru`, zona pipeline): pe lângă jetonul de
   proiect, randează `renderPieceCard` pentru piesele cu `pc.stationId === station.id`.
2. **`renderPieceCard`**: stare nouă „într-o etapă de proiect" — arată numele etapei + `→`
   (înaintează în flux) + `↺` (înapoi). `isBack` (azi `psIdx === -1`) se rescrie pe baza poziției
   reale în `stationsFor(p)`, nu doar în `piesaStationsFor(p)`.
3. **Mutare piesă** (`data-piece-move`): pasul `→`/`←` merge pe lista
   `pieceFlowFor(p)` = [etape `proiect` dinaintea primei etape `piesa`] + [etape `piesa`].
   Helper nou. `←` de la prima intrare → nu mai există „null", vezi punctul 5.
4. **Drop** (`.col-body` `kind === 'proiect'`): dacă etapa e dinaintea primei etape `piesa`,
   `pc.stationId = zone.dataset.station` (parcare). Dacă e post-execuție (Montaj etc.) → rămâne
   comportamentul actual „mută tot proiectul". `dragover` permite drop-ul de piesă și pe coloane
   `proiect` timpurii (se scoate garda `kind === 'piesa'` doar pentru acel caz).
5. **Fără stare `null`.**
   - Piese noi (din modal, `pieces.push`) → `stationId` = prima etapă din `stationsFor(proj)`
     (de regulă „Ofertare"), nu `null`.
   - `normalizeState`: piesele existente cu `stationId == null` → mutate pe prima etapă a
     proiectului lor. (Migrare unică, fără pierdere — piesa era oricum „la început".)
   - Se elimină `data-piece-demote` care punea `stationId = null`; `↺` din prima etapă devine
     inactiv (sau lipsește).

> **Punct pentru review:** varianta de mai sus renunță la coloana separată „De pornit". Dacă
> vrei totuși un sertar vizibil distinct de „Ofertare" pentru piese neîncepute, alternativa e o
> primă mini-coloană `.col-body[data-station="__todo__"]` cu sentinela `__todo__` tratată ca
> etapă `proiect` la început. Recomandarea mea: fără ea, e mai coerent.

## 7. Harta modificărilor în `index.html`

**Șterse:** vezi §3 (canvas, checklists, `renderProjectCard`, `.piece-sublist`,
side-panel-on-edge pentru comenzi).

**Adăugate:**
- `renderRegistru()` (din fostul `renderHartaPeProiecte`) — listă de `.reg-row` + `.reg-detail`.
- `renderRegRow(p)`, `renderRegDetail(p)`, `renderRegHead(p)`, `renderProjToken(p)`.
- `pieceFlowFor(p)`, `bucket(stationId)`.
- `registryOpen` (Set, modul), `state.registrySort`.
- CSS: `.reg`, `.reg-toolbar`, `.reg-row`, `.reg-bar`, `.reg-detail`, `.reg-detail-head`,
  `.reg-detail-pipe`, `.proj-token`. Refolosește tokenii de culoare de fază existenți.

**Modificate:**
- `renderHala()` — construiește registrul, nu canvas-ul; păstrează `renderTeamSidebar()`,
  `attachHalaEvents()`, empty-state.
- `renderPieceCard()` — starea „în etapă de proiect" (§6.2).
- handler `data-piece-move` — `pieceFlowFor` (§6.3).
- handler `drop` pe `.col-body` — parcare piesă pe etapă `proiect` timpurie (§6.4).
- `normalizeState()` — `state.registrySort` default; piese `stationId==null` → prima etapă;
  curăță `p.x/p.y/cl.x/cl.y`; **nu** șterge `state.checklists`.
- crearea piesei în `openProjectModal` — `stationId` = prima etapă (§6.5).
- `attachHalaEvents()` — pierde `.col-title` global? (rămâne `.proj-stage-head` per proiect);
  câștigă toggle-ul de rând și comutatorul de sortare.

**Neatinse:** tot ce e la §4 în afară de punctele de mai sus.

## 8. Plan de testare

Mediu: fără `node`; test în browser pe o copie locală servită static (PowerShell `HttpListener`),
cu `localStorage` populat din blob-ul live (exportat de utilizator). Asserții prin
`javascript_tool` pe DOM (screenshot-urile au fost nesigure).

1. **Migrare fără pierdere.** Încarcă starea live. Pentru fiecare proiect: apare un `.reg-row`;
   desfăcut, are exact `stationsFor(p).length` coloane; fiecare piesă apare o singură dată
   (într-o coloană), fiecare comandă apare în subsecțiunea materiale, fiecare persoană atribuită
   apare. Nicio piesă cu `stationId` null rămasă.
2. **Pastila de fază** neschimbată față de live pentru fiecare proiect (albastru/portocaliu/roșu).
3. **Piesă parcată în Măsurători:** drop pe coloana Măsurători → piesa e acolo, pastila rămâne
   albastră; `→` o duce în prima etapă de execuție.
4. **Drag & drop** piesă între execuții, piesă → Montaj (mută proiectul), proiect între etape,
   persoană pe piesă / pe cutia montaj — toate merg.
5. **Etape & lanes:** adaugă/șterge/reordonează etapă; adaugă/șterge lane cu piese pe el
   (re-atribuire corectă).
6. **Comutator sortare:** termen ⇄ urgență reordonează lista; alegerea persistă după `render()`
   și după reload.
7. **Undo/redo** după: editare proiect, mutare piesă, parcare piesă în Măsurători, schimbare
   sortare, avansare, finalizare.
8. **Toate tab-urile** (Gantt / Comenzi / Reparații / Finalizate) se randează în continuare.
9. **Sync:** o salvare locală nu se auto-detectează ca schimbare remotă (semnătura
   `stableStringify` stabilă).

## 9. Puncte deschise pentru review-ul specului

1. **Numele proiectului pe rândul pliat** — proiectele au `cod` + `client`, dar nu un câmp „nume".
   Opțiuni: (a) doar `cod` + `client`; (b) prima linie din `p.notite`; (c) câmp nou opțional
   `p.titlu` în modal. Recomandare: (a) acum, (c) dacă se simte nevoia.
2. **„De pornit" separat** vs. piese noi direct în prima etapă (§6, punct de review).
   Recomandare: fără coloană separată.
3. **`state.checklists`** — inert dar păstrat în blob. OK, sau ștergem de tot la `normalizeState`?
   Recomandare: păstrat inert (recuperabil).
4. **Comutatorul de sortare** — două butoane vizibile, sau un singur buton care ciclează?
   Detaliu de UI, se poate decide la implementare.
