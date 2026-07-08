# AI BOS — Automation Engine (Workflows)

> **Version:** 0.1.0 | **Statut:** `DESIGN` | **Maturité:** `ALPHA`  
> **Dernière mise à jour:** Juillet 2026  
> **Audience:** Backend, Product, Integration Engineers, Operations  
> **Référence héritage:** [SIH IA ReminderService](../../sihia-platform/backend/app/application/reminder_service.py), [PipelineService](../../sihia-platform/backend/app/application/pipeline_service.py)

---

## 1. Vision : l'automatisation comme colonne vertébrale

L'**Automation Engine** d'AI BOS est le système nerveux de la plateforme : il connecte événements, données, agents IA et systèmes externes pour exécuter des processus métier sans intervention manuelle.

Inspiré de n8n et Zapier, mais **natif à la plateforme** — profondément intégré avec les agents, le RAG, le RBAC et l'Event Bus. Pas un outil externe bolt-on.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI BOS Automation Engine                              │
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│  │Triggers │───▶│Conditions│───▶│ Actions │───▶│ Outputs │            │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘            │
│       │              │              │              │                    │
│  • Schedule      • If/Else      • API call     • Webhook               │
│  • Webhook       • Switch       • Agent        • Email                  │
│  • Event Bus     • Filter       • AI node      • Database               │
│  • Manual        • Loop         • Transform    • Notification           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Visual Workflow Builder (React Flow)                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Positionnement vs outils externes

| Capacité | Zapier/n8n | AI BOS Automation |
|----------|------------|-------------------|
| Intégration agents IA | Plugin externe | Natif |
| Isolation multi-tenant | Par compte | `organization_id` + RLS |
| RBAC workflows | Basique | Permissions granulaires |
| Event Bus interne | Non | Bidirectionnel |
| Audit & compliance | Limité | Complet (SOC 2) |
| Coût | Par tâche externe | Inclus plateforme |

---

## 2. Architecture

### Composants CORE

| Module | Responsabilité |
|--------|----------------|
| `core/workflow/engine` | Exécution graphe, scheduling |
| `core/workflow/builder` | API + UI visual builder |
| `core/workflow/triggers` | Écoute events, webhooks, cron |
| `core/workflow/nodes` | Bibliothèque de nœuds |
| `core/workflow/executor` | Runtime d'exécution |
| `core/workflow/store` | Persistance définitions + runs |

### Schéma de données

```sql
CREATE TABLE workflow.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    -- draft | active | paused | archived
    definition JSONB NOT NULL,        -- graphe React Flow
    trigger_config JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE workflow.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    workflow_id UUID NOT NULL REFERENCES workflow.workflows(id),
    trigger_type TEXT NOT NULL,
    trigger_payload JSONB,
    status TEXT NOT NULL DEFAULT 'running',
    -- running | completed | failed | cancelled | waiting
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error TEXT,
    context JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE workflow.workflow_step_logs (
    id UUID NOT NULL,
    run_id UUID NOT NULL REFERENCES workflow.workflow_runs(id),
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    status TEXT NOT NULL,
    input JSONB,
    output JSONB,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    error TEXT,
    PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);
```

---

## 3. Visual Workflow Builder

### ADR-011-001 : React Flow comme moteur UI

Le builder visuel utilise React Flow pour éditer le graphe de workflow :

```typescript
interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // pour conditions (true/false)
  targetHandle?: string;
}
```

### Types de nœuds

| Catégorie | Nœuds | Icône |
|-----------|-------|-------|
| **Triggers** | Schedule, Webhook, Event, Manual | ⚡ |
| **Logic** | If/Else, Switch, Filter, Loop, Merge | 🔀 |
| **Data** | Transform, Set, Code (Python/JS) | 📊 |
| **Integration** | HTTP Request, Database Query | 🔌 |
| **AI** | LLM Prompt, Agent Call, RAG Query | 🤖 |
| **Action** | Email, SMS, Notification, Webhook Out | 📤 |
| **Flow** | Wait, Stop, Error Handler | ⏱️ |

