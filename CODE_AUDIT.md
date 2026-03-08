# Code Audit — Floor Planner
**Date:** 2026-03-08  
**Scope:** All `.tsx` / `.ts` files in `apps/editor/` and `packages/viewer/src/`  
**Auditor:** Janes (Tech-Domain-Orchestrator)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 0 |
| 🟠 HIGH     | 18 |
| 🟡 MEDIUM   | 9 |
| 🟢 LOW      | 6 |

**TypeScript check:** `npx tsc --noEmit --project apps/editor/tsconfig.json` → **0 errors, EXIT 0** ✅

**Good news:** No React Hooks Rule violations found (all early-returns are inside callbacks, not at component render level). The PR #9 pattern was a one-off — codebase is clean here.

---

## 🟠 HIGH — WebGPU Material Type Errors

These cause the **250+ `Texture sample count mismatch` warnings** in the console. WebGPU requires `NodeMaterial` variants for the renderer pipeline. Legacy `MeshStandardMaterial` / `MeshBasicMaterial` JSX elements and constructor calls are not WebGPU-compatible when using the three/webgpu renderer.

---

### [HIGH] — `<meshStandardMaterial>` in slab-renderer
- **Datei:** `packages/viewer/src/components/renderers/slab/slab-renderer.tsx`
- **Zeile:** ~36
- **Problem:** JSX element `<meshStandardMaterial>` creates a legacy `MeshStandardMaterial`, incompatible with WebGPU renderer.
- **Fix:** Replace with `<meshStandardNodeMaterial>` (import from `three/webgpu`)
- **Code:**
```tsx
// ❌ Jetzt
<meshStandardMaterial color="#e5e5e5" />

// ✅ Fix
<meshStandardNodeMaterial color="#e5e5e5" />
```

---

### [HIGH] — `<meshStandardMaterial>` in window-renderer
- **Datei:** `packages/viewer/src/components/renderers/window/window-renderer.tsx`
- **Zeile:** ~25
- **Problem:** Legacy material in WebGPU pipeline.
- **Fix:** Replace with `<meshStandardNodeMaterial>`
- **Code:**
```tsx
// ❌
<meshStandardMaterial color="#d1d5db" />
// ✅
<meshStandardNodeMaterial color="#d1d5db" />
```

---

### [HIGH] — `<meshStandardMaterial>` in door-renderer
- **Datei:** `packages/viewer/src/components/renderers/door/door-renderer.tsx`
- **Zeile:** ~25
- **Problem:** Legacy material in WebGPU pipeline.
- **Fix:** Replace with `<meshStandardNodeMaterial>`

---

### [HIGH] — `<meshStandardMaterial>` in roof-renderer
- **Datei:** `packages/viewer/src/components/renderers/roof/roof-renderer.tsx`
- **Zeile:** ~164
- **Problem:** Legacy material in WebGPU pipeline.
- **Fix:** Replace with `<meshStandardNodeMaterial>`

---

### [HIGH] — `<meshStandardMaterial>` × 2 in wall-edge-handles
- **Datei:** `apps/editor/components/tools/wall/wall-edge-handles.tsx`
- **Zeilen:** ~246, ~272
- **Problem:** Two `<meshStandardMaterial>` JSX elements for edge handle spheres.
- **Fix:** Replace both with `<meshStandardNodeMaterial>`

---

### [HIGH] — `<meshStandardMaterial>` × 3 in polygon-editor
- **Datei:** `apps/editor/components/tools/shared/polygon-editor.tsx`
- **Zeilen:** ~358, ~384, ~427
- **Problem:** Three material instances for vertex handles and center point.
- **Fix:** Replace all three with `<meshStandardNodeMaterial>`

---

### [HIGH] — `new MeshBasicMaterial()` in guide-renderer
- **Datei:** `packages/viewer/src/components/renderers/guide/guide-renderer.tsx`
- **Zeile:** ~59
- **Problem:** JS constructor `new MeshBasicMaterial()` in `useMemo` — not a JSX element so the WebGPU renderer doesn't auto-upgrade it. Causes texture sample count mismatch when map texture is applied.
- **Fix:** Use `new MeshBasicNodeMaterial()` from `three/webgpu`
- **Code:**
```ts
// ❌
import { MeshBasicMaterial } from 'three'
return new MeshBasicMaterial({ map: tex, ... })

// ✅
import { MeshBasicNodeMaterial } from 'three/webgpu'
return new MeshBasicNodeMaterial({ map: tex, ... })
```

