# AI BOS — Agent Engine

> **Version:** 0.1.0 | **Statut:** `DESIGN` | **Maturité:** `ALPHA`  
> **Dernière mise à jour:** Juillet 2026  
> **Audience:** AI Engineering, Product, Backend, Domain Experts  
> **Référence héritage:** [SIH IA ChatbotService](../../backend/app/application/chatbot_service.py)

---

## 1. Vision : une équipe IA par entreprise

L'**Agent Engine** d'AI BOS déploie une équipe d'agents IA spécialisés — CEO, Sales, Finance, Marketing, Legal, HR — chacun doté d'une mission claire, d'un contexte métier, d'une mémoire persistante, d'outils contrôlés et de guardrails adaptés.

Contrairement au chatbot SIH IA (assistant unique d'orientation hospitalière), AI BOS orchestre un **écosystème multi-agents** collaboratif, capable d'exécuter des workflows, d'appeler des APIs et de déléguer entre pairs.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI BOS — Agent Organization                       │
│                                                                      │
│   ┌─────────┐                                                        │
│   │   CEO   │ ← Orchestrateur stratégique, vue 360° entreprise      │
│   └────┬────┘                                                        │
│        │ délègue                                                      │
│   ┌────┴────────────────────────────────────────────┐                 │
│   │                                                  │                 │
│ ┌─▼───┐ ┌───────┐ ┌────────┐ ┌──────────┐ ┌────┐ ┌──────┐          │
│ │Sales│ │Finance│ │Marketing│ │  Legal   │ │ HR │ │ Ops  │  ...     │
│ └─────┘ └───────┘ └────────┘ └──────────┘ └────┘ └──────┘          │
│                                                                      │
│   Chaque agent : Mission + Context + Memory + Tools + Guardrails    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Anatomie d'un agent

### Modèle de données

```sql
CREATE TABLE agent.agents (
    id TEXT PRIMARY KEY,              -- ex: agent.sales
    organization_id UUID,               -- NULL = agent plateforme (template)
    name TEXT NOT NULL,
    display_name JSONB NOT NULL,      -- {"fr": "Alex Commercial", "en": "Alex Sales"}
    avatar_url TEXT,
    mission TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Structure de configuration

```yaml
agent:
  id: agent.sales
  mission: "Qualifier les leads, gérer le pipeline commercial, proposer des devis"
  
  context:
    company_profile: "{{ org.profile }}"
    products: "{{ org.products }}"
    sales_playbook: "{{ kb.documents tagged 'sales' }}"
    
  memory:
    type: hybrid                    # short_term + long_term
    short_term_window: 20           # messages
    long_term_collection: agent.sales.memories
    
  llm:
    model_hint: gpt-4o-mini
    temperature: 0.7
    max_tokens: 2048
    
  guardrails:
    packs: [sales, general]
    custom:
      - name: max_discount
        rule: "never_offer_discount_above {{ org.sales.max_discount }}%"
        
  tools:
    - crm.search_leads
    - crm.update_lead
    - calendar.book_demo
    - email.send_template
    - workflow.trigger:lead_nurturing
    
  permissions:
    rbac_roles: [sales_rep, sales_manager]
    data_scopes: [crm.*, kb.sales.*]
    actions_require_approval:
      - crm.update_lead.status=won
      - email.send_template.discount
```

---

## 3. Catalogue des agents CORE

### Agent CEO (Orchestrateur)

| Attribut | Valeur |
|----------|--------|
| **ID** | `agent.ceo` |
| **Mission** | Synthèse stratégique, arbitrage inter-départements, reporting exécutif |
| **Contexte** | KPIs tous départements, OKRs, board reports |
| **Mémoire** | Décisions stratégiques, historique arbitrages |
| **Outils** | `analytics.dashboard`, `agent.delegate`, `report.generate` |
| **LLM** | claude-sonnet (raisonnement complexe) |
| **Guardrails** | Pas de décision financière directe, escalade humaine > seuil |

**Workflows typiques :**
- Briefing matinal cross-fonctionnel
- Analyse écart KPI vs objectifs
- Délégation tâche à agent spécialisé
- Préparation comité de direction

### Agent Sales

| Attribut | Valeur |
|----------|--------|
| **ID** | `agent.sales` |
| **Mission** | Qualification leads (BANT), gestion pipeline, propositions commerciales |
| **Contexte** | CRM, catalogue produits, playbook vente, historique client |
| **Mémoire** | Interactions leads, objections fréquentes, deals gagnés/perdus |
| **Outils** | `crm.*`, `calendar.*`, `email.*`, `quote.generate` |
| **LLM** | gpt-4o-mini |
| **Guardrails** | Pas de remise > seuil sans approbation, pas de promesse contractuelle |

### Agent Finance

| Attribut | Valeur |
|----------|--------|
| **ID** | `agent.finance` |
| **Mission** | Analyse financière, prévisions, conformité, reporting |
| **Contexte** | Comptabilité, budgets, flux trésorerie, réglementation |
| **Mémoire** | Clôtures mensuelles, anomalies détectées, décisions validées |
| **Outils** | `accounting.*`, `forecast.run`, `report.pnl`, `invoice.*` |
| **LLM** | claude-sonnet |
| **Guardrails** | HITL obligatoire transactions > seuil, pas de conseil fiscal personnalisé |

### Agent Marketing

| Attribut | Valeur |
|----------|--------|
| **ID** | `agent.marketing` |
| **Mission** | Campagnes, contenu, analyse performance, segmentation |
| **Contexte** | Brand guidelines, personas, calendrier éditorial, analytics |
| **Mémoire** | Campagnes passées, A/B tests, feedback audience |
| **Outils** | `campaign.*`, `content.generate`, `analytics.marketing`, `social.schedule` |
| **LLM** | gpt-4o |
| **Guardrails** | Validation brand, pas de claims non vérifiables, RGPD consent |

### Agent Legal

| Attribut | Valeur |
|----------|--------|
| **ID** | `agent.legal` |
| **Mission** | Analyse contrats, veille réglementaire, gestion risques juridiques |
| **Contexte** | Corpus juridique, templates contrats, jurisprudence |
| **Mémoire** | Contrats analysés, clauses problématiques, décisions |
| **Outils** | `contract.analyze`, `clause.search`, `compliance.check` |
| **LLM** | claude-sonnet |
| **Guardrails** | Disclaimer « pas de conseil juridique », HITL signature contrats |

### Agent HR

| Attribut | Valeur |
|----------|--------|
| **ID** | `agent.hr` |
| **Mission** | Recrutement, onboarding, politiques RH, gestion talents |
| **Contexte** | Organigramme, politiques internes, offres d'emploi, évaluations |
| **Mémoire** | Candidats, entretiens, feedback managers |
| **Outils** | `ats.*`, `onboarding.*`, `policy.search`, `survey.*` |
| **LLM** | gpt-4o-mini |
| **Guardrails** | Anti-discrimination, confidentialité salaires, HITL licenciement |

### Agents additionnels (roadmap)

| Agent | Mission | Priorité |
|-------|---------|----------|
| `agent.support` | Support client, tickets, FAQ | P1 |
| `agent.ops` | Opérations, inventaire, logistique | P2 |
| `agent.it` | Helpdesk, assets, sécurité | P2 |
| `agent.data` | Analytics, SQL, visualisations | P1 |
| `agent.reception` | Accueil, orientation (héritage SIH IA) | P0 |

---

## 4. Mémoire agent

### ADR-010-001 : Mémoire hybride court/long terme

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Memory System                      │
├─────────────────────────┬───────────────────────────────────┤
│   Short-term (session)  │   Long-term (persistent)          │
│   ─────────────────     │   ──────────────────────          │
│   • Redis cache         │   • PostgreSQL agent.memories     │
│   • 20 derniers msgs    │   • Vector store (épisodique)     │
│   • Contexte immédiat   │   • Faits extraits (sémantique)   │
│   • TTL 24h             │   • Décisions validées            │
└─────────────────────────┴───────────────────────────────────┘
```

### Schéma mémoire long terme

```sql
CREATE TABLE agent.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    agent_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,        -- episodic | semantic | procedural
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}',
    -- source_conversation_id, entities, confidence
    importance FLOAT DEFAULT 0.5,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);
```

### Types de mémoire

| Type | Description | Exemple |
|------|-------------|---------|
| **Episodic** | Événements spécifiques | « Lead Dupont a demandé démo le 15/03 » |
| **Semantic** | Faits généraux | « Notre produit premium coûte 99€/mois » |
| **Procedural** | Savoir-faire | « Pour qualifier un lead, utiliser BANT » |

### Extraction automatique

Après chaque conversation significative :

```python
async def consolidate_memory(conversation_id: UUID, agent_id: str):
    messages = await get_conversation(conversation_id)
    facts = await llm_gateway.complete(extract_facts_prompt(messages))
    for fact in facts:
        if fact.importance > 0.7:
            await memory_store.upsert(agent_id, fact)
```

---

## 5. Système d'outils (Tools)

### ADR-010-002 : Tools typés avec permissions

```python
@dataclass
class ToolDefinition:
    name: str                        # crm.search_leads
    description: str                 # Pour le LLM
    parameters: JSONSchema
    handler: Callable
    permissions: list[str]           # rbac permissions requises
    rate_limit: int = 60             # par minute
    requires_approval: bool = False
```

### Catalogue d'outils par domaine

| Domaine | Outils | Agent(s) |
|---------|--------|----------|
| **CRM** | `search_leads`, `update_lead`, `create_opportunity` | Sales |
| **Calendar** | `check_availability`, `book_meeting`, `cancel_meeting` | Sales, HR |
| **Email** | `send_template`, `draft_email`, `search_inbox` | Sales, Marketing |
| **Accounting** | `get_balance`, `create_invoice`, `run_forecast` | Finance |
| **KB/RAG** | `search_knowledge`, `get_document` | Tous |
| **Analytics** | `query_metrics`, `generate_chart` | CEO, Finance |
| **Workflow** | `trigger_workflow`, `get_workflow_status` | Tous |
| **Agent** | `delegate_to_agent`, `ask_agent` | CEO |

### Exécution d'outil

```python
async def execute_tool(
    tool_name: str,
    params: dict,
    context: AgentContext,
) -> ToolResult:
    tool = tool_registry.get(tool_name)
    
    # 1. Vérification permissions
    if not has_permission(context.user, tool.permissions):
        raise PermissionDenied(tool_name)
    
    # 2. Guardrails pre-exécution
    guardrail = await guardrails.check_tool_call(tool_name, params, context)
    if guardrail.action == "refuse":
        return ToolResult(error=guardrail.message)
    
    # 3. Approbation HITL si requis
    if tool.requires_approval or needs_approval(params, context):
        approval = await hitl_queue.request(context, tool_name, params)
        if not approval.approved:
            return ToolResult(status="pending_approval", approval_id=approval.id)
    
    # 4. Exécution
    result = await tool.handler(params, context)
    
    # 5. Audit
    await audit.log_tool_call(context, tool_name, params, result)
    
    return result
```

---

## 6. Permissions et RBAC

### Matrice agent × rôle

| Agent | admin | manager | sales_rep | finance | hr | employee |
|-------|-------|---------|-----------|---------|-----|----------|
| CEO | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Sales | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Finance | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Marketing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Legal | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| HR | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Reception | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

### Scopes de données

```yaml
agent.sales:
  data_scopes:
    - crm.leads:read
    - crm.leads:write
    - crm.opportunities:*
    - kb.documents:read WHERE tags CONTAINS 'sales'
    - calendar.own:*
  denied:
    - hr.salaries:*
    - finance.transactions:*
```

---

## 7. Orchestration (LangGraph-style)

### ADR-010-003 : Graphe d'états pour workflows agent

Inspiré de LangGraph, l'orchestrateur modélise l'exécution agent comme un graphe orienté :

```
                    ┌──────────────┐
                    │    START     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
              ┌─────│   Router     │─────┐
              │     └──────────────┘     │
              │                          │
       ┌──────▼──────┐           ┌───────▼───────┐
       │   Agent     │           │   Delegate    │
       │   Execute   │           │   to Agent    │
       └──────┬──────┘           └───────┬───────┘
              │                          │
       ┌──────▼──────┐                   │
       │  Tool Call  │◄──────────────────┘
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  Evaluate   │
       │  Continue?  │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │     END     │
       └─────────────┘
```

### État d'exécution

```python
@dataclass
class AgentState:
    conversation_id: UUID
    agent_id: str
    messages: list[Message]
    current_tool_calls: list[ToolCall]
    tool_results: list[ToolResult]
    delegated_to: str | None
    iteration: int
    max_iterations: int = 10
    status: Literal["running", "waiting_approval", "completed", "failed"]
```

### Boucle ReAct

```python
async def agent_loop(state: AgentState) -> AgentState:
    while state.iteration < state.max_iterations:
        # 1. LLM décide prochaine action
        response = await llm_gateway.complete(AgentRequest(
            agent_id=state.agent_id,
            messages=state.messages,
            tools=agent.tools,
        ))
        
        # 2. Si tool calls, exécuter
        if response.tool_calls:
            for call in response.tool_calls:
                result = await execute_tool(call.name, call.params, context)
                state.tool_results.append(result)
                state.messages.append(ToolMessage(result))
            state.iteration += 1
            continue
        
        # 3. Si réponse finale, terminer
        state.messages.append(AssistantMessage(response.content))
        state.status = "completed"
        break
    
    return state
```

---

## 8. Communication agent-to-agent

### Patterns de communication

| Pattern | Description | Exemple |
|---------|-------------|---------|
| **Delegation** | CEO assigne tâche à agent spécialisé | « @Sales qualifie ce lead » |
| **Consultation** | Agent demande expertise | Sales → Legal : « Cette clause est-elle standard ? » |
| **Handoff** | Transfert conversation | Support → Sales (lead qualifié) |
| **Broadcast** | Notification multi-agents | CEO → tous : « Nouveau objectif Q3 » |
| **Pipeline** | Chaîne séquentielle | Marketing → Sales → Finance |

### Protocole de message inter-agent

```python
@dataclass
class AgentMessage:
    from_agent: str
    to_agent: str
    message_type: Literal["delegate", "consult", "handoff", "broadcast", "response"]
    payload: dict
    conversation_id: UUID
    priority: str
    timeout_seconds: int = 300
```

### Exemple délégation

```python
# CEO délègue analyse financière
await agent_bus.send(AgentMessage(
    from_agent="agent.ceo",
    to_agent="agent.finance",
    message_type="delegate",
    payload={
        "task": "Analyser l'impact d'une baisse de 10% du CA sur la trésorerie",
        "context": {"current_revenue": 1_000_000, "scenario": -0.10},
        "deadline": "2026-07-07T12:00:00Z",
    },
))
```

### Résolution de conflits

Si deux agents produisent des recommandations contradictoires :
1. Escalade automatique vers CEO agent
2. CEO synthétise ou demande arbitrage humain
3. Décision loggée pour apprentissage

---

## 9. Workflows agent

### Workflows pré-définis

| Workflow | Agents impliqués | Trigger |
|----------|------------------|---------|
| `lead_to_customer` | Marketing → Sales → Finance | Nouveau lead |
| `employee_onboarding` | HR → IT → Manager | Nouvel employé |
| `contract_review` | Legal → Finance → CEO | Nouveau contrat |
| `monthly_close` | Finance → CEO | Fin de mois |
| `incident_response` | Ops → IT → Legal | Alerte sécurité |

### Définition workflow

```yaml
workflow:
  id: lead_to_customer
  trigger:
    event: crm.lead.created
    conditions:
      - lead.score > 50
  steps:
    - agent: agent.sales
      action: qualify_lead
      timeout: 1h
      
    - condition: lead.qualified == true
      then:
        - agent: agent.sales
          action: schedule_demo
        - agent: agent.marketing
          action: add_to_nurture_campaign
      else:
        - agent: agent.marketing
          action: add_to_cold_nurture
          
    - agent: agent.finance
      action: check_credit
      requires_approval: true
```

---

## 10. Guardrails par agent

### Héritage framework global

Chaque agent compose des packs guardrails (voir [README_08_AIArchitecture](README_08_AIArchitecture.md)) :

```yaml
agent.finance:
  guardrails:
    packs: [finance, general, pii]
    rules:
      - name: no_investment_advice
        action: refuse
        message_fr: "Je ne peux pas fournir de conseil en investissement."
      - name: large_transaction
        condition: "params.amount > 10000"
        action: escalate
        assign_to: role:finance_manager
```

### Guardrails SIH IA adaptés

L'agent `agent.reception` (héritage SIH IA) conserve :

```yaml
agent.reception:
  guardrails:
    packs: [healthcare, general]
    # EMERGENCY, DIAGNOSIS, INJECTION hérités de chatbot_guardrails.py
```

---

## 11. Interface utilisateur

### Panneau agents

- Liste agents disponibles selon rôle utilisateur
- Chat dédié par agent avec avatar et personnalité
- Indicateur outils utilisés en temps réel
- Historique conversations par agent
- File d'approbation HITL intégrée

### Mentions et délégation

```
Utilisateur: @CEO Quel est l'état de notre pipeline Q2 ?

CEO: Je consulte l'agent Sales pour les données pipeline...
     [Délégation → agent.sales]
     
Sales: Voici le pipeline Q2 : 45 leads qualifiés, 12 opportunités...
```

---

## 12. Observabilité agents

### Métriques

```
agent_executions_total{agent_id, status}
agent_tool_calls_total{agent_id, tool_name}
agent_delegations_total{from_agent, to_agent}
agent_iterations_histogram{agent_id}
agent_approval_wait_seconds{agent_id}
```

### Traces

```
agent.execution
├── guardrails.input
├── memory.retrieve
├── llm.complete
├── tool.crm.search_leads
├── agent.delegate [agent.sales → agent.legal]
│   └── agent.execution
└── guardrails.output
```

---

## 13. Migration depuis SIH IA

| SIH IA | AI BOS Agent |
|--------|--------------|
| `ChatbotService` | `agent.reception` |
| `_UI_CONFIG` | Agent UI config par tenant |
| `_retrieve_context` | RAG engine |
| `evaluate_guardrails` | Guardrails pack healthcare |
| Session store | Agent memory + conversations |

---

## 14. Definition of Done — Agent Engine

- [ ] 6 agents CORE définis (CEO, Sales, Finance, Marketing, Legal, HR)
- [ ] Agent `reception` migré depuis SIH IA
- [ ] Mémoire hybride opérationnelle
- [ ] Tool registry avec 20+ outils
- [ ] Orchestration ReAct avec max 10 itérations
- [ ] Communication inter-agent (delegate, consult)
- [ ] Permissions RBAC par agent
- [ ] Guardrails par agent configurables
- [ ] HITL pour actions sensibles
- [ ] Métriques et traces exposées

---

## Références

- [README_08_AIArchitecture](README_08_AIArchitecture.md) — LLM Gateway, guardrails
- [README_09_RAG](README_09_RAG.md) — Knowledge base agents
- [README_11_Workflows](README_11_Workflows.md) — Automation Engine
- [README_16_RBAC](README_16_RBAC.md) — Permissions

---

*Documentation propriétaire — AI BOS Platform Team. © 2026 AI BOS.*
