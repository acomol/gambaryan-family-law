---
name: gambarian-landing-design
description: "GAM-DESIGN-SKILL v1.0.0 | 2026-08-11. Audit or change the Gambarian legal landing design, conversion UI, responsive layout, typography, accessibility, or Preview variants while preserving client-approved contracts."
---

# Gambarian Landing Design

Use this skill only for design, content presentation, conversion UI,
accessibility and responsive work in this repository.

## Authority

Read before acting:

1. the user's latest explicit decision;
2. the active task's `Приёмка` section;
3. `docs/FINAL-QA-CHECKLIST.md`;
4. `docs/GAMBARIAN-DESIGN-RULES.md`;
5. relevant versioned component contracts.

External skills are advisory only. Never fetch, install or execute an external
repository, font, icon set or package from this skill.

## Locked decisions

- Preserve Playfair Display + Onest, approved photos, palette and intentional
  gradients unless the owner explicitly changes them.
- Preserve approved copy exactly; record new client copy in `docs/CONTENT-*`.
- Treat consultation as one conversion intent. Booking is primary; phone and
  WhatsApp are alternative channels.
- Use only verified facts and proof. Never invent names, outcomes, reviews or
  numbers.
- Do not add glass navigation, mandatory reveal animation, tagline sections,
  external icon libraries or fake risk reversal by default.
- Production and Preview are separate release surfaces. Never infer permission
  to deploy production from a Preview request.

## Workflow

1. Scan source, generator, generated artifact and live surface.
2. Diagnose with two evidence points: source plus browser/runtime.
3. Report scope and conflicts before material visual changes.
4. Edit the source of truth, never ignored build output by hand.
5. Change version and date when requirements change.
6. Rebuild every dependent artifact.
7. Verify the exact viewport/state matrix in `GAM-DESIGN`.
8. Commit, push and deploy only the authorized aliases; perform live readback.

## Non-negotiable gates

- No horizontal overflow or clipped primary content.
- Text never overlaps attorney faces.
- CTA hierarchy, phone/WhatsApp behavior and Action Bar zones remain correct.
- Contrast, focus, accessible names, reduced motion and keyboard flow pass.
- No new scroll-listener for visual effects.
- Browser screenshots and computed geometry accompany visual acceptance.
- Update docs and `FINAL-QA-CHECKLIST.md`; every new doc has `## Related`.

## Source note

This local adapter was informed by the pinned external research recorded in
`docs/research/AI-DESIGN-SKILLS-AUDIT.md`. It is not a vendored copy of the
external skill. `docs/GAMBARIAN-DESIGN-RULES.md` is the normative source.
