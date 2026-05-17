# 🚀 Démarrage rapide - Intégration Power BI

## ⚡ En 3 minutes

### 1️⃣ Créer le fichier de configuration

```bash
cd frontend
cp .env.example .env
```

### 2️⃣ Ajouter vos URLs Power BI

Ouvrez `frontend/.env` et remplacez `<URL>` par vos URLs publiques Power BI :

```env
VITE_POWERBI_STOCK_REPORT=<URL du rapport Stock>
VITE_POWERBI_CONSUMPTION_REPORT=<URL du rapport Consommation>
VITE_POWERBI_DISTRIBUTION_REPORT=<URL du rapport Distribution>
```

**Comment obtenir les URLs ?**
1. Ouvrez Power BI
2. Faites **Partager** sur votre rapport
3. Cochez **Partager avec le lien public**
4. Copiez l'URL

### 3️⃣ Redémarrer et c'est fait !

```bash
npm run dev
```

Allez à http://localhost:5173/app/home → Les rapports s'affichent ! ✨

---

## 📍 Où les rapports apparaissent

- **Page d'accueil** : `/app/home` (3 rapports affichés directement)
- **BI complet** : `/app/bi` (tous les rapports)

---

## 🔧 Besoin de plus d'infos ?

- [Guide complet](POWERBI_INTEGRATION_GUIDE.md)
- [Résumé des changements](POWERBI_SETUP_SUMMARY.md)

---

**C'est tout !** Les rapports s'affichent maintenant directement. 🎉
