<!--
Sync Impact Report
Version change: N/A → 1.0.0
Modified principles: (new adoption)
Added sections: Operational Standards; Delivery Workflow
Removed sections: None
Templates requiring updates: .specify/templates/plan-template.md (✅); .specify/templates/spec-template.md (✅); .specify/templates/tasks-template.md (✅)
Follow-up TODOs: None
-->
# Zdro Photobooth Constitution

## Core Principles

### Principle I — Guided Simplicity
- MUST provide a single, obvious call to action for each screen so guests can operate the booth without instruction.
- MUST use plain-language copy and large, accessible controls that work with keyboard and touch input.
- MUST surface success, countdown, and error states inline so guests always know what will happen next.
Rationale: The booth serves highly non-technical audiences; frictionless flows keep events moving.

### Principle II — Dependable Capture Flow
- MUST treat camera access as a critical path: serialize capture calls, guard against concurrent runs, and fail with friendly recovery guidance.
- MUST log capture attempts with timestamps, gphoto2 output, and file paths to support rapid troubleshooting on-site.
- MUST keep photo writes inside the configured public directory and clean up stale files on the cadence defined by operations.
Rationale: Reliable photo delivery is the core promise—any gap breaks the experience and event timeline.

### Principle III — Localized & Inclusive Content
- MUST maintain translations for all guest-facing text in the locale catalogs and avoid hard-coded strings.
- MUST default to the visitor’s preferred locale when available and always allow manual language switching.
- MUST ensure visual content, audio cues, and messaging remain culturally appropriate and follow accessibility best practices (ARIA labels, contrast, readable fonts).
Rationale: Events host diverse audiences; inclusive localization keeps the booth welcoming and compliant.

### Principle IV — Standards-First Web Delivery
- MUST build UI with web standards (semantic HTML, CSS, modern JS) and App Router conventions, avoiding platform-specific hacks.
- MUST prefer native browser capabilities before adding libraries (e.g., timers, animations, responsive layout) and justify any polyfills or shims in code review.
- MUST preserve performance budgets: initial load under 2 seconds on reference hardware and no blocking scripts outside core flow.
Rationale: Standards-aligned code simplifies maintenance, keeps the booth fast, and reduces vendor lock-in.

### Principle V — Disciplined Dependencies & Security Hygiene
- MUST evaluate new dependencies for footprint, maintenance cadence, and security risk; document the rationale in PRs before adoption.
- MUST pin and audit runtime-critical tooling (gphoto2 integration, Next.js, localization libraries) and keep update cadence on the TODO roadmap.
- MUST confine secrets to `.env.local`, never expose privileged configuration to the client, and gate admin-only controls behind environment flags.
Rationale: A lean, secure stack minimizes on-site surprises and keeps the booth easy to deploy.

## Operational Standards
- Configure `PHOTO_DIR`, `BASE_URL`, countdown seconds, and ports through environment variables; document any non-default values in README or ops runbooks.
- Keep capture, cleanup, and gallery scripts idempotent so repeated runs cannot delete or double-save guest photos.
- Store all guest assets inside `public/photos` (or the configured equivalent) and serve them via signed or time-bound URLs when exposed beyond trusted networks.
- Run localization reviews before events to confirm translations, QR labels, and signage copy for each enabled locale.

## Delivery Workflow
- Draft specs and plans using the project templates, ensuring the Constitution Check section cites how the work upholds each principle.
- Update `TODO.md` after each milestone or governance change so stakeholders can track operational readiness.
- Require manual verification on reference hardware (camera + host) before shipping any feature that touches the capture flow or localization.
- Treat rollbacks as first-class: document recovery steps and configuration toggles alongside each feature spec.

## Governance
- Amendments require consensus from the product owner and the on-site operations lead, plus a recorded rationale in the PR description.
- Versioning follows semantic rules: MAJOR for principle changes or removals, MINOR for new principles or sections, PATCH for clarifications.
- Reviewers MUST confirm new features cite the impacted principles and include validation notes covering localization and capture reliability.
- Conduct quarterly compliance reviews that exercise capture, localization, and cleanup flows, logging outcomes in project docs.

**Version**: 1.0.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-10-07
