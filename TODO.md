# TODO — Atelier Moldoveanu

## Adaptare mobil (telefon)
- [ ] "Hartă atelier" (canvas pan/zoom, drag&drop coloane): greu de făcut touch-friendly — de reevaluat separat. Important: e acum SINGURUL tab din aplicație, deci pe mobil nu mai există altă variantă de fallback (ex. tabelul "Proiecte") — de regândit ce vede un utilizator de telefon.

## Ascunse temporar (cod încă există, doar scoase din navigare)
- [ ] View-ul "Etape comune" din Hartă atelier (board-ul liber cu coloane trase manual) — scos din UI pe 2026-08-24, a rămas doar "Pe proiecte"
- [ ] Tab "Proiecte" (tabelul cu Traseu/Tabel, filtrul "arată și proiectele finalizate") — scos din bara de tab-uri pe 2026-08-24

Istoricul lucrurilor rezolvate s-a mutat în [ITERATII.md](ITERATII.md), ca să rămână TODO-ul curat, doar cu ce mai e de făcut.

## Abandonat — „tracker deștept" / prognoză automată
Ideea: aplicația să estimeze singură când se termină fiecare proiect și cum se propagă întârzierile
(simulare pe oameni, min/buc × cantitate, calibrare din realitate). Renunțat pe 2026-09-03 —
prea complex, încredere mică că iese util. Groundwork-ul (`pc.qty`, `⏱ min/buc`, `state.settings`,
`state.calib`) a fost dat înapoi cu revert. A rămas doar tab-ul **Gantt** ca vizualizare manuală.

## Idei / de discutat
- (adaugă aici orice altceva observi — o notăm și decidem prioritatea împreună)