### Exemple visuel : Rappel rendez-vous (SIH IA)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Schedule   │────▶│   Filter    │────▶│   Loop      │
│  Daily 8am  │     │ RDV in 24h  │     │ appointments│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
             ┌──────▼──────┐           ┌───────▼───────┐          ┌───────▼───────┐
             │  If/Else    │           │  Send Email   │          │   Send SMS    │
             │ has email?  │           │               │          │               │
             └─────────────┘           └───────────────┘          └───────────────┘
```

---

## 4. Triggers (Déclencheurs)

### Types de triggers

| Type | Description | Configuration |
|------|-------------|---------------|
| **Schedule** | Cron expression | `0 8 * * *` (daily 8am) |
| **Webhook** | HTTP POST entrant | URL unique, signature HMAC |
| **Event** | Event Bus interne | `crm.lead.created`, `document.indexed` |
| **Manual** | Déclenchement UI/API | Bouton ou `POST /workflows/{id}/run` |
| **Polling** | Vérification périodique | Intervalle, source externe |

### Trigger Schedule (héritage ReminderService)

SIH IA `ReminderService.run_auto_batch()` s'exécute via cron pour les RDV dans les 24h. AI BOS généralise :

```yaml
trigger:
  type: schedule
  cron: "0 8 * * *"
  timezone: Europe/Paris
```

### Trigger Event Bus

```yaml
trigger:
  type: event
  event_type: crm.lead.created
  filters:
    - field: lead.score
      operator: gte
      value: 50
```

### Trigger Webhook

```yaml
trigger:
  type: webhook
  path: /hooks/lead-capture
  method: POST
  authentication:
    type: hmac
    secret: "{{ secrets.webhook_secret }}"
  payload_schema:
    type: object
    properties:
      email: { type: string }
      company: { type: string }
```

---

## 5. Conditions et logique

### Nœud If/Else

```yaml
node:
  type: if_else
  id: check_email
  config:
    conditions:
      - field: "{{ $json.patient.email }}"
        operator: is_not_empty
    true_branch: send_email
    false_branch: check_phone
```

### Opérateurs supportés

| Opérateur | Description |
|-----------|-------------|
| `equals`, `not_equals` | Égalité |
| `contains`, `not_contains` | Sous-chaîne |
| `gt`, `gte`, `lt`, `lte` | Comparaison numérique |
| `is_empty`, `is_not_empty` | Présence |
| `matches` | Regex |
| `in`, `not_in` | Liste de valeurs |

### Nœud Switch

```yaml
node:
  type: switch
  config:
    field: "{{ $json.lead.status }}"
    cases:
      - value: new
        target: qualify_lead
      - value: qualified
        target: schedule_demo
      - value: won
        target: onboarding
    default: nurture_campaign
```

### Nœud Loop

```yaml
node:
  type: loop
  config:
    items: "{{ $trigger.appointments }}"
    batch_size: 10
    parallel: false
    body: process_appointment
```

---

## 6. Actions

### Actions natives

| Action | Description | Héritage SIH IA |
|--------|-------------|-----------------|
| `email.send` | Envoi email SMTP/SendGrid | `send_email()` |
| `sms.send` | Envoi SMS Twilio | `send_sms()` |
| `notification.push` | Notification in-app | — |
| `database.insert` | Insert PostgreSQL | — |
| `database.update` | Update PostgreSQL | — |
| `http.request` | Appel API externe | — |
| `webhook.out` | POST sortant | — |
| `file.upload` | Upload S3 | — |

### Action Email (seed ReminderService)

Migration du pattern `_build_messages` SIH IA :

```yaml
node:
  type: email.send
  config:
    to: "{{ $json.patient.email }}"
    subject: "Rappel rendez-vous — {{ $json.appointment.patient_name }}"
    template: appointment_reminder
    variables:
      patient_name: "{{ $json.appointment.patient_name }}"
      doctor_name: "{{ $json.appointment.doctor_name }}"
      datetime: "{{ $json.appointment.date | format_datetime }}"
      reason: "{{ $json.appointment.reason }}"
```

### Action HTTP Request

```yaml
node:
  type: http.request
  config:
    method: POST
    url: "https://api.external.com/leads"
    headers:
      Authorization: "Bearer {{ secrets.external_api_key }}"
    body:
      email: "{{ $json.lead.email }}"
      source: "ai-bos"
    retry:
      max_attempts: 3
      backoff: exponential
