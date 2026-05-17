# Backlog des Sprints - Plateforme TRANSTU

## 📋 Sprint 1 : Analyse et Intégration des données
**Durée:** 2 semaines  
**Objectif:** Analyser la structure BD Oracle et mettre en place l'ETL

| ID | User Story | Tâche | Priorité |
|---|---|---|---|
| 1.1 | En tant que développeur BI, j'ai besoin de comprendre les données du système afin d'analyser l'activité médicale et pharmaceutique de la TRANSTU. | **Connexion à la base de données Oracle.** Exploration des tables existantes (produits, prescriptions, distributions, stocks). Analyse de la structure et de la qualité des données. | 1 |
| 1.2 | En tant que développeur BI, je dois concevoir l'architecture décisionnaire afin de permettre l'analyse des prestations médicales et pharmaceutiques. | **Identifier les dimensions et les faits.** Concevoir le modèle Data Warehouse - Concevoir les Data Marts (Consommation, Stock, Mouvement). | 1 |
| 1.3 | En tant que développeur BI, je dois préparer le chargement des tables dimensionnelles et factuelles. | **Configurer l'environnement ETL (Talend ou Airflow).** Nettoyer et transformer les données - Préparer le chargement des tables dimensionnelles et factuelles. | 1 |

---

## 📋 Sprint 2 : Développement des APIs et Backend
**Durée:** 2 semaines  
**Objectif:** Construire les APIs REST complètes et la logique métier

| ID | User Story | Tâche | Priorité |
|---|---|---|---|
| 2.1 | En tant que développeur Backend, j'ai besoin des APIs de gestion des produits et références afin de pouvoir consulter et modifier le catalogue pharmaceutique. | **Créer les endpoints CRUD pour Produits** - Implémenter la validation avec Zod - Ajouter les filtres et la pagination - Documenter avec Swagger | 1 |
| 2.2 | En tant que développeur Backend, j'ai besoin des APIs de gestion du stock afin de suivre les disponibilités en temps réel. | **Créer les endpoints CRUD pour Stock** - Implémenter les mouvements de stock (entrée/sortie/ajustement) - Gérer les lots (expiration, numéro de lot) - Ajouter les alertes de stock minimum | 1 |
| 2.3 | En tant que développeur Backend, j'ai besoin des APIs de distribution afin de gérer les envois vers les dépôts satellites. | **Créer les endpoints pour Distribution** - Gérer les commandes de distribution - Tracker les statuts (en attente, expédiée, reçue) - Implémenter la logique de répartition intelligente | 1 |
| 2.4 | En tant que développeur Backend, j'ai besoin d'améliorer la gestion des rôles et permissions afin de sécuriser les opérations métier. | **Implémenter RBAC complet** - Créer les rôles: Admin, Pharmacien, Secrétaire, Gestionnaire stock - Ajouter les permissions granulaires par module - Intégrer avec JWT | 1 |
| 2.5 | En tant que développeur Backend, j'ai besoin des APIs de prescriptions afin de permettre aux médecins de prescrire des médicaments. | **Créer les endpoints pour Prescriptions** - Implémenter la validation des prescriptions - Gérer les agents pharmaciens associés - Créer les rapports de conformité | 2 |

---

## 📋 Sprint 3 : Interface Utilisateur et Tableaux de Bord
**Durée:** 2 semaines  
**Objectif:** Développer l'interface complète avec React/Vite et intégrer Power BI

