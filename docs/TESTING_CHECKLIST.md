# Testchecklista – körkortsflödet

Den här checklistan körs **innan en ändring rapporteras som klar** till
beställaren. Syftet är att fånga regressioner tidigt och minska antalet
fram-och-tillbaka-cykler.

Varje punkt körs mot preview-URL:en (eller publicerad miljö när relevant).

## 1. Roller att testa
- **Kund** – fyller i anamnes via mobil (consent → frågor → submit).
- **Assistent** – startar och slutför ärendet i Anamnesportalen.
- **Optiker** – läser mejlet, går igenom svaren och fattar beslut.

## 2. Båda spåren ska testas
- **App-spåret**: Genomför undersökning i appen
  (`ExaminationSummary.tsx` – visus + ID + utfall + tilldelning).
- **ServeIT-spåret**: Journalför direkt i ServeIT
  (`ServitJournalDialog.tsx` – kundnummer + utfall + tilldelning).

## 3. Alla fyra utfall ska testas i tur och ordning
1. Godkänd – kan skickas
2. Godkänd – rek. synundersökning
3. Optiker ska kontakta innan inskick
4. Ej godkänd

För varje utfall, verifiera:
- Färgkod i mejlet (grön / gul / orange / röd).
- Utfallet syns i subject-raden.
- Utfallet syns i UI:t hos optikern (Dashboard).

## 4. Mejl-validering
Öppna det mottagna mejlet och kontrollera att följande syns:
- [ ] Bedömning (färgkodat block överst).
- [ ] Patientens förnamn + kundnummer (inte personnummer!).
- [ ] Bokningsdatum + butik + organisation.
- [ ] Assistentens fritext-anteckning (om angiven).
- [ ] Komplett anamnes — varje fråga + svar grupperat per sektion.
- [ ] Personnummer-fält ska INTE finnas med (filtrerat).
- [ ] Plain text-versionen är läsbar (testa i klient som visar text).

## 5. Glasögon/linser-flödet
- [ ] "Använder glasögon" och "Använder kontaktlinser" är separata kryssrutor.
- [ ] "Överstiger ±8 dioptrier" syns endast om "glasögon" är ikryssat.
- [ ] När ±8 D är ikryssat visas styrke-fält per öga (sfär/cyl/axel/add).
- [ ] När ±8 D INTE är ikryssat sparas inga styrke-värden.
- [ ] Linser kan kryssas i utan att styrke-fält visas.

## 6. Edge cases att inte glömma
- Patient med tomma anamnes-svar → mejlet visar "Inga anamnes-svar registrerade".
- Patient utan kundnummer → kundnummer-raden döljs i mejlet.
- Optikern saknar mejladress → tydligt felmeddelande till assistenten.
- Två assistenter slutför samma ärende samtidigt → ingen dubbeltilldelning.

## 7. Testprofil
Använd Christians konto (`christian@binokel.se`) eller Hugos konto för att
simulera optikersidan. För assistent/kund-flödet kan ett separat testkonto
användas i samma organisation.

---

**Tumregel:** Hellre tio minuters egen testkörning än en extra runda
fram-och-tillbaka med beställaren.