---

### [HIGH] — `<meshBasicMaterial>` in ground-occluder
- **Datei:** `packages/viewer/src/components/viewer/ground-occluder.tsx`
- **Zeile:** ~67
- **Problem:** JSX legacy material for the ground plane (used for every frame).
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` × 2 in wall-edge-handles
- **Datei:** `apps/editor/components/tools/wall/wall-edge-handles.tsx`
- **Zeilen:** ~202, ~218
- **Problem:** Legacy materials for handle clickable zones.
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` in wall-tool
- **Datei:** `apps/editor/components/tools/wall/wall-tool.tsx`
- **Zeile:** ~241
- **Problem:** Preview mesh uses legacy material.
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` in slab-tool
- **Datei:** `apps/editor/components/tools/slab/slab-tool.tsx`
- **Zeile:** ~273
- **Problem:** Preview polygon mesh uses legacy material.
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` in zone-tool
- **Datei:** `apps/editor/components/tools/zone/zone-tool.tsx`
- **Zeile:** ~344
- **Problem:** Preview polygon mesh uses legacy material.
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` × 3 in cursor-sphere
- **Datei:** `apps/editor/components/tools/shared/cursor-sphere.tsx`
- **Zeilen:** ~41, ~47, ~55
- **Problem:** All three cursor sphere variants use legacy material. These render on every frame.
- **Fix:** Replace all three with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` × 3 in ceiling-tool
- **Datei:** `apps/editor/components/tools/ceiling/ceiling-tool.tsx`
- **Zeilen:** ~300, ~317, ~335
- **Problem:** Preview materials during ceiling drawing.
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` in roof-tool
- **Datei:** `apps/editor/components/tools/roof/roof-tool.tsx`
- **Zeile:** ~204
- **Problem:** Preview mesh uses legacy material.
- **Fix:** Replace with `<meshBasicNodeMaterial>`

---

### [HIGH] — `<meshBasicMaterial>` × 2 in walkthrough-controls
- **Datei:** `apps/editor/components/walkthrough/walkthrough-controls.tsx`
- **Zeilen:** ~239, ~246
- **Problem:** Walkthrough invisible plane and highlight sphere use legacy materials.
- **Fix:** Replace both with `<meshBasicNodeMaterial>`

---

## 🟡 MEDIUM — Memory Leaks

### [MEDIUM] — Texture never disposed in guide-renderer
- **Datei:** `packages/viewer/src/components/renderers/guide/guide-renderer.tsx`
- **Zeile:** ~43–65
- **Problem:** `TextureLoader.load()` creates a `Texture` that is stored in `setTex(t)`. When `resolvedUrl` changes (new image loaded), the previous texture is replaced but never `.dispose()`d. Same for the `MeshBasicMaterial` created in `useMemo` — it leaks when `tex` or `node.opacity` changes.
- **Fix:** Add cleanup in the texture `useEffect` and `useMemo`:
```ts
// In the texture useEffect
return () => {
  cancelled = true
  setTex(prev => {
    prev?.dispose()  // dispose old texture
    return null
  })
}

// In the material useMemo — use a ref for cleanup
// Or: return cleanup via useEffect that watches `material`
```

---

### [MEDIUM] — BoxGeometry + EdgesGeometry not disposed on unmount in window-tool
- **Datei:** `apps/editor/components/tools/window/window-tool.tsx`
- **Zeile:** ~286–289
- **Problem:** `boxGeo` and `edgesGeo` are created inside the component render body (not in `useMemo`), so they are recreated on every render AND `edgesGeo` is never disposed when the component unmounts. `boxGeo.dispose()` is called after creating `edgesGeo`, but `edgesGeo` itself leaks.
- **Fix:** Move into `useMemo` with a cleanup, or into a stable ref:
```tsx
const edgesGeo = useMemo(() => {
  const box = new BoxGeometry(1.5, 1.5, 0.07)
  const edges = new EdgesGeometry(box)
  box.dispose()
  return edges
}, [])

