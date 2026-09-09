# Coloana „Sarcini" din Planificare — de ce nu merge și ce punem în loc

**Autor:** Nick + Claude
**Data:** 2026-09-09
**Context:** După ce Faza 1–3 din tab-ul Planificare au fost livrate, Nick a semnalat
că derivarea de sarcini din coloana stângă e „~50% din timp inutilă" — carduri de
tipul „⚠ 0023 întârziat 8z" nu sunt sarcini și nu interesează pe nimeni din atelier.

---

## 1. Diagnostic — de ce a ieșit prost

Coloana stângă a fost construită ca **generator de sarcini**: `deriveTasks(state, iso)`
scanează proiectele și scoate carduri pe care le tragi pe oameni. Eșuează din patru
motive, în ordinea gravității:

### 1.1 Aplicația știe *stare*, nu *intenție*
Poate vedea „termenul lui 0023 a trecut acum 8 zile". Nu poate ști dacă asta înseamnă
„sună clientul", „grăbește sudura", „e ok, clientul a amânat" sau „nimic". Doar Nick
știe. Un card „⚠ întârziat 8z" mută decizia înapoi la Nick — deci n-a economisit nimic,
doar a ocupat spațiu.

### 1.2 Regulile scot ne-acțiuni
„⚠ întârziat Nz" și „Urmărit comandă X" **descriu o situație**, nu un verb + obiect pe
care-l face cineva. Sunt alarme, nu sarcini. Le-am pus în aceeași coloană cu „Sudat X"
și au diluat tot.

### 1.3 Regulile acționabile sunt prea grosiere
„Sudat 0011" — care piese? Toate? Cele 2 care au venit? Cât timp? Un sudor care
citește „Sudat 0011" pe foaia ORGANIZARE nu află nimic ce nu știa deja. Sarcinile reale
din foile de hârtie sunt specifice: „Sudat rame tâmplării Catena și oglinzi",
„Debitat și/sau îndoit ce mai e Orsay".

