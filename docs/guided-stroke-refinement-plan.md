# Guided Stroke Refinement Plan

## Objective

Let a child draw freely under a limited prompt such as "draw grass" or "draw a flower", then generate an optimized version of the corresponding element based on the child's own stroke. The optimized element should keep the child's placement, scale, direction, drawing energy, and imperfection while using a readable QuickDraw-style symbol.

## Feasibility

This is feasible without training a recognition model because the app already knows the target category from the selected tool. The system does not need to infer whether the child drew a flower, grass, rain, or a star. It only needs to transform a selected category into a better-structured visual result using the child's stroke features.

The current project already provides the core inputs:

- Pointer time series points with `x`, `y`, `t`, and pressure.
- QuickDraw-style stroke records and derived features.
- Selected tool/category from the toolbar.
- Extracted SVG assets in `public/quickdraw-assets`.
- Scene state updates and feedback text.

## Is QuickDraw Model Training Needed?

No, not for the current product goal.

Training a model on QuickDraw would be useful only if the app needed to classify an unknown drawing, for example "the child drew something, decide whether it is a flower or a cloud". That is not the intended interaction. The prompt/tool already defines the intended element, so training a classifier would add complexity, privacy risk, and behavior that can feel like scoring.

Recommended use of QuickDraw data:

- Use curated QuickDraw SVG samples as visual references and asset variants.
- Use the vector structure as an output style: simple paths, no filled commercial illustration, round caps/joins.
- Use local statistics only for future offline tuning, such as typical aspect ratios or stroke counts per category.

Avoid:

- Uploading children's drawings.
- Runtime dataset downloads.
- "Looks like / does not look like" scoring.
- Psychological or ability assessment.
- Claiming the model is trained on child-specific data.

## Product Architecture

The correct architecture is "guided refinement", not recognition:

1. Child selects a tool, such as `flower`.
2. Child draws freely.
3. The app extracts stroke features: bounding box, center, length, speed, direction, closedness, density.
4. The app selects a curated QuickDraw SVG for the chosen tool.
5. The app fits that SVG to the child's stroke:
   - center from child stroke center,
   - scale from child stroke bounding box and length,
   - aspect ratio from child stroke if safe,
   - rotation from stroke direction for directional elements,
   - animation speed and opacity from speed/density.
6. The raw stroke fades out and the refined element remains.
7. Scene state updates as before.

## Implementation Strategy

The implementation should keep two layers:

- `TemporaryStrokeLayer`: short-lived original child trace.
- `QuickDrawElementLayer`: persistent refined element.

The new refinement layer should be deterministic, local, and privacy-safe:

- No model call.
- No backend.
- No camera input for drawing.
- No dataset download at runtime.

## Acceptance Checks

- Drawing a selected tool produces that tool, not a classified guess.
- The optimized element appears where the child drew.
- A short, wide child stroke makes a wider element where appropriate.
- A tall stroke makes a taller element where appropriate.
- Directional tools such as wind, water, bridge, and line-like elements follow the child's stroke direction.
- Children are never told the drawing is wrong.

## Future Optional ML

Only consider ML if the app later needs open-ended drawing without selecting a tool. Even then, prefer an on-device lightweight classifier trained on public QuickDraw data and use it only as a suggestion, not as a score. A better near-term alternative is template matching against curated SVG categories plus explicit child choice.
