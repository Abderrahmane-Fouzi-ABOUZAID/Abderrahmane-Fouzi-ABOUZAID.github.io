# Portfolio design system

## Direction

The portfolio is an evidence-led security assurance dossier, not a generic cyber interface. Its visual reference is a marked-up operational review: requirements, trust boundaries, evidence, decisions, and ownership are visible in the layout.

## Brand voice

- Precise: use concrete scope, dates, ownership, and measured facts.
- Operational: show how standards become workflows and usable systems.
- Composed: confident without inflated claims or theatrical security imagery.

## Color

The dark surface supports focused reading in a dim technical-review setting. Warm signal orange marks decisions and primary actions. Sea-glass green marks verified controls and positive states. Neither color is used as decoration.

- `--ink`: primary dark canvas
- `--panel`: raised evidence surfaces
- `--paper`: primary text
- `--muted`: secondary text
- `--signal`: decisions and primary actions
- `--assurance`: verified evidence and positive states
- `--line`: low-contrast structure

All authored colors use OKLCH. Text and interactive states target WCAG 2.2 AA.

## Typography

Manrope is the single committed family. Hierarchy comes from scale, weight, line length, and whitespace. Monospace is reserved for code fragments and control identifiers, not used as a generic technical costume.

- Body copy: 16 to 18px, maximum 70 characters per line
- Display: fluid `clamp()` scale with tight but readable tracking
- Labels: sentence case, short, and descriptive

## Layout

- Strict dossier grid with visible rules and asymmetric editorial moments
- Major sections use distinct spacing rhythms rather than identical cards
- Homepage provides fast recruiter scanning
- Dedicated case studies provide durable, shareable technical depth
- Primary targets are at least 44px high on touch layouts

## Components

- Evidence rail: compact metadata for context, ownership, status, and proof
- Case-study row: screenshot or artifact plus problem, decision, and outcome
- Capability map: capability connected directly to project evidence
- CV chooser: language first, then explicit view/download actions
- Mobile jump menu: all destinations remain available at every width

## Motion

Motion is limited to small opacity and transform transitions. No continuous canvas animation. `prefers-reduced-motion` disables non-essential transitions and smooth scrolling.

## Content rules

- Never publish unverified performance or coverage claims.
- Credit collaborators by name.
- Label private work and explain what evidence can be shared.
- Expand specialized acronyms on first use.
- Avoid modal-only project content; every case study has a stable URL.
