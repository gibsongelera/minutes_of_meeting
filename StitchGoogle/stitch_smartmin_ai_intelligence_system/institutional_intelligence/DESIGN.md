---
name: Institutional Intelligence
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5a413d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#8e706c'
  outline-variant: '#e2bfb9'
  surface-tint: '#b22b1d'
  primary: '#570000'
  on-primary: '#ffffff'
  primary-container: '#800000'
  on-primary-container: '#ff8371'
  inverse-primary: '#ffb4a8'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cba72f'
  on-tertiary-container: '#4e3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#8f0f07'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin: 32px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
---

## Brand & Style
The design system embodies the prestige of Zamboanga Peninsula Polytechnic State University while integrating the cutting-edge capabilities of enterprise AI. It is built on a foundation of **Corporate Modernism** with subtle **Glassmorphism** accents to signal innovation.

The brand personality is authoritative yet accessible—designed to feel like a high-reliability tool for university governance. It prioritizes clarity and efficiency, ensuring that complex meeting data and task delegations are presented with academic rigor. The emotional response should be one of "effortless command": users should feel that the system is an extension of their professional intellect.

## Colors
The palette is rooted in the university’s heritage. The **Deep Maroon** provides a sense of stability and institutional history, used primarily for headers, primary actions, and branding elements. **White** and **Light Gray** form the "canvas," creating a spacious, clean environment that reduces cognitive load during long transcription reviews.

The **Subtle Gold** is reserved specifically for "Intelligence" features—AI-generated summaries, automated task suggestions, and premium insights. This color signals high-value, machine-processed information. Success and error states use sophisticated, muted tones of green and red to maintain the professional aesthetic without feeling overly loud.

## Typography
The typographic strategy balances institutional weight with digital utility. **Public Sans** is utilized for headlines to provide a sense of official government-grade reliability and clear hierarchy. It is neutral yet carries enough visual weight to anchor large dashboard sections.

**Inter** is the workhorse for body content, transcriptions, and task lists. Its high x-height and exceptional legibility make it ideal for reading long-form text and navigating dense data tables. Use `body-md` for standard transcriptions and `label-caps` for metadata like "Speaker Name" or "Timestamp" to provide a clear distinction between the dialogue and the interface.

## Layout & Spacing
This design system utilizes a **Fixed Grid** approach for the main dashboard to ensure consistency across various institutional departments. The layout is centered on a 12-column grid with a maximum container width of 1440px. 

Margins and gutters are generous to prevent the UI from feeling "cramped," a common issue in enterprise platforms. A strict 8px spatial system governs all internal padding and alignment. Components should be spaced using `md` (16px) for related elements and `lg` (24px) to separate distinct functional sections. Sidebars should be fixed at 280px to accommodate long institutional navigation labels.

## Elevation & Depth
Depth is created through **Tonal Layering** supplemented by **Minimal Glassmorphism**. The base background is the neutral light gray, while "work areas" (cards, transcription editors) are pure white with a 1px border of a slightly darker gray.

To signal AI-driven components, use a subtle glassmorphism effect: a semi-transparent white background with a 12px backdrop blur and a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)). This differentiates "static" content from "intelligent" content. Primary buttons should have a slight Maroon shadow to give them a tactile, "pressable" quality that stands out against the flat university branding.

## Shapes
The shape language is defined as **Rounded (Level 2)**. This strikes a balance between the precision of a professional tool and the modern friendliness of a user-centric AI platform. 

Standard components like input fields and buttons use a 0.5rem (8px) radius. Larger containers, such as dashboard widgets or meeting cards, utilize the `rounded-lg` (1rem/16px) property. This softening of the institutional Maroon prevents the system from feeling overly rigid or dated, aligning it with contemporary productivity tools like Notion.

## Components

### Buttons
- **Primary:** Solid Deep Maroon with white text. High-contrast, 8px radius.
- **Secondary:** Maroon outline with transparent background.
- **AI Action:** Subtle Gold background with white text or Deep Maroon text, utilizing a "glow" shadow to indicate its special functionality.

### Transcription Cards
Cards should feature a white background with a 1px light gray border. The header should display the meeting title in `h3` Public Sans. A "Task Summary" section within the card should be highlighted with a soft gold left-border to denote AI processing.

### Input Fields
Forms use a light gray fill with no initial border; they transition to a 2px Maroon border on focus. This "quiet" default state reduces visual noise when multiple fields are present.

### AI Badges
A signature component of this system is the "AI Intelligence Badge." These are small, pill-shaped chips with a gold-to-white gradient background, used to label items that have been automatically generated or suggested by the system.

### Task Delegation Lists
Lists are clean with horizontal dividers only. Checkboxes should use the Deep Maroon color for the "checked" state. Hover states on list items should use a very faint gray (almost white) to indicate interactivity without disrupting the reading flow.