# Quadern d'Entrenament

App d'entrenament (PWA) per a entrenador i clients. Dades a Supabase amb inici de sessió.

- `index.html` · app (Avui, Pes, Progrés, Setmana, Any, Menjar, Informes)
- `store.js` · dades locals + sincronització, accés, consentiment RGPD, mode "veure client"
- `coach.js` · panell de clients, invitacions, editors de rutines i pautes, informe setmanal automàtic
- `supabase/functions/quadern` · funció de servidor: convidar clients i esborrar compte

Permisos (RLS): el client només registra `sessions`, `bodyweight`, `kcallog`, `drafts` i només després d'acceptar el consentiment;
l'entrenador escriu `exercises`, `templates`, `targets`, `programs`, `nutrition`, `reports` dels seus clients.
