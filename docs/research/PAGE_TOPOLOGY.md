# PAGE_TOPOLOGY — cargoarchitecture.ca/a-propos/

## Design System

| Token | Value | Notes |
|-------|-------|-------|
| Font | Swiss 721 BT → **Inter** (Google) | Weights: 400, 500, 700, 800 |
| Dark BG | `#1D1D1D` / `rgb(29,29,29)` | Primary dark |
| Gray BG | `#3E3E3E` / `rgb(62,62,62)` | Secondary dark |
| White | `#FFFFFF` | Cards, white sections |
| Muted text | `#B4B4B4` | Secondary text on dark |
| Body text dark | `#1D1D1D` | Text on white sections |
| Type scale | 12, 13, 14, 16, 18, 26, 32, 46px | Extracted computed |
| Layout | Full-width, no max-width container | Edge-to-edge design |
| Lang | French (fr) | Quebec firm |

## Sections (DOM order)

### 0. Header + Hero (`about-head`) — h: 911px
- **BG:** dark / `#1D1D1D`
- **Nav:** ACCUEIL | PROJETS | À PROPOS | CULTURE | CONTACT + EN switch
- **CTA nav:** "VOTRE PROJET COMMENCE ICI" (white border button)
- **Hero:** Large split text — "CARGO" bottom-left + "ARCHITECTURE" bottom-right (huge condensed bold white)
- **Anchor nav:** Firme | Services | Approche | Équipe | Prix et distinctions (with horizontal rules)

### 1. Firm Intro (`about`) — h: 699px
- **BG:** `#3E3E3E` (gray)
- **Layout:** Two columns
- **Left (wider):** Large 26px body text about the firm
- **Right:** Italic history text (founded 2006 Toronto → Québec 2008) + founder photo (Charles-Bernard Gagnon, Architecte Fondateur, OAQ)

### 2. Service Cards (`about-cards`) — h: 1572px
- **BG:** `#3E3E3E` (gray)
- **Layout:** 3 cascading/offset white cards
- **Card 1:** "Services en Architecture" — 7 bullet items + "VOIR LES PROJETS" CTA
- **Card 2:** "Services en Design d'intérieur" — bullet items + "TOUS LES PROJETS" CTA
- **Card 3:** "Services en Planification et Expertise" — bullet items
- Below cards: 3 full-width project photos

### 3. Project Phases (`about-phases`) — h: 682px
- **BG:** `#1D1D1D` (dark)
- **Heading:** "Les phases d'un projet"
- **CTA:** "DÉBUTER VOTRE PROJET" button
- Numbered table 00–05 with horizontal rule separators

### 4. Sustainability / ACV (`lifecycle`) — h: 664px
- **BG:** `#FFFFFF` (white section)
- **Layout:** Two columns
- **Left:** Large black text about sustainable solutions
- **Right:** Detailed ACV explanation

### 5. Full-width Photo (`culture-image`) — h: 972px
- Full-bleed office/atelier photo, no text

### 6. Team (`about-team`) — h: 1934px
- **BG:** `#FFFFFF` (white)
- Numbered list 01–13 of team members
- Each row: Number | Name | Role | expand button
- Dark 1px horizontal line separators

### 7. Awards/Distinctions (`about-phases-last`) — h: 1198px
- **BG:** `#1D1D1D` (dark)
- Left: text + CTA, Right: awards table (2015–2021)

### 8. Contact Form (`module-soumission`) — h: 911px
- **BG:** `#1D1D1D` (dark)
- Left: heading + intro, Right: contact form

### 9. Footer (`module-logo`)
- Split: "CARGO" left + copyright center + "ARCHITECTURE" right

## Component Mapping

| # | Section | Component | File |
|---|---------|-----------|------|
| 0 | Header+Hero | Header, HeroSection | Header.tsx, HeroSection.tsx |
| 1 | Firm Intro | FirmIntro | FirmIntro.tsx |
| 2 | Service Cards | ServiceCards | ServiceCards.tsx |
| 3 | Project Phases | ProjectPhases | ProjectPhases.tsx |
| 4 | Sustainability | Sustainability | Sustainability.tsx |
| 5 | Full Photo | FullWidthPhoto | FullWidthPhoto.tsx |
| 6 | Team | TeamSection | TeamSection.tsx |
| 7 | Awards | AwardsSection | AwardsSection.tsx |
| 8 | Contact | ContactForm | ContactForm.tsx |
| 9 | Footer | Footer | Footer.tsx |