```

---

## 7. Nœuds IA

### ADR-011-002 : IA comme nœud first-class

### Nœud LLM Prompt

```yaml
node:
  type: ai.llm_prompt
  config:
    model: gpt-4o-mini
    prompt_template: lead_qualification
    variables:
      lead_data: "{{ $json.lead }}"
    output_field: qualification_result
```

### Nœud Agent Call

```yaml
node:
  type: ai.agent_call
  config:
    agent_id: agent.sales
    message: "Qualifie ce lead selon BANT : {{ $json.lead | tojson }}"
    wait_for_response: true
    timeout_seconds: 120
    output_field: agent_response
```

### Nœud RAG Query

```yaml
node:
  type: ai.rag_query
  config:
    query: "{{ $json.user_question }}"
    knowledge_scope:
      tags: ["faq", "support"]
    top_k: 5
    include_sources: true
    output_field: rag_response
```

### Nœud AI Transform

```yaml
node:
  type: ai.transform
  config:
    input: "{{ $json.raw_text }}"
    instruction: "Extrais les entités nommées (personnes, dates, montants) en JSON"
    output_schema:
      type: object
      properties:
        persons: { type: array }
        dates: { type: array }
        amounts: { type: array }
```

---

## 8. Nœuds Webhook

### Webhook entrant (Trigger)

Chaque workflow avec trigger webhook reçoit une URL unique :

```
POST https://api.ai-bos.com/hooks/{organization_id}/{workflow_id}/{webhook_token}
```

Validation signature :

```python
def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

### Webhook sortant (Action)

```yaml
node:
  type: webhook.out
  config:
    url: "{{ $json.callback_url }}"
    method: POST
    headers:
      Content-Type: application/json
      X-AI-BOS-Signature: "{{ compute_hmac($json) }}"
    body:
      event: workflow.completed
      workflow_id: "{{ $workflow.id }}"
      run_id: "{{ $run.id }}"
      result: "{{ $json }}"
    retry:
      max_attempts: 5
      backoff: exponential
      retry_on: [500, 502, 503, 504]
```

---

## 9. Exécution et runtime

### Moteur d'exécution

```python
class WorkflowExecutor:
    async def execute(self, workflow: Workflow, trigger_payload: dict) -> WorkflowRun:
        run = await self.create_run(workflow, trigger_payload)
        context = ExecutionContext(
            workflow=workflow,
            run=run,
            variables={"trigger": trigger_payload},
        )
        
        try:
            start_node = workflow.get_trigger_node()
            await self.execute_node(start_node, context)
            run.status = "completed"
        except WorkflowError as e:
            run.status = "failed"
            run.error = str(e)
            await self.handle_error(e, context)
        finally:
            await self.finish_run(run)
        
        return run
    
    async def execute_node(self, node: WorkflowNode, context: ExecutionContext):
        # Log début
        step_log = await self.start_step_log(node, context)
        
        try:
            # Exécuter selon type
            handler = self.node_handlers[node.type]
            output = await handler.execute(node.config, context)
            
            # Stocker output
            context.variables[node.id] = output
            
            # Déterminer nœud suivant
            next_nodes = workflow.get_next_nodes(node, output)
            for next_node in next_nodes:
                await self.execute_node(next_node, context)
            
            step_log.status = "completed"
            step_log.output = output
        except Exception as e:
            step_log.status = "failed"
            step_log.error = str(e)
            raise
        finally:
            await self.finish_step_log(step_log)
```

### Contexte d'exécution

```python
@dataclass
class ExecutionContext:
    workflow: Workflow
    run: WorkflowRun
    organization_id: UUID
    variables: dict[str, Any]      # $trigger, $node_id, $json
    secrets: SecretResolver
    
    def resolve(self, expression: str) -> Any:
        """Résout {{ $json.field }} ou {{ $node_id.output }}"""
        ...
```

### Gestion des erreurs

```yaml
node:
  type: http.request
  config:
    # ...
  on_error:
    strategy: continue | stop | retry | goto
    retry:
      max_attempts: 3
    goto: error_handler_node
    notify:
      - type: email
        to: admin@company.com
```

---

## 10. Agents déclencheurs de workflows

### ADR-011-003 : Bidirectionnel Agent ↔ Workflow

Les agents peuvent déclencher des workflows via l'outil `workflow.trigger` :

