# AI BOS — Index de la documentation entreprise

> **Version:** 0.1.0 | **Dernière mise à jour:** Juillet 2026  
> **Audience:** Engineering, Product, Security, Architecture Review Board

---

## Navigation rapide

### Suivi projet
| # | Document | Description |
|---|----------|-------------|
| ETAT | [README_ETAT_IMPLEMENTATION](README_ETAT_IMPLEMENTATION.md) | Suivi d'avancement global et checklist cochée |

### Fondation produit & stratégie
| # | Document | Description |
|---|----------|-------------|
| 00 | [README_00_Vision](README_00_Vision.md) | Vision, mission, positionnement 10 ans |
| 01 | [README_01_ProductStrategy](README_01_ProductStrategy.md) | Stratégie produit, segments, GTM |
| 34 | [README_34_Roadmap](README_34_Roadmap.md) | Roadmap produit 36 mois |
| 40 | [README_40_ImplementationRoadmap](README_40_ImplementationRoadmap.md) | Roadmap technique exécutable |

### Architecture & structure
| # | Document | Description |
|---|----------|-------------|
| 02 | [README_02_Architecture](README_02_Architecture.md) | Architecture système globale |
| 05 | [README_05_Core](README_05_Core.md) | Spécification du CORE platform |
| 06 | [README_06_ModularArchitecture](README_06_ModularArchitecture.md) | Modules, boundaries, contracts |
| 12 | [README_12_EventDriven](README_12_EventDriven.md) | Event Bus, CQRS, sagas |
| 39 | [README_39_ProjectStructure](README_39_ProjectStructure.md) | Arborescence mono-repo |

### Frontend & Backend
| # | Document | Description |
|---|----------|-------------|
| 03 | [README_03_Frontend](README_03_Frontend.md) | Shell UI, design system, apps |
| 04 | [README_04_Backend](README_04_Backend.md) | Services, patterns, déploiement |
| 37 | [README_37_DeveloperGuide](README_37_DeveloperGuide.md) | Guide développeur |
| 38 | [README_38_CodingStandards](README_38_CodingStandards.md) | Standards code & PR |

### Données
| # | Document | Description |
|---|----------|-------------|
| 07 | [README_07_Database](README_07_Database.md) | Schéma, multi-tenant, migrations |
| 22 | [README_22_Search](README_22_Search.md) | Moteur de recherche unifié |
| 23 | [README_23_Documents](README_23_Documents.md) | GED, OCR, versioning |

### Intelligence artificielle
| # | Document | Description |
|---|----------|-------------|
| 08 | [README_08_AIArchitecture](README_08_AIArchitecture.md) | Stack IA globale |
| 09 | [README_09_RAG](README_09_RAG.md) | RAG, embeddings, vector DB |
| 10 | [README_10_Agents](README_10_Agents.md) | Agent Engine, personas |
| 11 | [README_11_Workflows](README_11_Workflows.md) | Automation Engine (n8n-like) |
| 26 | [README_26_MachineLearning](README_26_MachineLearning.md) | ML ops, forecasting |

### API & intégrations
| # | Document | Description |
|---|----------|-------------|
| 13 | [README_13_API](README_13_API.md) | API Gateway, REST, GraphQL |
| 36 | [README_36_FutureApplications](README_36_FutureApplications.md) | Apps verticales & marketplace |

### Sécurité & identité
| # | Document | Description |
|---|----------|-------------|
| 14 | [README_14_Security](README_14_Security.md) | Security posture globale |
| 15 | [README_15_Authentication](README_15_Authentication.md) | AuthN flows |
| 16 | [README_16_RBAC](README_16_RBAC.md) | Role-Based Access Control |
| 17 | [README_17_ABAC](README_17_ABAC.md) | Attribute-Based Access Control |
| 18 | [README_18_MultiTenant](README_18_MultiTenant.md) | Isolation tenant |

### Commercial & organisation
| # | Document | Description |
|---|----------|-------------|
| 19 | [README_19_Billing](README_19_Billing.md) | Facturation usage & sièges |
| 20 | [README_20_Subscriptions](README_20_Subscriptions.md) | Plans, quotas, feature flags |
| 21 | [README_21_Notifications](README_21_Notifications.md) | Email, SMS, push, in-app |

### Analytics & BI
| # | Document | Description |
|---|----------|-------------|
| 24 | [README_24_Analytics](README_24_Analytics.md) | Analytics temps réel |
| 25 | [README_25_BI](README_25_BI.md) | Business Intelligence |

### DevOps & Cloud
| # | Document | Description |
|---|----------|-------------|
| 27 | [README_27_DevOps](README_27_DevOps.md) | CI/CD, IaC, GitOps |
| 28 | [README_28_Cloud](README_28_Cloud.md) | Architecture AWS |
| 29 | [README_29_Deployment](README_29_Deployment.md) | Déploiement multi-env |
| 30 | [README_30_Testing](README_30_Testing.md) | Stratégie tests |
| 31 | [README_31_Monitoring](README_31_Monitoring.md) | Monitoring |
| 32 | [README_32_Observability](README_32_Observability.md) | Logs, traces, métriques |
| 33 | [README_33_Performance](README_33_Performance.md) | SLO, capacity planning |

### Migration & héritage
| # | Document | Description |
|---|----------|-------------|
| 35 | [README_35_MigrationFromSIHIA](README_35_MigrationFromSIHIA.md) | Extraction CORE depuis SIH IA |
| — | [APPENDIX_BusinessModules](APPENDIX_BusinessModules.md) | Catalogue CRM, Sales, Finance, HR… |

---

## Référence externe

- **SIH IA état d'implémentation:** [`../sihia-platform/Document/README_ETAT_IMPLEMENTATION.md`](../sihia-platform/Document/README_ETAT_IMPLEMENTATION.md)
- **SIH IA architecture:** [`../sihia-platform/Document/README_02_Architecture.md`](../sihia-platform/Document/README_02_Architecture.md)

---

## Conventions documentaires

- **ADR** (Architecture Decision Records) : préfixe `ADR-NNN` dans chaque doc concerné
- **Statuts** : `DRAFT` | `REVIEW` | `APPROVED` | `DEPRECATED`
- **Niveau de maturité** : `CONCEPT` | `DESIGN` | `ALPHA` | `BETA` | `GA`
