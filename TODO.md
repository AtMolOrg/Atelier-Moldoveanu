# TODO — Atelier Moldoveanu

## Adaptare mobil (telefon)
- [ ] "Hartă atelier" (canvas pan/zoom, drag&drop coloane): greu de făcut touch-friendly — de reevaluat separat, posibil rămâne experiență doar-desktop

## Ascunse temporar (cod încă există, doar scoase din navigare)
- [ ] Tab "Cronologie" (Gantt) — scos din bara de tab-uri pe 2026-08-24, de reevaluat/redesenat ulterior
- [ ] View-ul "Etape comune" din Hartă atelier (board-ul liber cu coloane trase manual) — scos din UI pe 2026-08-24, a rămas doar "Pe proiecte"

## Rezolvate
- [x] 2026-08-24 — Scos butonul "+ Proiect nou" din bara de sus când ești pe "Hartă atelier" (rămâne doar cel din toolbar-ul hărții, era duplicat)
- [x] 2026-08-24 — Scoasă bara "Proiecte în execuție" de deasupra hărții atelierului
- [x] 2026-08-24 — Fundalul din spatele coloanelor de pe "Hartă atelier" e acum caroiaj punctat subtil, nu un panou solid
- [x] 2026-08-24 — Sidebar Echipă/Furnizori devin overlay pe tot ecranul pe mobil (sub 640px), cu buton × de închidere și fundal întunecat; nu se mai deschid automat pe mobil la intrarea în "Hartă atelier"
- [x] 2026-08-24 — Butoane, taburi, câmpuri de formular și zone de atins mărite sub 640px; font 16px pe input-uri ca să nu mai facă zoom automat Safari pe iOS
- [x] 2026-08-24 — Pe telefon (sub 640px), aplicația pornește implicit pe tab-ul "Proiecte" în loc de "Hartă atelier"
- [x] 2026-08-24 — Temă complet alb-negru-gri (fără portocaliu deloc pe butoane), culorile de stare (întârziat/ok/finalizat) păstrate pentru claritate
- [x] 2026-08-20 — Fix crash la încărcare cauzat de Firebase care șterge array-urile goale (workers/assignments/repairs/connections deveneau `undefined`) — bloca butoanele de adăugat proiect/membru echipă

## Idei / de discutat
- (adaugă aici orice altceva observi — o notăm și decidem prioritatea împreună)