| ID | User Story | Tâche | Priorité |
|---|---|---|---|
| 3.1 | En tant qu'utilisateur Admin, j'ai besoin d'un tableau de bord de gestion des produits afin de consulter et maintenir le catalogue. | **Créer la page /app/products** - Afficher la liste avec pagination - Implémenter les filtres (catégorie, fournisseur, stock) - Ajouter les actions CRUD (Create, Read, Update, Delete) | 1 |
| 3.2 | En tant qu'utilisateur Pharmacien, j'ai besoin d'un tableau de bord de stock afin de suivre les disponibilités et les mouvements. | **Créer la page /app/stock** - Afficher l'inventaire avec les quantités - Implémenter les mouvements (ajout, prélèvement, ajustement) - Afficher les alertes de stock minimum | 1 |
| 3.3 | En tant qu'utilisateur Secrétaire, j'ai besoin d'une interface de gestion des prescriptions afin de traiter les demandes des médecins. | **Créer la page /app/prescriptions** - Afficher le formulaire de prescription avec validation - Intégrer les agents pharmaciens - Implémenter le workflow de validation | 1 |
| 3.4 | En tant qu'utilisateur Gestionnaire, j'ai besoin d'un tableau de bord de distribution afin de suivre les envois vers les dépôts. | **Créer la page /app/distribution** - Afficher les commandes de distribution - Tracker les statuts (en attente, expédiée, reçue) - Ajouter les graphiques de performance | 1 |
| 3.5 | En tant que Directeur, j'ai besoin de tableaux de bord Power BI intégrés afin de suivre les KPIs en temps réel. | **Intégrer Power BI sur la home page** - Afficher les rapports d'indicateurs clés (consommation, stock, distribution) - Implémenter les filtres par date et dépôt - Créer la page complète /app/bi | 1 |
| 3.6 | En tant qu'utilisateur, j'ai besoin d'une authentification sécurisée afin de protéger mes données. | **Créer les pages login/register** - Implémenter la validation des formulaires - Gérer les tokens JWT - Ajouter la fonctionnalité "Forgot Password" | 2 |

---

## 📋 Sprint 4 : Tests, Optimisation et Déploiement
**Durée:** 2 semaines  
**Objectif:** Assurer la qualité, la performance et la mise en production

| ID | User Story | Tâche | Priorité |
|---|---|---|---|
| 4.1 | En tant que QA Engineer, j'ai besoin de tester toutes les APIs afin de garantir la qualité du backend. | **Créer les tests unitaires (Jest)** - Tester les endpoints CRUD - Tester la validation avec Zod - Tester les middlewares d'authentification | 1 |
| 4.2 | En tant que QA Engineer, j'ai besoin de tester l'interface utilisateur afin de garantir la qualité du frontend. | **Créer les tests React (Vitest)** - Tester les composants principaux - Tester la navigation et les routes - Tester l'intégration avec l'API | 1 |
| 4.3 | En tant que DevOps Engineer, j'ai besoin de mettre en place la CI/CD afin d'automatiser les tests et les déploiements. | **Configurer GitHub Actions** - Ajouter les workflows de test automatiques - Configurer le déploiement sur staging - Configurer le déploiement en production | 1 |
| 4.4 | En tant que Développeur, j'ai besoin d'optimiser les performances de l'application afin d'assurer une bonne expérience utilisateur. | **Optimiser les requêtes BD (indexation)** - Implémenter le caching (Redis) - Optimiser les bundles JavaScript - Lazy loading des composants | 2 |
| 4.5 | En tant qu'Administrateur, j'ai besoin de configurer l'environnement de production afin de lancer l'application en production. | **Configurer les variables d'environnement** - Sécuriser les connexions BD - Configurer les logs et le monitoring - Prévoir la scalabilité | 1 |
| 4.6 | En tant qu'Utilisateur, j'ai besoin que l'application soit accessible et performante afin d'utiliser la plateforme au quotidien. | **Optimiser les temps de chargement** - Implémenter la pagination intelligente - Ajouter les indicateurs de progression - Gérer les erreurs et les timeouts | 2 |

---

## 📊 Récapitulatif

| Sprint | Durée | Objectif Principal | Livrables |
|--------|-------|-------------------|-----------|
| **Sprint 1** | 2 sem | Analyse & ETL | Structure DW, ETL configuré, données chargées |
| **Sprint 2** | 2 sem | APIs Backend | Endpoints CRUD, validation, RBAC, Swagger |
| **Sprint 3** | 2 sem | UI & Dashboards | Pages React, Power BI intégré, authentification |
| **Sprint 4** | 2 sem | Tests & Déploiement | Tests automatisés, CI/CD, production ready |

---

## 🎯 Points de Priorité par Sprint

- **Sprint 1:** 3 US (1 semaine chacune)
- **Sprint 2:** 5 US (4 priorité 1, 1 priorité 2)
- **Sprint 3:** 6 US (5 priorité 1, 1 priorité 2)
- **Sprint 4:** 6 US (4 priorité 1, 2 priorité 2)

**Total:** 20 User Stories réparties sur 4 sprints de 2 semaines chacun
