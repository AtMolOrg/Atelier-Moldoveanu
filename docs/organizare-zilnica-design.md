# Tab „Planificare" — organizarea zilnică · design

**Autor:** Nick (manager de atelier) + Claude
**Data:** 2026-09-09
**Stare:** schiță pentru revizuire

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

| Condiție | Card generat | Merge de obicei la |
|---|---|---|
| piese la Debitare, niciuna la Sudură | „Sudat &lt;proiect&gt;" | sudori |
| toate piesele la montaj + comenzile primite | „Montaj &lt;proiect&gt; — &lt;adresă&gt; RAL &lt;x&gt;" | echipă montaj |
| piese `pregatire` alături de piese pornite | „Debitat &lt;proiect&gt; (&lt;n&gt; piese neîncepute)" | Nea Marian / Mircea |
| `projectWarnings` „comandă neprimită" | „Recepție / urmărit comandă &lt;proiect&gt;" | Gabi |
| termen &lt; azi și nu e la montaj | „⚠ &lt;proiect&gt; întârziat &lt;N&gt;z" | Nick (de urmărit) |

Cardul se trage în dreapta pe un om. După repartizare dispare din stânga (sau se
estompează cu „→ &lt;nume&gt;"). Cardurile nederivabile (ex. „Prototip ușă Orsay")
se adaugă manual în coloana din mijloc.

### 3.2 Mijloc — Oameni
Roster-ul, în ordinea lui. Fiecare om = o zonă de drop cu lista lui de sarcini,
**ordonată** (ordinea contează — se poate trage în sus/jos). Se poate tasta o
sarcină liberă direct. Narcis și Gabi vin pre-completați cu rollup-urile lor (3.3).
O bifă „azi lipsește" scoate omul din foaie și îi mută sarcinile în Resturi.

### 3.3 Dreapta — Documentul de mâine (foaia crem)
Randare live a foii ORGANIZARE: antet + reminder-e fixe, apoi un bloc per om în
ordinea roster-ului, apoi „Resturi". Fiecare linie e **editabilă pe loc**
(`contenteditable`) — ajustezi o formulare fără să atingi datele. Butoane:

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

### 4.1 `state.people` — roster
```
{ id, name, active: true, role: 'atelier' | 'coord' | 'birou', order: int, awayDates: [] }
```
- Cheie **nouă**, separată de `state.workers` (care rămâne doar furnizori — migrarea
  lui îi șterge activ pe ceilalți).
- Seed inițial: gol; Nick adaugă oamenii o dată. Sau seed din numele văzute în
  ultimele foi, dacă Nick vrea.
- Nick, Narcis, Gabi → `role: 'coord'`.

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

### 4.4 `state.playbook` — caietul de atelier (faza 4)
```
{ updatedAt, text: '<markdown: cum lucrează atelierul ăsta>' }
```
Panou read-only în tab, editabil de Nick, actualizat de un pas LLM de seară.

## 5. Sarcini derivate — generatoare (stânga)

`deriveTasks(state, date)` → listă de carduri candidat. Reguli pure, deterministe,
peste starea proiectelor. Fiecare card are un `id` stabil (`derived:<projectId>:<rule>`)
ca să nu se dubleze la re-render și ca repartizarea să se lipească.

Reguli inițiale (extensibile): cele din tabelul 3.1. Fiecare regulă = o funcție
mică; Nick poate dezactiva reguli dacă zgomotesc.

## 6. Rollup Narcis & Gabi

`deriveNarcisTasks(state, date)`:
- montajele de mâine → „Dus &lt;proiect&gt; la &lt;adresă&gt;" (adresa: câmp nou
  `p.adresaMontaj`, sau din `montajNotes` până există câmpul)
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

### 8.1 Statistică pe jurnal (faza 3, fără LLM)
`fetchLog(90)` + agregări:
- mediană zile per etapă, per fel de proiect → termene mai realiste, avertisment
  „de obicei sudura vine la 2 zile după debitare"
- co-ocurență material ↔ fel de proiect → „montajul cere de obicei SikaFC11 + freză 45"
- ridicări recurente → „RAL 5011 se ia de la Tanti Vitan, 2 tuburi" (apărut de 3×)
Afișate ca sugestii estompate lângă cardurile relevante; un click le acceptă.

### 8.2 Caietul de atelier (faza 4, cu LLM)
Un pas de seară (buton „Actualizează caietul" sau Firebase Cloud Function
declanșată de `plan-finalizat`, cu debounce): Claude citește evenimentele zilei +
`state.playbook`, propune diff pe caiet, Nick confirmă. Data viitoare, asamblorul
citește caietul ca context pentru sugestii. **Nu** mereu-pornit: o dată pe seară.

## 9. Migrări și constrângeri

- `DATA_VERSION` = 8, neschimbat. `state.people`, `state.plans`, `state.playbook`
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

1. **Faza 1 (nucleul util):** roster + asamblor 3 coloane + rollup Narcis/Gabi +
   foaia crem + export PDF/Word + extinderea jurnalului. Fără învățare.
2. **Faza 2:** modul de dimineață + bifat + ↻ carryover.
3. **Faza 3:** sugestii statistice din jurnal.
4. **Faza 4:** caietul de atelier + pasul LLM de seară.

Fiecare fază = software funcțional, testabil singur.

## 11. Întrebări deschise pentru Nick

1. **Adresa de montaj:** câmp nou `p.adresaMontaj` pe proiect, sau lăsăm în
   `montajNotes` până se strânge nevoia?
2. **Roster:** îl populezi tu manual o dată, sau vrei să-l pre-completez din numele
   din ultimele 6 foi ORGANIZARE?
3. **Reminder-ele fixe** din antet („Suflat flexurile…", „Sa se respecte ordinea…") —
   listă editabilă în setări, sau hardcodate?
4. **Modul de dimineață:** comutator manual, sau se schimbă singur după oră / după ce
   apeși „Finalizează ziua"?
5. **Rolurile birou** (Bianca, Radian) — au sarcini greu de derivat („scos de
   execuție", „caiet proiect"). Le tratăm ca oameni normali cu sarcini doar manuale,
   sau merită un generator separat mai târziu?
6. **Zilele libere / weekend:** planul e strict „mâine", sau vrei să poți pregăti și
   „luni" vinerea?
