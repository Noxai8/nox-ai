# NOX Exercise Demo Visual System — Design

Date: 2026-09-18  
Repository: `Noxai8/nox-ai`  
Status: approved visual direction; implementation pending

## Goal

Replace the exercise demonstration imagery with a consistent, realistic 3D visual system across the full NOX catalog while preserving the data contracts consumed by `Program.tsx`, `Training.tsx`, and `noxExercises.ts`.

## Current state

- 152 canonical exercises.
- 150 simple thumbnails under `public/exercises/`.
- 92 complete HD sets under `public/exercises-hd/<exercise_id>/`.
- Target: 608 assets using `cover.webp` and `position1.webp` through `position3.webp`.

## Visual direction

Two recurring realistic 3D athletes:

- male athlete for push, legs, and part of conditioning;
- female athlete for pull, core, and the remaining conditioning exercises.

Both use consistent identities, realistic athletic proportions, matte-black training clothes, restrained acid-lime NOX accents, and a neutral non-sexualized presentation.

Renders use a seamless white or very light-gray studio, soft professional lighting, clean contact shadows, and only the required equipment.

## Image sequence

1. `cover.webp`: most recognizable active position;
2. `position1.webp`: stable start position;
3. `position2.webp`: contraction or meaningful midpoint;
4. `position3.webp`: controlled return or final position.

The cover must not be an unrelated waiting pose. Athlete, clothing, equipment, camera, scale, lighting, and environment remain fixed within one exercise.

## Requirements

- Plausible anatomy and joint alignment.
- Consistent grip, stance, equipment settings, plates, and machine geometry.
- No cropped limbs or equipment.
- Movement readable without text.
- Three-quarter camera by default; side view when technically clearer.
- Consistent 4:3 WebP exports.
- Stable existing exercise IDs and file paths.

## Architecture

Production proceeds by category: push, pull, legs, core, then conditioning. Each exercise receives an exercise-specific prompt derived from canonical metadata and technique instructions. Reusable athlete and style specifications preserve consistency.

A validation script audits:

- every canonical exercise ID;
- presence of all four HD files;
- accepted format and consistent dimensions;
- zero-byte or unreadable assets;
- orphaned directories;
- unresolved catalog paths.

Existing paths remain unchanged:

`public/exercises-hd/<exercise_id>/{cover,position1,position2,position3}.webp`

`noxExercises.ts` remains the resolver. `Program.tsx` consumes the HD cover; `Training.tsx` displays the three movement positions. Existing thumbnails remain fallbacks until each batch passes validation.

## Batch workflow

1. Generate a representative sample.
2. Review identity consistency and biomechanics.
3. Correct the prompt template.
4. Generate the rest of the category.
5. Run the asset audit and application build.
6. Inspect every sequence.
7. Commit the validated category independently.

Priority review covers unilateral movements, cables, machines, bodyweight exercises, complex barbell lifts, and exercises where a three-quarter view hides the trajectory.

## Safety and rollback

- Preserve current assets until replacements pass review.
- Use isolated category commits.
- Fall back to current thumbnails for invalid or missing generated assets.
- Do not change catalog IDs or consumer APIs.
- Allow a category to be reverted independently.

## Completion criteria

- 152 exercises resolve correctly.
- 608 HD files are present and readable.
- No orphaned HD directories.
- Asset audit passes.
- Production build passes.
- Every cover and three-position sequence receives manual visual review.
- Authentication, data access, routing, and workout logic remain unchanged.

## Out of scope

- Runtime 3D, videos, Three.js, or Blender integration.
- Overall Program or Training interface redesign.
- Exercise-programming logic changes.
- New catalog exercises during the rollout.
