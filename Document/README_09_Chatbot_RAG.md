# Chatbot medical (phase post-MVP)

## Positionnement
Assistant d information et d orientation. Jamais de diagnostic critique.

## Scope V1 chatbot
- FAQ medicale generale
- Orientation service
- Rappels simples
- Escalade urgence immediate

## Architecture proposee
- LLM open source
- RAG sur base de connaissance validee
- Guardrails pour filtrage demandes dangereuses

## Garde-fous obligatoires
- Disclaimer visible a chaque session
- Blocage demandes hors perimetre
- Redirection urgences
- Audit log conversation

## Definition of done chatbot
- Taux reponses hors perimetre controle
- Escalade urgence testee
- Corpus source traceable
- Validation medicale humaine des contenus
