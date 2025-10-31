# Design Guidelines

Detta dokument innehåller designriktlinjer för att säkerställa konsekvent och högkvalitativ användarupplevelse i hela applikationen.

## Spacing & Whitespace

### Kritiskt: Generöst med whitespace
Ett återkommande problem har varit för täta dialoger och komponenter. **ALLTID** använd generösa marginaler och spacing för att ge användaren andrum.

### Dialog Spacing Standards

**DialogContent:**
- Max-width: Minst `sm:max-w-[500px]`, oftast `sm:max-w-[600px]` för mer komplex innehåll
- Content padding automatiskt via DialogContent, men lägg till extra `py-6` på main content

**DialogHeader:**
- Använd `space-y-3` för spacing mellan title och description
- Description ska ha `text-base` (inte text-sm) för bättre läsbarhet
- Undvik att trappa ihop header-elementen

**Main Content (`<div>` inuti DialogContent):**
```tsx
<div className="space-y-8 py-6">  {/* Inte space-y-4, använd space-y-8! */}
  {/* Innehåll här */}
</div>
```

**Sections inom content:**
- Använd `space-y-4` MINIMUM mellan label och input
- Använd `space-y-6` eller `space-y-8` mellan olika sections
- För komplex content (checkboxes, listor): använd `space-y-3` mellan items

**DialogFooter:**
```tsx
<DialogFooter className="pt-6 gap-3">  {/* pt-6 ger separation från content */}
  <Button className="min-w-[100px]">Cancel</Button>
  <Button className="min-w-[140px]">Confirm</Button>
</DialogFooter>
```

### Form Elements

**Labels:**
- Alltid `text-base` för primary labels (inte text-sm)
- `font-semibold` för viktiga labels
- Spacing: `space-y-4` mellan label och input för forms

**Textarea & Inputs:**
- Lägg till `mt-3` på textarea/input om det finns beskrivande text ovanför
- Använd `leading-relaxed` på beskrivande texter för bättre läsbarhet

**Checkboxes/Radio Groups:**
- Använd `space-y-3` mellan items (inte space-y-2)
- Lägg till `space-x-2` eller `space-x-3` mellan checkbox och label

### Alerts & Info Boxes

```tsx
<Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription className="leading-relaxed">  {/* leading-relaxed! */}
    <strong>Title:</strong> Description text här
  </AlertDescription>
</Alert>
```

### Lists

**Unordered lists:**
```tsx
<ul className="text-sm text-muted-foreground list-disc list-inside space-y-2 ml-2">
  {/* space-y-2 för spacing mellan list items */}
</ul>
```

### Cards

**Card Content:**
- Använd `space-y-6` eller `space-y-8` mellan sections
- För listor av items: `space-y-4` minimum

## Typography

### Font Sizes
- **Headings:** Använd standardiserade sizes från Tailwind (text-3xl, text-2xl, text-xl, text-lg)
- **Body text:** `text-base` som default, `text-sm` endast för sekundär/meta information
- **Descriptions:** `text-base` med `leading-relaxed` för bättre läsbarhet
- **Small print:** `text-xs` endast för timestamps, meta-data, hints

### Font Weights
- **Primary text:** `font-medium` eller `font-semibold`
- **Body text:** default (font-normal)
- **Labels:** `font-semibold` för viktiga labels

## Color Usage

### Semantic Colors
ALLTID använd semantic tokens från design systemet, ALDRIG direkta färger:

```tsx
// ❌ WRONG
<div className="bg-blue-500 text-white">

// ✅ CORRECT
<div className="bg-primary text-primary-foreground">
```

### Alert Colors
- Info: Standard Alert component
- Warning: `border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950`
- Error: `variant="destructive"`
- Success: `border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950`

## Interactive Elements

### Buttons

**Sizing:**
- Använd `min-w-[100px]` för cancel/back buttons
- Använd `min-w-[140px]` för primary action buttons
- Använd `size="lg"` för stora call-to-action buttons

