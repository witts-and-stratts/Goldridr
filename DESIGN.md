---
name: Goldridr
description: Premium chauffeur service platform; dark, sharp, gold earned through restraint.
colors:
  burnished-gold: "#C29E66"
  limousine-black: "oklch(0 0 0)"
  ivory: "oklch(1 0.0001 271.15)"
  cabin-black: "oklch(0.145 0 0)"
  cabin-panel: "oklch(0.205 0 0)"
  admin-primary: "oklch(0.922 0 0)"
  hairline-white: "oklch(1 0 0 / 8%)"
  muted-gray: "oklch(0.556 0 0)"
  focus-gold: "oklch(0.6208 0.0677 90.36)"
  signal-red: "oklch(0.58 0.22 27)"
typography:
  display:
    fontFamily: "Engry, ui-serif, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Epilogue, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.6
  label:
    fontFamily: "Engravers Gothic BT, ui-sans-serif, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
  ui:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  none: "0px"
  admin: "0.5rem"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.burnished-gold}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
  button-outline-hover:
    backgroundColor: "{colors.burnished-gold}"
    textColor: "oklch(0.145 0 0 / 80%)"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    rounded: "{rounded.none}"
    height: "3rem"
  card:
    backgroundColor: "{colors.cabin-panel}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.none}"
---

# Design System: Goldridr

## 1. Overview

**Creative North Star: "The Tailored Suit"**

