# Guide d'Intégration Power BI

Ce guide explique comment intégrer vos rapports Power BI directement dans votre application Pharmacie.

## 🚀 Installation rapide

### Étape 1 : Créer un fichier `.env` dans le dossier `frontend/`

Copiez le fichier `.env.example` en `.env` :

```bash
cp frontend/.env.example frontend/.env
```

### Étape 2 : Obtenir les URLs publiques de vos rapports Power BI

#### Option A : Publier les rapports en tant que "Public" (recommandé pour les démos)

1. Ouvrez **Power BI Service**
2. Allez dans **Mon espace de travail** → sélectionnez votre rapport
3. Cliquez sur **Partager**
4. Cochez **Partager avec le lien public**
5. Copiez l'URL du rapport

#### Option B : Utiliser Power BI Embedded avec authentification Azure

Pour une sécurité accrue, utilisez Power BI Premium ou Embedded :

1. Configurez une **Application Azure** pour l'authentification Service Principal
2. Accordez les autorisations Power BI API
3. Générez un token de service
4. Utilisez le token pour générer les URLs embed

### Étape 3 : Ajouter les URLs à votre `.env`

Exemple :

```env
VITE_POWERBI_STOCK_REPORT=https://app.powerbi.com/reportEmbed?reportId=abc123...
VITE_POWERBI_CONSUMPTION_REPORT=https://app.powerbi.com/reportEmbed?reportId=def456...
VITE_POWERBI_DISTRIBUTION_REPORT=https://app.powerbi.com/reportEmbed?reportId=ghi789...
VITE_POWERBI_MOVEMENTS_REPORT=https://app.powerbi.com/reportEmbed?reportId=jkl012...
VITE_POWERBI_INVENTORY_REPORT=https://app.powerbi.com/reportEmbed?reportId=mno345...
```

### Étape 4 : Redémarrer l'application

```bash
cd frontend
npm install
npm run dev
```

## 📍 Où les rapports apparaissent

### 1. **Page d'accueil** (`/app/home`)
Les 3 premiers rapports (Stock, Consommation, Distribution) apparaissent directement en bas de la page.

### 2. **Section BI** (`/app/bi`)
Tous les rapports disponibles s'affichent avec des iframes.

### 3. **Pages détaillées** (`/app/bi/stock`, `/app/bi/prescriptions`, etc.)
Chaque rapport peut avoir sa propre page.

## 🔒 Sécurité

- **Pour les démos** : Utilisez les URLs publiques
- **Pour la production** : Implémentez l'authentification Power BI Embedded avec Azure AD
- Les iframes n'acceptent que les URLs HTTPS valides
- Vérifiez que votre rapport Power BI autorise les embed publics

## 🐛 Dépannage

### Le rapport n'apparaît pas

1. ✅ Vérifiez que l'URL est correcte
2. ✅ Vérifiez que le rapport est marqué comme "public" dans Power BI
3. ✅ Vérifiez les logs du navigateur (F12 → Console)
4. ✅ Attendez que la variable d'environnement soit rechargée (redémarrez le serveur dev)

### Message d'erreur "Impossible de charger le rapport"

- Le rapport n'est pas accessible depuis le navigateur
- L'URL contient des caractères non valides
- Le rapport a expiré ou a été supprimé

### CORS ou erreurs de sécurité

- Assurez-vous que Power BI autorise les embed publics
- Vérifiez les paramètres de sécurité de votre tenant Power BI

## 🛠️ Configuration avancée

### Modifier la hauteur des rapports

Éditez [src/components/PowerBIEmbed.jsx](../src/components/PowerBIEmbed.jsx) :

```jsx
<PowerBIEmbed 
  title="Stock"
  url={import.meta.env.VITE_POWERBI_STOCK_REPORT}
  height="700px"  // Modifier cette valeur
/>
```

### Ajouter un nouveau rapport

1. Ajoutez la variable d'environnement dans `.env` :
   ```
   VITE_POWERBI_NEW_REPORT=https://...
   ```

2. Ajoutez-le dans [src/pages/Home.jsx](../src/pages/Home.jsx) :
   ```jsx
   <PowerBIEmbed 
     title="Mon Rapport"
     url={import.meta.env.VITE_POWERBI_NEW_REPORT}
     height="500px"
   />
   ```

### Personnaliser le composant PowerBIEmbed

Le composant [src/components/PowerBIEmbed.jsx](../src/components/PowerBIEmbed.jsx) gère :
- ✅ Chargement progressif des iframes
- ✅ Affichage d'erreurs claires
- ✅ Responsive design
- ✅ Support multilangue (FR/EN)

## 📚 Ressources

- [Power BI Embed Documentation](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embedding)
- [Power BI Public URL](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-share-report-power-point)
- [Power BI API Reference](https://learn.microsoft.com/en-us/power-bi/developer/rest-api-reference)

## ✅ Checklist d'intégration

- [ ] Rapports créés dans Power BI
- [ ] Rapports marqués comme publics
- [ ] Fichier `.env` créé avec les URLs
- [ ] Rapports visibles sur la page d'accueil
- [ ] Rapports visibles dans `/app/bi`
- [ ] Test en mode production
- [ ] Configuration CORS correcte

---

**Besoin d'aide ?** Consultez la documentation Power BI officielle ou contactez le support.