### 1.4 Modelul rămâne în urmă de realitate
Piesele sunt de fapt **ansambluri** din mai multe sub-piese (vezi
`docs/` + memoria proiectului); nimeni nu mută cartonașele în timp real; deci un card
„Debitat X (1 piesă neîncepută)" poate fi despre o piesă deja debitată în atelier.
Cifrele exacte („3 la debitare · 2 la sudură") sunt **încrezător greșite** o parte din
timp.

### 1.5 Concluzie
Ideea de derivare n-a fost greșită ca intenție, dar a **depășit ce poate aplicația**.
Reparația nu e „reguli mai bune" — e să **coborâm derivarea** de la „generează sarcini"
la „semnalează ce cere atenție", și să lăsăm Nick să scrie sarcinile.

---

## 2. Ce știe aplicația de încredere

| Date | Cât de actuale | Sursă |
|---|---|---|
| Faza proiectului (proiectare / execuție / montaj / livrat) | bune — Nick mută cartonașul | `currentStageInfo` |
| Distribuția pieselor pe bucket-uri (pregătire / exec / montaj) | *aproximative* — vezi 1.4 | `bucketFor` |
| Termen limită | reale — Nick le setează | `p.termen` |
| Comenzi: text, furnizor, stare, zi de livrare | reale — întreținute în tab-ul Comenzi | `p.orders[]` |
| Reparații: deschisă / în lucru / rezolvată | reale | `state.repairs[]` |
| Avertismente („N comenzi neprimite", „N piese neîncepute") | derivate dar oneste | `projectWarnings` |
| Adresă montaj + telefon client | reale (nou) | `p.adresaMontaj`, `p.telClient` |

**Un digest de stare stă pe teren solid. O listă de sarcini nu.**

---

## 3. Ce-i trebuie de fapt lui Nick

Din cele 6 foi ORGANIZARE reale, procesul de seară al lui Nick e:

1. Merge proiect cu proiect, aproximativ după urgență.
2. Pentru fiecare: *care e starea? ce urmează? cine face?*
3. Scrie sub numele omului.
4. Plus lucrurile fixe (drumurile lui Narcis, comenzile lui Gabi, curățenia).
5. Plus ce nu-i în sistem (comisioane, prototipuri, „ce o mai fi").

Deci treaba coloanei stângi: **pentru fiecare proiect activ, arată-i lui Nick tot ce
altfel ar căuta prin 3 tab-uri, într-un rând scanabil, sortat ca cele care cer atenție
să fie sus. Apoi dă-te la o parte ca să scrie.**

Punctul cheie pe care l-am ratat prima dată: **în cele mai multe zile, cele mai multe
proiecte nu cer nimic.** Un digest bun ascunde acele proiecte, nu le enumeră starea.

---

## 4. Dimensiuni de decis

1. **Unitatea:** rând-per-proiect (D1), grupare pe stare (D2), refolosit registrul (D3),
   delta față de ieri (D4).
2. **Ce arată un rând — și mai ales ce lasă afară.** Prea mult = alt zid.
3. **Linia „ce urmează":** o păstrăm? formulată cum? Poate distribuția pieselor + faza
   spun deja destul.
4. **Cum scrie Nick din ea:** composer inline per proiect? zonă de text per om cu
   autocomplete pe numele proiectelor? ambele?
5. **Sortare / grupare:** urgență pură? pe fază? „cere atenție" vs „curge"?
6. **Relația cu foaia ORGANIZARE:** digestul e vederea de lucru; foaia e ieșirea. Nu
   trebuie să arate la fel.
7. **Ce se întâmplă cu `deriveTasks`:** îl ștergem? păstrăm 2–3 reguli chiar
   acționabile ca *sugestii în interiorul rândului de proiect*, nu ca carduri de sine
   stătătoare?
8. **Staleness:** dacă modelul rămâne în urmă, o distribuție precisă e riscantă. Mai
   bine grosier („execuție: în curs") + un „atins acum Nz" ca Nick să știe cât să se
   încreadă.

---

## 5. Patru variante

### D1 — Digest de rânduri (ideea lui Nick, dezvoltată)
Un rând per proiect activ, sortat după urgență. Fiecare rând, compact:
`cod client · [FAZĂ] · termen (întârziat Nz ca metadată roșie, nu ca task) ·
piese: 3 debitare / 2 sudură / 1 montaj · comenzi: 2/3 (⚠ 1 la Furnizor X, joi) ·
🔧 1 reparație · «ce urmează» formulat ca observație`.
Click pe rând → composer inline: `[text sarcină] [alege om] [+]` → intră în `plan.tasks`.
Zero drag din stânga, zero carduri-observație.

- **Plus:** exact ce cere Nick; păstrează digestul util, aruncă falsul.
- **Minus:** dacă arată toate proiectele cu tot detaliul, redevine un zid. Are nevoie de
  disciplină la „ce lasă afară" (dimensiunea 2).
- **Efort:** mediu. `renderDerivedColumn` → `renderProjectDigest`; compunere inline;
  se șterge mecanismul de drag din stânga.

### D2 — Două găleți: „Cere atenție" / „Curge" (B din discuție, rafinat)
Doar proiectele cu ceva în neregulă intră în **Cere atenție** cu detaliu complet:
termen sub ~5 zile sau depășit, comandă neprimită care ar trebui să fi sosit, reparație
deschisă, blocaj de flux (piese care așteaptă etapa următoare fără să se miște de N zile).
Restul se colapsează în **Curge** — o singură linie per proiect (`cod · fază · termen`),
fără detaliu.

- **Plus:** atacă direct plângerea de „50% zgomot" — în majoritatea zilelor 3–5 proiecte
  cer atenție, restul de 10 sunt o listă de o linie.
- **Plus:** te forțează să prioritizezi; e aproape de „Make-ready / Last Planner" din
  cele 5 mockupuri.
- **Minus:** „blocaj de flux" are nevoie de un semnal de vechime („piesa X stă la
  debitare de 6 zile") pe care acum nu-l calculăm — trebuie `piesa-mutata` din jurnal
  sau un `stationSince` per piesă.
- **Efort:** mediu-mare (regula de blocaj + eventual câmp nou).

### D3 — Registrul *este* sursa de planificare
Fără digest separat. Coloana stângă din Planificare = **registrul** (rândurile pliate pe
care Nick le-a construit deja și le place), fiecare rând cu un mic buton „→ pune pe
plan" care deschide composerul. Refolosește ce există; suprafață nouă aproape zero.

- **Plus:** Nick are deja încredere în registru; nu învață nimic nou; nicio dublare de
  logică de stare.
- **Plus:** cel mai puțin cod, cel mai puțin de întreținut.
- **Minus:** registrul e sortat pe termene/găleți, nu neapărat pe „ce planific azi";
  poate fi prea dens ca panou lateral îngust (dar are deja modul îngust/lat).
- **Minus:** amestecă „vederea de referință" cu „ecranul de planificare" — unii oameni
  vor una curată pentru seară.
- **Efort:** mic.

### D4 — „Foaia de ieri" + ce s-a schimbat
Arată foaia ORGANIZARE de ieri + un delta: piesă mutată, comandă sosită, reparație
deschisă, proiect finalizat — de la ieri seară până acum. Nick planifică **ajustând
ieri**, nu de la zero.

- **Plus:** se potrivește cu realitatea din dumpuri — foile sunt ~80% identice zi de zi
  („Andrei: Sudat Vespasian" apare 4 zile la rând).
- **Plus:** delta e exact „ce cere atenție azi" — un semnal natural, nu o euristică.
- **Minus:** are nevoie de jurnal cu istoric (abia acum a fost pornit); nu ajută în
  prima săptămână.
- **Minus:** nu ajută la un proiect nou care n-a fost pe nicio foaie.
- **Efort:** mediu; depinde de `fetchLog` + un „carryover vizual" al foii.

---

## 6. Recomandare — sinceră

**D3 + logica de triere din D2.** Concret:

- Coloana stângă din Planificare devine **registrul, filtrat și sortat pentru
  planificare**: sus proiectele care **cer atenție** (termen ≤ 7 zile sau depășit,
  comandă neprimită, reparație deschisă, avertisment de piese neîncepute), dedesubt
  „Restul" colapsat — o linie per proiect, extensibil.
- Fiecare rând de proiect (pliat, ca în registru) primește **un buton mic „+ sarcină"**
  care deschide `[text] [alege om] [+]` chiar acolo — scrii, intră în `plan.tasks` cu
  `projectId` legat.
- `deriveTasks` **se retrage** din coloana stângă. Îl păstrăm doar ca text pentru linia
  „ce urmează" din rând, formulat ca observație (**„așteaptă sudura"**, nu „Sudat X") —
  și doar când e neambiguu. Când nu e, nu afișăm nimic pe linia aia.
- **Rollup-urile Narcis/Gabi rămân** ca acum (alea *sunt* utile: „Dus 0010 la adresă",
  „Comandat 2 poziții").
- **Cardurile 🔧 mentenanță și 📝 notițe rămân** ca secțiuni proprii sub digest — alea
  *sunt* sarcini reale.
- Distribuția pieselor pe rând: **grosier**, nu cifre („execuție — în curs" /
  „gata de montaj" / „toate piesele la montaj"), plus, dacă avem jurnal, „ultima mișcare
  acum Nz" ca indicator de încredere.

**De ce D3 și nu D1:** D1 rescrie un digest de la zero care riscă să redevină un zid și
dublează logica de stare din registru. D3 refolosește vederea în care Nick are deja
încredere și adaugă doar trierea + butonul de scriere. Mai puțin cod, mai puțin de
stricat, mai aproape de cum lucrează deja.

**De ce nu D4 acum:** e cea mai elegantă pe termen lung, dar are nevoie de 1–2 săptămâni
de jurnal ca să arate ceva. O ținem ca fază ulterioară — delta „ce s-a schimbat de
ieri" poate deveni al doilea rând de sus în D3 când jurnalul are istoric.

---

## 7. Ce se schimbă în cod (dacă mergem pe D3+D2)

- `renderDerivedColumn` → `renderPlanRegistru(plan)`: refolosește `renderRegRow` /
  logica de rând din registru, dar:
  - filtru fix pe „active", sortare: `regSeverity` descrescător (deja există), apoi
    secțiune „Restul" colapsată sub un prag.
  - fiecare rând primește `+ sarcină` → composer inline (`data-plan-compose="projId"`).
- Se șterge: `.dcard` pentru proiecte, drag `DC::` pentru proiecte (rămâne pentru
  upkeep/notite), `renderDerivedColumn` vechi.
- `deriveTasks` → `projectNextHint(p)` care întoarce string sau `''`; folosit doar în
  rândul de digest, nu ca sursă de carduri.
- `assignDerived` rămâne pentru upkeep/notite/rollup; pentru proiecte, composerul
  cheamă direct `planTaskAdd(plan, personId, text, 'manual', {projectId})`.
- Nimic la `state`, la sync, la undo.

Efort estimat: ~un lot de mărimea unui task Faza 1 (1–2 ore de implementare + verificare).

---

## 8. Întrebări pentru Nick

1. **D3+D2, D1, sau altceva?** (Recomand D3+D2.)
2. **Pragul „cere atenție":** termen ≤ 7 zile e ok, sau vrei ≤ 5 / ≤ 10? Și: reparație
   deschisă intră automat în „cere atenție" chiar dacă termenul e departe?
3. **Linia „ce urmează":** o vrei deloc, sau doar starea (fază + piese grosier) e destul?
4. **Composer:** `[text] [alege om]` per proiect e suficient, sau vrei să poți adăuga
   mai multe sarcini deodată pentru un proiect (una per om)?
5. **„Restul" colapsat:** o linie per proiect (`cod · fază · termen`) sau ascuns complet
   până apeși „arată tot"?
6. **Distribuția pieselor:** grosier („în execuție / gata de montaj") sau tot vrei cifre
   („3 debitare · 2 sudură"), acceptând că uneori sunt greșite?