Goldridr dresses like its chauffeurs: dark cloth, sharp seams, and one piece of metal that catches the light. The marketing surface is true black with ivory text and Burnished Gold (#C29E66) appearing only where a decision is asked for. The admin takes the suit off entirely: it runs stock shadcn neutral dark (untinted zinc, 0.625rem radius, system sans, default shadows) so eight hours of dispatch work happens in familiar, unremarkable product UI. The luxury identity belongs to the public surface only.

The system explicitly rejects two failures named in PRODUCT.md: the **generic SaaS admin** (stat cards, gradient accents, identical card grids) and **flashy gold-on-black luxe** (casino gradients, gloss, ornament). Luxury here is the absence of noise, not the addition of shine.

**Key Characteristics:**
- Public site: dark surfaces by conviction, layered tonally, never by shadow
- Public site: zero border radius on core controls; edges are the identity
- Gold reserved for action, selection, and identity moments on the public site
- Wide engraved uppercase labels carry the brand voice at small sizes
- Admin: stock shadcn neutral dark, unmodified; the suit stays at the door

## 2. Colors

A warm-black wardrobe with one metal accent on the public site; the admin uses shadcn's stock neutral dark palette, untinted.

### Primary
- **Burnished Gold** (#C29E66): primary actions, selected states, brand marks. Matte by intention; it is the watch at the cuff, not the chandelier. Hover states fill with it at 80% (`--gold/80`).

### Neutral
- **Limousine Black** (oklch(0 0 0)): the marketing-site canvas. The one permitted pure black; everything layered on it is warm.
- **Cabin Black** (oklch(0.145 0 0)): admin background; shadcn's stock dark canvas.
- **Cabin Panel** (oklch(0.205 0 0)): admin cards, popovers, dialogs, sidebar; one tonal step above the background.
- **Admin Primary** (oklch(0.922 0 0)): stock shadcn near-white primary; `--gold` is remapped to this inside the admin so shared components lose their gold.
- **Ivory** (oklch(1 0.0001 271)): foreground text on dark surfaces.
- **Hairline White** (oklch(1 0 0 / 8%)): borders and dividers; structure at a whisper.
- **Muted Gray** (oklch(0.556 0 0)): secondary text, placeholders.

### Tertiary
- **Focus Gold** (oklch(0.6208 0.0677 90.36)): focus rings only; a desaturated gold that signals keyboard position without shouting.
- **Signal Red** (oklch(0.58 0.22 27)): destructive actions and validation errors. The only non-gold chroma on any screen.

### Named Rules
**The Cufflink Rule.** Burnished Gold occupies at most 10% of any public-site screen. Its rarity is the luxury; a screen that feels golden has failed.
**The Two Wardrobes Rule.** The public site wears the tailored suit; the admin wears stock shadcn neutral dark, unmodified. Never import gold, Engravers, or zero-radius into the admin; never let stock shadcn styling leak onto the public site.

## 3. Typography

**Display Font:** Engry (with ui-serif, Georgia fallback)
**Body Font:** Epilogue, weights 300–700 (with system-ui fallback)
**Label/Wide Font:** Engravers Gothic BT (with sans-serif fallback)
**UI Font:** Inter via `--font-sans`; the admin theme remaps all brand font variables to system stacks

**Character:** A three-voice wardrobe: Engry speaks for the brand at display sizes, Epilogue Light does the everyday talking, and Engravers Gothic delivers small uppercase labels like plates on a cabin door. The admin removes the accent entirely and works in system sans: precision over personality during the workday.

### Hierarchy
- **Display** (Engry 400, large display sizes, 1.1 line-height): hero and identity moments on marketing pages only.
- **Body** (Epilogue 300/400, 1rem, 1.6): paragraphs and descriptions; cap prose at 65–75ch.
- **Label** (Engravers Gothic 500, 0.75rem, +0.05em, UPPERCASE): buttons, nav items, section labels. This is the signature voice.
- **UI** (Inter/system 400, 0.875rem): admin tables, forms, and data; density without fatigue.

### Named Rules
**The Engraved Plate Rule.** Buttons and wayfinding labels are set small, wide, and uppercase in Engravers Gothic. Never set body copy or data in the wide face.

## 4. Elevation

On the public site: flat, tonal layering. No shadow vocabulary exists there and none should be introduced. Depth is conveyed two ways: a surface one tonal step lighter than what it sits on, and hairline borders at low-alpha white. If a surface needs more separation, lighten it another step; do not blur or drop a shadow under it.

The admin uses stock shadcn elevation as shipped (e.g. `shadow-lg` on dialogs and popovers). Do not strip it; familiarity is the point there.

### Named Rules
**The Flat Cloth Rule.** Shadows are prohibited on the public site. A component that seems to need one needs a tonal step or a hairline instead. The admin is exempt: stock shadcn shadows stay.

## 5. Components

Refined and restrained: hairline borders, quiet hovers, the engraved label doing the identity work. Every interactive component ships with default, hover, focus-visible, and disabled states; focus is always a 1px Focus Gold ring.

### Buttons
- **Shape:** hard rectangle (0px radius) on the public site; inside the admin, stock shadcn corners (calc(var(--radius) - 2px), radius 0.625rem)
- **Label:** Engravers Gothic, 0.75rem, medium, uppercase
- **Outline (signature):** 0.5px Burnished Gold border at 50%, transparent fill, gold text; hover fills Burnished Gold with near-black text
- **Primary:** gold fill, hover dims to gold at 80%
- **Ghost:** borderless; hover fills gold with black text; expanded state holds gold at 20%
- **Disabled:** 50% opacity, no pointer events

### Cards / Containers
- **Corner Style:** sharp (0px) on marketing; admin surfaces use the stock shadcn radius (0.625rem)
- **Background:** Cabin Panel, one tonal step above the page
- **Shadow Strategy:** none; see Elevation
- **Border:** Hairline White (8%), 1px or nothing
- **Internal Padding:** generous on marketing, compact in admin tables

### Inputs / Fields
- **Style:** transparent background, 1px border, 0px radius, 48px height, Epilogue Light
- **Focus:** border shifts to ring color plus a 1px Focus Gold ring at 50%
- **Error:** Signal Red border with a 1px red ring at 20%
- **Disabled:** input-tinted fill at 50%, not-allowed cursor, 50% opacity

### Navigation
- **Admin sidebar:** stock shadcn sidebar tokens (Cabin Panel surface, system sans labels); active item uses the standard accent treatment, never a filled gold block.
- **Marketing nav:** ivory labels on black, gold reserved for the active route or the booking CTA.

### Status & Data (signature)
Booking and chauffeur states must read at a glance (PRODUCT.md: "State at a glance"). Express status with the chart ramp's warm ambers and text labels, not colored card borders or badge rainbows.

## 6. Do's and Don'ts

### Do:
- **Do** keep Burnished Gold under 10% of any public-site screen (The Cufflink Rule).
- **Do** use tonal steps (0.145 → 0.205) and low-alpha white hairlines for separation on the public site.
- **Do** set every public-site button and wayfinding label in uppercase Engravers Gothic at 0.75rem.
- **Do** keep core controls (buttons, inputs) at 0px radius on the public site; the admin uses stock shadcn corners.
- **Do** keep the admin as stock shadcn neutral dark (The Two Wardrobes Rule); reach for plain shadcn components and defaults there.
- **Do** ship hover, focus-visible, and disabled states with every interactive component.

### Don't:
- **Don't** build the "generic SaaS admin" named in PRODUCT.md: no hero-metric stat cards, no gradient accents, no identical card grids.
- **Don't** drift into "flashy gold-on-black luxe": gold gradients, glossy effects, and ornamental borders are prohibited by name.
- **Don't** use box-shadows on the public site (The Flat Cloth Rule); in the admin, keep stock shadcn shadows.
- **Don't** import the luxury identity (gold, Engravers, zero radius, true black) into the admin, and don't let stock shadcn styling leak onto the public site.
- **Don't** use `border-left`/`border-right` thicker than 1px as a colored status stripe; status is text plus warm-amber tone.
- **Don't** introduce new hues. The palette is warm darks, gold, and Signal Red for errors; nothing else.
- **Don't** set data, tables, or body copy in Engravers Gothic or Engry.
