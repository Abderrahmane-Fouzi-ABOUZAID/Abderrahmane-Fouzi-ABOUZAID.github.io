# Abderrahmane Fouzi ABOUZAID portfolio

Evidence-led portfolio for a cybersecurity engineering student focused on security assurance, application security, GRC automation, and software engineering.

## Information architecture

- Recruiter-first homepage with selected work, experience, education, results, capabilities, and contact information
- Verified professional-development evidence, including the Claude Cowork course completion badge
- Dedicated, shareable case studies for DNSSI Compass, Cybersecurity Standards Academy, LEAP, Medisphere, the PwC consulting case, and the graph-based simulation
- Explicit collaborator credits and public/private evidence labels
- French and English CV view and download actions

## Implementation

- Semantic HTML, shared responsive CSS, and framework-free JavaScript
- Mobile navigation preserves all destinations
- WCAG-oriented focus states, skip link, 48 × 48px minimum interaction targets, and reduced-motion support
- WebP project imagery with explicit intrinsic dimensions
- Canonical URLs, Open Graph and Twitter metadata, Person structured data, sitemap, robots file, favicon, and custom 404 page
- Self-hosted Manrope, a shared spacing scale, and container-aware project and workflow layouts
- No continuous canvas animation and no modal-only project content
- JavaScript-independent navigation, CV access, and screenshot fallbacks

## Design system

See `DESIGN.md` for the evidence-dossier direction, tokens, layout rules, accessibility principles, and content standards.

## Run locally

Serve the directory so project URLs and root-relative 404 assets resolve correctly:

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## UI verification

The implementation audit, findings, and reproduction commands are in `docs/ui-ux-audit.tex` (and its compiled PDF). `tests/ui-audit.cjs` checks all eight pages at nine widths, enlarged text, accessibility, keyboard interactions, no-JavaScript fallbacks, and font loading. Test dependencies are isolated from the deployed static site.
