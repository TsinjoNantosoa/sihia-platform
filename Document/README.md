# Dossier d execution du projet SIH IA

Ce dossier transforme votre cahier de charge en plan d implementation progressif.

## Ordre recommande
1. README_00_Vision_Scope.md
2. README_01_Setup_Environnement.md
3. README_02_Architecture.md
4. README_03_Backend_FastAPI.md
5. README_04_Base_De_Donnees.md
6. README_05_Frontend_React.md
7. README_06_Securite_RBAC.md
8. README_07_Data_Pipeline_Airflow.md
9. README_08_ML_Prediction.md
10. README_09_Chatbot_RAG.md
11. README_10_DevOps_Deploy.md
12. README_11_Tests_QA.md
13. README_12_Roadmap_12_Semaines.md
14. README_13_Business_GTM.md

## Regle de progression
- Ne jamais passer a une etape suivante si l etape actuelle n est pas validee.
- Livrer petit a petit (MVP d abord).
- Priorite absolue: valeur metier + securite + donnees propres.

## Definition of done globale
- Le MVP tourne en local via Docker Compose.
- Les modules patients, medecins, rendez-vous fonctionnent.
- Un dashboard KPI minimum est disponible.
- Une prediction Prophet 7 jours est exposee via API.
- Des tests critiques passent (API, auth, CRUD, migrations).
