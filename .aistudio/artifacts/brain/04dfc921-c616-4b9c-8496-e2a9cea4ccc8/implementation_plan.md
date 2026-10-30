# Implementation Plan: Mobile Interface Overhaul & Advanced Bot Automation Features

## Problem Summary & Goals
Mobile users encounter clipping and viewport overflow where modals (such as server creation and feature management) extend beyond screen bounds, hiding action buttons and preventing navigation. Additionally, bot automation needs to be expanded with production-grade Mineflayer capabilities based on user requirements:
1. **Mobile Responsiveness Overhaul:**
   - Dedicated mobile bottom navigation bar (`fixed bottom-0`) with active indicators for Dashboard, Control Panel, Features, and Docs/Admin.
   - Mobile full-screen slideover modals (`max-h-[92vh] flex flex-col` on mobile) with pinned sticky headers, scrollable form bodies, and pinned sticky action buttons.
   - Horizontal touch-optimized swipeable tab strip for the Bot Control Panel with smooth snap scrolling.
   - Compact responsive Virtual D-Pad for mobile movement with forward/back/strafe/jump/sprint/halt controls.
2. **Advanced Bot Automation Suite (Built-in Mineflayer engine):**
   - **Auto-Eat:** Monitors hunger/food levels (< 18) and bot health; identifies food items in inventory, selects them, and safely executes eating.
   - **Auto-Armor:** Scans inventory for helmets, chestplates, leggings, and boots, evaluates tier/defense rating, and equips optimal gear.
   - **Auto-Totem Keeper:** Detects Totem of Undying in inventory; auto-equips to offhand whenever offhand is empty or popped.
   - **AFK Anti-Kick:** Randomized subtle pitch/yaw adjustments, micro-sneak, or arm swing at configurable intervals to prevent idle kicks on Paper/Spigot/Vanilla servers.
   - **Guard Mode / Mob Defense:** Proactively detects hostile mobs within attack radius (3.5 blocks) and strikes with optimal equipped weapon.
   - **Auto-Fish:** Automatically casts fishing rod, listens for bite/splash velocity delta, reels in catch, and recasts after delay.
   - **Auto-Miner / Waypoint Pathfinding:** Allows setting target XYZ waypoints with basic step movement and block dig queue.
   - **Auto-Reconnect Scheduler:** Configurable retry delay, reconnect limits, and status broadcast.

---

## User Review Required

> [!IMPORTANT]
> All new bot automation features will be natively implemented in `server/botManager.ts` and exposed as togglable profile settings and live control panel toggles. Modals across the application will adapt smoothly between desktop popups and mobile bottom-sheet slideovers.

- **Mobile Viewport Height Safeguard:** Modal sheets will employ `max-h-[92vh]` with dedicated internal scrolling (`overflow-y-auto`) and fixed sticky headers and footers to ensure Submit/Cancel buttons are always on screen.
- **Persistence:** Bot automation states (Auto-Eat, Auto-Armor, Auto-Totem, AFK Anti-Kick, Guard Mode, Auto-Fish) will be saved in `BotProfile` so settings persist across restarts.

---

## Proposed Changes

### 1. Mobile Navigation & Modal System
#### [src/components/Navbar.tsx] & [src/components/MobileBottomNav.tsx]
- Create `src/components/MobileBottomNav.tsx` rendering a fixed bottom navigation bar on screens `< md` with icons for Dashboard, Control Panel, Features, Docs, and Admin.
- Add bottom padding (`pb-20 md:pb-6`) to `src/App.tsx` main content wrapper so content is never obscured by the bottom bar.
- Update `src/components/Navbar.tsx` brand header with compact mobile profile chip and clean drawer toggle.

#### [src/pages/DashboardPage.tsx]
- Overhaul the Create Server & Edit Server modal into a responsive mobile-first slideover:
  - Mobile (`< sm`): Slides up from bottom as a drawer (`rounded-t-2xl max-h-[92vh] flex flex-col`), with fixed header `flex items-center justify-between p-4 border-b`, scrollable form body `overflow-y-auto p-4 flex-1 space-y-4`, and sticky footer `p-4 border-t bg-[#0e1013] flex gap-2 justify-end`.
  - Desktop (`sm+`): Centered modal card with clean borders.
