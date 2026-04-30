Jag har kontrollerat nuläget i databasen och hittat orsaken:

- Daniel finns idag i `users` bara för organisationen `Optik Test`.
- Christian och Hugo finns i `users` för `Niemis Optik Norrland`, därför syns de i optikerlistan och kan få mail.
- Clerk-medlemskapet kan alltså vara rätt, men Supabase-raden som appen använder för optikerlistan saknas för Daniel i Niemis-organisationen.
- Det finns dessutom en teknisk spärr i databasen: `users.clerk_user_id` är globalt unik, vilket gör att samma Clerk-användare inte kan finnas i flera organisationer samtidigt. Det behöver justeras korrekt, annars kommer Daniel inte kunna få en separat Supabase-rad i Niemis.

Plan:

1. Uppdatera databasen så samma Clerk-användare kan finnas i flera organisationer
   - Ta bort den globala unika spärren på `users.clerk_user_id`.
   - Behåll/utgå från den befintliga unika regeln per organisation: `(organization_id, clerk_user_id)`.
   - Justera foreign key för `anamnes_entries.optician_id` så den pekar på rätt optiker inom samma organisation via `(organization_id, optician_id)` -> `users(organization_id, clerk_user_id)`.
   - Detta bevarar säkerheten: en optiker matchas fortfarande inom rätt organisation, inte globalt.

2. Lägg till Daniel i `Niemis Optik Norrland` i Supabase
   - Skapa en ny `users`-rad för:
     - email: `daniel@binokel.se`
     - namn: Daniel Niemi
     - Clerk user id: Daniels befintliga Clerk-id
     - organization_id: `org_2vXhzuO3NxisIjVL4PoGRK7ZdxF` (`Niemis Optik Norrland`)
     - role: `optician`
   - Daniels befintliga admin-rad i `Optik Test` lämnas orörd.

3. Fixa synken från Clerk så problemet inte återkommer
   - Uppdatera `useSyncClerkUsers` så den alltid söker och uppdaterar användare per aktiv organisation, inte bara per `clerk_user_id`.
   - Detta gör att en användare kan vara medlem i flera organisationer utan att synken blandar ihop raderna.
   - Uppdateringar ska använda både `organization_id` och `clerk_user_id`.

4. Säkra att inloggning inte råkar skriva över roller
   - Uppdatera `useEnsureUserRecord` så befintliga användares roll inte skrivs över till `optician` vid inloggning/org-byte.
   - Vid ny rad kan rollen fortsatt sättas till `optician` som default.
   - Vid befintlig rad uppdateras endast namn/e-post, inte roll eller organisation.

5. Verifiera flödet efter ändringen
   - Kontrollera att Daniel finns i `users` i `Niemis Optik Norrland`.
   - Kontrollera att optikerlistan hämtar Daniel tillsammans med Christian/Hugo.
   - Kontrollera att mailfunktionen kan slå upp Daniels e-post via `optician_id + organization_id`.
   - Kontrollera att befintliga tilldelningar inte bryts av foreign key-ändringen.

Förväntat resultat:

- Daniel syns som valbar optiker i Niemis Optik Norrland.
- Det går att tilldela körkortsärenden/anamneser till Daniel.
- Mail till optiker kan skickas till `daniel@binokel.se` på samma sätt som för Christian och Hugo.
- Daniels roll/adminstatus i andra organisationer påverkas inte.