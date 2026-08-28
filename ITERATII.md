# Iterații aplicație — Atelier Moldoveanu

Jurnal al schimbărilor majore de design/arhitectură făcute pe aplicație, ca istoric de decizii — separat de [TODO.md](TODO.md), care e lista de lucruri de făcut.

## 2026-08-28

- **Comenzi materiale per proiect**: fiecare proiect are acum `p.orders` — o listă de materiale de aprovizionat, cu text liber, cantitate, furnizor (dropdown din furnizorii existenți) și stare care ciclează De comandat → Comandat → Primit. Apare ca panou pliabil în „dosarul" proiectului din Hartă atelier → Pe proiecte, între capul dosarului și rândul de etape. Pe cardul de proiect e o linie compactă „📋 Materiale 3/7 · incomplet/complet".
- **Fără bump `DATA_VERSION`** pentru asta: schimbarea e pur aditivă, iar backfill-ul se face în `normalizeState` (`p.orders = []` dacă lipsește). Motiv: `resolveVersioned` n-are ramură „mai nou decât știu", deci un bump ar face codul vechi să cadă pe `defaultState()` după o salvare pe versiunea nouă.
- Starea deschis/închis a panoului e per-proiect, doar în memorie (nu se salvează, nu se sincronizează). Editarea unui câmp salvează pe `change`, fără re-render, ca să nu sară focusul.

## 2026-08-24

- **Adaptare mobil**: butoane/taburi/câmpuri mai mari sub 640px (zone de atins), font 16px pe input-uri (evită zoom automat iOS Safari).
- **Temă**: din bej/maro cald → alb-negru-gri complet, fără portocaliu pe butoane. Culorile de stare (întârziat/ok/finalizat) rămân, fiindcă au sens funcțional.
- **Simplificare navigare**: eliminate din UI tab-urile "Cronologie" (Gantt), "Proiecte" (tabel) și "Reparații", precum și view-ul "Etape comune" din Hartă atelier (board liber cu coloane trase manual). A rămas un singur ecran de lucru: **Hartă atelier → Pe proiecte**. Codul vechi pentru toate astea e păstrat în fișier, doar scos din navigare — poate fi reactivat dacă e nevoie. Bara de tab-uri a fost eliminată complet din header (nu mai are rost cu un singur tab).
- **Hartă atelier → canvas infinit**: fundal cu caroiaj punctat (nu panou solid), containerul de pan/zoom umple tot ecranul disponibil (nu mai e cutie fixă de 70vh care tăia marginile).
- **UI plutitor**: bara de sus (titlu, search, butoane) nu mai are fundal alb solid — totul plutește direct pe caroiaj. Butonul "+ Proiect nou" de pe hartă e simplu, plutitor, fără panoul alb cu text explicativ. Sidebar-urile Echipă/Furnizori nu se mai deschid automat la intrarea pe hartă — doar la hover/click pe eticheta laterală.
- **Fix**: partițiile ("⊞" pe o etapă, ex. Atelier/Extern) erau stocate global pe etapă, deci adăugarea uneia pe un proiect apărea și la celelalte. Acum sunt per-proiect.
- **Buton feedback**: iconița 💬 din bara de sus (unde erau tab-urile) deschide un mesaj scurt; se salvează într-un nod separat în Firebase (`workshop-board-feedback`, nu se amestecă cu datele panoului). Din același modal, "Exportă tot (.txt)" descarcă tot ce s-a strâns într-un fișier text.

## 2026-08-20

- Fix crash la încărcare cauzat de Firebase care șterge array-urile goale (`workers`/`assignments`/`repairs`/`connections` deveneau `undefined`) — bloca butoanele de adăugat proiect/membru echipă.
