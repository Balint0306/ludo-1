# GitHub Feltöltési Útmutató

## Git Telepítése Windows-ra

### 1. Git Letöltése
1. Menj a [https://git-scm.com/download/win](https://git-scm.com/download/win) oldalra
2. A letöltés automatikusan elindul
3. Futtasd a letöltött Git telepítőt

### 2. Git Telepítés
1. Kattints "Next" végig a telepítő lépésein
2. Használd az alapértelmezett beállításokat
3. **FONTOS:** Jelöld be a "Git Bash Here" és "Git GUI Here" opciókat
4. Válaszd a "Use Git from the Windows Command Prompt" opciót
5. Telepítés befejezése után indítsd újra a PowerShell-t

### 3. Git Konfiguráció
Nyiss egy **új PowerShell ablakot** és add meg a nevedet és email címedet:

```powershell
git config --global user.name "A Neved"
git config --global user.email "a.email@cimed.com"
```

## GitHub Repository Feltöltés

Miután a Git telepítve van és konfigurálva van:

```powershell
# 1. Lépj be a projekt mappába
cd n:\Ludo

# 2. Git repository inicializálása
git init

# 3. Fájlok hozzáadása
git add .

# 4. Első commit
git commit -m "Initial commit: Online multiplayer Ludo game"

# 5. Main ág átnevezése (ha szükséges)
git branch -M main

# 6. Remote repository hozzáadása
git remote add origin https://github.com/Balint0306/ludo-1.git

# 7. Feltöltés GitHub-ra
git push -u origin main
```

### Bejelentkezés
Az első `git push` parancs után a GitHub kérni fogja a bejelentkezési adataidat:
- **Username:** GitHub felhasználóneved
- **Password:** Personal Access Token (NEM a jelszavad!)

#### Personal Access Token Létrehozása
1. GitHub-on: Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → "Generate new token (classic)"
3. Add meg a token nevét: `Ludo Project`
4. Válaszd ki a `repo` scope-ot (teljes repo hozzáférés)
5. "Generate token"
6. **MÁSOLD KI ÉS MENTSD EL** a tokent valahova biztonságosan!
7. Használd ezt a tokent mint jelszót a `git push` során

## Gyors Verzió (Ha már van Git)

Ha már van Git telepítve és konfigurálva:

```powershell
cd n:\Ludo
git init
git add .
git commit -m "Initial commit: Online multiplayer Ludo game"
git branch -M main
git remote add origin https://github.com/Balint0306/ludo-1.git
git push -u origin main
```

## Későbbi Frissítések

Amikor módosítasz a kódon és fel akarod tölteni GitHub-ra:

```powershell
cd n:\Ludo
git add .
git commit -m "Leírás a változásokról"
git push
```

## Hibaelhárítás

### "git not recognized"
- Telepítsd a Git-et: [git-scm.com](https://git-scm.com)
- Indítsd újra a PowerShell-t

### "Permission denied"
- Ellenőrizd a GitHub bejelentkezési adataidat
- Használj Personal Access Token-t jelszó helyett

### "Repository not found"
- Ellenőrizd, hogy a repository URL helyes-e
- Ellenőrizd, hogy van-e hozzáférésed a repository-hoz
- Esetleg létre kell hoznod a repository-t GitHub-on

## Következő Lépések

1. **Telepítsd a Git-et** (ha még nincs)
2. **Konfiguráld a Git-et** (név és email)
3. **Futtasd a fenti parancsokat** a projekt feltöltéséhez
4. **Ellenőrizd GitHub-on**, hogy minden fájl feltöltődött-e

---

**Sikeres feltöltést! 🚀**
