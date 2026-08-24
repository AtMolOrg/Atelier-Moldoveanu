# Predare sesiune — 2026-08-25

Rezumat pentru continuarea lucrului, indiferent de pe ce calculator/sesiune se reia.

## Ce e live acum

- **URL**: https://atelier-moldoveanu.web.app
- **Repo**: https://github.com/AtMolOrg/Atelier-Moldoveanu (branch `main`)
- **Deploy**: automat — orice push pe `main` republică site-ul prin GitHub Actions (`.github/workflows/firebase-hosting-merge.yml`)
- **Proiect Firebase**: `atelier-m-cccb6` (Hosting + Realtime Database + Authentication)

## Stack (decis și motivat — vezi și memoria salvată)

- Vanilla JS, un singur fișier ([index.html](index.html)), fără build, fără framework — decizie deliberată pentru că nu se scrie cod manual, totul trece prin AI.
- Backend: Firebase Realtime Database (plan gratuit Spark, $0).
- Autentificare: Firebase Auth, un singur cont comun de echipă (`echipa@atelier-moldoveanu.local`), parolă știută doar de user. Regulile bazei de date cer `auth != null`.
- Găzduire: Firebase Hosting, subdomeniu gratuit.

## Ce s-a făcut în sesiunea asta

1. Login gate cu Firebase Auth peste board-ul existent (înainte era complet deschis).
2. Reguli de securitate pe Realtime Database (`database.rules.json`) — deploy-uite, verificate din exterior (401 fără autentificare).
3. Hosting + deploy automat prin GitHub Actions (`firebase init hosting:github`).
4. Redenumire site din `atelier-m-cccb6.web.app` în `atelier-moldoveanu.web.app`.
5. Fix layout: bara de sus și tab-urile Echipă/Furnizori plutesc acum cu adevărat peste canvas-ul infinit (înainte erau opace fără motiv — canvas-ul nu se rendera de fapt sub ele).
6. Eliminat butonul dublicat „+ Proiect nou" din canvas.
7. Cartonașele de angajați/furnizori — la jumătate din lățime, 2 pe rând.
8. Proiectele din „Hartă atelier" pot fi acum mutate **individual**, liber pe canvas, cu aliniere automată (snap) la marginile altor proiecte — tras de eticheta cu codul, care arată ca un tab de dosar. Proiectele nemutate rămân grupate normal.
9. Fix: cardul de proiect nu mai pornea panning-ul întregii hărți quando îl trăgeai de pe corp (doar eticheta face drag acum).
10. Fix: eliminat un „perete" artificial care bloca mutarea proiectelor spre stânga/sus.
11. Fix: scrollbar orizontal parazit în cardurile de proiect — cardul se dimensionează acum natural după conținut, nu mai are lățime fixă.

## De reținut

- **Parola contului comun** (`echipa@atelier-moldoveanu.local`) o știe doar userul — Claude nu o reține niciodată, din motive de securitate.
- **Cheia API Firebase** e deja în [index.html](index.html) (nu e secretă, e ok să fie publică — protecția reală vine din Security Rules).
- Dacă se reia lucrul pe alt calculator/sesiune Claude Code nouă: codul + acest fișier + [ITERATII.md](ITERATII.md) + [TODO.md](TODO.md) dau tot contextul necesar. Memoria Claude salvată azi (stack-ul ales, faptul că userul nu scrie cod) e legată de acest calculator — o sesiune nouă în alt loc nu o va avea automat.

## Neterminat / posibil de continuat

- Nimic deschis explicit la finalul sesiunii — ultimele fix-uri (scrollbar, perete stânga/sus) au fost confirmate „all good" de user.
