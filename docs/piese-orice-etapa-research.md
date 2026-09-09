# Piese în orice etapă — studiu de arhitectură

**Întrebarea:** o piesă trebuie să poată fi pusă liber în orice etapă/categorie, nu doar în etapele de tip `piesa`.

**Document de analiză. Nicio linie de cod nu a fost modificată.** Referințele de linie sunt la `index.html` la commit `a053c82`.

---

## 0. Rezumat executiv

1. **Restricția e într-un singur loc**: blocul `else if(kind === 'proiect')` din drop handler, liniile **1139–1153**. Ștergerea lui = 15 linii și piesa se poate pune oriunde.
2. **Dar restricția ține în viață o presupunere care nu e doar în drop handler**: „piesă pe etapă de tip `piesa`" ⇒ `bucketFor` (425), `currentStageInfo` (506), `projectWarnings` (522) și, prin ele, tot semnalul din registru. Ștergerea singură produce **un bug direct**: o piesă trasă pe Montaj devine „piesă neîncepută" (vezi §1).
3. **Plasarea liberă e deja realitate în date, doar că accidentală.** Din 38 de piese din `_livedata.json`: **11 fără `stationId`** (normalizate de `normalizeState:303` pe `p.stations[0]` = Ofertare, etapă de tip `proiect`), **14 pe sentinelul `__montaj__`**, **13 pe etape reale de tip `piesa`**. Adică **25 din 38 (66%) nu stau pe o etapă de tip `piesa`**. Codul deja randează piese în coloane de tip `proiect` (`renderRegPipe:884`).
4. **`PIECE_MONTAJ` e deja mort la scriere.** 5 referințe în tot fișierul (75, 302, 426, 840/865/875/886, 1407) și **niciuna nu e o atribuire** — butonul care îl seta a dispărut odată cu →/↺ (commit `caad176`). Cele 14 piese pe sentinel sunt o stare din care se poate ieși (le tragi afară) dar în care nu se mai poate intra. E o ușă cu sens unic.
5. **Semnalul din registru are deja un fals pozitiv vizibil în date**: proiectul `0007 Clapan` are cartonașul la Montaj și **o piesă încă la Debitare / Laser**, dar registrul scrie `MTJ · la montaj`. Regula corectă („faza = piesa cea mai în urmă") e o schimbare de o funcție și rezolvă asta indiferent de opțiunea aleasă.
6. **Recomandarea: B acum (≈40 de linii), C mai târziu dacă e nevoie. A nu merită făcut ca atare** — pentru că „doar o listă ordonată" nu produce cele trei culori de la sine, are nevoie de o bandă de execuție, adică e C cu banda ascunsă.

---

## 1. Ce presupune modelul actual

Invarianți nescriși, ținuți de cod, nu de structura de date:

| # | Invariant | Cine îl impune |
|---|---|---|
| I1 | `p.stationId` e mereu o etapă de tip `proiect` | select-ul `#f-stage` (1578), drop-ul `PRJ::` (1155 `if(kind !== 'proiect') return`), fallback-ul la ștergere de etapă (1007, 1013) |
| I2 | O piesă stă pe: o etapă `piesa`, o etapă `proiect` **dinaintea** primei `piesa`, sau pe sentinel | drop handler 1135–1153 |
| I3 | Fluxul are ≥1 etapă de fiecare tip | guard-ul de ștergere 1004–1005 |
| I4 | Etapele `piesa` formează o bandă contiguă | **doar convenție** — `addProjectStage:471` inserează după ultima `piesa`, dar butoanele ‹/› (998–1001) mută adiacent **fără verificare de tip** și pot intercala |
| I5 | „Montaj" nu e o etapă anume, e o **poziție**: orice etapă `proiect` după ultima `piesa` (`isPostExecStationFor`, 453–458) | — |
| I6 | Faza nu se stochează, se derivă | `currentStageInfo` (506–520) |

**I4 e deja spart-abil azi.** Asta contează pentru argument: `type` nu e o garanție structurală, e o etichetă pe care restul codului o tratează ca și cum ar fi garanție.

### Cine consumă ce (inventar de apeluri)

| Helper | Definiție | Apelanți |
|---|---|---|
| `bucketFor` | 425 | `projectWarnings:531`, `renderRegHead:764` |
| `currentStageInfo` | 506 | `regPhaseKey:559`, `regSignal:573`, `regCmp:675`, `renderRegHead:761` |
| `pieceFlowFor` | 430 | **doar** `renderPieceCard:902` |
| `piesaStationsFor` | 424 | `pieceFlowFor:434`, `finalizabil:772` |
| `firstPiesaIndexFor` | 441 | `pieceFlowFor:432`, `lastProiectBefore…:448`, drop handler 1140 |
| `lastPiesaIndexFor` | 440 | `isPostExecStationFor:454`, `addProjectStage:471`, `currentStageInfo:512` |
| `isPostExecStationFor` | 453 | `finalizabil:772`, `renderRegPipe:839`, drop handler 1142 |
| `nextProiectStationFor` | 442 | `finalizabil:771` |
| `lastProiectBeforeFirstPiesaFor` | 447 | **0 apelanți — cod mort** |
| `PIECE_MONTAJ` | 75 | 302, 426, 840/865/875/886, 1407 — **toate citiri** |

Notă suplimentară: clasele `phase-*` returnate de `currentStageInfo` nu mai colorează nimic direct — CSS-ul `.proj-wrap.phase-*` / `.pct-stage.phase-*` (app.css 154–168) e **mort** (zero apariții `proj-wrap`/`pct-stage` în `index.html`). Singurul consumator vizual e traducerea `regPhaseKey` → `ph-ante`/`ph-exec`/`ph-montaj`/`ph-done` (app.css 228–231).

---

## 2. Analiza pe cele 10 puncte

### 1. `bucketFor` (425–429)

```js
if(stationId === PIECE_MONTAJ) return 'montaj';
var st = stationByIdFor(p, stationId);
return (st && st.type === 'piesa') ? 'exec' : 'pregatire';
```

| Unde e piesa | Azi | Corect după eliberare |
|---|---|---|
| Ofertare / Măsurători / Proiectare | `pregatire` | `pregatire` ✔ neschimbat |
| Debitare / Sudură / Polizare / Finisaj | `exec` | `exec` ✔ |
| **Montaj (stația)** | **`pregatire`** ✘ | `montaj` |
| sentinel `__montaj__` | `montaj` | (dispare, vezi §4) |
| `stationId` null / inexistent | `pregatire` | irelevant — `normalizeState:302` îl resetează la încărcare |

**Asta e ruptura numărul unu.** O piesă trasă pe Montaj cade pe ramura `else` și e numărată drept „neîncepută" — exact invers față de adevăr. Se propagă imediat în `projectWarnings:531` („N piese neîncepute"), în banda ⚠ (813), în `regSignal` (`k:'blk'`, 572) și în `regSeverity` (+9, 581). Un drag înainte ar aprinde alarma.

