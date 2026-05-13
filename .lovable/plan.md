## Problem

När en optiker öppnar ett ärende från dashboarden visar `AnamnesisDetailModal` "Åtkomst nekad", trots att personen är inloggad som optiker.

## Rotorsak

`useRobustUserRole` (källan till `isOptician`) har en lucka i sin laddningslogik:

```ts
if (!userId || !isReady) {
  setIsLoading(false);   // ← markerar "klar" utan att ha hämtat rollen
  return;
}
```

`useSupabaseClient.isReady` är ofta `false` på första rendern (Clerk-token är inte färdig än). Då sätts `isLoading=false` med `supabaseRole=null`. Modalen läser då `canViewDetails = isAdmin || isOptician` = `false` och renderar "Åtkomst nekad" innan effekten hinner köra om när `isReady` blir `true`.

För Clerk-administratörer döljs problemet eftersom `isAdmin` kommer direkt från Clerk membership. Optiker (rollen ligger bara i Supabase) är sårbara.

## Lösning

Inför ett explicit `hasResolvedRole`-tillstånd i `useRobustUserRole` så att `isLoading` förblir `true` ända tills vi faktiskt har försökt hämta rollen från Supabase minst en gång (eller kunnat läsa från cache). Modalen fortsätter visa sin "Verifierar behörigheter…"-skärm under tiden istället för att flasha "Åtkomst nekad".

### Ändringar

**`src/hooks/useRobustUserRole.ts`**
- Lägg till `const [hasResolved, setHasResolved] = useState(false)`.
- I cache-träff: `setHasResolved(true)` innan `setIsLoading(false)`.
- När `!userId || !isReady`: behåll `isLoading=true` (vänta på Clerk/Supabase) istället för att sätta `false`. Bara om Clerk-auth är färdiggladdad och `userId` är `null` (= utloggad) markera resolved.
- Efter `fetchSupabaseRole`: alltid `setHasResolved(true)` innan `setIsLoading(false)`.
- Returnera `isLoading: isLoading || !hasResolved` så modalen inte gör accessbeslut för tidigt.

**`src/components/Optician/AnamnesisDetailModal.tsx`**
- Inga funktionella ändringar behövs; den visar redan loader när `isLoadingRole` är `true`. För extra robusthet: visa loader även om `roleError` finns men `retryCount < MAX_RETRIES` (förhindrar flash av felmeddelande mitt i retry).

## Verifiering

1. Logga in som optiker (t.ex. `christian@binokel.se`), öppna dashboarden, klicka på ett körkortsärende → modalen ska gå direkt från "Verifierar behörigheter…" till innehåll, aldrig "Åtkomst nekad".
2. Logga in som admin → fortsatt direkt åtkomst (Clerk-membership).
3. Logga in som `member` → "Åtkomst nekad" som tidigare.

## Filer

- `src/hooks/useRobustUserRole.ts` (logikfix)
- `src/components/Optician/AnamnesisDetailModal.tsx` (mindre robusthet i error-grenen)
