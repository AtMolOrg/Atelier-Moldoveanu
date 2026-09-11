# Tracker săptămânal ("desfășurătorul") — research + 5 variante

## Ce e pe tablă

Poza are două zone distincte:

- **Stânga (~3/4)** — o listă curentă de joburi active, câte o intrare pe client/proiect,
  cu sub-puncte (ce mai trebuie: „sticlă + colț de lift", „vopsit", „silicoane dacă mai
  trebuie"), unele cu „?" (incert) sau „!" (urgent). **Asta e deja acoperit de tab-ul
  Hartă atelier** — e registrul de proiecte + reparații/necesare, doar pe hârtie. Nu
  propun un tab nou pentru partea asta.
- **Dreapta (~1/4)** — un grid Luni–Vineri (două săptămâni suprapuse, 14–18 și 21–25
  Septembrie), cu bare/paranteze desenate de mână, cu nume de oameni și proiecte, unele
  cu săgeți care întind bara pe mai multe zile, colorate (roșu = azi/urgent, negru =
  normal). **Asta e partea nouă** — un orar vizual, pe săptămână, cine face ce în ce zi.

## Ce avem deja în date vs. ce nu avem

- **Avem**: `state.plans[date].tasks[]` — exact structura „persoană + zi + text +
  proiect" pe care o scrii deja manual în Planificare (coloana Oameni). Fostul
  `renderWeekView` (pe cale să fie scos) era deja un grid oameni × zile din aceleași
  date — doar afișate ca text simplu în celulă, nu ca bare.
- **Avem**: faza curentă a fiecărui proiect (`currentStageInfo`/`bucketFor`) și termenul
  (`p.termen`) — deci putem colora/poziționa automat pe axa timpului.
- **NU avem**: nicio legătură automată „persoană ↔ piesă/proiect pe zi anume" în afara
  a ce scrii tu manual în Planificare. Deci un tracker complet automat (fără să scrii
  nimic) nu e posibil azi — cineva (tu) tot trebuie să spună cine lucrează la ce în ce
  zi. Variantele de mai jos diferă în cât de mult calculează automat vs. cât scrii tu.

**Concluzie:** nu e un tab rupt de Planificare — e o **reprezentare vizuală diferită a
acelorași date** (`state.plans`), plus opțional contextul de fază/termen din proiecte.
Practic, ăsta e locul unde renaște fostul `renderWeekView`, dar tratat ca prezentare
principală, nu mod ascuns.

## 5 variante (mockup funcțional, date reconstruite de pe tablă)

| # | Nume | Axă rânduri | Bare | Scriu eu direct pe grid? | Cât de aproape de tablă |
|---|------|-------------|------|--------------------------|--------------------------|
| 1 | Gantt pe proiecte | proiect (sortat după termen) | azi→termen, colorată după fază | nu (doar click pe bară) | mediu |
| 2 | Pe oameni (grid) | persoană | chip pe zi, târăște între zile/oameni | da | mare (e chiar fosta vedere de săptămână) |
| 3 | Bandă whiteboard | mixt (proiect+persoană într-un flux) | bară cu săgeată, culoare roșu/negru/verde ca cerneala | parțial | foarte mare — replică literală |
| 4 | Zi × fază | zi (coloană), 3 benzi pe fază în interior | chip în banda de fază | parțial | mic — leagă de Hartă atelier, nu de tablă |
| 5 | Agendă zilnică (carduri) | zi (coloană verticală) | chip-uri stivuite | da | mic — mai degrabă mobil/simplu |

Recomandarea mea: **varianta 2** ca bază (e continuarea directă a ce ai deja în
Planificare, fără date noi de întreținut), cu stilul vizual al **variantei 3** împrumutat
pentru bare (arată mult mai bine decât text în celulă). Dar uită-te la toate — sunt
făcute clic-abile, cu date reale (reconstruite din poză, nu exacte), pe tema reală a
aplicației (Grafit, întunecată, Roboto Mono).
