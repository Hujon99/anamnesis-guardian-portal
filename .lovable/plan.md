

## Fix: Utskriften visar tom/bara 1 sida

### Orsak
CSS-regeln `#root > *:not(.print-overlay-container)` döljer alla direkta barn av `#root` som inte har klassen `.print-overlay-container`. Men `.print-overlay-container` ligger djupt nästlad (inuti Layout, Router, FormBuilder osv), så den matchas aldrig som direkt barn — och hela DOM:en döljs vid utskrift.

### Lösning
Ändra print-CSS i **enbart** `FormPrintPreview.tsx` (inga andra filer). Strategi:

1. Ta bort de felaktiga `#root > *:not(...)` och `body > *:not(#root)` selektorerna
2. Istället: gör `.print-overlay-container` till en "breakout" via `position: fixed` som täcker hela sidan vid print, med `z-index: 99999` och vit bakgrund
3. Dölj alla andra element med `body *` visibility hidden, men gör `.print-overlay-container` och dess barn synliga igen

Konkret CSS-ändring (rad 137-150 i FormPrintPreview.tsx):

**Ta bort:**
```css
body > *:not(#root),
nav, aside, header, [data-sidebar] {
  display: none !important;
}

#root > *:not(.print-overlay-container) {
  display: none !important;
}

.print-overlay-container {
  position: static !important;
  overflow: visible !important;
}
```

**Ersätt med:**
```css
body * {
  visibility: hidden;
}

.print-overlay-container,
.print-overlay-container * {
  visibility: visible;
}

.print-overlay-container {
  position: absolute !important;
  left: 0;
  top: 0;
  width: 100% !important;
  overflow: visible !important;
}
```

### Filer som ändras
| Fil | Ändring |
|-----|---------|
| `src/components/FormBuilder/FormPrintPreview.tsx` | Byt ut print-CSS selektorer (ca 10 rader) |

### Filer som INTE ändras
- `FormBuilder.tsx` — ingen ändring
- Alla andra filer — ingen ändring
- Ingen logik, state eller funktioner påverkas

