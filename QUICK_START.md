# ⚡ DÉMARRAGE RAPIDE - Agents Management

## 🎯 Objectif
Avoir une table `AGENT` (agent_id, agent_name, agent_situation) qui alimente la liste des agents dans les prescriptions médicales.

## ✅ FAIT - Voici ce que vous avez:

### 1. Table AGENT en BD
```sql
CREATE TABLE AGENT (
  ID        NUMBER PRIMARY KEY,              -- agent_id
  NAME      VARCHAR2(255) NOT NULL,         -- agent_name
  SITUATION VARCHAR2(500),                   -- agent_situation
  CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
  UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
)
```

### 2. API REST Complète
```
GET    /api/agents                 - Liste des agents
GET    /api/agents/:id             - Un agent
POST   /api/agents                 - Créer
PUT    /api/agents/:id             - Modifier
DELETE /api/agents/:id             - Supprimer
```

### 3. Interface Admin
- Page: `/app/admin/agents`
- CRUD complet (Create, Read, Update, Delete)
- Recherche
- Pagination

### 4. Intégration Prescriptions
- Les agents créés apparaissent automatiquement dans le dropdown du formulaire de prescription
- Fonctionne via `listPrescriptionAgents()` qui interroge la table AGENT

---

## 🚀 ÉTAPES D'EXÉCUTION

### Étape 1: Créer la Table (3 secondes)
```bash
# Windows
.\create-agent-table.bat

# Ou Linux/Mac
bash create-agent-table.sh

# Ou Manuel
cd backend
npm exec node scripts/create_agent_table.mjs
```

✅ Résultat: Vous verrez "✓ Table AGENT created successfully"

### Étape 2: Redémarrer Backend (5 secondes)
```bash
cd backend
npm start
```

### Étape 3: Redémarrer Frontend (5 secondes)
```bash
# Dans un autre terminal
cd frontend
npm run dev
```

### Étape 4: Tester (1 minute)

1. **Aller à Admin**
   - URL: http://localhost:5173
   - Connectez-vous
   - Cliquez "Admin" dans le dashboard

2. **Créer un Agent**
   - Cliquez "Agents"
   - Remplissez:
     - **Agent Name**: Dr. Jean Dupont
     - **Agent Situation**: Service de Cardiologie
   - Cliquez "Create Agent" ✅

3. **Vérifier dans Prescriptions**
   - Allez: Doctors → Prescriptions
   - Créez une prescription
   - Cliquez sur le champ "Agents"
   - Voir votre agent dans la liste ✅

---

## 📝 EXEMPLES

### Via API (cURL)

**Créer un agent:**
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agent_name": "Dr. Jean Dupont",
    "agent_situation": "Service de Cardiologie"
  }'
```

**Récupérer tous les agents:**
```bash
curl http://localhost:3000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Modifier un agent:**
```bash
curl -X PUT http://localhost:3000/api/agents/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agent_name": "Dr. John Smith"
  }'
```

**Supprimer un agent:**
```bash
curl -X DELETE http://localhost:3000/api/agents/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via Interface Admin

- **Créer**: Remplir formulaire + bouton "Create Agent"
- **Modifier**: Cliquer ✏️ + modifier + bouton "Update Agent"
- **Supprimer**: Cliquer 🗑️ + confirmer

---

## 🔍 VÉRIFICATIONS

### "Ça marche?"
```bash
# 1. En base de données
SELECT * FROM AGENT;
-- Devrait montrer votre agent ✅

# 2. Via API
curl http://localhost:3000/api/agents -H "Authorization: Bearer YOUR_TOKEN"
-- Devrait retourner votre agent en JSON ✅

# 3. Dans l'application
# Créez une prescription et recherchez l'agent
-- Devrait être dans le dropdown ✅
```

### "Ça ne marche pas?"

**Problème**: "Table not found"
```bash
# Vérifier que le script s'est exécuté
# Exécuter manuellement:
cd backend
npm exec node scripts/create_agent_table.mjs
```

**Problème**: "Permission denied"
```bash
# Vérifier les permissions de l'utilisateur
# Besoin: PERMISSIONS.PRESCRIPTIONS_WRITE
```

**Problème**: "Agents n'apparaissent pas"
```bash
# Actualisez le navigateur (Ctrl+R)
# Vérifiez les logs du backend
# Assurez-vous d'avoir créé au moins un agent
```

---

## 📚 DOCUMENTATION

| Doc | Pour |
|-----|------|
| `README_AGENTS.md` | 📖 Vue d'ensemble |
| `AGENT_SETUP_GUIDE.md` | 📚 Guide complet |
| `AGENT_TABLE_SOLUTION.md` | 🎯 Solution expliquée |
| `AGENT_IMPLEMENTATION.md` | 🔧 Détails techniques |
| `AGENT_CHANGES_SUMMARY.md` | 📝 Changements apportés |
| `IMPLEMENTATION_CHECKLIST.md` | ✅ Vérification |
| `FILE_STRUCTURE_OVERVIEW.md` | 📁 Structure des fichiers |

---

## 💡 POINTS CLÉS

✅ **Backward Compatible**: Fonctionne même si la table AGENT n'existe pas (fallback sur PRESCRIPTION)

✅ **Automatique**: Une fois un agent créé, il apparaît automatiquement dans les prescriptions

✅ **Réutilisable**: Un agent peut être utilisé dans plusieurs prescriptions

✅ **Centralisé**: Gérez vos agents depuis l'admin, pas depuis chaque prescription

✅ **Flexible**: Modifiez/supprimez les agents à tout moment

---

## ⏱️ TEMPS TOTAL

- **Créer table**: 1 seconde
- **Redémarrer**: 10 secondes
- **Créer agent**: 30 secondes
- **Tester**: 2 minutes
- **TOTAL**: ~3 minutes ✅

---

## 🎓 PROCHAIN APPRENTISSAGE

Après avoir testé:
1. Lisez `README_AGENTS.md` pour comprendre l'architecture
2. Explorez `AdminAgents.jsx` pour voir comment c'est implémenté
3. Vérifiez la fonction `listPrescriptionAgents()` dans `prescriptions.controller.js`

---

## 📞 BESOIN D'AIDE?

1. **Installation bloquée?**
   → Voir `AGENT_SETUP_GUIDE.md`

2. **Erreur?**
   → Voir `IMPLEMENTATION_CHECKLIST.md` - Diagnostic

3. **Comment ça marche?**
   → Voir `AGENT_IMPLEMENTATION.md` - Détails techniques

4. **C'est pas assez?**
   → Voir `AGENT_TABLE_SOLUTION.md` - Solution complète

---

**Vous êtes prêt! 🚀 Commencez par exécuter create-agent-table.bat**

---

*Created: 10/05/2026*  
*Status: ✅ Prêt à l'Emploi*  
*Version: 1.0*