```python
# Outil agent
@tool("workflow.trigger")
async def trigger_workflow(
    workflow_id: str,
    payload: dict,
    context: AgentContext,
) -> ToolResult:
    workflow = await workflow_repo.get(workflow_id, context.organization_id)
    run = await executor.execute(workflow, payload)
    return ToolResult(
        status="triggered",
        run_id=run.id,
        message=f"Workflow {workflow.name} démarré",
    )
```

### Workflows déclenchés par agents

| Agent | Workflow | Trigger |
|-------|----------|---------|
| Sales | `lead_nurturing` | Lead qualifié |
| HR | `employee_onboarding` | Nouvel employé |
| Finance | `invoice_reminder` | Facture impayée J+30 |
| Marketing | `campaign_launch` | Validation campagne |
| CEO | `board_report` | Demande rapport |

### Workflows déclenchant agents

```yaml
workflow:
  name: lead_qualification
  trigger:
    type: event
    event_type: crm.lead.created
  nodes:
    - id: qualify
      type: ai.agent_call
      config:
        agent_id: agent.sales
        message: "Qualifie: {{ $trigger.lead }}"
    
    - id: branch
      type: if_else
      config:
        conditions:
          - field: "{{ $qualify.score }}"
            operator: gte
            value: 70
        true_branch: schedule_demo
        false_branch: add_nurture
```

---

## 11. Seeds SIH IA

### ReminderService → Workflow `appointment_reminder`

Migration du service SIH IA vers workflow natif :

```yaml
workflow:
  id: appointment_reminder
  name: Rappels rendez-vous automatiques
  description: Hérité de ReminderService SIH IA
  status: active
  
  trigger:
    type: schedule
    cron: "0 */4 * * *"  # Toutes les 4 heures
    timezone: UTC
  
  nodes:
    - id: fetch_appointments
      type: database.query
      config:
        query: |
          SELECT a.*, p.email, p.phone
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
          WHERE a.status IN ('scheduled', 'confirmed')
            AND a.date BETWEEN now() AND now() + interval '24 hours'
            AND a.organization_id = :org_id
        parameters:
          org_id: "{{ $organization.id }}"
    
    - id: loop_appointments
      type: loop
      config:
        items: "{{ $fetch_appointments.rows }}"
        body: process_reminder
    
    - id: check_email_sent
      type: database.query
      config:
        query: |
          SELECT 1 FROM appointment_reminders
          WHERE appointment_id = :appt_id AND channel = 'email' AND kind = 'auto'
        parameters:
          appt_id: "{{ $json.id }}"
      output: email_already_sent
    
    - id: send_email
      type: if_else
      config:
        conditions:
          - field: "{{ $json.email }}"
            operator: is_not_empty
          - field: "{{ $check_email_sent.rows }}"
            operator: is_empty
        true_branch: do_send_email
    
    - id: do_send_email
      type: email.send
      config:
        to: "{{ $json.email }}"
        subject: "Rappel rendez-vous — {{ $json.patient_name }}"
        body: |
          Bonjour {{ $json.patient_name }},
          
          Ceci est un rappel pour votre rendez-vous.
          - Médecin : {{ $json.doctor_name }}
          - Date : {{ $json.date | format_datetime }}
          - Motif : {{ $json.reason }}
    
    - id: log_reminder
      type: database.insert
      config:
        table: appointment_reminders
        values:
          appointment_id: "{{ $json.id }}"
          channel: email
          kind: auto
          status: sent
          sent_at: "{{ now() }}"
```

### PipelineService → Workflow `daily_data_pipeline`

Migration des DAGs SIH IA :

```yaml
workflow:
  id: daily_data_pipeline
  name: Pipeline données quotidien
  description: Hérité de PipelineService SIH IA (sihia_daily)
  
  trigger:
    type: schedule
    cron: "0 2 * * *"  # 2h du matin
  
  nodes:
    - id: patient_import
      type: workflow.subworkflow
      config:
        workflow_id: patient_import
        on_error: continue
    
    - id: analytics_refresh
      type: workflow.subworkflow
      config:
        workflow_id: analytics_refresh
        depends_on: [patient_import]
    
    - id: ml_features
      type: workflow.subworkflow
      config:
        workflow_id: ml_features
        depends_on: [analytics_refresh]
    
    - id: check_health
      type: ai.transform
      config:
        instruction: |
          Analyse les métriques des 3 pipelines et génère un rapport de santé.
          Alerte si error_rate > 5% ou si stale > 24h.
        input: |
          patient_import: {{ $patient_import }}
          analytics: {{ $analytics_refresh }}
          ml: {{ $ml_features }}
    
    - id: alert_if_degraded
      type: if_else
      config:
        conditions:
          - field: "{{ $check_health.status }}"
            operator: equals
            value: degraded
        true_branch: send_alert
    
    - id: send_alert
      type: notification.push
      config:
        channel: ops-alerts
        message: "Pipeline quotidien dégradé : {{ $check_health.summary }}"
```

