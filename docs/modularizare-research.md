# Modularizare `index.html` — document de decizie

**Data:** 2026-09-07 · **Stare cod analizat:** `358f9b8` · **Fișier:** `index.html`, 2722 linii / 161.750 bytes (~46k tokens la citire integrală)

---

## 1. Harta codului azi

### Structura brută

| Zonă | Linii | Bytes | % |
|---|---|---|---|
| `<head>` + `<style>` (12–572) | 560 | 42.020 | 26% |
| markup `<body>` (574–617) | 44 | 1.903 | 1% |
| `<script>` — un singur IIFE (618–2722) | 2104 | 114.454 | 71% |

În `<head>`: Google Fonts (Raleway) + trei `<script src>` clasice către gstatic — `firebase-app-compat`, `firebase-auth-compat`, `firebase-database-compat` 10.13.2. IIFE-ul declară deja `"use strict"` pe prima linie (linia 620).

### Unitățile logice din IIFE

| # | Unitate | Linii | Mărime | Rol |
|---|---|---|---|---|
| 1 | config + globals + helpers pure | 622–711 | 90 | `STORAGE_KEY`, `DATA_VERSION=8`, `state`, `tab`, `searchQuery`, `ganttZoom`, `registryOpen`, `uid/esc/pad2/stableStringify`, date utils, `defaultState()` |
| 2 | Firebase + load + migrații + normalize | 712–900 | 189 | chei, `dbRef`, `withAuth`, `logEvent`, `loadState`, `migrateV3→V8`, `normalizeState`, `resolveVersioned` |
| 3 | undo/redo + save + toast | 901–988 | 88 | `undoStack`, `noteUndoPoint`, `saveState`, `saveToLocal`, `showToast` |
| 4 | helpers de domeniu | 989–1134 | 146 | `projectById`, `stationsFor`, `pieceFlowFor`, `currentStageInfo`, `currentPhaseKind`, `refreshPhaseStamps`, `projectWarnings`, `matchesSearch` |
| 5 | **dispatcher `render()`** | 1135–1150 | 16 | `if(tab==='hala') renderHala() else if …` |
| 6 | hala / registru — randare | 1152–1463 | 312 | `renderHala`, `renderRegistru`, `renderRegRow`, `renderRegHead`, `renderRegPipe`, `renderPieceCard`, `renderOrdersRows`, `supplierOptionsHtml` |
| 7 | **`attachHalaEvents`** | 1464–1815 | 352 | tot drag&drop-ul + toate mutațiile din registru |
| 8 | gantt | 1816–2005 | 190 | `ganttPhaseSpans`, `ganttPhases`, `renderGantt` |
| 9 | comenzi + furnizori | 2006–2165 | 160 | `renderFurnizoriPanel`, `attachFurnizoriEvents`, `renderComenzi` |
| 10 | finalizate | 2166–2264 | 99 | `renderFinalizatDetail`, `loadFinLog`, `renderFinalizate` |
| 11 | reparații | 2265–2378 | 114 | `REPAIR_STATUSES`, `renderReparatii` |
| 12 | modale | 2379–2561 | 183 | `openRepairModal`, `openFeedbackModal`, `openProjectModal` |
| 13 | wiring + init + live sync | 2562–2722 | 160 | tab-uri, Ctrl+Z, resize, `startApp`, `applyRemote`, `flushRemote`, `attachLiveSync`, login |

### Cuplajul — cifre, nu impresii

Referințe pe tot fișierul: `state` **94×**, `esc()` **55×**, `render()` **54×**, `saveState()` **46×**.

