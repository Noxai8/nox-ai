# NOX Exercise Demo Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a validated library of 608 consistent realistic-3D exercise images for all 152 canonical NOX exercises without changing exercise IDs or the existing UI contract.

**Architecture:** Keep the current `public/exercises-hd/<exercise_id>/` contract, add deterministic Node tooling for catalog extraction, image splitting, and asset auditing, then replace imagery category-by-category. Each exercise is generated as one four-panel contact sheet to preserve athlete/equipment/camera consistency, split into four WebP assets, audited, visually reviewed, and committed in an isolated category commit.

**Tech Stack:** React 18, TypeScript, Vite, Node.js ESM, Node test runner, Sharp, OpenAI built-in image generation.

**Spec:** `docs/superpowers/specs/2026-09-18-exercise-demo-visual-system-design.md`

## Global Constraints

- The canonical catalog contains exactly 152 exercises.
- Every exercise must resolve to exactly `cover.webp`, `position1.webp`, `position2.webp`, and `position3.webp`.
- All final assets must be WebP images with a consistent 4:3 aspect ratio.
- Existing exercise IDs and `/exercises-hd/<exercise_id>/...` paths must remain stable.
- The male athlete is used for push, legs, and six conditioning exercises.
- The female athlete is used for pull, core, and six conditioning exercises.
- Clothing is matte black with restrained acid-lime NOX accents.
- Backgrounds are white or very light gray with soft studio lighting.
- Anatomy, grip, stance, equipment geometry, camera, scale, and athlete identity must remain consistent within an exercise.
- No unrelated interface redesign, authentication change, data-access change, routing change, or workout-logic change is allowed.
- Existing simple thumbnails remain fallback assets until an HD sequence is validated.
- Each category is committed independently so it can be reverted independently.

---

### Task 1: Catalog extraction and audit core

**Files:**
- Create: `scripts/lib/exercise-catalog.mjs`
- Create: `scripts/lib/exercise-asset-audit.mjs`
- Create: `scripts/tests/exercise-asset-audit.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `readCanonicalCatalog(sourceText): Array<{id:string,name:string,category:string,equipment:string}>`
- Produces: `auditExerciseAssets({ catalog, assetRoot }): Promise<AuditResult>`
- Produces: `AuditResult = { expectedExercises:number, expectedFiles:number, errors:string[], warnings:string[], byCategory:Record<string,{exercises:number,complete:number}> }`

- [ ] **Step 1: Add Sharp as a development dependency and test scripts**

Run:

```bash
npm install --save-dev sharp
npm pkg set scripts.test:exercise-assets="node --test scripts/tests/*.test.mjs"
npm pkg set scripts.validate:exercise-assets="node scripts/validate-exercise-assets.mjs"
```

Expected: `package.json` contains both scripts and `sharp` appears under `devDependencies`.

- [ ] **Step 2: Write failing catalog and audit tests**

Create tests using `node:test`, `node:assert/strict`, temporary directories, and this minimum fixture:

```js
const source = `
const NOX_GENERATOR_CATALOG: CatalogExercise[] = [
  { id: 'barbell_bench_press', name: 'Développé couché barre', category: 'push', equipment: 'barre' },
  { id: 'seated_cable_row', name: 'Rowing poulie basse', category: 'pull', equipment: 'poulie' },
];
`;

test('extracts the canonical catalog in source order', () => {
  assert.deepEqual(readCanonicalCatalog(source), [
    { id: 'barbell_bench_press', name: 'Développé couché barre', category: 'push', equipment: 'barre' },
    { id: 'seated_cable_row', name: 'Rowing poulie basse', category: 'pull', equipment: 'poulie' },
  ]);
});

test('reports every missing HD asset', async () => {
  const result = await auditExerciseAssets({
    catalog: readCanonicalCatalog(source),
    assetRoot: fixtureRoot,
  });
  assert.equal(result.expectedExercises, 2);
  assert.equal(result.expectedFiles, 8);
  assert.equal(result.errors.length, 8);
});
```

Add tests for duplicate IDs, orphan directories, unreadable files, wrong aspect ratio, and a complete four-file exercise.

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm run test:exercise-assets
```

Expected: FAIL because the two modules do not exist.

- [ ] **Step 4: Implement catalog extraction**

Implement `readCanonicalCatalog` by isolating `NOX_GENERATOR_CATALOG`, parsing each object’s four quoted fields, rejecting duplicate IDs, and throwing when the parsed catalog is empty.