**Spacing:**
- DialogFooter: `gap-3` mellan buttons
- Button groups: `space-x-3` eller `gap-3`

**Grid of buttons:**
```tsx
<div className="grid grid-cols-2 gap-6">  {/* gap-6, inte gap-4 */}
  <Button size="lg" className="h-24 flex flex-col gap-2">
    {/* Content */}
  </Button>
</div>
```

### Forms

**Form fields:**
```tsx
<FormItem className="flex flex-col space-y-4">  {/* space-y-4! */}
  <FormLabel className="text-base font-semibold">Label</FormLabel>
  <FormControl>
    <Input />
  </FormControl>
  <FormDescription className="leading-relaxed">
    Description text
  </FormDescription>
  <FormMessage />
</FormItem>
```

## Accessibility

### Touch Targets
- Minimum 44x44px för touch targets
- Använd `size="lg"` för buttons på mobile-first interfaces
- Grid buttons: `h-24` minimum för large touch targets

### Text Contrast
- Använd semantic colors för automatisk dark mode support
- Text på colored backgrounds: använd `text-primary-foreground` eller motsvarande

### Focus States
- Aldrig disable focus rings (default Tailwind focus states är bra)
- För custom focus states: använd `focus-visible:` prefix

## Responsive Design

### Breakpoints
- Mobile first: skriv mobile styles först, lägg till `sm:`, `md:`, `lg:` för större skärmar
- Dialog widths: `sm:max-w-[500px]` eller `sm:max-w-[600px]`

### Grid Layouts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* gap-6 minimum för grid spacing */}
</div>
```

## Common Mistakes to Avoid

### ❌ För tätt spacing
```tsx
// WRONG
<div className="space-y-2 py-2">
<DialogHeader>
  <DialogTitle>Title</DialogTitle>
  <DialogDescription className="text-sm">Description</DialogDescription>
</DialogHeader>
```

### ✅ Korrekt spacing
```tsx
// CORRECT
<div className="space-y-8 py-6">
<DialogHeader className="space-y-3">
  <DialogTitle>Title</DialogTitle>
  <DialogDescription className="text-base">Description</DialogDescription>
</DialogHeader>
```

### ❌ För små font sizes
```tsx
// WRONG
<Label className="text-sm">Important Label</Label>
<p className="text-xs">Important description</p>
```

### ✅ Rätt font sizes
```tsx
// CORRECT
<Label className="text-base font-semibold">Important Label</Label>
<p className="text-sm leading-relaxed">Important description</p>
```

### ❌ Direkta färger
```tsx
// WRONG
<Button className="bg-blue-500 text-white hover:bg-blue-600">
```

### ✅ Semantic colors
```tsx
// CORRECT
<Button variant="default">  // Använder primary colors från theme
```

## Review Checklist

Innan du committar ny UI-kod, kolla:

- [ ] Har dialogen `sm:max-w-[500px]` eller större?
- [ ] Använder main content `space-y-8 py-6` eller liknande generöst spacing?
- [ ] Har DialogHeader `space-y-3`?
- [ ] Är DialogDescription `text-base` (inte text-sm)?
- [ ] Har DialogFooter `pt-6 gap-3`?
- [ ] Använder labels `text-base font-semibold` för viktiga fält?
- [ ] Har beskrivande texter `leading-relaxed`?
- [ ] Använder forms `space-y-4` eller mer mellan fields?
- [ ] Har lists `space-y-2` eller `space-y-3` mellan items?
- [ ] Använder endast semantic colors från theme (inga direkta färg-klasser)?
- [ ] Har buttons `min-w-[100px]` eller större?
- [ ] Har touch targets minst 44x44px (använd `size="lg"` eller `h-24`)?

## Resources

- [Tailwind Spacing Scale](https://tailwindcss.com/docs/customizing-spacing)
- [Radix UI Dialog Anatomy](https://www.radix-ui.com/docs/primitives/components/dialog)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
