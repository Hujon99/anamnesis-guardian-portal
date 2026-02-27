

## Fix: Utskrift visar bara 2 sidor istället för hela formuläret

### Orsak
CSS-regeln `page-break-inside: avoid` på `.print-section` säger åt webbläsaren att inte bryta inuti en sektion. Eftersom sektioner kan vara längre än en A4-sida, klipper webbläsaren bort överskjutande innehåll istället för att skapa fler sidor.

### Ändringar (2 filer, minimala ändringar)

**Fil 1: `src/components/FormBuilder/FormPrintPreview.tsx`**
- Ta bort `page-break-inside: avoid` från `.print-section` (tillåt sektioner att flöda över flera sidor)
- Behåll `page-break-inside: avoid` på `.print-question` (enskilda frågor bör helst hållas ihop)
- Lägg till `page-break-before: auto` på `.print-section` för naturligt sidflöde
- Lägg till print-regler som hanterar den fasta containern (dölj sidebar, gör fixed-element till static)

**Fil 2: `src/components/FormBuilder/FormBuilder.tsx`**
- Lägg till en print-specifik CSS-klass på print-preview-containern så att den renderas korrekt vid utskrift (ändra `fixed` till `static` vid print via inline style-tag)

### Exakt CSS-ändring i FormPrintPreview.tsx (rad 129-136)

Nuvarande:
```css
.print-section {
  page-break-after: avoid;
  page-break-inside: avoid;
}
```

Nytt:
```css
.print-section {
  page-break-before: auto;
}
```

Plus tillägg av regler som döljer allt utom print-content vid utskrift:
```css
body > *:not(.print-preview-container),
nav, aside, header, [data-sidebar] {
  display: none !important;
}

.fixed {
  position: static !important;
}
```

### Vad som INTE ändras
- Inga andra komponenter
- Ingen logik, state eller funktioner
- Inga andra sidor eller vyer
- Bara CSS-regler i print media query
