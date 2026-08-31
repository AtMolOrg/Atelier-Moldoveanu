# Cercetare — panouri de producție la scară

Template-uri funcționale (fișiere HTML de sine stătătoare, deschide-le direct în browser, fără server) care demonstrează tipare găsite prin research pentru problema: **canvas-ul liber cu poziționare manuală devine greu de folosit la 20-50 de proiecte active simultan.**

Context complet și decizii în [ITERATII.md](../ITERATII.md) (secțiunea 2026-08-31) — inclusiv de ce prima încercare de rescriere a fost revenită (revert).

## Ce e în folder

| Fișier | Tipar demonstrat | Recomandat pentru |
|---|---|---|
| [01-tabel.html](01-tabel.html) | Listă/tabel dens, sortabil, filtrabil — ca „My View" din shopVOX sau grid-ul Airtable | Scanare rapidă a multor proiecte deodată, ca vedere **alternativă**, nu înlocuitor |
| [02-panou-grupat.html](02-panou-grupat.html) | Grupare automată pe fază (Proiectare/Execuție/Montaj), grupuri restrângibile, reordonare prin drag doar în cadrul grupei | Varianta „structurată" de canvas — dacă se reface încercarea din 08-31, de-aici se pornește |
| [03-canvas-minimap.html](03-canvas-minimap.html) | Canvas liber + minimap + zoom semantic (cardurile devin puncte colorate la zoom mic) | Opțiune DOAR dacă se ține poziționarea liberă — nu e recomandarea principală |

Fiecare fișier are un comentariu la început cu: ce demonstrează, de ce e construit așa, și ce sursă din research a inspirat-o. Datele din ele sunt inventate ("împrumutate"), cu aceeași formă ca proiectele reale (cod, client, fază, termen) — schimbi array-ul din `<script>` cu date reale ca să testezi cu volum real.

## De ce contează template-ul 02 în mod special

Prima încercare (revenită) a picat pentru că panoul lateral "Necesar montaj" nu s-a comportat corect combinat cu un `zoom` CSS aplicat pe tot panoul. Template-ul 02 evită complet acea combinație (cardurile sunt responsive din start, fără nevoie de rescalare globală) și are un card cu panoul lateral deschis explicit, ca să se poată verifica înainte de orice reîncercare pe aplicația reală.

## Cum se testează

Deschide oricare fișier direct în browser (dublu-click, sau `file://` din orice folder) — nu au nevoie de server, de Firebase, sau de restul aplicației. Fiecare e complet izolat.

## Surse de research

Vezi lista completă de surse (research general + implementare tehnică) în artefactul de cercetare trimis în conversație, sau redeschide research-ul dacă e nevoie de verificat ceva anume — subiecte acoperite: tipare kanban/swimlane la scară, HTML5 Drag & Drop API, `position:sticky` pe tabele mari, virtualizare DOM (nu e nevoie sub ~500 elemente).