`'exec'` **încă înseamnă ceva** — „piesa e în banda de producție" — dar sensul trebuie mutat de pe tip pe **poziție**. Forma corectă, indiferent de opțiune:

```js
function bucketFor(p, stationId){
  if(stationId === PIECE_MONTAJ) return 'montaj';              // doar cât timp mai există sentinel
  if(isPostExecStationFor(p, stationId)) return 'montaj';      // + 1 linie = fix-ul
  var st = stationByIdFor(p, stationId);
  return (st && st.type === 'piesa') ? 'exec' : 'pregatire';
}
```

O linie. Sub opțiunile C/A, cele trei ramuri devin aritmetică de indici pe bandă.

### 2. `currentStageInfo` (506–520)

Patru ramuri, în ordine: cartonaș pe etapă `piesa` (defensiv) → cartonaș după ultima `piesa` = montaj → **vreo piesă pe o etapă `piesa` ⇒ „Execuție"** → altfel etapa cartonașului.

**Nu greșește dacă piesa e parcată pe Măsurători** — euristica se uită doar în `piesaIds` (515–516), deci o piesă pe o etapă `proiect` e ignorată. Bine.

**Dar greșește în alte două feluri:**

- *(nou, după eliberare)* toate piesele trase pe Montaj, cartonașul încă la Proiectare ⇒ `piesaIds` gol ⇒ fază `ante` / albastru / `PRG`. Un proiect gata de montaj citit ca „în proiectare".
- *(deja azi, în date)* euristica e **optimistă**: se declanșează la prima piesă ajunsă pe podea. Combinat cu ramura de la 514 („cartonașul după ultima `piesa` ⇒ montaj"), proiectul `0007 Clapan` — cartonaș la Montaj, 4 piese pe sentinel, **1 piesă la Debitare** — apare în registru ca `MTJ · la montaj`. Piesa rămasă la laser e invizibilă în semnal.

**Ce ar trebui să însemne faza când piesele sunt împrăștiate.** Două reguli candidate:

| Regulă | Răspunde la întrebarea | Efect pe `0007 Clapan` |
|---|---|---|
| (a) piesa cea mai **avansată** (comportamentul de azi) | „a început atelierul?" | `MTJ` — greșit |
| (b) piesa cea mai **în urmă** (ideea „M5") | „unde e frontul real / ce mă blochează?" | `EXE · la debitare` — adevărat |

Registrul e o listă de „la ce mă uit acum", deci răspunsul util e **codașul**, nu fruntașul. Recomand (b), cu etapa cartonașului ca fallback când proiectul n-are piese. E o schimbare de ~10 linii într-o singură funcție și e **ortogonală** față de eliberarea plasării — se poate livra separat și se poate da înapoi separat.

Verificare pe datele reale (ce s-ar schimba în registru):

| Proiect | Azi | Cu regula (b) |
|---|---|---|
| 0004 Catena (5× Sudură, card la Proiectare) | EXE | EXE — neschimbat |
| 0008 Vespasian (Finisaj + Polizare) | EXE | EXE — neschimbat |
| 0012 Șerban (3× montaj + 1× Finisaj) | EXE | EXE — neschimbat |
| **0007 Clapan** (4× montaj + 1× Debitare, card la Montaj) | **MTJ** | **EXE** ← singura schimbare vizibilă |
| 0001 Bugnariu (2× Finisaj, card la Montaj) | MTJ | EXE |

Deci: două rânduri din cincisprezece se corectează. Impact mic, adevăr mai bun.

### 3. `pieceFlowFor` (430–435)

`pre-proiect` + toate etapele `piesa`. **Un singur apelant** (`renderPieceCard:902`), unde `flowIdx` servește exclusiv la `isBack = flowIdx === 0 && inProiectStage` (906), care pune clasa `.back-to-design` = chenar stâng albastru (app.css:422). Butoanele →/↺ care foloseau fluxul au fost scoase; drag-ul e singura mișcare.

Deci: **„fluxul" ancorat în `firstPiesaIndexFor` nu mai are consumatori reali.** Ordinea coloanelor din pipeline vine din `stationsFor(p)` (`renderRegPipe:834`), **nu** din `pieceFlowFor` — deci ordinea nu e afectată de nimic din discuția asta.

După eliberare, „fluxul unei piese" = pur și simplu `stationsFor(p)`. Corect: se șterge `pieceFlowFor` și `flowIdx` se calculează pe lista completă (sau se renunță complet la `isBack`, care oricum marchează un singur caz cosmetic). **−6 linii.**

### 4. Sentinelul `PIECE_MONTAJ` (75)

**Poate fi retras, și ar trebui, indiferent de opțiune.** Argumente:

- **E deja mort la scriere** (0 atribuiri în tot fișierul). Cele 14 piese pe sentinel sunt legacy; le poți trage afară dar nu le mai poți pune înapoi. E o stare cu sens unic — jumătate stricată deja.
- Odată ce o piesă poate sta pe stația Montaj, „piesă la montaj" e exprimabil **prin poziție**. Sentinelul devine un al doilea mod de a spune același lucru, invizibil pentru `stationByIdFor`, pentru calculul `thin`, pentru lane-uri și pentru orice indexare pe flux.
- E singurul lucru care face coloana Montaj un caz special în `renderRegPipe`.

**Ce se șterge odată cu el:**

| Loc | Ce dispare |
|---|---|
| 426 | prima linie din `bucketFor` |
| 302 | excepția din guard-ul de normalizare |
| 839–840 | `isMontajCol` + `montajPieces` |
| 862–865, 873–876 | ramura duplicat din lane-uri (piese la stație **+** piese pe sentinel) |
| 883–887 | ramura `proiect` din `col-body` — devine identică cu cea `piesa` |
| 844 | termenul `+ montajPieces.length` din `pieceCount` |
| 1407 | ternarul din `renderFinalizatDetail` |

`renderRegPipe` pierde ~15 linii și cea mai urâtă asimetrie a lui: azi are **patru** ramuri (lane/non-lane × proiect/piesa) care după retragere devin **două** (lane/non-lane).

**Migrare** (deterministă, fără timestamp-uri — vezi §10):

```js
// în normalizeState, pe fiecare proiect:
// __montaj__  ->  prima etapă de după ultima etapă de piesă, altfel ultima etapă
```

**Ce se rupe dacă retragerea se face brutal:** un tab vechi rămas deschis cu codul v8 rescrie datele migrate cu sentinelul la loc (e un singur nod RTDB partajat, clienții nu sunt gate-uiți pe versiune). **Asigurare ieftină: se păstrează calea de *citire* a sentinelului (linia din `bucketFor` + maparea din `normalizeState`) încă un ciclu de release** și se șterge doar calea de scriere/randare specială.

### 5. `renderRegPipe` (832–899)

| Element | Linii | Efectul plasării libere |
|---|---|---|
| `thin` | 843–846 | **Niciunul.** `piecesHere` (843) filtrează pe `stationId`, fără test de tip — deja agnostic. O piesă pe Ofertare îngroașă deja coloana. |
| `has-pieces` / `has-many` | 844–845, 847 | Neschimbate; doar termenul `+ montajPieces.length` dispare cu sentinelul |
| `is-here` | 841 | `station.type === 'proiect' && p.stationId === station.id` — corect **atâta timp cât I1 ține**. Dacă se eliberează și cartonașul de proiect (opțiunea A), devine `p.stationId === station.id`, altfel coloana nu primește nici bara accent, **nici mânerul de drag (848)** → proiectul rămâne blocat acolo. Capcană de reținut. |
| caz special Montaj | 839–840, 862–865, 873–876, 883–887 | Se prăbușește complet cu sentinelul |
| clasa `.proiect` / `.piesa` pe cutie | 847 | Doar cosmetică: `background: rgba(255,255,255,.025)` pe `.piesa` (app.css:182). Se poate păstra ca bandă vizuală sau arunca. |
| `data-kind` | 871, 882 | Există **exclusiv** ca să alimenteze ramificarea din drop handler. Dispare odată cu ea (sau rămâne doar pentru drop-ul `PRJ::`). |
| „—" (col-empty) | 872, 887, 891 | Mică asimetrie existentă: ramura `proiect` (887) ascunde „—" și când e cartonașul acolo; ramura `piesa` (891) nu. Se unifică gratuit odată cu §4. |

**Concluzie: pipeline-ul e deja aproape complet agnostic la tip.** Singurele lucruri specifice tipului sunt caz-special-Montaj (moare cu sentinelul) și `is-here` (rămâne corect cât timp cartonașul e ancorat).

### 6. `projectWarnings` + semnalul din registru

`projectWarnings` (522–534) — „N piese neîncepute" apare doar dacă `nPre > 0 && nOther > 0` (531–532), adică piesele sunt **împărțite** între `pregatire` și restul. Cu `bucketFor` nereparat, o piesă pe Montaj intră în `nPre` ⇒ avertisment fals. Cu `bucketFor` pozițional, avertismentul își păstrează exact sensul: „unele piese au plecat, N n-au plecat" — și devine **mai** corect, pentru că „neîncepută" înseamnă acum „înainte de prima etapă de execuție", nu „pe o etapă care nu e marcată `piesa`".

Lanțul din registru, punct cu punct:

| Funcție | Linii | Efect |
|---|---|---|
| `regBucket` | 546–555 | **Zero.** Pur pe termen. Nicio opțiune nu-l atinge. |
| `regPhaseKey` / `regPhaseTag` | 557–563 | Maparea rămâne identică; se schimbă doar ce returnează `currentStageInfo` |
| `regSignal` | 566–575 | Prioritatea `livrat → întârziat → warning → „la <etapă>"` rămâne. Se schimbă (i) dispariția warning-ului fals de la §1, (ii) textul „la <etapă>" dacă se adoptă regula codașului (`la debitare` în loc de `la montaj` pentru Clapan) |
| `regSeverity` | 576–584 | Indirect: numără `projectWarnings` (+9 fiecare). Un warning fals mai puțin = ordonare mai corectă la sortarea „Urgență" |
| `regCmp` sort „Fază" | 674–677 | Citește `cls` — forma nu se schimbă |
| margine + tag (`rr-edge`, `rr-tag`) | 727–728, app.css 226–231 | Culoarea urmează `regPhaseKey`, deci urmează `currentStageInfo` |

### 7. Drop handler (1123–1164)

Se șterge **blocul 1139–1153** în întregime — tot `else if(kind === 'proiect')`. Ramura pentru piesă devine cele două linii de la 1136–1137, executate necondiționat.

**Conflictul e real și e argumentul cel mai tare pentru schimbare:** liniile 1142–1146 spun că a trage o **piesă** pe Montaj mută **tot proiectul** acolo. Gestul e supraîncărcat și face imposibil exact lucrul cerut („pune piesa asta la montaj"). După ștergere, drag-ul de piesă mută piesa, punct.

**Ce se pierde:** scurtătura „avansează proiectul la montaj trăgând ultima piesă". Rămâne drag-ul de proiect din capul coloanei (`data-proj-drag`, 1052–1063 → drop 1154–1161), care face deja fix asta. Sub opțiunea A, unde cartonașul n-ar mai avea poziție, întrebarea dispare de tot.

Guard-ul `if(kind !== 'proiect') return` de la 1155 (drop `PRJ::`) rămâne dacă cartonașul rămâne ancorat (I1); dispare sub A.

### 8. `finalizabil` (771–772)

```js
var next = nextProiectStationFor(p, p.stationId);
var finalizabil = isPostExecStationFor(p, p.stationId) || (!next && piesaStationsFor(p).length === 0);
```

**Ambii termeni privesc poziția cartonașului, nu piesele.** Deci e **deja independent** de unde stau piesele → **neschimbat sub B**. Coerent.

Are însă o gaură care exista și înainte: nimic nu împiedică finalizarea cu piese rămase în urmă — `0007 Clapan` e finalizabil acum, cu o piesă la laser. Plasarea liberă face situația mai probabilă, nu mai puțin. Îmbunătățire ieftină și ortogonală: **nu bloca**, doar `confirm('Mai sunt N piese care n-au ajuns la montaj. Finalizezi oricum?')`.

Sub A (fără poziție de cartonaș): `finalizabil` devine „toate piesele sunt în ultima bandă", sau — mai bine — butonul e mereu vizibil cu același `confirm`.

### 9. Editorul de etape + modalul de proiect

Unde își câștigă `type` existența azi:

| Loc | Linii | Rol | Supraviețuiește? |
|---|---|---|---|
| poziția de inserare a etapei noi | `addProjectStage:471` | `piesa` → după ultima `piesa`; `proiect` → la coadă | Sub B: da. Sub A/C: inutil — o singură „+ etapă" care adaugă la coadă + ‹/› pentru poziționare |
| textul explicativ al celor două butoane | 1591–1592, 467 | „execuție, urmărită piesă cu piesă" vs „proiectare, la nivel de proiect" | Valoare pedagogică reală pentru proprietar; sub A/C se pierde și trebuie înlocuit cu marcarea benzii |
| guard „minim o etapă de fiecare tip" | 1004–1007 | + fallback `sameType` la ștergere | Sub A/C: „minim o etapă" + fallback = vecinul |
| select-ul „Etapă curentă" | 1578–1584 | listează doar etape `proiect` | Sub A: listează tot, sau dispare |
| chip-urile din modal | 1627, app.css 541–542 | colorate pe tip | Pură decorație |

**Verdict:** sub **B**, `type` rămâne util ca *hint* — dar devine un hint care **conduce în tăcere culorile**. Asta e datoria explicativă a opțiunii B (vezi §3-opțiuni). Sub **A**, `type` devine complet vestigial și ar trebui scos din model; sub **C** e înlocuit de ceva onest (`execFrom` / `execTo`).

Reamintire: ‹/› (998–1001) poate deja intercala tipurile, deci `type` nu garantează nici azi banda contiguă pe care `firstPiesaIndexFor` / `lastPiesaIndexFor` o presupun.

### 10. `normalizeState`, migrare, sync, undo

`normalizeState:299–306`: o piesă cu `stationId` inexistent (și diferit de sentinel) → `p.stations[0]`, `lane = null`. **Fix aici e dovada că plasarea liberă e deja permisă de model**: 11 piese din datele live intră pe ramura asta și ajung pe Ofertare, o etapă `proiect`. Ce lipsește nu e suportul, e **intenționalitatea**.

**Migrări necesare:**

| Opțiune | Migrare |
|---|---|
| B fără retragerea sentinelului | **Niciuna** |
| B cu retragerea sentinelului | `__montaj__` → prima etapă după ultima `piesa` (fallback: ultima etapă) |
| C | + `execFrom` / `execTo` per proiect, derivate determinist din `type`: prima și ultima etapă `piesa` |
| A | idem C (banda tot e necesară) + eventual `delete p.stationId`, ceea ce e **distructiv** — mai bine se păstrează și se ignoră |

**Sync / undo — riscuri:**

- **`stableStringify` (92–103) nu se atinge sub nicio opțiune.** E un serializator generic, nu știe nimic despre model. **Zero risc de semnătură.** Ce se schimbă e *conținutul*: orice migrare făcută la normalizare produce un diff la prima salvare de după deploy.
- Lecția e deja în `ITERATII.md:17` (C4/B3): o sămânță pusă la normalizare cu o valoare **stabilă** e o migrare unică și cuminte; una pusă cu `Date.now()` re-stampilează la fiecare undo/redo și inundă sync-ul. **Toate migrările propuse aici sunt deterministe — niciun timestamp.**
- Migrarea trebuie pusă în **`normalizeState`**, nu doar într-un `migrateV8toV9`, pentru că `applySnapshot` (346) și listener-ul live re-trec prin `resolveVersioned`. Altfel un undo poate învia sentinelul.
- Bump `DATA_VERSION` 8→9 + `migrateV8toV9` pentru igienă, dar guard-ul din `normalizeState` e cel care protejează efectiv de un tab vechi (vezi asigurarea din §4).

---

## 3. Opțiuni de design

### A — Se retrage distincția de tip

Stațiile devin `{id, name, lanes?}`, o listă ordonată simplă. Cartonașul de proiect stă și el pur și simplu la o stație. Faza se derivă din poziția piesei celei mai în urmă.

**Problema centrală, care nu e evidentă până nu scrii codul:** o listă ordonată **nu produce trei culori de la sine**. `ante` / `exec` / `montaj` au nevoie de două granițe. Variantele:

- **A1 — granițe implicite:** prima etapă = ante, ultima = montaj, restul = exec. Pe un flux de 8 etape (Ofertare, Măsurători, Proiectare, Debitare, Sudură, Polizare, Finisaj, Montaj) asta pune Măsurători și Proiectare în „execuție". Fals.
- **A2 — granițe explicite:** exact opțiunea C.

Deci **A fără C e sub-specificat, iar A cu C *este* C.** Concluzie analitică: A nu e mai simplu decât C, e C cu banda ascunsă sub covor.

- **Se schimbă:** `bucketFor` (rescris), `currentStageInfo` (rescris), `pieceFlowFor` (șters), `piesaStationsFor` / `firstPiesaIndexFor` / `lastPiesaIndexFor` / `nextProiectStationFor` / `isPostExecStationFor` / `lastProiectBeforeFirstPiesaFor` (șterse sau reduse la aritmetică de bandă), `renderRegPipe` (−20), drop handler (−15), editor de etape (−15), modal (−8), `normalizeState` (+15). **~150 de linii atinse, ~10 funcții, toate derivările deodată.**
- **Migrare:** sentinel + bandă + eventual poziția cartonașului.
- **Culoarea fazei:** din poziția piesei celei mai în urmă.
- **`PIECE_MONTAJ`:** moare.
- **UX:** model mental curat („etape, piese, trage-le unde vrei"), dar cartonașul de proiect are nevoie de `is-here` eliberat (§5), altfel se blochează.
- **Risc: mare.** Rescrie simultan tot ce alimentează semnalul din registru, livrat acum două zile.

### B — `type` rămâne hint, nu se mai impune

Modelul nu se schimbă. Se șterge doar constrângerea și se definește explicit comportamentul cazurilor noi.

- **Se schimbă:**
  - drop handler **1139–1153** → șters (**−15**)
  - `bucketFor` **425–429** → `+1 linie` (`isPostExecStationFor` ⇒ `'montaj'`) — repară falsul „piesă neîncepută"
  - `renderPieceCard` **902–906** → `flowIdx` pe `stationsFor` sau `isBack` scos (**−4**)
  - `pieceFlowFor` **430–435** → șters (**−6**)
  - `PIECE_MONTAJ` retras: migrare în `normalizeState` (**+4**) + `renderRegPipe` colapsat (**−15**)
  - `currentStageInfo` — **opțional**, separat: regula codașului (**~10 linii într-o funcție**)
  - editor de etape + modal: **neatinse**
- **Total: ~40 de linii, 4 funcții** (60 dacă intră și regula codașului).
- **Migrare:** doar sentinelul, deterministă, cu citirea păstrată un ciclu.
- **Culoarea fazei:** derivare neschimbată (cartonaș + euristica „piese pe podea"), plus fix-ul pentru Montaj.
- **`PIECE_MONTAJ`:** **se retrage.** Argument: e deja mort la scriere și cu sens unic; păstrarea lui înseamnă două moduri de a spune „piesă la montaj", dintre care unul invizibil pentru `stationByIdFor`, pentru `thin` și pentru orice indexare — exact în momentul în care celălalt mod devine natural și accesibil. E un duplicat strict mai slab, purtat pentru 14 rânduri legacy.
- **UX pipeline:** neschimbat vizual; coloanele de tip `proiect` primesc piese și se îngroașă singure (logica `thin` e deja agnostică).
- **UX registru:** o singură schimbare — dispare un warning fals. Restul semnalului rămâne identic.
- **Risc: mic.**
- **Slăbiciune (onest):** modelul mental rămâne pe două niveluri. Proprietarul poate pune o piesă pe Ofertare, dar `type` continuă să conducă în tăcere bucket-urile, textul butoanelor „+ etapă", guard-ul de ștergere și select-ul din modal. Regula „poți pune piesa oriunde, dar culorile știu doar de etapele de execuție" e greu de spus cu voce tare. E datorie explicativă, nu bug.

### C — Flux plat + benzi de fază definite de utilizator

Stațiile pierd `type`. Fiecare proiect (sau șablonul global) primește `execFrom` / `execTo` — două id-uri de etapă care marchează banda de execuție. Totul se derivă din aritmetică de indici:

```
band(p, stationId):  i = idx(stationId)
                     i <  idx(execFrom) -> 'pregatire'
                     i <= idx(execTo)   -> 'exec'
                     altfel             -> 'montaj'
```

- Face **explicit** ceea ce `type` codifică implicit azi (`execFrom` = `firstPiesaIndexFor`, `execTo` = `lastPiesaIndexFor`).
- **Repară scurgerea I4**: o bandă stocată ca două id-uri nu poate fi coruptă de butoanele ‹/›, spre deosebire de banda dedusă din tip.
- **Se schimbă:** aceeași suprafață ca A, plus un mic UI de setare a benzii (două marcaje pe capetele de coloană din pipeline, sau o pereche de select-uri în modal).
- **Migrare: trivială și perfect deterministă** — `execFrom` = prima etapă `piesa`, `execTo` = ultima. Se calculează din datele existente, fără input de la utilizator.
- **Culoarea fazei:** banda piesei celei mai în urmă; etapa cartonașului ca fallback când nu există piese.
- **`PIECE_MONTAJ`:** moare.
- **Risc: mediu.** Costul real e UI-ul de setare a benzii — un buton pe care proprietarul s-ar putea să nu-l atingă niciodată. Dacă nu-l atinge, C se comportă exact ca B cu o migrare în plus.

---

## 4. Recomandare

### **B acum. C mai târziu, doar dacă apare nevoia. A — niciodată ca atare.**

**Traseu pe pași, fiecare livrabil și reversibil separat:**

| Pas | Ce | Mărime | De ce separat |
|---|---|---|---|
| **B0** | Șterge restricția din drop handler (1139–1153) **+** linia `isPostExecStationFor ⇒ 'montaj'` din `bucketFor` | **~16 linii** | Ăsta e **răspunsul complet la întrebarea pusă**. Fără linia din `bucketFor` introduce un bug — cele două merg împreună, nimic altceva nu trebuie să meargă cu ele. |
| **B1** | Retrage `PIECE_MONTAJ` (migrare + citire păstrată un ciclu) + colapsează ramura Montaj din `renderRegPipe` + șterge `pieceFlowFor` și `lastProiectBeforeFirstPiesaFor` (cod mort) | **~25 linii, net negativ** | Curățenie pură, zero schimbare de comportament vizibil. Se poate face în orice moment după B0. |
| **B2** | `currentStageInfo` urmează **piesa cea mai în urmă** | **~10 linii, o funcție** | Singura îmbunătățire *semantică* reală. Schimbă ce citește proprietarul în registru → merită livrat singur, ca să se vadă dacă îi place. |
| **C** | `type` → `execFrom` / `execTo` | ~150 linii | Doar dacă apar etape care nu încap în cele trei găleți. |

### Justificare

**1. Împotriva fluxului real de lucru al proprietarului.** Urmărește piesele individual prin debitare/sudură/polizare/finisaj și coordonează montajul pe teren. Modelul pe piese e corect și nu se pune în discuție. Ce cere el e o singură restricție de drag&drop — și plasarea liberă **e deja 66% reală în datele lui** (11 piese normalizate pe Ofertare, 14 pe sentinel). B **legalizează ce se întâmplă deja**, nu introduce un concept nou.

**2. Simplitatea modelului mental.** Contra-argument onest pentru B: rămâne pe două niveluri (§3-B, „slăbiciune"). Dar A **nu** cumpără simplitatea promisă — cumpără o bandă implicită greșită (A1) sau chiar C (A2). Singura opțiune care simplifică *cu adevărat* modelul e C, și C are un cost de UI pe care încă nimeni nu l-a cerut.

**3. Mărimea și riscul.** B0 = 16 linii, un singur `if` șters și un `if` adăugat, verificabil prin drag în pipeline în 30 de secunde. A/C = ~150 de linii peste 10 funcții care alimentează *toate* semnalele vizibile.

**4. Ce face fiecare opțiune semnalului din registru, tocmai livrat.** Registrul (rând strâns → tag `PRG/EXE/MTJ` + margine colorată + un singur semnal) e proaspăt și proprietarul abia învață să-l citească. **B0/B1 îl schimbă într-o singură direcție: elimină un fals „piesă neîncepută".** Restul rândurilor rămân identice bit cu bit. **B2 schimbă exact două rânduri din cincisprezece** (`0007 Clapan`, `0001 Bugnariu`), și le schimbă **spre adevăr** — Clapan citește azi „la montaj" cu o piesă încă la laser. A/C ar re-deriva simultan fiecare tag, fiecare margine, fiecare semnal, imediat după ce a fost livrat. Motiv suficient de puternic în sine.

### De urmărit când se implementează

- **`is-here` (841)** e capcana ascunsă: dacă vreodată se eliberează și cartonașul de proiect, coloana lui nu mai primește nici bara accent, nici mânerul de drag (848) → proiect blocat, fără cale de ieșire prin UI. `type === 'proiect'` trebuie scos **din ambele** locuri simultan.
- **Butoanele ‹/› (998–1001)** pot deja intercala tipuri și rup banda pe care `firstPiesaIndexFor`/`lastPiesaIndexFor` o presupun. B trăiește cu asta (ca și azi); C o repară.
- **Textul guard-ului de ștergere (1005, 1012, 1022)** vorbește despre „etapă de tip piesă/proiect". După B0 mesajele rămân corecte tehnic, dar mai puțin adevărate pentru utilizator — merită reformulate în același commit.
- **`finalizabil`** rămâne coerent, dar merită `confirm`-ul cu piese rămase în urmă (§8) — 3 linii, ortogonal.
- **Mobil:** de la commit `caad176` drag-ul e **singura** cale de a muta o piesă, iar plasarea liberă îl face și mai încărcat. `TODO.md` marchează mobilul ca nerezolvat. Nu blochează nimic din ce e mai sus, dar datoria crește.

---

## 5. Anexă — inventar de linii, opțiunea B completă (B0+B1+B2)

| Fișier / funcție | Linii | Acțiune | Δ |
|---|---|---|---|
| drop handler, ramura `kind === 'proiect'` | 1139–1153 | șters | −15 |
| `bucketFor` | 425–429 | +1 linie `isPostExecStationFor` | +1 |
| `bucketFor` | 426 | linia sentinelului — **păstrată un ciclu**, apoi ștearsă | −1 (mai târziu) |
| `pieceFlowFor` | 430–435 | șters | −6 |
| `lastProiectBeforeFirstPiesaFor` | 447–452 | șters (cod mort, 0 apelanți) | −6 |
| `renderPieceCard` | 902–906 | `flowIdx` pe `stationsFor`, sau `isBack` scos | −4 |
| `renderRegPipe` | 839–840, 862–865, 873–876, 883–887 | colapsat: 4 ramuri → 2 | ≈ −15 |
| `renderFinalizatDetail` | 1407 | ternarul sentinelului scos | −1 |
| `normalizeState` | 299–306 | + migrarea sentinelului | +4 |
| `currentStageInfo` (B2) | 506–520 | regula piesei celei mai în urmă | ≈ +2 net |
| `app.css` | 154–168 | CSS mort (`.proj-wrap.phase-*`, `.pct-stage.phase-*`) — de șters oricând | −15 |

**Net: ~−55 de linii în `index.html`, ~−15 în `app.css`.** Aplicația iese din schimbare **mai mică** decât a intrat.

---

*Mockup-ul opțional (`scratchpad/piese-liber.html`) nu a fost construit: `scratchpad/` nu există în repo, iar concluzia nu depindea de el — dovada decisivă a venit din `_livedata.json`, unde 66% din piese stau deja în afara etapelor de tip `piesa`. Nimic nu a fost commis, publicat sau modificat în afara acestui fișier.*