- [ ] **Step 5: Implement the asset audit**

Use `sharp(file).metadata()` to verify each expected file exists, is readable, has `format === 'webp'`, has non-zero dimensions, and satisfies `Math.abs(width / height - 4 / 3) <= 0.01`. Enumerate directories under `assetRoot` to report orphans. Do not mutate assets.

- [ ] **Step 6: Run tests and verify success**

Run:

```bash
npm run test:exercise-assets
```

Expected: all catalog and audit tests PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/lib scripts/tests
git commit -m "test: add exercise asset audit core"
```

### Task 2: Validation CLI and machine-readable report

**Files:**
- Create: `scripts/validate-exercise-assets.mjs`
- Create: `reports/exercise-assets/.gitkeep`
- Modify: `.gitignore`
- Test: `scripts/tests/exercise-asset-audit.test.mjs`

**Interfaces:**
- Consumes: `readCanonicalCatalog`, `auditExerciseAssets`
- Produces: command `npm run validate:exercise-assets`
- Produces: `reports/exercise-assets/latest.json`

- [ ] **Step 1: Add a failing CLI integration test**

Spawn the CLI against a temporary catalog and asset root. Assert exit code `1` for missing files and assert the JSON report contains `expectedExercises`, `expectedFiles`, `errors`, `warnings`, and `byCategory`.

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test:exercise-assets
```

Expected: FAIL because the CLI is absent.

- [ ] **Step 3: Implement the CLI**

Defaults:

```js
const catalogPath = process.env.NOX_CATALOG_PATH || 'src/lib/noxExercises.ts';
const assetRoot = process.env.NOX_ASSET_ROOT || 'public/exercises-hd';
const reportPath = process.env.NOX_ASSET_REPORT || 'reports/exercise-assets/latest.json';
```

Print category totals, complete counts, and every error. Write formatted JSON. Exit `1` when `errors.length > 0`; otherwise exit `0`.

- [ ] **Step 4: Ignore generated reports but preserve the directory**

Add `reports/exercise-assets/*.json` to `.gitignore` and retain `.gitkeep`.

- [ ] **Step 5: Verify tests and current repository status**

Run:

```bash
npm run test:exercise-assets
npm run validate:exercise-assets
```

Expected: tests PASS. The audit may fail at this stage because the current repository is incomplete; its report must state the exact missing or invalid paths.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-exercise-assets.mjs scripts/tests/exercise-asset-audit.test.mjs reports/exercise-assets/.gitkeep .gitignore
git commit -m "feat: add exercise asset validation command"
```

### Task 3: Deterministic contact-sheet splitter

**Files:**
- Create: `scripts/lib/split-exercise-contact-sheet.mjs`
- Create: `scripts/split-exercise-contact-sheet.mjs`
- Create: `scripts/tests/split-exercise-contact-sheet.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `splitExerciseContactSheet({ inputPath, outputDir }): Promise<string[]>`
- Produces: ordered outputs `cover.webp`, `position1.webp`, `position2.webp`, `position3.webp`
- Produces: command `npm run split:exercise-sheet -- <input> <exercise_id>`

- [ ] **Step 1: Write the failing splitter test**

Create a synthetic 1600×300 four-color image with Sharp. Split it and assert four 400×300 WebP outputs, correct ordered filenames, and representative pixel colors proving left-to-right order.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:exercise-assets
```

Expected: FAIL because the splitter is absent.

- [ ] **Step 3: Implement strict splitting**

Require an image whose width is divisible by four and whose panel ratio is within 0.01 of 4:3. Extract four equal panels left-to-right, resize each to 1200×900 using `fit: 'cover'`, and encode WebP at quality 92. Refuse to overwrite an existing output directory unless `NOX_ALLOW_ASSET_OVERWRITE=1`.

- [ ] **Step 4: Add the package command**

```json
"split:exercise-sheet": "node scripts/split-exercise-contact-sheet.mjs"
```

The CLI resolves output to `public/exercises-hd/<exercise_id>/` and rejects IDs absent from the canonical catalog.

- [ ] **Step 5: Run tests and a synthetic CLI smoke test**

Run:

```bash
npm run test:exercise-assets
```

Expected: all tests PASS and four 1200×900 WebP files are produced in the temporary fixture.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/lib/split-exercise-contact-sheet.mjs scripts/split-exercise-contact-sheet.mjs scripts/tests/split-exercise-contact-sheet.test.mjs
git commit -m "feat: add exercise contact sheet splitter"
```

