# Node.js Telepítési Útmutató

## Windows-ra

### 1. Letöltés
1. Menj a [https://nodejs.org](https://nodejs.org) oldalra
2. Töltsd le a **LTS verziót** (Long Term Support) - ez a stabil, ajánlott verzió
3. Válaszd a Windows Installer (.msi) 64-bit verziót

### 2. Telepítés
1. Futtasd a letöltött .msi fájlt
2. Kattints "Next" a telepítő varázsló lépésein
3. Fogadd el a licenc feltételeket
4. Használd az alapértelmezett telepítési útvonalat: `C:\Program Files\nodejs\`
5. **FONTOS:** Jelöld be a "Automatically install the necessary tools" opciót
6. Kattints "Install" és várj a telepítés befejezésére
7. Kattints "Finish"

### 3. Ellenőrzés
Nyiss egy **új PowerShell ablakot** (fontos, hogy új legyen!) és futtasd:

```powershell
node --version
npm --version
```

Látnod kell valami ilyesmit:
```
v20.11.0
10.2.4
```

## Ha már telepítve van a Node.js

Ha a fenti parancsok működnek, minden rendben! Folytathatod a függőségek telepítésével:

```powershell
cd n:\Ludo
npm install
npm start
```

## Következő lépés

Miután a Node.js települt, futtasd ezeket a parancsokat:

```powershell
# 1. Lépj be a Ludo mappába
cd n:\Ludo

# 2. Telepítsd a függőségeket
npm install

# 3. Indítsd el a szervert
npm start
```

A szerver elindul a `http://localhost:3000` címen, és készen állsz a játékra! 🎲
