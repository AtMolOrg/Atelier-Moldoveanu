# TODO — Atelier Moldoveanu

## Adaptare mobil (telefon)
- [ ] "Hartă atelier" (canvas pan/zoom, drag&drop coloane): greu de făcut touch-friendly — de reevaluat separat. Important: e acum SINGURUL tab din aplicație, deci pe mobil nu mai există altă variantă de fallback (ex. tabelul "Proiecte") — de regândit ce vede un utilizator de telefon.

## Ascunse temporar (cod încă există, doar scoase din navigare)
- [ ] Tab "Cronologie" (Gantt) — scos din bara de tab-uri pe 2026-08-24, de reevaluat/redesenat ulterior
- [ ] View-ul "Etape comune" din Hartă atelier (board-ul liber cu coloane trase manual) — scos din UI pe 2026-08-24, a rămas doar "Pe proiecte"
- [ ] Tab "Proiecte" (tabelul cu Traseu/Tabel, filtrul "arată și proiectele finalizate") — scos din bara de tab-uri pe 2026-08-24
- [ ] Tab "Reparații" (board-ul de reparații) — scos din bara de tab-uri pe 2026-08-24

## Rezolvate
- [x] 2026-08-24 — Partițiile ("⊞" pe o etapă, ex. Atelier/Extern) sunt acum per-proiect, nu globale — adăugarea unei partiții pe un proiect nu mai apare și la celelalte proiecte
- [x] 2026-08-24 — Scos tot din bara de sus în afară de "Hartă atelier": tab-urile Proiecte/Reparații/Cronologie nu mai sunt accesibile din navigare (vezi mai sus)
- [x] 2026-08-24 — UI-ul întreg (titlu, search, taburi, butoane) plutește direct pe caroiaj — fără bară albă solidă sus
- [x] 2026-08-24 — Sidebar Echipă/Furnizori nu se mai deschid automat la intrarea pe "Hartă atelier" pe desktop — doar la hover/click pe eticheta laterală
- [x] 2026-08-24 — Scos panoul alb cu text explicativ din jurul butonului "+ Proiect nou" de pe hartă — a rămas doar butonul, plutitor
- [x] 2026-08-24 — Hartă atelier: canvas infinit (pan/zoom) păstrat, dar containerul umple tot ecranul disponibil în loc de o cutie fixă de 70vh care tăia marginile proiectelor de sus/jos
- [x] 2026-08-24 — Scoasă bara "Proiecte în execuție" de deasupra hărții atelierului
- [x] 2026-08-24 — Fundalul din spatele coloanelor de pe "Hartă atelier" e acum caroiaj punctat subtil, nu un panou solid
- [x] 2026-08-24 — Sidebar Echipă/Furnizori devin overlay pe tot ecranul pe mobil (sub 640px), cu buton × de închidere și fundal întunecat
- [x] 2026-08-24 — Butoane, taburi, câmpuri de formular și zone de atins mărite sub 640px; font 16px pe input-uri ca să nu mai facă zoom automat Safari pe iOS
- [x] 2026-08-24 — Temă complet alb-negru-gri (fără portocaliu deloc pe butoane), culorile de stare (întârziat/ok/finalizat) păstrate pentru claritate
- [x] 2026-08-20 — Fix crash la încărcare cauzat de Firebase care șterge array-urile goale (workers/assignments/repairs/connections deveneau `undefined`) — bloca butoanele de adăugat proiect/membru echipă

## Idei / de discutat
- (adaugă aici orice altceva observi — o notăm și decidem prioritatea împreună)