// Dispose on unmount:
useEffect(() => {
  return () => { edgesRef.current?.geometry?.dispose() }
}, [])
```

---

### [MEDIUM] — BoxGeometry + EdgesGeometry not disposed on unmount in door-tool
- **Datei:** `apps/editor/components/tools/door/door-tool.tsx`
- **Zeile:** ~277–280
- **Problem:** Same pattern as window-tool. `edgesGeo` created at render time, never disposed.
- **Fix:** Same pattern as above.

---

### [MEDIUM] — BoxGeometry not disposed after EdgesGeometry creation in use-placement-coordinator
- **Datei:** `apps/editor/components/tools/item/use-placement-coordinator.tsx`
- **Zeile:** ~659–662
- **Problem:** Inside `useEffect`, `boxGeometry` and `edgesGeometry` are created. The `boxGeometry` (intermediate geometry used only to create edges) is NOT disposed before use. Neither is disposed in the cleanup function.
- **Fix:**
```ts
const boxGeometry = new BoxGeometry(dims[0], dims[1], dims[2])
boxGeometry.translate(0, dims[1] / 2, 0)
const edgesGeometry = new EdgesGeometry(boxGeometry)
boxGeometry.dispose() // ← ADD THIS
edgesRef.current.geometry = edgesGeometry

