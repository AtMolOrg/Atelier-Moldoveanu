# Tab „Planificare" — organizarea zilnică · design

**Autor:** Nick (manager de atelier) + Claude
**Data:** 2026-09-09
**Stare:** decizii luate (secțiunea 11), gata de plan de implementare

---

## 1. De ce

Atelierul produce zilnic o foaie **ORGANIZARE** pe hârtie: reminder-e fixe sus, apoi
un bloc per om cu sarcinile zilei în ordine („Sa se respecte ordinea taskurilor!"),
la final o secțiune „Resturi" (backlog neprins pe zi). Nick o compune seara, din cap
+ registru, și o distribuie dimineața.

Tab-ul înlocuiește pasul „o scriu de mână": **asamblează foaia din starea reală a
proiectelor**, Nick repartizează și reordonează, iar foaia iese gata de tipărit.
Fiindcă totul stă pe Firebase cu sincronizare live, planul se vede la toți și
rămâne corect pe măsură ce ziua se schimbă — fără agent, fără server.

## 2. Scop și ne-scop

**În scop (faza 1):**
- Tab nou „Planificare", frate cu „Hartă atelier" și „Comenzi".
- Roster de oameni (echipa a fost scoasă demult din model — o readucem separat).
- Asamblor pe 3 coloane: sarcini derivate → oameni → documentul de mâine.
- Rollup automat pentru **Narcis** (drumuri) și **Gabi** (comenzi/birou) + text liber.
- Documentul crem, editabil pe loc, cu **Descarcă PDF** și **Descarcă pentru Word**.
- Extinderea jurnalului de evenimente existent (nodul `-log`), ca temelie pentru învățare.

**În scop (faze ulterioare):** stratul de dimineață (bifat + ↻ carryover); sugestii
statistice din jurnal; „caietul de atelier" care învață (LLM, o dată pe seară).

**Ne-scop:** agent mereu-pornit; antrenarea unui model propriu; management de resurse
umane (pontaj, concedii — doar o bifă „azi lipsește"); planificare pe ore/Gantt.

## 3. Tab-ul — 3 coloane

Layout ca varianta 3 („Assembler") din `scratchpad/planificare-5.html`.
Sus: `azi <zi, dată> → plan pentru <zi, dată+1>`, buton pentru a naviga zilele.

### 3.1 Stânga — Sarcini derivate
Scanează `state.projects`. Pentru fiecare proiect neterminat, deduce **acțiunea
următoare** din pipeline + `projectWarnings()` + piese + comenzi, și scoate carduri
candidat (nerepartizate):

Fiecare card poartă un `skill`; asamblorul **sugerează** (nu forțează) oamenii
activi al căror `skills` conține valoarea aia.

| Condiție | Card generat | `skill` sugerat |
|---|---|---|
| piese la Debitare, niciuna la Sudură | „Sudat &lt;proiect&gt;" | `sudura` |
| toate piesele la montaj + comenzile primite | „Montaj &lt;proiect&gt; — &lt;adresă&gt; RAL &lt;x&gt;" | `montaj` |
| piese `pregatire` alături de piese pornite | „Debitat &lt;proiect&gt; (&lt;n&gt; piese neîncepute)" | `debitare` |
| piese care așteaptă îndoire / abkant | „Îndoit / abkant &lt;proiect&gt;" | `abkant` |
| piese la Polizare / Șlefuire | „Polizat &lt;proiect&gt;" | `polizat` |
| proiect la `proiectare`, fără piese definite / nelansate | „Scos de execuție &lt;proiect&gt;" | `proiectare` |
| `projectWarnings` „comandă neprimită" | „Recepție / urmărit comandă &lt;proiect&gt;" | `comenzi` (Gabi) |
| montaj mâine cu adresă | „Dus &lt;proiect&gt; la &lt;adresă&gt;" | `sofer` (Narcis) |
| termen &lt; azi și nu e la montaj | „⚠ &lt;proiect&gt; întârziat &lt;N&gt;z" | `coord` (Nick) |

Proiectanții (Bianca, Radian) **nu** sunt „doar sarcini manuale" — au un rol
derivabil: sunt cei care mută un proiect din proiectare în producție. Generatorul
„Scos de execuție" este frontul pipeline-ului.

Cardul se trage în dreapta pe un om. După repartizare dispare din stânga (sau se
estompează cu „→ &lt;nume&gt;"). Cardurile nederivabile (ex. „Prototip ușă Orsay")
se adaugă manual în coloana din mijloc.

### 3.2 Mijloc — Oameni
Roster-ul, în ordinea lui. Fiecare om = o zonă de drop cu lista lui de sarcini,
**ordonată** (ordinea contează — se poate trage în sus/jos). Se poate tasta o
sarcină liberă direct. Narcis și Gabi vin pre-completați cu rollup-urile lor (3.3).
O bifă „azi lipsește" scoate omul din foaie și îi mută sarcinile în Resturi.

### 3.3 Dreapta — Documentul de mâine (foaia crem)
Randare live a foii ORGANIZARE: antet + **reminder-e fixe** (secțiunea 4.5), apoi un
bloc per om în ordinea roster-ului, apoi „Resturi". Fiecare linie e **editabilă pe
loc** (`contenteditable`) — ajustezi o formulare fără să atingi datele. Butoane:

- **Descarcă PDF** — `window.print()` cu stil de print care arată doar foaia crem;
  browserul face PDF-ul, cu fonturile intacte. Zero dependințe.
- **Descarcă pentru Word** — exportă foaia ca `.doc` (HTML pe care Word îl deschide
  și îl editezi normal). DOCX „adevărat" ar cere o bibliotecă de pe CDN — pas opțional.
- **Copiază** — text simplu în clipboard, în stilul foii de hârtie.
- **Finalizează ziua** — îngheață planul (timestamp), pornește planul de mâine din
  ce a rămas nebifat (vezi 6).

## 4. Model de date

`DATA_VERSION` rămâne **8**. Chei noi, completate în `normalizeState` (idempotent,
determinist, fără `Date.now()`):

### 4.1 `state.people` — roster / bază de date de angajați
```
{ id, name, active: true,
  role: 'atelier' | 'coord' | 'birou' | 'proiectant' | 'sef',
  skills: string[],        // ce știe să facă — pe asta se sugerează repartizarea
  order: int, awayDates: [] }
```
- Cheie **nouă**, separată de `state.workers` (care rămâne doar furnizori — migrarea
  lui îi șterge activ pe ceilalți).
- **Funcție reală de administrare:** adaugă / redenumește / dezactivează / șterge
  membri, reordonează, editează rol + skills. UI: sub-panou „Angajați".
- `role` = grupare grosieră pentru UI + tratamentul special coord (Narcis/Gabi).
  `skills` = fin, folosit de generatoare ca să **sugereze** cine primește un card
  (Nick tot trage unde vrea).
- `awayDates: []` — zile în care omul lipsește; îl scoate din foaia acelei zile.

**Roster pre-completat** (din cele 6 foi + rolurile reale spuse de Nick):

| Nume | role | skills |
|---|---|---|
| Dic, Hadi, Andrei | atelier | `sudura` |
| Nea Marian | atelier | `debitare`, `strung` |
| Mircea | atelier | `laser`, `abkant`, `debitare` |
| Mihai | atelier | `polizat` |
| Dorin, Mihăiță, Eugen, Alin | atelier | `montaj`, `atelier` |
| Vlad | atelier | `curatenie` |
| Bianca, Radian | proiectant | `proiectare` |
| Narcis | coord | `sofer` |
| Gabi | birou | `comenzi`, `contabilitate` |
| Nick | coord | `coord` |
| Petru | sef | `coord` |

Petru (șeful) apare în roster ca să poți lista/atribui manual, dar **niciun
generator nu-l țintește**.

### 4.2 `state.plans` — planul pe zi
```
{
  date: 'YYYY-MM-DD',
  tasks: [
    { id, text, personId, projectId | null, order: int,
      done: false, doneAt: null,
      source: 'manual' | 'derived' | 'carryover',
      carriedFrom: 'YYYY-MM-DD' | null }
  ],
  resturi: [ { id, text, order } ],
  reminders: [ 'Suflat flexurile la final de zi', 'Sa se respecte ordinea taskurilor!' ],
  edits: { '<lineKey>': 'text editat manual pe foaie' },
  finalizedAt: null
}
```
- Un obiect per dată. Se păstrează ultimele ~30 de zile; restul se taie la
  `normalizeState`.
- Sarcinile lui Narcis/Gabi sunt tot `tasks` cu `personId` = al lor și
  `source: 'derived'` — se editează/reordonează/șterg ca oricare. Regenerarea lor
  nu suprascrie ce a modificat Nick manual (match pe `id` stabil derivat din sursă).

### 4.3 Jurnalul de evenimente — nodul `-log` (există deja)
`logEvent(type, text)` scrie deja append-only într-un nod separat
(`<key>-log.json`), **în afara** lui `state` — deci nu umflă sincronizarea și nici
undo-ul. Acum e subutilizat (4 tipuri). Extindem:

- `logEvent(type, text, data?)` — al treilea argument, obiect structurat, pentru
  statistică (`{ projectId, from, to, ... }`).
- Apeluri noi la tranzițiile care contează:
  `piesa-mutata`, `etapa-schimbata`, `comanda-stare`, `reparatie-adaugata`,
  `reparatie-stare`, `plan-task-bifat`, `plan-finalizat`.
- Funcție nouă `fetchLog(sinceDays)` — GET pe nod, pentru statistică și caiet
  (acum e write-only).
- Cap la scriere: nodul nu se șterge singur; adăugăm o curățare periodică
  (păstrează ultimele ~3000 sau ultimele 90 de zile) rulată la `Finalizează ziua`.

### 4.4 `state.playbook` — caietul de atelier (faza 5)
```
{ updatedAt, text: '<markdown: cum lucrează atelierul ăsta>' }
```
Panou read-only în tab, editabil de Nick, actualizat de un pas LLM de seară.

### 4.5 `state.reminders` — rândurile fixe din capul foii
```
[ 'Suflat flexurile la final de zi', 'Sa se respecte ordinea taskurilor!' ]
```
- Apar pe **fiecare** foaie, indiferent de zi.
- **Editabile** — Nick le schimbă / adaugă / șterge dintr-un loc mic în setări.
  Default: cele două de mai sus.
- Pe `state` (se sincronizează), nu pe fiecare `plan`. Un `plan` poate suprascrie
  local lista pentru o zi anume, dar cazul normal e lista globală.

### 4.6 Câmpuri noi pe proiect
```
p.adresaMontaj : ''   // adresa unde se face montajul — pentru rollup-ul lui Narcis
p.telClient    : ''   // numărul de telefon al clientului — Narcis sună clienții
```
- Ambele în modalul de proiect (Editează / Proiect nou).
- `adresaMontaj` intră în cardul „Montaj &lt;proiect&gt; — &lt;adresă&gt; RAL &lt;x&gt;"
  și în secțiunea lui Narcis.
- `telClient` apare lângă adresă pe foaie, unde e cazul.
- Backfill `''` în `normalizeState`.

## 5. Sarcini derivate — generatoare (stânga)

`deriveTasks(state, date)` → listă de carduri candidat. Reguli pure, deterministe,
peste starea proiectelor. Fiecare card are un `id` stabil (`derived:<projectId>:<rule>`)
ca să nu se dubleze la re-render și ca repartizarea să se lipească.

Reguli inițiale (extensibile): cele din tabelul 3.1. Fiecare regulă = o funcție
mică; Nick poate dezactiva reguli dacă zgomotesc.

## 6. Rollup Narcis & Gabi

`deriveNarcisTasks(state, date)`:
- montajele de mâine → „Dus &lt;proiect&gt; la &lt;p.adresaMontaj&gt;" (+ `p.telClient`)
- comenzi care sosesc mâine (din `deliveryDay` al furnizorului) → „Luat de la &lt;furnizor&gt;"
- reparații/note cu termen mâine care implică transport

`deriveGabiTasks(state, date)`:
- `allNeeds()` cu status „de comandat" → „Comandat &lt;material&gt; pentru &lt;proiect&gt;"
- comenzi trimise care sosesc → „Recepție &lt;furnizor&gt;"
- `projectWarnings` de tip 📋

Amândoi au sub lista derivată o **zonă de text liber** pentru comenzile din afara
sistemului („dus Tiguan în service", „luat litere WIN după ora 10", „Dedeman — bandă").
Textul liber se salvează pe `plan.tasks` cu `source: 'manual'`.

## 7. Stratul de dimineață (faza 2)

Același plan, alt mod de afișare (toggle „seară / dimineață", sau automat după ce
planul zilei e `finalizedAt`):
- listă de bifat, grupată pe om
- bifarea scrie eveniment `plan-task-bifat`
- la `Finalizează ziua` următoare, sarcinile nebifate se copiază în planul nou cu
  `source: 'carryover'`, `carriedFrom: <data>`, badge ↻

## 8. Învățarea (faze 3–4)

**Regula de siguranță:** învață → **sugerează** → Nick confirmă. Ce s-a învățat e
vizibil și editabil. Niciodată aplicat automat, niciodată cutie neagră.

### 8.1 Statistică pe jurnal (faza 4, fără LLM)
`fetchLog(90)` + agregări:
- mediană zile per etapă, per fel de proiect → termene mai realiste, avertisment
  „de obicei sudura vine la 2 zile după debitare"
- co-ocurență material ↔ fel de proiect → „montajul cere de obicei SikaFC11 + freză 45"
- ridicări recurente → „RAL 5011 se ia de la Tanti Vitan, 2 tuburi" (apărut de 3×)
Afișate ca sugestii estompate lângă cardurile relevante; un click le acceptă.

### 8.2 Caietul de atelier (faza 5, cu LLM)
Un pas de seară (buton „Actualizează caietul" sau Firebase Cloud Function
declanșată de `plan-finalizat`, cu debounce): Claude citește evenimentele zilei +
`state.playbook`, propune diff pe caiet, Nick confirmă. Data viitoare, asamblorul
citește caietul ca context pentru sugestii. **Nu** mereu-pornit: o dată pe seară.

## 9. Migrări și constrângeri

- `DATA_VERSION` = 8, neschimbat. `state.people`, `state.plans`, `state.reminders`,
  `state.playbook` și câmpurile noi de proiect (`adresaMontaj`, `telClient`)
  completate în `normalizeState` cu `typeof === 'undefined'` guard, idempotent,
  determinist, fără date curente.
- Tăiere: `state.plans` la ultimele ~30 de zile; nodul `-log` la ~90 de zile / 3000
  intrări, la `Finalizează ziua`.
- Nu se atinge `stableStringify`, sync-ul live, undo/redo, `saveState`,
  `noteUndoPoint`.
- Cod ES5-ish (`var`, `function`), un singur IIFE, fără build. Bibliotecă pentru
  DOCX „adevărat" doar de pe CDN și doar dacă Nick o cere.
- Jurnalul rămâne în afara lui `state` (nod separat) — deci nu intră în undo și nu
  strică echo-suppression.
- `state.plans` **intră** în `state` → se sincronizează și e undoable. De verificat
  că repartizarea/reordonarea produc un singur punct de undo per acțiune.

## 10. Fazare

1. **Faza 1 (nucleul util):** roster + administrare angajați + câmpuri noi pe
   proiect (adresă montaj, tel client) + reminder-e editabile + asamblor 3 coloane
   (cu generatorul „Scos de execuție") + rollup Narcis/Gabi + foaia crem + export
   PDF/Word + extinderea jurnalului. Fără învățare.
2. **Faza 2:** modul de dimineață (comută automat după oră) + bifat + ↻ carryover.
3. **Faza 3:** vederea de săptămână — pregătești mai multe zile în avans (luni
   vinerea), foaia zilnică rămâne unitatea.
4. **Faza 4:** sugestii statistice din jurnal.
5. **Faza 5:** caietul de atelier + pasul LLM de seară.

Fiecare fază = software funcțional, testabil singur.

## 11. Decizii (Nick, 2026-09-09)

1. **Adresă montaj + telefon client** → câmpuri noi pe proiect (`p.adresaMontaj`,
   `p.telClient`), în modal, folosite de rollup-ul lui Narcis. (§4.6)
2. **Roster** → pre-completat din cele 6 foi + **funcție de administrare** completă
   (adaugă / scoate / editează angajați) — o mică bază de date de personal. (§4.1)
3. **Reminder-ele fixe** → rămân fixe pe foaie, dar **editabile** dintr-un loc mic în
   setări; Nick le schimbă când e cazul. (§4.5)
4. **Modul de dimineață** → seara faci planul; dimineața doar bifezi. Comutarea
   seară↔dimineață se face **automat după oră**. E faza 2.
5. **Bianca & Radian** = proiectanți → **au generator** („Scos de execuție &lt;proiect&gt;"
   la frontul pipeline-ului), nu doar sarcini manuale. (§5, tabel 3.1)
6. **Săptămână** → se pregătește și „luni" vinerea; în plus, o **vedere de
   săptămână** ca fază proprie (faza 3).
