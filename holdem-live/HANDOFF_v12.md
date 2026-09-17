# Hold'em Live — v12 Handoff

## Source of truth
- Repository: `yoon-donggyu/yoon-donggyu.github.io`
- Frontend path: `/holdem-live/`
- Public URL: `https://yoon-donggyu.github.io/holdem-live/`
- Supabase project: `vxrsgcsxquaunvxnlkcv`
- Edge Function: `holdem-api`

## Current frontend load order
1. `app-a.js` — room/session/home/lobby base
2. `app-b.js` — table/actions/history/share/game base
3. `app-c.js` — HUD, hand evaluator, base SFX
4. `app-d.js` — premium audio/animation/voice layer
5. `runtime-v12.js` — consolidated room runtime

CSS remains layered for compatibility:
- `style.css`
- `enhance.css`
- `luxury.css`
- `patch-v7.css`
- `premium-v9.css`
- `premium-v9-seats.css`
- `orientation-v11.css`

## v12 runtime consolidation
`runtime-v12.js` replaces the old runtime JS patch chain (`patch-v7.js`, `patch-v10.js`, `patch-v11.js`). Those older files remain in Git history/repository for rollback but are no longer loaded by `index.html`.

v12 owns:
- room roster rendering
- verified seating
- race-safe state polling
- render only when room state actually changes
- stale response protection using request sequence
- game-active / room-landscape classes
- native landscape lock attempt
- virtual 90-degree landscape fallback for browsers without orientation lock

## Regression issues that must never return
1. Joining a room then being kicked back to invite/home.
2. UI showing `착석 완료` when the player was not actually persisted in `room_players`.
3. 1-second polling recreating the entire DOM and causing visible flicker.
4. Older state responses overwriting a newer seated/game state.
5. Opponent hole cards leaking in network state before showdown.

## Verified multiplayer behavior
### Work session verification
- 6 join/seating regression tests passed.
- Real 2-player flow verified through re-entry, seating, betting streets, and chip conservation.

### 2026-09-17 v12 verification
A production Supabase API test room was created with 6 players.
- all 6 joined successfully
- Seat 1–6 persisted correctly
- hand started successfully
- Host received exactly 2 private hole cards
- P2 received exactly 2 private hole cards
- opponent `revealedCards` count before showdown: 0 for both clients
- actual turn order followed through preflop actions
- five players folded in legal turn order
- hand reached `HAND_COMPLETE`
- total chips after hand: `60,000` = `10,000 × 6`
- final sample stacks: Host 10,000 / P2 9,950 / P3 10,050 / P4 10,000 / P5 10,000 / P6 10,000

## Current design direction
Premium Private Casino Lounge / modern luxury poker UI.
- landscape-first mobile
- deep emerald felt
- dark walnut / rosewood frame
- thin warm-gold trim
- glass HUD
- 2–6 player seat layouts
- right-side HUD
- card/chip motion effects

## Audio status
Current production audio still uses Web Audio synthesis in `app-c.js` / `app-d.js`.
Planned next step is file-based SFX with separate volume/fade controls.
Desired assets:
- card deal
- chip call/bet/raise
- fold swish
- all-in
- timer warning
- pot win
- subtle UI tap
- optional low-tempo noir lounge jazz BGM

Background Music generation was attempted on 2026-09-17 but provider hourly generation limit was reached. Retry later; do not block other work on this.

## Remaining priority work
1. Physical-device visual QA on iPhone Safari and Android Chrome.
2. Verify virtual-landscape touch alignment on iPhone Safari.
3. Move from layered legacy CSS toward `base / lobby / game / effects` once visual behavior is frozen.
4. Replace synthesized audio with file-based SFX/BGM.
5. Improve community-card animation separately from hole-card deal animation.
6. Guard win animation so it fires once per completed hand.
7. Consider Supabase Realtime after UI/logic stability; do not rewrite server authority just for responsiveness.

## Constraints
- Play money only.
- No login/signup.
- 2–6 players.
- Server authoritative game state.
- Preserve side pots, heads-up rules, showdown, timeouts, reconnect, host migration, hidden hole cards.
- Do not rewrite the working backend merely for UI refactoring.
