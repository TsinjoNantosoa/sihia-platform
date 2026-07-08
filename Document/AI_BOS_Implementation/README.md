# AI BOS — Documentation d'implémentation

> **AI Business Operating System** — Plateforme intelligente des entreprises  
> **Version doc :** 0.1.0 | **Juillet 2026**

---

## À propos de ce dossier

Ce répertoire contient **l'intégralité de la documentation entreprise** pour concevoir et implémenter **AI BOS** — la plateforme sur laquelle **SIH IA** deviendra une application verticale parmi d'autres (Edu AI, Legal AI, Hotel AI…).

| Contenu | Fichiers |
|---------|----------|
| Vision & stratégie produit | `README_00` → `README_01`, `README_34` |
| Architecture & CORE (47 modules) | `README_02`, `README_05`, `README_06` |
| Frontend & Backend | `README_03`, `README_04` |
| Base de données & IA | `README_07` → `README_11` |
| API, sécurité, multi-tenant | `README_12` → `README_20` |
| Notifications, search, analytics | `README_21` → `README_26` |
| DevOps, cloud, déploiement | `README_27` → `README_33` |
| Migration depuis SIH IA | **`README_35`** ⭐ |
| Roadmap implémentation 52 semaines | **`README_40`** ⭐ |
| Modules métier (CRM, Sales, Finance…) | `APPENDIX_BusinessModules.md` |

**Total : 44 fichiers** (~18 000 lignes).

---

## Par où commencer

1. **[INDEX.md](INDEX.md)** — Table des matières complète
2. **[README_00_Vision.md](README_00_Vision.md)** — Vision 10 ans
3. **[README_05_Core.md](README_05_Core.md)** — Spécification des 47 modules CORE
4. **[README_35_MigrationFromSIHIA.md](README_35_MigrationFromSIHIA.md)** — Plan de migration depuis ce dépôt
5. **[README_40_ImplementationRoadmap.md](README_40_ImplementationRoadmap.md)** — Plan technique semaine par semaine

---

## Lien avec SIH IA (ce dépôt)

| Document SIH IA | Rôle |
|-----------------|------|
| [../README_ETAT_IMPLEMENTATION.md](../README_ETAT_IMPLEMENTATION.md) | État actuel du code réutilisable |
| [../README_02_Architecture.md](../README_02_Architecture.md) | Architecture SIH IA d'origine |
| `backend/`, `src/` | Code source à extraire vers AI BOS CORE |

---

## Structure du futur monorepo AI BOS

```
ai-bos/                          # Futur dépôt (à créer)
├── platform/                    # CORE — 47 modules
├── apps/
│   └── sihia/                   # SIH IA comme app verticale
├── modules/                     # CRM, Sales, Finance…
└── Document/                    # Copie de ce dossier
```

Voir [README_39_ProjectStructure.md](README_39_ProjectStructure.md) pour l'arborescence complète.

---

## README plateforme

Vue d'ensemble courte : [README_PLATFORM.md](README_PLATFORM.md)
