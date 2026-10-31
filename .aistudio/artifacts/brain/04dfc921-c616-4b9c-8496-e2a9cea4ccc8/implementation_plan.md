# Implementation Plan: Dashboard Animation, Control System, and UI Refinement

## 1. Objective
Enhance the bot management dashboard with production-grade entrance animations, a centralized global command dock for improved control, and refined visual iconography to achieve a cohesive, high-fidelity user experience.

## 2. Scope
- **Animations**: Implement entrance and state-change animations using `framer-motion` for dashboard cards, modals, and navigation transitions.
- **Global Control System**: Create a persistent, contextual command dock (fixed bottom or floating sidebar) for "Bulk Actions" (Start All, Stop All, Sync All) and quick profile navigation.
- **UI & Icons**: Standardize iconography across the application, refine the typographic hierarchy, and ensure consistent padding/spacing across the new responsive grid.

## 3. Implementation Steps

### Phase 1: Animation Infrastructure
- Install `framer-motion` as a dependency.
- Define reusable motion wrappers for dashboard cards and modal entry/exit.
- Apply staggered entrance animations to the bot profile grid.

### Phase 2: Global Control System
- Develop `src/components/GlobalCommandDock.tsx`:
  - Persistent sticky dock on small screens.
  - Quick-access bulk actions: `Start All Online`, `Stop All Active`, `Sync All Packets`.
  - Contextual visibility (hidden on login/landing).

### Phase 3: UI & Iconography Refinement
- Audit icon consistency (replace generic icons with optimized Lucide variants).
- Refine padding and typographic hierarchy in bot profile cards based on the *frontend-design* skill.
- Apply subtle surface contrast improvements between cards and the main background for better readability.

## 4. Verification
- Validate animation performance on low-end mobile devices (frame drops < 5%).
- Verify all global command dock actions trigger the correct server-side endpoints and display feedback.
- Compile and lint using `npm run build` and `npm run lint`.
