# TODO — Atelier Moldoveanu

## Adaptare mobil (telefon)
- [ ] "Hartă atelier" (canvas pan/zoom, drag&drop coloane): greu de făcut touch-friendly — de reevaluat separat. Important: e acum SINGURUL tab din aplicație, deci pe mobil nu mai există altă variantă de fallback (ex. tabelul "Proiecte") — de regândit ce vede un utilizator de telefon.

## Ascunse temporar (cod încă există, doar scoase din navigare)
- [ ] View-ul "Etape comune" din Hartă atelier (board-ul liber cu coloane trase manual) — scos din UI pe 2026-08-24, a rămas doar "Pe proiecte"
- [ ] Tab "Proiecte" (tabelul cu Traseu/Tabel, filtrul "arată și proiectele finalizate") — scos din bara de tab-uri pe 2026-08-24

Istoricul lucrurilor rezolvate s-a mutat în [ITERATII.md](ITERATII.md), ca să rămână TODO-ul curat, doar cu ce mai e de făcut.

## În lucru — „tracker deștept" / prognoză (Cronologie faza 2+)
- [x] Faza 1: tab „Cronologie" — Gantt cu bare per proiect (deschidere → dată estimată de gata), culori pe fază, zoom Zi/Săpt/Lună, linie „azi", ⚑ termen, mâner de tras pe capătul barei care arată întârzierea (`p.gataEstimat`).
- [x] Faza 0a: câmpuri de estimare — `pc.qty` (buc/piesă), `station.minPerUnit` (⏱ min/buc pe capul etapei de piesă), `state.settings.hoursPerDay` (7), `state.calib` (acumulator gol).
- [ ] Faza 0b: `stageEnteredAt` pe proiect + piesă la fiecare schimbare de etapă; la ieșirea dintr-o etapă de piesă → sample în `state.calib` (minute / buc). Log și mutările de piese. Silent.
- [ ] Faza 2: motor de simulare — pe fiecare om, coadă de etape (durata = `Σ(qty×min/buc)/(7h×nr oameni)`), prioritate cel-mai-strâns-termen; ieșire = dată estimată de final per proiect + cine slăbește. Ecran „bilanț de seară". Cronologie folosește data din simulare.
- [ ] Faza 3 (opțional): apel real la un model (Claude) cu rezumatul structurat → recomandare în cuvinte. Necesită cheie API în client — de discutat riscul.
- [ ] Mai târziu: contenție pe bancuri (capacitate din „lanes"), dependențe explicite proiect→proiect, date de sosire pe comenzi de material.

## Idei / de discutat
- (adaugă aici orice altceva observi — o notăm și decidem prioritatea împreună)
