import argparse
import json
import math
import multiprocessing as mp
from pathlib import Path

import numpy as np


DEFAULT_LABELS = [
    "bridge",
    "circle",
    "cloud",
    "flower",
    "grass",
    "hurricane",
    "lantern",
    "leaf",
    "light bulb",
    "line",
    "moon",
    "mushroom",
    "ocean",
    "pond",
    "potato",
    "rain",
    "rainbow",
    "river",
    "snail",
    "squiggle",
    "star",
    "sun",
    "tree",
    "tornado",
    "windmill",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="quickdraw_selected")
    parser.add_argument("--cache-dir", default="quickdraw_cache")
    parser.add_argument("--size", type=int, default=64)
    parser.add_argument("--limit", type=int, default=3650)
    parser.add_argument("--workers", type=int, default=max(1, min(6, mp.cpu_count() - 1)))
    parser.add_argument("--rebuild-cache", action="store_true")
    args = parser.parse_args()

    input_dir = Path(args.input)
    cache_dir = Path(args.cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    categories = [category for category in DEFAULT_LABELS if (input_dir / f"{category}.ndjson").exists()]
    jobs = [(str(input_dir / f"{category}.ndjson"), category, args.limit, args.size, str(cache_dir), args.rebuild_cache) for category in categories]

    with mp.Pool(processes=args.workers) as pool:
        for result in pool.imap_unordered(build_category_cache, jobs):
            print(result, flush=True)


def build_category_cache(job):
    file_path_raw, category, limit, size, cache_dir_raw, rebuild = job
    file_path = Path(file_path_raw)
    cache_dir = Path(cache_dir_raw)
    safe_category = category.replace(" ", "_")
    cache_file = cache_dir / f"{safe_category}_s{size}_n{limit}.npz"
    source_mtime = file_path.stat().st_mtime if file_path.exists() else 0

    if cache_file.exists() and not rebuild:
        try:
            with np.load(cache_file) as data:
                if int(data["size"]) == size and int(data["limit"]) == limit and float(data["source_mtime"]) == source_mtime:
                    return f"skip {category}: {cache_file.name}"
        except Exception:
            pass

    rows = read_samples(file_path, limit, size)
    images = np.asarray(rows, dtype=np.float32)
    np.savez_compressed(cache_file, images=images, size=size, limit=limit, source_mtime=source_mtime)
    return f"built {category}: {len(images)} -> {cache_file.name}"


def read_samples(file_path: Path, limit: int, size: int):
    rows = []
    with file_path.open("r", encoding="utf8") as handle:
        for line in handle:
            if len(rows) >= limit:
                break
            try:
                sample = json.loads(line)
            except json.JSONDecodeError:
                continue
            if sample.get("recognized") is not True or not isinstance(sample.get("drawing"), list):
                continue
            raster = rasterize(sample["drawing"], size)
            if raster is not None:
                rows.append(raster)
    return rows


def rasterize(drawing, size: int):
    strokes = []
    for stroke in drawing:
        if not isinstance(stroke, list) or len(stroke) < 2:
            continue
        xs, ys = stroke[0], stroke[1]
        points = [(float(x), float(ys[index])) for index, x in enumerate(xs) if index < len(ys)]
        if len(points) >= 2:
            strokes.append(points)
    points = [point for stroke in strokes for point in stroke]
    if len(points) < 2:
        return None

    min_x = min(point[0] for point in points)
    max_x = max(point[0] for point in points)
    min_y = min(point[1] for point in points)
    max_y = max(point[1] for point in points)
    width = max(1.0, max_x - min_x)
    height = max(1.0, max_y - min_y)
    padding = 4.0
    drawable = max(1.0, size - padding * 2)
    scale = drawable / max(width, height)
    offset_x = padding + (drawable - width * scale) / 2
    offset_y = padding + (drawable - height * scale) / 2
    grid = np.zeros((size, size), dtype=np.float32)

    for stroke in strokes:
        for index in range(1, len(stroke)):
            ax = (stroke[index - 1][0] - min_x) * scale + offset_x
            ay = (stroke[index - 1][1] - min_y) * scale + offset_y
            bx = (stroke[index][0] - min_x) * scale + offset_x
            by = (stroke[index][1] - min_y) * scale + offset_y
            draw_line(grid, ax, ay, bx, by)
    return grid


def draw_line(grid, ax, ay, bx, by):
    size = grid.shape[0]
    steps = max(1, math.ceil(math.hypot(bx - ax, by - ay) * 2.4))
    for step in range(steps + 1):
        t = step / steps
        x = ax + (bx - ax) * t
        y = ay + (by - ay) * t
        stamp(grid, x, y, 1.1, size)


def stamp(grid, x, y, radius, size):
    min_x = max(0, math.floor(x - radius - 1))
    max_x = min(size - 1, math.ceil(x + radius + 1))
    min_y = max(0, math.floor(y - radius - 1))
    max_y = min(size - 1, math.ceil(y + radius + 1))
    for yy in range(min_y, max_y + 1):
        for xx in range(min_x, max_x + 1):
            distance = math.hypot(xx - x, yy - y)
            value = max(0.0, 1.0 - distance / max(radius + 1, 1.0))
            if value > grid[yy, xx]:
                grid[yy, xx] = value


if __name__ == "__main__":
    main()
