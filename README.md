# Ludo - Online Multiplayer Társasjáték 🎲

Modern, vizuálisan lenyűgöző online multiplayer Ludo játék Node.js backend-del és Socket.io valós idejű kommunikációval.

![Ludo Game](https://img.shields.io/badge/Multiplayer-2--4%20Players-blue)
![Node.js](https://img.shields.io/badge/Node.js-Required-green)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-red)

## ✨ Funkciók

- 🎮 **Online Multiplayer** - 2-4 játékos támogatás
- 🏠 **Szoba-alapú játék** - Egyedi szoba kódokkal
- ⚡ **Valós idejű szinkronizálás** - Socket.io WebSocket
- 🎨 **Modern UI/UX** - Glassmorphism design, animációk
- 🎲 **Teljes játéklogika** - Klasszikus Ludo szabályok
- 🔒 **Szerver oldali validáció** - Anti-cheat védelem
- 📱 **Reszponzív design** - Desktop és tablet támogatás

## 🚀 Gyors Kezdés

### Követelmények

- **Node.js** v16+ és npm (Letöltés: [nodejs.org](https://nodejs.org))

### Telepítés

```powershell
# 1. Lépj be a projekt mappába
cd n:\Ludo

# 2. Telepítsd a függőségeket
npm install

# 3. Indítsd el a szervert
npm start
```

A szerver elindul: **http://localhost:3000**

### Játék Indítása

1. **Host játékos:**
   - Nyisd meg: `http://localhost:3000`
   - Add meg a neved
   - Kattints "Új Szoba Létrehozása"
   - Másold ki a szoba kódot (6 karakter)

2. **További játékosok:**
   - Nyissanak új böngésző ablakot
   - Csatlakozzanak a szoba kóddal

3. **Kezdjétek el a játékot!** 🎉

## 📁 Projekt Struktúra

```
n:\Ludo\
├── server.js          # Node.js + Express + Socket.io backend
├── index.html         # Frontend HTML struktúra
├── index.css          # Design system (glassmorphism, animációk)
├── game.js            # Kliens oldali játéklogika
├── package.json       # NPM konfiguráció
├── NODE_INSTALL.md    # Node.js telepítési útmutató
└── README.md          # Ez a fájl
```

## 🎮 Játékszabályok

### Alapok
- **Cél:** Elsőként juttasd haza mind a 4 bábudat
- **Indulás:** 6-ost kell dobni a bábuk elindításához
- **Mozgás:** Lépj a kocka értékével (1-6)
- **Ütés:** Ha bábu másik színű bábura lép, visszaküldi házba
- **Biztonságos mezők:** ⭐ csillagos mezőkön nem lehet ütni
- **Célba jutás:** Pontosan kell dobni a célmezőre

### Multiplayer
- 2-4 játékos körönként
- 6-os dobás esetén újra dobhatsz
- Csak saját bábuid mozgathatod

## 🛠️ Technológiák

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web szerver framework
- **Socket.io** - WebSocket kommunikáció
- **CORS** - Cross-origin támogatás

### Frontend
- **HTML5** - Szemantikus struktúra
- **CSS3** - Modern design (glassmorphism, animációk)
- **Vanilla JavaScript** - Kliens oldali logika
- **Socket.io Client** - Valós idejű szinkronizálás
- **Google Fonts (Outfit)** - Typography

## 🎨 Design Jellemzők

- **Glassmorphism** effektek backdrop blur-ral
- **Vibráns színpaletta** (piros, kék, zöld, sárga)
- **Dark mode** gradiens háttér
- **Smooth animációk** (kocka dobás, bábuk mozgása)
- **Particles background** animáció
- **Responsive layout** - Grid & Flexbox

## 🌐 Hálózati Játék

### Helyi hálózaton (LAN)
1. Keresd meg a host gép IP címét:
   ```powershell
   ipconfig
   ```
2. Más gépeken nyisd meg: `http://[HOST_IP]:3000`

### Interneten keresztül
- Deploy-old Heroku/Railway/Render szolgáltatásra
- Vagy használj port forwarding-ot

## 📝 Node.js Telepítés

Ha nincs még telepítve a Node.js:

**Részletes útmutató:** [NODE_INSTALL.md](NODE_INSTALL.md)

**Röviden:**
1. Letöltés: [nodejs.org](https://nodejs.org) (LTS verzió)
2. Telepítés (Windows Installer)
3. Ellenőrzés: `node --version` és `npm --version`

## 🔧 NPM Scriptek

```json
{
  "start": "node server.js",     // Indítás
  "dev": "nodemon server.js"     // Dev mód (auto-reload)
}
```

## 🐛 Hibaelhárítás

### "npm not recognized"
- Telepítsd a Node.js-t: [nodejs.org](https://nodejs.org)
- Indítsd újra a PowerShell ablakot

### Port már használatban (EADDRINUSE)
- Állítsd be másik portot: `PORT=3001 npm start`
- Vagy állítsd le a foglalt folyamatot

### Socket kapcsolódási hiba
- Ellenőrizd, hogy a szerver fut-e
- Nézd meg a firewall beállításokat
- Ellenőrizd a `http://localhost:3000` elérhetőségét

## 🚀 Továbbfejlesztési Ötletek

- [ ] Perzisztens adatbázis (MongoDB/PostgreSQL)
- [ ] Felhasználói fiókok és bejelentkezés
- [ ] Játék statisztikák és ranglisták
- [ ] Chat funkció Socket.io-val
- [ ] AI ellenfél (single player mód)
- [ ] Hangeffektek és zene
- [ ] Mobil app (React Native)
- [ ] Custom házszabályok
- [ ] Többnyelvű támogatás (i18n)

## 📄 Licenc

MIT License - Szabadon használható és módosítható

## 👨‍💻 Fejlesztő

Készítve modern web technológiákkal ❤️

---

**Élvezd a játékot! 🎲🎉**

Problémák esetén nézd meg a [NODE_INSTALL.md](NODE_INSTALL.md) fájlt vagy a [walkthrough.md](walkthrough.md) részletes dokumentációt.