Densitatea pe unitate (cât de „nucleu-dependentă" e fiecare):

| Unitate | `state` | `saveState()` | `render()` |
|---|---|---|---|
| helpers domeniu (4) | 8 | 1 | 0 |
| hala/registru randare (6) | 9 | 0 | 0 |
| **`attachHalaEvents` (7)** | **19** | **27** | **24** |
| gantt (8) | 2 | 0 | 1 |
| comenzi (9) | 9 | 6 | 9 |
| finalizate (10) | 3 | 1 | 1 |
| reparații (11) | 12 | 5 | 5 |
| modal feedback | 0 | 0 | 0 |
| modal proiect | 7 | 2 | 4 |

Dependențe *transversale* între unități (nu doar spre nucleu):

- `findOrderByKey` (definit la 1181, în zona hala) e folosit de `attachHalaEvents` (1712, 1722, 1732) **și** de comenzi (2135, 2144, 2153) → hala și comenzi împart cod.
- `supplierOptionsHtml` (1174) folosit în registru (1201) **și** în comenzi (2120).
- `openProjectModal` e apelat din hala-render (1223), hala-events (1611), **gantt (2001)**, **finalizate (2161)**, wiring (2565) → modalele sunt un hub, nu o frunză.
- `matchesSearch` folosit de registru (1237), gantt (1885), reparații (2282).
- `renderPieceCard` e apelat de 4 locuri, toate în unitatea 6 (singura funcție cu adevărat locală).
- Unitățile 6 și 7 sunt un singur organism: 7 atașează handlere pe DOM-ul produs de 6, prin `data-*` și clase (`.col-title`, `.lane-del`, `.reg-row`). Nu există interfață între ele, doar convenția de markup.

### CSS-ul e o singură suprafață partajată

`<style>` are 560 linii cu 15 secțiuni comentate (HEADER, BOARD, REGISTRU, SIDE PANEL, PROJECT CARD, PIECE CARD, GANTT, REPARATII, MODAL, TOAST, LOGIN…), dar cu tokens `:root` și clase de bază (`.btn`, `.search-input`, `.empty-state`) folosite peste tot. **Din ultimele 14 commit-uri, 11 au atins CSS-ul.** E cea mai des atinsă zonă partajată din tot proiectul.

### Ce arată istoricul: unde se lucrează de fapt

Am clasificat hunk-urile ultimelor 14 commit-uri pe unități:

```
f883de4 Comenzi: rerandare furnizor          → gantt(1)
687f85e Scoate sistemul de urgență           → hala-render(8) CSS(4) CORE(4) hala-events(2)
03c37ff Panou Furnizori editabil             → comenzi(3) gantt(1) CSS(1)
f46def5 Scoate echipa/oamenii                → hala-render(11) hala-events(7) CSS(5) modals(3) markup(3) CORE(2) wiring(1) comenzi(1)
cfcad69 Registru pliabil                     → (rescriere masivă)
4479fde Registru 9a                          → modals(1) hala-render(1)
50b29f1 Registru: + etapă în modal           → hala-render(5) hala-events(4) CSS(3) modals(2) CORE(1)
f3d93f0 Topbar fundal opac                   → CSS(1)
7f4301f Fix final-review findings            → hala-render(6) hala-events(6) modals(4) CORE(3) CSS(2) markup(1)
2f70a7a Registru: pastilă+halo fază          → hala-render(12) CSS(4) modals(1) markup(1) hala-events(1) CORE(1)
fb49736 Curățare renderProjectCard/canvas    → hala-render(13) CSS(6) modals(3) markup(2) hala-events(2) wiring(1)
2c15e47 Registru: pipeline de etape          → hala-render(2) CSS(1)
5f1e9f3 Registru: antet de proiect           → hala-render(5) hala-events(1) CSS(1)
9d8c6c5 Registru: toolbar sortare            → hala-render(3) markup(1) hala-events(1) CSS(1)
e1c094e normalizeState: registrySort         → CORE(1)
```

Trei concluzii dure:

1. **Doar 3 din 14 commit-uri ating o singură unitate.** Restul sunt cross-cutting prin natura lor.
2. **Munca e concentrată covârșitor în hala/registru (unitățile 6+7, 664 linii).** Gantt, finalizate, reparațiile aproape nu se ating.
3. **Commit-urile de simplificare** („scoate urgența", „scoate echipa") ating 4–8 unități simultan. Astea nu devin paralelizabile prin nicio împărțire de fișiere.

### Seams reale (ordonate după cât de curat se taie)

| Seam | Independență | Observație |
|---|---|---|
| **CSS → `app.css`** | ★★★★★ | Zero dependențe de JS. Tăietură perfect curată. |
| `gantt` (8) | ★★★★ | Doar `state`, `matchesSearch`, date utils, `openProjectModal`. Cel mai curat modul JS. |
| `reparatii` (11) | ★★★★ | Aproape autonom; doar `render`/`setAddButton`/`openRepairModal`. |
| `finalizate` (10) | ★★★★ | Autonom + `loadFinLog` (fetch propriu). |
| `comenzi` (9) | ★★★ | Împarte `findOrderByKey` + `supplierOptionsHtml` cu hala. |
| modale (12) | ★★ | Hub apelat din 5 locuri; scriu în `state` și cheamă `render()`. |
| **hala/registru (6+7)** | ★ | 664 linii, `saveState` 27×, cuplaj markup↔handlere prin `data-*`. **Nu se taie.** |
| nucleu (1–4) + `render()` (5) | — | Prin definiție partajat. |

**Rezumat brutal: singurele module care se desprind curat sunt exact cele la care nu lucrează nimeni. Zona unde se lucrează 80% din timp (registru + CSS) este zona cea mai puțin separabilă.**

---

## 2. Testul decisiv: chiar blochează fișierul unic paralelismul?

Ipoteza de la care a pornit întrebarea e că „agenții nu pot lucra în paralel pentru că orice modificare atinge același fișier". Am testat-o empiric, într-o clonă separată (repo-ul original neatins), simulând doi agenți pe branch-uri diferite:

| Test | Scenariu | Rezultat |
|---|---|---|
| 1 | Agent A modifică linia 1900 (gantt), Agent B linia 2100 (comenzi) — **același fișier** | ✅ **MERGE CURAT** |
| 2 | A și B modifică aceeași secțiune (registru), la **6 linii distanță** | ✅ **MERGE CURAT** |
| 3 | A șterge blocul 1700–1760 (eliminare feature), B editează linia 1730 **în interiorul lui** | ❌ **CONFLICT** |

**Git face merge la nivel de hunk, nu la nivel de fișier.** Un fișier de 2722 de linii nu produce conflicte prin simplul fapt că e mare. Conflictele apar când două modificări ating aceleași linii — iar dacă ating aceleași linii, ele ar ateriza în același modul și după splitare. Testul 3 ar da conflict identic dacă `hala-events.js` ar fi fișier separat.

Deci **premisa e în mare parte falsă la nivel de git**. Blocajele reale ale paralelismului sunt altele:

1. **Costul de context** — orice agent care vrea să înțeleagă ceva citește ~46k tokens. Ăsta e cel mai real cost și splitarea chiar îl rezolvă.
2. **Doi agenți în același working directory** — `Edit` pe același fișier se calcă reciproc. Se rezolvă cu **worktrees / branch-uri**, nu cu splitare. (Repo-ul are deja `feature/furnizori-comenzi`, `feature/layout-densitate`, `backup/live-*` — infrastructura de branch-uri există deja.)
3. **Conflicte semantice** — doi agenți care schimbă forma lui `state` sau comportamentul lui `render()`. Nicio arhitectură de fișiere nu rezolvă asta.
4. **Review-ul** — un diff mare într-un fișier mare e greu de verificat de un owner non-dev.

Splitarea fișierelor fără reducerea dependențelor nu e modularitate reală — e reorganizare vizuală; dacă fiecare fișier depinde în continuare de toate celelalte, modificările se propagă la fel ([ITU Online](https://www.ituonline.com/tech-definitions/what-is-modularity-in-software-design/)). La fel, când mai mulți agenți scriu în aceeași resursă, apar conflicte mai greu de rezolvat decât munca secvențială ([MindStudio](https://www.mindstudio.ai/blog/what-is-claude-code-split-and-merge-pattern-sub-agents-parallel)).

---

## 3. Opțiunile

Context de deploy care schimbă calculul: `firebase.json` are `"public": "."` — **se publică tot rootul repo-ului**, cu `Cache-Control: no-cache` pe `**`. Deci opțiunile 2 și 3 (folder de fișiere statice) necesită **zero modificări** în `.github/workflows/firebase-hosting-merge.yml` și în `firebase.json`. Fișierele noi se deployează automat. Doar opțiunea 4 obligă la schimbarea CI-ului și a `public`.

| | Efort migrare | Ce învață/întreține ownerul | Schimbare deploy | Risc | Câștig paralelism | Reversibilitate |
|---|---|---|---|---|---|---|
| **1. Rămâne un fișier** | zero | nimic | niciuna | zero | **zero** (dar vezi §2 — nici nu e problema principală) | n/a |
| **2. `<script>`-uri simple + namespace `App`** | mediu — de despachetat IIFE-ul, de expus ~40 de simboluri partajate pe un obiect `App`, de fixat ordinea de încărcare | ordinea `<script>`-urilor în `<head>`; „dacă adaugi un fișier, îl adaugi și în index.html" | **niciuna** (folder deja publicat) | mediu — ordinea de încărcare e fragilă și eșuează la runtime, nu la build | mic-spre-mediu | **mare** — concatenezi înapoi |
| **3. ES modules native** | mediu — `import`/`export` explicite, dar `"use strict"` există deja, deci un hazard clasic dispare | ce e un modul; **nu mai poate deschide `index.html` direct de pe disc** (CORS pe `file://`) — are nevoie de un server local | **niciuna** | mediu-mic — erorile apar la încărcare, imediat vizibile | mediu | **mare** — se poate reconcatena |
| **4. Vite / esbuild + npm** | mare — `package.json`, lockfile, config, `dist/` | npm, `node_modules`, un build care poate pica; codul live nu mai e codul din repo | **da** — `npm ci && npm run build` în CI, `"public": "dist"` | **mare** — un build stricat blochează deploy-ul unei aplicații în producție zilnică | mediu (același ca 3) | mică — CI + config + structură |
| **5. Build + framework** | rescriere totală | un framework întreg | da | **inacceptabil** — rescriere de la zero, fără teste, aplicație folosită zilnic | mediu | ~zero |

### Note pe fiecare

**1 — Rămâne un fișier.** Decizia originală (documentată în `PREDARE.md`: „un singur fișier, fără build, fără framework — decizie deliberată pentru că nu se scrie cod manual, totul trece prin AI") e încă în mare parte validă. Contra-argumentul real nu e merge-ul, ci cei 46k tokens de citire și diff-urile greu de revizuit. Marcatorii de secțiune ajută marginal — comentariile `/* ===== */` există deja parțial.

**2 — `<script>`-uri simple.** Paradoxal, e un *regres* față de azi: acum ai un singur IIFE curat, cu zero globale scurse. Opțiunea 2 înseamnă să spargi acea încapsulare și să reintroduci un obiect global întreținut manual, plus dependența de ordinea `<script>`-urilor — exact patternul pe care modulele l-au înlocuit ([2ality](https://2ality.com/2011/04/modules-and-namespaces-in-javascript.html), [8th Light](https://8thlight.com/insights/a-history-of-javascript-modules-and-bundling-for-the-post-es6-developer)). Singurul ei avantaj real față de 3: `file://` continuă să funcționeze.

**3 — ES modules native.** Tehnic cea mai curată variantă fără build. Toate browserele moderne le suportă nativ, fără transpilare ([Contentful](https://www.contentful.com/blog/es6-modules-support-lands-in-browsers-is-it-time-to-rethink-bundling/), [Philip Walton](https://philipwalton.com/articles/using-native-javascript-modules-in-production-today/)). Migrarea e incrementală prin natura ei: convertești un fișier, exporți ce trebuie, imporți unde se folosește, repeți ([Owen Densmore](https://medium.com/@backspaces/es6-modules-part-1-migration-strategy-a48de0b7f112)).

Detalii specifice acestui cod:
- `"use strict"` e deja acolo → zero schimbări de semantică din strict mode.
- Firebase compat rămâne neatins: cele 3 `<script src>` clasice rulează *înaintea* modulelor (modulele sunt deferred by default), deci globalul `firebase` e disponibil când pornește modulul. **Nu e nevoie de migrare la SDK-ul modular.**
- **Costul ascuns:** `<script type="module">` e blocat pe `file://` de politica CORS ([whatwg/html#8121](https://github.com/whatwg/html/issues/8121)). Dacă tu sau agenții deschideți vreodată `index.html` direct de pe disc pentru verificare, workflow-ul ăsta moare și trebuie înlocuit cu un server local (`npx serve`, `python -m http.server`). E o frecare mică, dar exact pe fluxul de testare curent.

**4 — Vite/esbuild.** Ce cumperi: minificare, tree-shaking, TypeScript. Ce câștigi *aici*: aproape nimic. Aplicația are **zero dependențe npm** (Firebase vine din CDN) → tree-shaking-ul n-are ce elimina. 161KB necomprimat, servit cu gzip și `no-cache`, e irelevant pentru un atelier cu câțiva utilizatori. TypeScript ar fi un beneficiu real pentru agenți, dar nu justifică singur un build. Ce plătești: `node_modules` în CI, un lockfile de întreținut, expunere la supply chain, și — cel mai grav — **codul live nu mai e codul pe care ownerul îl poate citi**. Un build stricat oprește deploy-ul unei aplicații folosite zilnic în producție. Setup-urile no-build naive au și ele riscuri de securitate ([Backpack for Laravel](https://backpackforlaravel.com/articles/opinions/do-you-still-need-a-bundler-a-look-at-what-s-changed-in-web-technology)), dar aici nu se importă nimic din afară în afara Firebase din CDN.

**5 — Framework.** Rescriere completă, fără teste, a unei aplicații în uz zilnic, comandată de un owner care nu poate verifica rezultatul citind codul. Nu.

### Calea hibridă / etapizată

Ideea „agent A deține `comenzi.js`, agent B deține `registru.js`" sună bine dar **nu se susține pe datele din §1**: 11 din 14 commit-uri ating CSS-ul partajat, munca e concentrată în registru (unitatea care nu se taie), iar `findOrderByKey` / `supplierOptionsHtml` / `openProjectModal` traversează deja granițele propuse. Ar funcționa pentru gantt/reparații/finalizate — module curate de 190/114/99 linii, adică **15% din cod, la care istoricul arată că aproape nu se lucrează**.

Varianta etapizată care chiar are sens e mai modestă: **scoate CSS-ul, lasă JS-ul întreg** — și reevaluezi.

---

## 4. Verdict

> **Nu transforma aplicația într-un proiect multi-fișier „real". Fă o singură tăietură — CSS-ul — și rezolvă paralelismul prin proces (worktrees + branch-uri), nu prin arhitectură.**

Motivele, în ordinea greutății:

1. **Problema declarată nu e problema reală.** Testele din §2 arată că git face merge curat pe modificări disjuncte în același fișier, inclusiv la 6 linii distanță. Ce blochează agenții e (a) citirea a 46k tokens și (b) doi agenți în același director de lucru — al doilea se rezolvă cu worktrees, care există deja ca practică în repo (`feature/*`, `backup/live-*`).

2. **Seam-urile curate sunt în locul greșit.** Gantt + reparații + finalizate = 403 linii perfect separabile, la care istoricul arată aproape zero activitate. Registrul + CSS = zona în care se lucrează efectiv, și e cea mai puțin separabilă. Splitarea ar produce fișiere frumoase și inutile.

3. **Modificările tale tipice sunt cross-cutting.** „Scoate sistemul de urgență", „scoate echipa/oamenii" — 4 până la 8 unități atinse simultan. Astea rămân serializate indiferent de câte fișiere ai.

4. **Opțiunea 4 pune în joc singurul lucru care merge perfect acum:** deploy-ul. Push pe `main` → site live, fără nimic care se poate strica între ele. Un `npm ci` care pică pe o versiune de Node în GitHub Actions oprește livrarea către un atelier care folosește aplicația zilnic. Beneficiul cumpărat (minificare, tree-shaking pe zero dependențe) e aproape nul aici.

5. **Traiectoria fișierului e descrescătoare.** Sesiunile recente au fost de simplificare — s-au scos features, fișierul s-a micșorat. Nu ești pe o pantă spre 10.000 de linii.

**Dacă totuși vrei modularizare JS, singura opțiune acceptabilă e 3 (ES modules native)** — nu 2 (regres față de IIFE-ul curat de azi), nu 4, nu 5. Dar amân-o până când există un declanșator real (vezi mai jos).

### Declanșatoare pentru reevaluare

Revino la opțiunea 3 dacă apare oricare dintre:
- `index.html` trece de ~4000 de linii;
- se adaugă un tab nou, cu adevărat independent (nu o extensie a registrului);
- ajungi constant la 3+ agenți în paralel pe cod, nu pe zone diferite ale aceleiași funcționalități;
- vrei TypeScript (atunci discuția devine direct despre opțiunea 4, nu 3).

---

## 5. Primul pas concret

**Extrage CSS-ul în `app.css`.**

Exact ce face agentul:
1. Taie liniile 12–572 din `index.html` (conținutul dintre `<style>` și `</style>`, exclusiv tag-urile).
2. Le pune în `app.css`, la rădăcina repo-ului.
3. Înlocuiește blocul `<style>…</style>` cu `<link rel="stylesheet" href="app.css">`, plasat după link-ul de Google Fonts.
4. Verifică live pe preview channel (workflow-ul de PR îl creează automat), pe toate cele 5 tab-uri + modale + ecranul de login.

De ce fix ăsta:
- **Zero risc pentru JS.** Nu se atinge nicio linie de logică.
- **Payoff imediat și măsurabil:** `index.html` scade de la 2722 la ~2165 linii și de la 161KB la ~120KB — cu 26% mai puțin context pentru fiecare agent care citește fișierul.
- **Izolează cea mai contestată suprafață.** CSS-ul e atins în 11 din 14 commit-uri. După separare, un agent care face doar retuș vizual nu mai deschide deloc fișierul cu logica, și invers. Ăsta e singurul câștig real de paralelism disponibil aici, și e cel mai ieftin.
- **Deploy neschimbat.** `"public": "."` publică `app.css` automat. `Cache-Control: no-cache` pe `**` elimină orice problemă de cache. Nu se atinge CI-ul.
- **Reversibil într-un singur pas:** copiezi conținutul lui `app.css` înapoi între `<style>` și `</style>`, ștergi `<link>`. Un commit de revert.
- **Mod de eșec benign:** dacă `app.css` nu se încarcă, aplicația apare nestilizată dar **funcțională** — vizibil instant, fără pierdere de date.

**Pasul 2 (opțional, doar dacă pasul 1 se simte util):** aceeași tăietură pentru `renderGantt` + `ganttPhases` + `ganttPhaseSpans` (liniile 1816–2005), ca `<script>` clasic separat. E modulul cu cel mai mic cuplaj (`state` 2×, `saveState` 0×). Ar fi un test onest al ipotezei „module separate ajută", pe 190 de linii, cu revert trivial. Dacă nici după el nu simți diferența, răspunsul la întrebarea din titlu e definitiv „nu".

**Pasul paralel, care nu ține de cod:** formalizează worktree-uri per agent (`git worktree add`) + branch per task + regula „un singur agent pe registru/CSS la un moment dat". Asta livrează mai mult paralelism decât orice restructurare de fișiere.

---

## 6. Ce NU rezolvă modularizarea

Onest, ca să nu existe așteptări greșite:

- **Modificările în nucleu rămân serializate.** Orice atingere a lui `state`, `saveState`, `normalizeState`, `render()` sau a migrațiilor blochează ceilalți agenți — indiferent în câte fișiere e împărțit codul. `state` e referențiat de 94 de ori.
- **Refactorizările transversale rămân transversale.** „Scoate feature X" atinge markup + CSS + randare + handlere + modale. După splitare ating 5 fișiere în loc de 5 zone. Zero câștig; ba chiar diff-uri mai greu de urmărit.
- **Conflictele semantice nu dispar.** Doi agenți care schimbă independent forma unui `project` se vor bate la runtime, nu la merge. Nicio structură de fișiere nu detectează asta.
- **Nu aduce teste.** Nici opțiunea 3, nici 4 nu creează teste automate singure. Ca să testezi ceva aici ai nevoie de o graniță de date pură (`normalizeState`, migrațiile V3→V8, `ganttPhases`, `stableStringify` — funcții pure, testabile) plus un runner. Opțiunea 4 face runner-ul mai ușor de adăugat (Vitest), dar **acele funcții pot fi testate și azi** copiindu-le într-un fișier de test — dacă vrei teste, ăla e drumul, nu build tooling-ul. Realist: pentru un atelier cu un owner non-dev, verificarea în browser pe canalul de preview rămâne raportul cost/beneficiu corect.
- **Nu reduce cuplajul markup↔handlere.** `attachHalaEvents` găsește elementele prin `querySelectorAll('.lane-del')` etc. Separarea în `registru-render.js` + `registru-events.js` ar crea două fișiere care depind unul de altul printr-un contract *nescris* de clase CSS și atribute `data-*` — mai fragil decât acum, nu mai puțin.
- **Nu ajută la mobil** (`TODO.md`), nu ajută la backup (azi doar exportul manual), nu ajută la migrarea eventuală de pe Firebase compat — care oricum va fi necesară cândva, fiindcă librăriile compat sunt o soluție temporară ce va fi eliminată într-o versiune majoră viitoare ([Firebase docs](https://firebase.google.com/docs/web/modular-upgrade), [RFC #7611](https://github.com/firebase/firebase-js-sdk/discussions/7611)). Aceea e o decizie separată, independentă de structura fișierelor.

---

## Surse

- [Owen Densmore — ES6 Modules, Part 1: Migration Strategy](https://medium.com/@backspaces/es6-modules-part-1-migration-strategy-a48de0b7f112)
- [Philip Walton — Using Native JavaScript Modules in Production Today](https://philipwalton.com/articles/using-native-javascript-modules-in-production-today/)
- [Contentful — ES6 browser support: is it time to rethink bundling?](https://www.contentful.com/blog/es6-modules-support-lands-in-browsers-is-it-time-to-rethink-bundling/)
- [Rolldown — Why do we still need bundlers?](https://rolldown.rs/in-depth/why-bundlers)
- [Backpack for Laravel — Do You Still Need a Bundler?](https://backpackforlaravel.com/articles/opinions/do-you-still-need-a-bundler-a-look-at-what-s-changed-in-web-technology)
- [whatwg/html #8121 — module scripts on `file://`](https://github.com/whatwg/html/issues/8121)
- [Firebase — Upgrade from the namespaced API to the modular API](https://firebase.google.com/docs/web/modular-upgrade)
- [firebase-js-sdk Discussion #7611 — Deprecating Namespaced Compat APIs](https://github.com/firebase/firebase-js-sdk/discussions/7611)
- [2ality — Patterns for modules and namespaces in JavaScript](https://2ality.com/2011/04/modules-and-namespaces-in-javascript.html)
- [8th Light — A History of JavaScript Modules and Bundling](https://8thlight.com/insights/a-history-of-javascript-modules-and-bundling-for-the-post-es6-developer)
- [ITU Online — What Is Modularity in Software Design?](https://www.ituonline.com/tech-definitions/what-is-modularity-in-software-design/)
- [MindStudio — Sub-Agent Parallelism: split-and-merge](https://www.mindstudio.ai/blog/what-is-claude-code-split-and-merge-pattern-sub-agents-parallel)

Testele de merge din §2 au fost rulate într-o clonă separată din scratchpad; repo-ul de lucru nu a fost modificat.
