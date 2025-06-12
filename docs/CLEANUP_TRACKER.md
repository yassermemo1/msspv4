# Cleanup Tracker

## Date: YYYY-MM-DD

### 1. Removed unused client components
- Moved `client/src/components/external-systems` ➜ `client/src/unused-scripts/external-systems`
- Moved `client/src/components/integration-engine` ➜ `client/src/unused-scripts/integration-engine`

### 2. Update TypeScript configuration
- Added `client/src/unused-scripts/**` to `exclude` list.
- Set `target` to `ES2017` and enabled `downlevelIteration`.

### 3. Installed missing runtime / dev dependencies
```
npm i -D terser
npm i compression jsonwebtoken csv-parser cron
```

### 4. Current status
- TypeScript errors reduced from ~822 ➜ 756 (−66) after removing duplicate client components.
- Remaining errors are concentrated in server-side integration-engine and widget registry modules, plus various strict-null checks in forms.

### 5. Next planned actions
1. Review server-side integration-engine stack (`server/api/integration-engine/*`, `server/routes/integration-engine-widgets.ts`, `server/services/integration-engine-adapter.ts`).
   - Determine if it's still used or superseded by `external-widgets` flow.
   - If unused, move to `server/unused-scripts/` and delete corresponding imports in `server/routes.ts`.
2. If integration-engine is required, triage key type errors (e.g. `ExternalSystem.systemType` enum mismatch, `authConfig` indexing) to unblock compilation.
3. Add missing types/glob utils (install `glob`, fix `fast-glob` namespace import).
4. Address low-hanging strict-null issues in `client/forms/*` that break dev server immediately (replace invalid generics, widen field types).

--- 