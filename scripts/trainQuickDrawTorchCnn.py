import argparse
import json
import math
import os
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset


CATEGORY_TO_TOOL = {
    "bridge": "bridge",
    "circle": "seed",
    "cloud": "cloud",
    "flower": "firstFlower",
    "grass": "grass",
    "hurricane": "windLine",
    "lantern": "lantern",
    "leaf": "leafBoat",
    "light bulb": "breathLight",
    "line": "windLine",
    "moon": "moon",
    "mushroom": "mushroom",
    "ocean": "waterLine",
    "pond": "ripple",
    "potato": "stone",
    "rain": "rainDrop",
    "rainbow": "rainbow",
    "river": "waterLine",
    "snail": "snailTrail",
    "squiggle": "windLine",
    "star": "star",
    "sun": "sunlight",
    "tree": "smallTree",
    "tornado": "windLine",
    "windmill": "windLine",
}


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


class ResidualBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super().__init__()
        self.stride = stride
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1)
        self.shortcut = None
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride)

    def forward(self, x):
        residual = x if self.shortcut is None else self.shortcut(x)
        x = F.relu(self.conv1(x))
        x = self.conv2(x)
        return F.relu(x + residual)


class QuickDrawCnn(nn.Module):
    def __init__(self, class_count: int, architecture: str = "deep", image_size: int = 32):
        super().__init__()
        self.architecture = architecture
        self.image_size = image_size
        if architecture == "resnet":
            self.stem = nn.Conv2d(1, 32, kernel_size=5, padding=2)
            self.blocks = nn.ModuleList([
                ResidualBlock(32, 32, 1),
                ResidualBlock(32, 64, 2),
                ResidualBlock(64, 64, 1),
                ResidualBlock(64, 128, 2),
                ResidualBlock(128, 128, 1),
                ResidualBlock(128, 192, 2),
            ])
            self.dropout = nn.Dropout(0.22)
            self.fc1 = nn.Linear(192, 192)
            self.fc2 = nn.Linear(192, class_count)
            return

        if architecture == "standard":
            channels = [1, 32, 64, 96]
            dense_hidden = 128
        else:
            channels = [1, 32, 64, 128, 128]
            dense_hidden = 192
        pooled_size = image_size // (2 ** (len(channels) - 1))
        dense_in = channels[-1] * pooled_size * pooled_size
        self.conv_layers = nn.ModuleList([
            nn.Conv2d(channels[index], channels[index + 1], kernel_size=5 if index == 0 else 3, padding=2 if index == 0 else 1)
            for index in range(len(channels) - 1)
        ])
        self.dropout = nn.Dropout(0.24 if architecture == "deep" else 0.22)
        self.fc1 = nn.Linear(dense_in, dense_hidden)
        self.fc2 = nn.Linear(dense_hidden, class_count)

    def forward(self, x):
        if self.architecture == "resnet":
            x = F.relu(self.stem(x))
            for block in self.blocks:
                x = block(x)
            x = F.adaptive_avg_pool2d(x, 1)
            x = torch.flatten(x, 1)
            x = F.relu(self.fc1(x))
            x = self.dropout(x)
            return self.fc2(x)

        for conv in self.conv_layers:
            x = F.max_pool2d(F.relu(conv(x)), 2)
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        return self.fc2(x)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="quickdraw_selected")
    parser.add_argument("--out", default="public/quickdraw-cnn")
    parser.add_argument("--max-per-category", type=int, default=2200)
    parser.add_argument("--validation-per-category", type=int, default=350)
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--seed", type=int, default=20260611)
    parser.add_argument("--no-augment", action="store_true")
    parser.add_argument("--architecture", choices=["standard", "deep", "resnet"], default="resnet")
    parser.add_argument("--target", choices=["category", "tool"], default="tool")
    parser.add_argument("--cache-dir", default="quickdraw_cache")
    parser.add_argument("--rebuild-cache", action="store_true")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.backends.cudnn.benchmark = True

    source_categories = [label for label in DEFAULT_LABELS if (Path(args.input) / f"{label}.ndjson").exists()]
    labels = get_output_labels(source_categories, args.target)
    label_to_index = {label: index for index, label in enumerate(labels)}
    train_images = []
    train_labels = []
    val_images = []
    val_labels = []
    cache_dir = Path(args.cache_dir) if args.cache_dir else None

    for category in source_categories:
        started_at = time.perf_counter()
        output_label = get_output_label(category, args.target)
        rows = read_or_build_cached_samples(
            Path(args.input) / f"{category}.ndjson",
            category,
            args.max_per_category + args.validation_per_category,
            args.size,
            cache_dir,
            args.rebuild_cache,
        )
        random.Random(stable_hash(category)).shuffle(rows)
        validation = rows[: args.validation_per_category]
        training = rows[args.validation_per_category : args.validation_per_category + args.max_per_category]
        train_images.extend(training)
        train_labels.extend([label_to_index[output_label]] * len(training))
        val_images.extend(validation)
        val_labels.extend([label_to_index[output_label]] * len(validation))
        elapsed = time.perf_counter() - started_at
        print(f"{category} -> {output_label}: train={len(training)} validation={len(validation)} load={elapsed:.2f}s", flush=True)

    train_x = torch.tensor(np.asarray(train_images, dtype=np.float32)[:, None, :, :])
    train_y = torch.tensor(train_labels, dtype=torch.long)
    val_x = torch.tensor(np.asarray(val_images, dtype=np.float32)[:, None, :, :])
    val_y = torch.tensor(val_labels, dtype=torch.long)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    pin_memory = device.type == "cuda"
    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=args.batch_size, shuffle=True, pin_memory=pin_memory)
    val_loader = DataLoader(TensorDataset(val_x, val_y), batch_size=args.batch_size, pin_memory=pin_memory)

    print(f"device={device}", flush=True)
    model = QuickDrawCnn(len(labels), args.architecture, args.size).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()
    best_state = None
    best_val_acc = 0.0
    history = []

    for epoch in range(args.epochs):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        for x, y in train_loader:
            x = x.to(device, non_blocking=True)
            y = y.to(device, non_blocking=True)
            if not args.no_augment:
                x = augment_batch(x)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            train_loss += float(loss.item()) * y.size(0)
            train_correct += int((logits.argmax(dim=1) == y).sum().item())
            train_total += y.size(0)

        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        train_acc = train_correct / max(train_total, 1)
        train_loss = train_loss / max(train_total, 1)
        history.append({
            "epoch": epoch + 1,
            "loss": round(train_loss, 4),
            "accuracy": round(train_acc, 4),
            "valLoss": round(val_loss, 4),
            "valAccuracy": round(val_acc, 4),
        })
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        print(
            f"epoch {epoch + 1}/{args.epochs} "
            f"loss={train_loss:.4f} acc={train_acc:.4f} val_loss={val_loss:.4f} val_acc={val_acc:.4f}",
            flush=True,
        )

    if best_state:
        model.load_state_dict(best_state)

    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = export_model(model, labels, args.size)
    category_to_output = {category: get_output_label(category, args.target) for category in source_categories}
    eval_report = build_eval_report(model, val_loader, labels, device, args.target)
    metadata = {
        "type": "quickdraw-torch-cnn-sketch-v1",
        "target": args.target,
        "imageSize": args.size,
        "labels": labels,
        "sourceCategories": source_categories,
        "categoryToOutput": category_to_output,
        "categoryToTool": build_category_to_tool(labels, args.target),
        "trainCount": len(train_labels),
        "validationCount": len(val_labels),
        "maxPerCategory": args.max_per_category,
        "validationPerCategory": args.validation_per_category,
        "epochs": args.epochs,
        "batchSize": args.batch_size,
        "augmentation": not args.no_augment,
        "cacheDir": str(cache_dir) if cache_dir else None,
        "network": get_network_name(args.architecture),
        "architecture": args.architecture,
        "bestValidationAccuracy": round(best_val_acc, 4),
        "mappedToolAccuracy": eval_report["mappedToolAccuracy"],
        "perCategoryAccuracy": eval_report["perCategoryAccuracy"],
        "confusionTop": eval_report["confusionTop"],
        "history": history,
    }
    (output_dir / "model.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf8")
    (output_dir / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf8")
    print(f"best validation accuracy={best_val_acc:.4f}", flush=True)
    print(f"wrote {output_dir.resolve()}", flush=True)


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in loader:
            x = x.to(device)
            y = y.to(device)
            logits = model(x)
            loss = criterion(logits, y)
            total_loss += float(loss.item()) * y.size(0)
            correct += int((logits.argmax(dim=1) == y).sum().item())
            total += y.size(0)
    return total_loss / max(total, 1), correct / max(total, 1)


def augment_batch(x):
    batch_size = x.size(0)
    device = x.device
    angles = (torch.rand(batch_size, device=device) * 24.0 - 12.0) * math.pi / 180.0
    scales = torch.rand(batch_size, device=device) * 0.24 + 0.88
    translate_x = torch.rand(batch_size, device=device) * 0.20 - 0.10
    translate_y = torch.rand(batch_size, device=device) * 0.20 - 0.10
    cos = torch.cos(angles) * scales
    sin = torch.sin(angles) * scales
    theta = torch.zeros(batch_size, 2, 3, device=device)
    theta[:, 0, 0] = cos
    theta[:, 0, 1] = -sin
    theta[:, 1, 0] = sin
    theta[:, 1, 1] = cos
    theta[:, 0, 2] = translate_x
    theta[:, 1, 2] = translate_y
    grid = F.affine_grid(theta, x.size(), align_corners=False)
    x = F.grid_sample(x, grid, mode="bilinear", padding_mode="zeros", align_corners=False)

    if random.random() < 0.85:
        x = x + torch.randn_like(x) * 0.018
    if random.random() < 0.45:
        keep = (torch.rand_like(x) > 0.018).float()
        x = x * keep
    return torch.clamp(x, 0.0, 1.0)


def build_eval_report(model, loader, labels, device, target):
    model.eval()
    class_count = len(labels)
    confusion = np.zeros((class_count, class_count), dtype=np.int64)
    with torch.no_grad():
        for x, y in loader:
            logits = model(x.to(device))
            predictions = logits.argmax(dim=1).cpu().numpy()
            actual = y.numpy()
            for actual_index, predicted_index in zip(actual, predictions):
                confusion[int(actual_index), int(predicted_index)] += 1

    per_category = {}
    confusion_top = {}
    mapped_correct = 0
    mapped_total = int(confusion.sum())
    for index, label in enumerate(labels):
        total = int(confusion[index].sum())
        correct = int(confusion[index, index])
        per_category[label] = round(correct / max(total, 1), 4)
        actual_tool = label if target == "tool" else CATEGORY_TO_TOOL.get(label, label)
        misses = []
        for predicted_index, count in enumerate(confusion[index]):
            predicted_tool = labels[predicted_index] if target == "tool" else CATEGORY_TO_TOOL.get(labels[predicted_index], labels[predicted_index])
            if actual_tool == predicted_tool:
                mapped_correct += int(count)
            if predicted_index == index or count == 0:
                continue
            misses.append({"label": labels[predicted_index], "count": int(count)})
        confusion_top[label] = sorted(misses, key=lambda item: item["count"], reverse=True)[:3]
    return {
        "mappedToolAccuracy": round(mapped_correct / max(mapped_total, 1), 4),
        "perCategoryAccuracy": per_category,
        "confusionTop": confusion_top,
    }


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


def read_or_build_cached_samples(file_path: Path, category: str, limit: int, size: int, cache_dir: Path | None, rebuild: bool):
    if cache_dir is None:
        return read_samples(file_path, limit, size)

    cache_dir.mkdir(parents=True, exist_ok=True)
    safe_category = category.replace(" ", "_")
    cache_file = cache_dir / f"{safe_category}_s{size}_n{limit}.npz"
    source_mtime = file_path.stat().st_mtime if file_path.exists() else 0

    if cache_file.exists() and not rebuild:
        with np.load(cache_file) as data:
            if int(data["size"]) == size and int(data["limit"]) == limit and float(data["source_mtime"]) == source_mtime:
                return data["images"].astype(np.float32)

    rows = read_samples(file_path, limit, size)
    images = np.asarray(rows, dtype=np.float32)
    np.savez_compressed(cache_file, images=images, size=size, limit=limit, source_mtime=source_mtime)
    return images


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
    padding = 4.0 if size >= 64 else 3.0
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
            draw_line(grid, ax, ay, bx, by, 1.1 if size >= 64 else 0.85)
    return grid


def draw_line(grid, ax, ay, bx, by, radius):
    size = grid.shape[0]
    steps = max(1, math.ceil(math.hypot(bx - ax, by - ay) * 2.4))
    for step in range(steps + 1):
        t = step / steps
        x = ax + (bx - ax) * t
        y = ay + (by - ay) * t
        stamp(grid, x, y, radius, size)


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


def export_model(model, labels, image_size):
    state = model.state_dict()
    if model.architecture == "resnet":
        return export_resnet_model(model, state, labels, image_size)

    conv_layers = {}
    for index in range(len(model.conv_layers)):
        conv_layers[f"conv{index + 1}"] = layer_payload(
            state[f"conv_layers.{index}.weight"],
            state[f"conv_layers.{index}.bias"],
        )
    return {
        "format": "quickdraw-torch-cnn-json-v1",
        "imageSize": image_size,
        "labels": labels,
        "layers": {
            **conv_layers,
            "dense1": layer_payload(state["fc1.weight"], state["fc1.bias"]),
            "dense2": layer_payload(state["fc2.weight"], state["fc2.bias"]),
        },
    }


def export_resnet_model(model, state, labels, image_size):
    blocks = []
    for index, block in enumerate(model.blocks):
        payload = {
            "conv1": layer_payload(state[f"blocks.{index}.conv1.weight"], state[f"blocks.{index}.conv1.bias"]),
            "conv2": layer_payload(state[f"blocks.{index}.conv2.weight"], state[f"blocks.{index}.conv2.bias"]),
            "stride": block.stride,
        }
        if block.shortcut is not None:
            payload["shortcut"] = layer_payload(state[f"blocks.{index}.shortcut.weight"], state[f"blocks.{index}.shortcut.bias"])
        blocks.append(payload)
    return {
        "format": "quickdraw-torch-resnet-json-v1",
        "imageSize": image_size,
        "labels": labels,
        "architecture": "resnet",
        "layers": {
            "stem": layer_payload(state["stem.weight"], state["stem.bias"]),
            "blocks": blocks,
            "dense1": layer_payload(state["fc1.weight"], state["fc1.bias"]),
            "dense2": layer_payload(state["fc2.weight"], state["fc2.bias"]),
        },
    }


def layer_payload(weight, bias):
    return {
        "shape": list(weight.shape),
        "weight": [round(float(value), 6) for value in weight.flatten().tolist()],
        "bias": [round(float(value), 6) for value in bias.flatten().tolist()],
    }


def stable_hash(text):
    value = 2166136261
    for char in text:
        value ^= ord(char)
        value = (value * 16777619) & 0xFFFFFFFF
    return value


def get_output_labels(source_categories, target):
    if target == "category":
        return source_categories
    labels = []
    for category in source_categories:
        label = get_output_label(category, target)
        if label not in labels:
            labels.append(label)
    return labels


def get_output_label(category, target):
    if target == "category":
        return category
    return CATEGORY_TO_TOOL.get(category, "grass")


def build_category_to_tool(labels, target):
    if target == "tool":
        return {label: label for label in labels}
    return {label: CATEGORY_TO_TOOL.get(label, "grass") for label in labels}


def get_network_name(architecture):
    if architecture == "standard":
        return "conv32-64-96-dense128"
    if architecture == "resnet":
        return "resnet32-64-128-192-gap-dense192"
    return "conv32-64-128-128-dense192"


if __name__ == "__main__":
    main()