### Task 4: Runtime fallback alignment

**Files:**
- Modify: `src/pages/Training.tsx`
- Verify: `src/pages/Program.tsx`
- Verify: `src/lib/noxExercises.ts`

**Interfaces:**
- Consumes: `getNoxExerciseThumbnail(exercise)`
- Changes: local `NoxExerciseImage` in `Training.tsx` accepts `fallbackSrc?: string | null`
- Preserves: `getNoxExerciseHdCover` and `getNoxExerciseHdPositions` signatures

- [ ] **Step 1: Extend Training’s image component**

Mirror the existing `Program.tsx` fallback behavior: track `usingFallback`, reset it on `src` or `fallbackSrc` change, switch once from the HD source to the simple thumbnail, then show `NoxVisualFallback` only if both fail.

- [ ] **Step 2: Wire the thumbnail fallback**

In `NoxExerciseCover`, pass `getNoxExerciseThumbnail(exercise)` as `fallbackSrc`. In the three-step demo, pass the same thumbnail only while a category has not yet passed the HD audit; do not reuse another exercise’s image.

- [ ] **Step 3: Verify the production build**

Run:

```bash
npm run build
```

Expected: Vite build exits `0` with no TypeScript error.

- [ ] **Step 4: Manually verify failure behavior**

Temporarily request one nonexistent HD filename in the browser. Confirm the matching exercise’s own simple thumbnail appears, restore the filename, and confirm the HD image appears again.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Training.tsx
git commit -m "fix: align training exercise image fallbacks"
```

### Task 5: Pilot the production workflow

**Files:**
- Replace: `public/exercises-hd/barbell_bench_press/*.webp`
- Replace: `public/exercises-hd/seated_cable_row/*.webp`
- Create: `docs/exercise-assets/prompt-template.md`
- Create: `docs/exercise-assets/review-checklist.md`

**Interfaces:**
- Consumes: built-in image generation, splitter CLI, asset audit
- Produces: two approved four-image sequences and the frozen production prompt

- [ ] **Step 1: Write the shared prompt template**

Specify a realistic 3D render, seamless white/light-gray studio, matte-black clothing, acid-lime piping, fixed camera/equipment/lighting, four equal horizontal panels, no text, no logos, no cropped limbs, and biomechanically plausible start/contraction/return phases.

- [ ] **Step 2: Generate the male pilot contact sheet**

Generate `barbell_bench_press` with the male athlete. The four panels are: recognizable active cover, bar at lockout, controlled touch near mid-chest, and return to lockout. Feet, grip width, rack, bench, plates, camera, clothing, and face must not change.

- [ ] **Step 3: Generate the female pilot contact sheet**

Generate `seated_cable_row` with the female athlete. The four panels are: recognizable contracted cover, arms extended with neutral spine, handle at lower ribs with elbows back, and controlled return. Seat, footplates, cable height, handle, camera, clothing, and face must not change.

- [ ] **Step 4: Split and audit both pilots**

Run:

```bash
NOX_ALLOW_ASSET_OVERWRITE=1 npm run split:exercise-sheet -- generated_images/barbell_bench_press-contact-sheet.png barbell_bench_press
NOX_ALLOW_ASSET_OVERWRITE=1 npm run split:exercise-sheet -- generated_images/seated_cable_row-contact-sheet.png seated_cable_row
npm run validate:exercise-assets
npm run build
```

Expected: both pilot directories contain four readable 1200×900 WebP images. Build passes.

- [ ] **Step 5: Perform visual review**

For all eight images, check identity, hands, joints, grip, stance, equipment geometry, camera, lighting, clothing, full-body framing, and correct movement order. Reject and regenerate the whole four-panel sheet if any invariant changes between panels.

- [ ] **Step 6: Freeze documentation and commit**

```bash
git add docs/exercise-assets public/exercises-hd/barbell_bench_press public/exercises-hd/seated_cable_row
git commit -m "feat: establish realistic 3d exercise demo style"
```

### Task 6: Push category rollout

**Files:**
- Replace: `public/exercises-hd/<push exercise id>/*.webp`
- Report: `reports/exercise-assets/latest.json` (generated, not committed)

**Interfaces:**
- Consumes: frozen prompt template and male athlete specification
- Produces: 37 complete push sequences / 148 WebP files

- [ ] **Step 1: Generate one four-panel sheet per push exercise**

Use the 37 canonical push IDs returned by `readCanonicalCatalog`. Generate the male athlete with exercise-specific equipment, start, contraction, and return instructions.

- [ ] **Step 2: Split all sheets**

For each push ID, run the splitter with `NOX_ALLOW_ASSET_OVERWRITE=1`.

- [ ] **Step 3: Audit and review**

Run tests, asset audit, and build. Manually review every push sequence against the checklist. Regenerate any failed sequence as a complete sheet.

- [ ] **Step 4: Commit the category**

```bash
git add public/exercises-hd
git commit -m "feat: replace push exercise demonstrations"
```

### Task 7: Pull category rollout

**Files:**
- Replace: `public/exercises-hd/<pull exercise id>/*.webp`

**Interfaces:**
- Consumes: frozen prompt template and female athlete specification
- Produces: 40 complete pull sequences / 160 WebP files

- [ ] Generate, split, audit, build, and manually review one four-panel sheet for every canonical pull ID.
- [ ] Regenerate full sheets for inconsistent hands, cable paths, handles, benches, or machine geometry.
- [ ] Commit with `git commit -m "feat: replace pull exercise demonstrations"`.

### Task 8: Legs category rollout

**Files:**
- Replace: `public/exercises-hd/<legs exercise id>/*.webp`

**Interfaces:**
- Consumes: frozen prompt template and male athlete specification
- Produces: 43 complete legs sequences / 172 WebP files

- [ ] Generate, split, audit, build, and manually review every canonical legs ID.
- [ ] Give additional review to spinal alignment, knee tracking, foot contact, unilateral side consistency, and bar path.
- [ ] Commit with `git commit -m "feat: replace legs exercise demonstrations"`.

### Task 9: Core category rollout

**Files:**
- Replace: `public/exercises-hd/<core exercise id>/*.webp`

**Interfaces:**
- Consumes: frozen prompt template and female athlete specification
- Produces: 20 complete core sequences / 80 WebP files

- [ ] Generate, split, audit, build, and manually review every canonical core ID.
- [ ] Give additional review to pelvic position, spinal alignment, support points, and left/right limb consistency.
- [ ] Commit with `git commit -m "feat: replace core exercise demonstrations"`.

### Task 10: Conditioning category rollout

**Files:**
- Replace: `public/exercises-hd/<conditioning exercise id>/*.webp`

**Interfaces:**
- Consumes: frozen prompt template and alternating athlete specifications
- Produces: 12 complete conditioning sequences / 48 WebP files

Use the male athlete for `treadmill_walk`, `treadmill_run`, `rowing_ergometer`, `sled_push`, `farmers_walk`, and `battle_rope`. Use the female athlete for `incline_treadmill_walk`, `stationary_bike`, `elliptical`, `stair_climber`, `jump_rope`, and `sled_pull`.

- [ ] Generate, split, audit, build, and manually review all 12 conditioning IDs.
- [ ] Verify moving equipment, ropes, sleds, belts, pedals, and handles remain consistent across phases.
- [ ] Commit with `git commit -m "feat: replace conditioning exercise demonstrations"`.

### Task 11: Final acceptance and documentation

**Files:**
- Create: `docs/exercise-assets/README.md`
- Verify: `public/exercises-hd/**`
- Verify: `src/pages/Program.tsx`
- Verify: `src/pages/Training.tsx`
- Verify: `src/lib/noxExercises.ts`

**Interfaces:**
- Consumes: all category outputs
- Produces: documented, fully audited 152-exercise library

- [ ] **Step 1: Run full automated verification**

```bash
npm ci
npm run test:exercise-assets
npm run validate:exercise-assets
npm run build
```

Expected: every command exits `0`; audit reports 152 complete exercises and 608 valid files with zero errors and zero orphan directories.

- [ ] **Step 2: Verify runtime behavior**

Open Program and Training flows. Confirm every exercise cover loads, every demo shows positions 1–3 in order, no cross-exercise visual appears, and missing-image fallback still behaves correctly when simulated.

- [ ] **Step 3: Document maintenance**

Document the canonical filenames, four-panel generation rule, splitter command, audit command, overwrite guard, visual checklist, athlete allocation, and category commit strategy.

- [ ] **Step 4: Review the final diff**

Confirm no authentication, Supabase, routing, workout-programming, or unrelated UI files changed.

- [ ] **Step 5: Commit final documentation**

```bash
git add docs/exercise-assets/README.md
git commit -m "docs: document exercise demo asset workflow"
```