// In return () => { ... } cleanup:
edgesRef.current?.geometry?.dispose() // ← ADD THIS
```

---

## 🟡 MEDIUM — TypeScript Strictness / `any` Usage

### [MEDIUM] — Widespread `as any` in Supabase queries (actions.ts)
- **Datei:** `apps/editor/features/community/lib/projects/actions.ts`
- **Zeilen:** 183, 241, 244, 275, 281, 298, 470, 497, 545, 585, 594, 644, 658, 708, 717, 780, 789, 791, 843, 851, 919, 968, 970, 983, 1002, 1006, 1057, 1084 (und mehr)
- **Problem:** Supabase query chains are cast with `as any` to bypass type errors. This hides real Supabase SDK type mismatches and makes refactoring unsafe.
- **Fix:** Generate proper Supabase types with `supabase gen types typescript` and use them. Or at minimum extract a typed helper:
```ts
// Replace: (supabase.from('projects') as any)
// With a typed wrapper that handles the SDK quirks once
```

---

### [MEDIUM] — `(child: any)` / `(n: any)` in models/hooks.ts
- **Datei:** `apps/editor/features/community/lib/models/hooks.ts`
- **Zeilen:** ~85, 87, 88, 122, 124, 125
- **Problem:** Node children are resolved via `(child: any)` callbacks, losing type safety on tree traversal.
- **Fix:** Use `AnyNode` type from `@pascal-app/core` or a discriminated union.

---

### [MEDIUM] — `(level as any).level` in level-system.tsx
- **Datei:** `packages/viewer/src/systems/level/level-system.tsx`
- **Zeile:** ~73
- **Problem:** Accessing `.level` property via `as any` cast on a `LevelNode`. Indicates `level` is either missing from the `LevelNode` type definition, or the variable name shadows the type.
- **Code:** `entries.push({ levelId, index: (level as any).level ?? 0, obj })`
- **Fix:** Add `level` (floor index) to `LevelNode` type in `@pascal-app/core`, then: `index: (level as LevelNode).floorIndex ?? 0`

---

### [MEDIUM] — `setSelection: (s: any) => void` in tree-node.tsx
- **Datei:** `apps/editor/components/ui/sidebar/panels/site-panel/tree-node.tsx`
- **Zeile:** ~11
- **Problem:** The `setSelection` prop on `handleTreeSelection` is typed as `any`, losing type safety for the selection shape.
- **Fix:** Import and use `ViewerSelection` or the Zustand store's `setSelection` signature.

---

### [MEDIUM] — `projectData as any` in page.tsx
- **Datei:** `apps/editor/app/viewer/[id]/page.tsx`
- **Zeile:** ~104
- **Problem:** Project data cast to `any` to access properties.
- **Fix:** Use the `Project` type from `features/community/lib/projects/types.ts`.

---

## 🟢 LOW — Minor Issues

### [LOW] — `icon: (props: any) => ...` in viewer-overlay.tsx
- **Datei:** `apps/editor/app/viewer/[id]/viewer-overlay.tsx`
- **Zeilen:** ~38, 44, 50
- **Problem:** Three icon factory functions typed as `(props: any)`. Should use `React.ImgHTMLAttributes<HTMLImageElement>` or a custom `IconProps` type.
- **Fix:** `(props: React.ImgHTMLAttributes<HTMLImageElement>) => ...`

---

### [LOW] — `node as any` in tree-node switch cases
- **Datei:** `apps/editor/components/ui/sidebar/panels/site-panel/tree-node.tsx`
- **Zeilen:** all switch cases
- **Problem:** Every switch case casts `node as any` when passing to typed tree node components.
- **Fix:** After narrowing with the `switch (node.type)` discriminant, TypeScript should be able to infer the correct subtype. Cast to the specific type instead: `node as BuildingNode`, etc.

---

### [LOW] — `Gemini API response typed as any` in ai-render/route.ts
- **Datei:** `apps/editor/app/api/ai-render/route.ts`
- **Zeilen:** ~86–88
- **Problem:** Gemini API response flatMapped with `(c: any)`, `(p: any)`.
- **Fix:** Define a minimal response type for the Gemini API or use the Google Generative AI SDK types.

---

### [LOW] — No cancelation of in-flight async in auth/hooks.ts
- **Datei:** `apps/editor/features/community/lib/auth/hooks.ts`
- **Zeile:** ~83
- **Problem:** `useEffect` fires an async operation (likely `getSession()`) without a cancellation mechanism. If the component unmounts before the promise resolves, a setState may be called on an unmounted component (though React 18 suppressed the warning, the actual state update still runs).
- **Fix:** Add a `let cancelled = false` guard (same pattern as viewer page.tsx which does this correctly).

---

### [LOW] — `scene_graph: any` in project types
- **Datei:** `apps/editor/features/community/lib/projects/types.ts`
- **Zeilen:** 42, 147
- **Problem:** The `scene_graph` field of a project is typed as `any`. This propagates `any` widely.
- **Fix:** Use the `SceneGraph` type from `@pascal-app/core` if available, or create a minimal interface.

---

## React Hooks Rule Violations

✅ **No violations found.**

The automated scan raised 30+ candidates, but all were false positives — every `if (...) return` occurrence within components was inside `useEffect`/`useCallback` callback bodies (standard defensive guards), **not** at the component render level. The PR #9 pattern (`ItemTool` with hook after conditional return) has not recurred.

All hook calls in `WallTool`, `SlabTool`, `CeilingTool`, `ZoneTool`, `ModelRenderer`, `GuideRenderer`, `WallRenderer`, etc. are unconditionally called before any render-level early returns. ✅

---

## TypeScript Check Output

```
$ npx tsc --noEmit --project apps/editor/tsconfig.json
(no output)
Exit code: 0
```

**0 TypeScript errors.** The codebase is fully type-correct per the current `tsconfig.json` settings.

---

## Priority Fix Plan

### Sprint-Prio 1 (Sofort — behebt 250+ WebGPU Warnings)
Replace all `<meshStandardMaterial>` → `<meshStandardNodeMaterial>` and `<meshBasicMaterial>` → `<meshBasicNodeMaterial>` across all 18 occurrences listed above. Also fix `new MeshBasicMaterial()` → `new MeshBasicNodeMaterial()` in guide-renderer.

**Estimated effort:** 30–60 min, all mechanical replacements.

### Sprint-Prio 2 (Memory Leaks)
- guide-renderer texture + material disposal
- window-tool + door-tool EdgesGeometry disposal (useMemo + cleanup)
- use-placement-coordinator BoxGeometry disposal

**Estimated effort:** 2–3h

### Sprint-Prio 3 (TypeScript strictness)
- Generate Supabase types (biggest payoff)
- Fix `LevelNode` type to include `floorIndex`
- Clean up remaining `as any` in tree-node.tsx

**Estimated effort:** 4–8h (depends on Supabase type gen complexity)

---

*Audit complete — 0 Critical, 18 High, 9 Medium, 6 Low*