---

## 12. Sécurité et permissions

### RBAC workflows

| Permission | Description |
|------------|-------------|
| `workflow:read` | Voir workflows |
| `workflow:write` | Créer/modifier workflows |
| `workflow:execute` | Déclencher manuellement |
| `workflow:delete` | Supprimer workflows |
| `workflow:admin` | Gérer tous workflows org |

### Isolation secrets

```python
# Les secrets ne sont jamais exposés dans les logs
context.secrets.get("smtp_password")  # Résolu runtime, masqué dans audit
```

### Rate limiting

| Limite | Valeur |
|--------|--------|
| Exécutions / workflow / heure | 1000 |
| Exécutions / org / heure | 10000 |
| Durée max exécution | 1 heure |
| Nœuds max par workflow | 100 |

---

## 13. Observabilité

### Métriques

```
workflow_executions_total{workflow_id, status}
workflow_step_duration_seconds{node_type}
workflow_queue_depth
workflow_errors_total{workflow_id, node_type}
```

### Dashboard

- Workflows actifs / en pause
- Exécutions dernières 24h (succès/échec)
- Top 10 workflows par volume
- Latence p95 par workflow
- Alertes pipelines stale (héritage PipelineService)

---

## 14. API Workflows

```
GET    /api/workflows                    # Liste workflows
POST   /api/workflows                    # Créer workflow
GET    /api/workflows/{id}               # Détail
PUT    /api/workflows/{id}               # Modifier
DELETE /api/workflows/{id}               # Soft delete
POST   /api/workflows/{id}/activate        # Activer
POST   /api/workflows/{id}/pause           # Pauser
POST   /api/workflows/{id}/run             # Exécution manuelle
GET    /api/workflows/{id}/runs            # Historique exécutions
GET    /api/workflows/runs/{run_id}        # Détail exécution
GET    /api/workflows/runs/{run_id}/logs   # Logs par nœud
POST   /api/workflows/{id}/test            # Test dry-run
```

---

## 15. Roadmap

| Phase | Livrables |
|-------|-----------|
| **P0** | Engine exécution, triggers schedule/event, actions email/sms/db |
| **P1** | Visual builder, nœuds IA, webhooks |
| **P2** | Migration ReminderService + PipelineService |
| **P3** | Sub-workflows, parallélisation, error handling avancé |
| **P4** | Marketplace templates, connecteurs externes |

---

## 16. Definition of Done — Automation Engine

- [ ] Engine exécution graphe opérationnel
- [ ] Triggers : schedule, event, webhook, manual
- [ ] Nœuds : if/else, loop, transform, http, email, sms
- [ ] Nœuds IA : llm_prompt, agent_call, rag_query
- [ ] Visual builder React Flow
- [ ] Workflow `appointment_reminder` migré depuis ReminderService
- [ ] Workflow `daily_data_pipeline` migré depuis PipelineService
- [ ] Agents peuvent déclencher workflows
- [ ] RBAC et isolation tenant
- [ ] Métriques et logs par nœud
- [ ] API complète documentée OpenAPI

---

## Références

- [README_10_Agents](README_10_Agents.md) — Agents déclencheurs
- [README_08_AIArchitecture](README_08_AIArchitecture.md) — Nœuds IA
- [README_12_EventDriven](README_12_EventDriven.md) — Event Bus
- [SIH IA ReminderService](../../sihia-platform/backend/app/application/reminder_service.py)
- [SIH IA PipelineService](../../sihia-platform/backend/app/application/pipeline_service.py)

---

*Documentation propriétaire — AI BOS Platform Team. © 2026 AI BOS.*
