# Samma ServeIT-guide även för app-journalförda körkortskollar

## Problem

När man öppnar en gammal körkortskoll som journalförts **i appen** visas idag bara en liten grön bekräftelse ("Journalförd direkt i appen av X"). Användaren vill i stället se **samma pedagogiska "Så här journalför du i ServeIT"-guide** som visas för servit-journalförda — så att man alltid kan gå tillbaka och hitta instruktionerna, även om man råkat klicka bort dem under själva flödet.

För servit-journalförda körkortskollar fungerar det redan rätt (sammanfattning överst + ServeIT-guide nedanför). Det är bara app-grenen som ska få samma upplägg.

## Ändring

I `src/components/Optician/EntryDetails/DrivingLicenseResults.tsx`:

1. Ta bort `isServeit`-villkoret runt sektion C — rendera alltid samma kort:
   - Titel: "Så här journalför du den här i ServeIT"
   - Innehåll: `<ServeitInstructions examination={examination} entry={entry} mode="review" />`
2. För app-journalförda läggs en kort, mjuk bekräftelse-rad in **inuti samma kort** (ovanför guiden):
   - "Den här körkortskollen är redan journalförd direkt i appen av {optiker} den {datum}. Guiden nedan finns kvar som referens om du vill journalföra den i ServeIT också."
   - För servit-journalförda visas i stället: "Den här körkortskollen ska/har journalförts i ServeIT — så här gjordes det."
3. Status-badgen i toppen ("Journalförd i appen" / "Ska journalföras i ServeIT") behålls oförändrad.
4. Den fristående gröna `Alert`-bekräftelsen för app-fallet tas bort (ersätts av raden ovan).

## Filer

- **Redigera**: `src/components/Optician/EntryDetails/DrivingLicenseResults.tsx`
- **Oförändrat**: `ServeitInstructions.tsx`, `ServeitTransferView.tsx`, sammanfattningen, tekniska detaljer, databasen.

## Verifiering

- Öppna en app-journalförd körkortskoll → sammanfattning + ServeIT-guide visas, med kort bekräftelse-rad om att den redan är journalförd i appen.
- Öppna en servit-journalförd körkortskoll → ser ut som idag.
- Inga åtgärdsknappar, inga ändringar i flödet.