- Responsive grid adjustments for stat cards (`grid-cols-2 lg:grid-cols-4`) and profile cards (`w-full overflow-hidden`).

### 2. Bot Control Panel Mobile Redesign
#### [src/pages/BotControlPanel.tsx]
- Replace wide tab headers with a touch-friendly, horizontal scrollable tab strip with smooth swipe navigation (`overflow-x-auto no-scrollbar scroll-smooth snap-x`).
- Integrate a dedicated responsive **Virtual D-Pad** widget in the Movement tab and overview quick-bar:
  - 8-direction intuitive grid with Up, Down, Left, Right, Jump, Sprint, and central Emergency Halt.
- Responsive container constraints: Add `max-w-full overflow-x-hidden` across console output, chat logs, player tables, and inventory grid to prevent horizontal page bulging.

### 3. Advanced Bot Automation Engine
#### [src/types.ts]
- Extend `BotProfile` with automation flags and settings:
  ```typescript
  autoEat?: boolean;
  autoArmor?: boolean;
  autoTotem?: boolean;
  afkAntiKick?: boolean;
  guardMode?: boolean;
  autoFish?: boolean;
  autoMinerTarget?: { x: number; y: number; z: number } | null;
  ```
- Extend `BotLiveState` to broadcast active automation status flags to the frontend in real time.

#### [server/botManager.ts]
- Implement real Mineflayer automation loops:
  - **Auto-Eat Routine:** Subscribes to `health` event. When `bot.food <= 17` or `bot.health < 15`, searches inventory for edible food (`apple`, `cooked_beef`, `bread`, `golden_apple`, etc.), equips to hand, activates item, and finishes eating.
  - **Auto-Armor Routine:** Triggered on inventory change and spawn. Evaluates defense points for helmet/chest/legs/boots slots and calls `bot.equip`.
  - **Auto-Totem Routine:** On health change or tick, checks `bot.inventory.slots[45]` (offhand). If not a totem of undying, locates totem in main inventory and equips to offhand.
  - **AFK Anti-Kick Routine:** Runs on a timer (every 25-45 seconds randomized). Executes a slight yaw pitch delta (e.g. `bot.look(yaw + delta, pitch)`), micro-sneak, or arm swing without triggering server invalid-movement flags.
  - **Guard Mode Routine:** Scans `bot.entities` for nearby hostile mobs (`zombie`, `skeleton`, `creeper`, `spider`, etc.) within 3.5m, faces entity, and attacks with equipped sword/axe.
  - **Auto-Fish Routine:** Locates fishing rod, casts line, listens for sound or entity velocity change near float, reels in, and recasts after 1.5s delay.
- Add Socket.IO event handlers and REST endpoints to toggle any feature dynamically while the bot is running.

#### [src/pages/BotControlPanel.tsx] & [src/pages/FeaturesPage.tsx]
- Add an **"Automation Suite"** section in the Bot Control Panel with interactive toggle cards for Auto-Eat, Auto-Armor, Auto-Totem, AFK Anti-Kick, Guard Mode, and Auto-Fish.
- Provide live activity indicators showing when an automation action is triggered (e.g. "Auto-Eat: Consumed Cooked Beef", "Auto-Totem: Equipped Totem to Offhand").

---

## Verification Plan

### Automated Tests & Compilation
- Run `compile_applet` to verify TypeScript compile-time safety and Vite bundle integrity.
- Run `lint_applet` to ensure zero syntax or type regression errors.

### Manual Verification
1. **Mobile Viewport Test (375px - 414px mobile widths):**
   - Verify the bottom navigation bar is fixed, responsive, and allows 1-tap switching between Dashboard, Control Panel, Features, and Docs.
   - Open the "Create Server / Bot Profile" modal on mobile: verify modal fills mobile height cleanly (`max-h-[92vh]`), form scrolls smoothly, and "Create Server" / "Cancel" buttons remain visible and clickable without horizontal overflow.
   - Inspect Bot Control Panel: verify horizontal swipe tabs, responsive console logs, and Virtual D-Pad.
2. **Feature Functional Test:**
   - Verify Auto-Eat, Auto-Armor, Auto-Totem, AFK Anti-Kick, and Guard Mode toggles update profile state and emit real bot commands.
   - Verify live inventory viewer slots scale properly on mobile screens.
