# Autonomous Sketch Recognition

## Current Implementation

The garden canvas now supports an autonomous recognition path:

1. The child draws freely.
2. The stroke is converted to a normalized vector signature.
3. The signature is compared with small local QuickDraw recognition templates.
4. The best matching tool from the current garden day's allowed tools is selected.
5. The existing QuickDraw element generation pipeline renders that recognized element.

The toolbar remains as a same-day reference set, not as a required stamp selector.

## Model Training Status

This implementation does not train or load an image recognition model. It uses local template matching against a curated subset of QuickDraw stroke data.

This is enough for a prototype because the recognition space is constrained by the current day, for example six possible tools instead of hundreds of categories.

## When Training Becomes Necessary

Training becomes necessary if the product requires robust recognition of open-ended children's drawings across many categories.

Recommended future model:

- Input: QuickDraw-style vector strokes, not raster screenshots.
- Model: lightweight 1D CNN, GRU, or small Transformer encoder.
- Training data: public QuickDraw `.ndjson` strokes plus augmentation.
- Runtime: on-device TensorFlow.js or ONNX Web inference.

Avoid using this as a score or assessment. If confidence is low, offer choices rather than saying the drawing is wrong.
