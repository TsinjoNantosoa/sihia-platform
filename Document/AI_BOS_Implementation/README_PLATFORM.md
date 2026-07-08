# AI BOS — AI Business Operating System

> **Version:** 0.1.0-alpha (Architecture & Documentation)  
> **Statut:** Conception plateforme — pré-implémentation  
> **Héritage:** Dérivé du socle technique [SIH IA](../sihia-platform) (Smart Intelligent Hospital Platform)

---

## Qu'est-ce qu'AI BOS ?

**AI BOS** est le système d'exploitation intelligent des entreprises : une plateforme SaaS modulaire, multi-tenant, cloud-native et **IA-first**, conçue pour centraliser les données, automatiser les opérations et augmenter chaque décision par l'intelligence artificielle.

Ce n'est **pas** un ERP classique. C'est l'infrastructure sur laquelle s'appuient les applications métier verticales :

| Application verticale | Domaine | Statut |
|----------------------|---------|--------|
| **SIH IA** | Santé / Hôpitaux | ✅ Existant — devient app #1 sur AI BOS |
| Edu AI | Éducation | 📋 Planifié |
| Legal AI | Juridique | 📋 Planifié |
| Hotel AI | Hôtellerie | 📋 Planifié |
| Retail AI | Commerce | 📋 Planifié |
| Factory AI | Industrie | 📋 Planifié |
| Government AI | Secteur public | 📋 Planifié |

---

## Positionnement produit

| Référence marché | Équivalent AI BOS |
|------------------|-------------------|
| Notion | Workspace unifié + knowledge |
| Salesforce | CRM + Sales + pipeline |
| Microsoft Copilot | Agents IA contextuels omniprésents |
| ChatGPT Enterprise | LLM privé par organisation |
| Power BI | Analytics + BI intelligente |
| HubSpot | Marketing automation |
| Monday.com | Projects + Tasks + workflows |
| Zapier / n8n | Automation Engine intégré |

**Différenciateur :** une seule plateforme, une seule source de vérité, une IA qui connaît toute l'entreprise.

---

## Documentation

Toute la documentation entreprise se trouve dans [`Document/`](Document/INDEX.md).

| Priorité lecture | Document |
|------------------|----------|
| 1 | [README_00_Vision](Document/README_00_Vision.md) |
| 2 | [README_02_Architecture](Document/README_02_Architecture.md) |
| 3 | [README_05_Core](Document/README_05_Core.md) |
| 4 | [README_06_ModularArchitecture](Document/README_06_ModularArchitecture.md) |
| 5 | [README_35_MigrationFromSIHIA](Document/README_35_MigrationFromSIHIA.md) |
| 6 | [README_40_ImplementationRoadmap](Document/README_40_ImplementationRoadmap.md) |

---

## Principes architecturaux (hérités de SIH IA, étendus)

1. **Clean Architecture** — `presentation / application / domain / infrastructure / core`
2. **Monolithe modulaire** → extraction microservices uniquement sous contrainte de scale
3. **Multi-tenant dès la conception** — isolation par `organization_id`
4. **IA comme primitive** — pas une feature ajoutée, le cœur du système
5. **Event-driven** — découplage modules via Event Bus
6. **API-first** — tout module expose des APIs consommables par agents et workflows
7. **Zero duplication** — CORE partagé, apps verticales = plugins

---

## Réutilisation SIH IA

~40 % du socle SIH IA est directement extractible vers AI BOS CORE :

| Composant SIH IA | Module AI BOS CORE |
|------------------|-------------------|
| Auth JWT + refresh rotation | `core/identity` |
| RBAC + permissions JWT | `core/authorization` |
| Audit JSONL | `core/audit` |
| Notifications SMTP/Twilio | `core/notifications` |
| Chatbot SSE + guardrails + RAG | `core/ai/conversation` |
| Whisper + TTS | `core/ai/speech` |
| Analytics KPIs | `core/analytics` |
| ML Prophet/linéaire | `core/ml` |
| Pipeline Airflow | `core/data-pipeline` |
| Health + metrics + correlation ID | `core/observability` |
| i18n FR/EN/AR + RTL | `core/i18n` |
| Docker + CI GitHub Actions | `core/devops` |

Voir [README_35_MigrationFromSIHIA](Document/README_35_MigrationFromSIHIA.md) pour le plan détaillé.

---

## Licence & gouvernance

Documentation propriétaire — AI BOS Platform Team.  
© 2026 AI BOS — Tous droits réservés.
