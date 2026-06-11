import { rasterizeQuickDrawDrawing } from './quickdrawRasterizer.js';

let cnnPromise = null;

export function loadQuickDrawCnnModel(basePath = '/quickdraw-cnn') {
  if (!cnnPromise) {
    cnnPromise = Promise.all([
      fetch(`${basePath}/model.json`).then((response) => (response.ok ? response.json() : null)),
      fetch(`${basePath}/metadata.json`).then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([model, metadata]) => {
        if (!model?.layers || !metadata?.labels?.length) return null;
        return prepareModel(model, metadata);
      })
      .catch(() => null);
  }
  return cnnPromise;
}

export function classifyWithQuickDrawCnn(drawing, bundle) {
  if (!bundle?.layers || !bundle?.metadata?.labels?.length) return null;
  const size = bundle.metadata.imageSize || bundle.imageSize || 32;
  const raster = rasterizeQuickDrawDrawing(drawing, size);
  if (!raster) return null;

  const logits = runCnn(raster, bundle);
  const probs = softmax(logits);
  const ranked = probs
    .map((confidence, index) => ({
      category: bundle.metadata.labels[index],
      toolId: bundle.metadata.categoryToTool?.[bundle.metadata.labels[index]],
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    ...ranked[0],
    alternatives: ranked.slice(0, 5),
    modelType: bundle.metadata.type || 'quickdraw-cnn',
  };
}

function prepareModel(model, metadata) {
  const layers = {};
  for (const [name, layer] of Object.entries(model.layers)) {
    if (name === 'blocks' && Array.isArray(layer)) {
      layers.blocks = layer.map((block) => ({
        stride: block.stride || 1,
        conv1: prepareWeightLayer(block.conv1),
        conv2: prepareWeightLayer(block.conv2),
        shortcut: block.shortcut ? prepareWeightLayer(block.shortcut) : null,
      }));
      continue;
    }
    layers[name] = prepareWeightLayer(layer);
  }
  return {
    imageSize: model.imageSize || metadata.imageSize || 32,
    labels: model.labels || metadata.labels,
    layers,
    metadata,
  };
}

function prepareWeightLayer(layer) {
  return {
    shape: layer.shape,
    weight: new Float32Array(layer.weight),
    bias: new Float32Array(layer.bias),
  };
}

function runCnn(raster, bundle) {
  const size = bundle.imageSize || 32;
  let tensor = {
    data: raster,
    channels: 1,
    height: size,
    width: size,
  };
  if (bundle.metadata?.architecture === 'resnet' || bundle.layers.blocks) {
    return runResNet(tensor, bundle);
  }
  for (const layerName of getConvLayerNames(bundle.layers)) {
    tensor = maxPool2x2(relu(conv2dSame(tensor, bundle.layers[layerName])));
  }
  const flat = tensor.data;
  const hidden = reluVector(dense(flat, bundle.layers.dense1));
  return dense(hidden, bundle.layers.dense2);
}

function runResNet(tensor, bundle) {
  tensor = relu(conv2dSame(tensor, bundle.layers.stem));
  for (const block of bundle.layers.blocks || []) {
    tensor = residualBlock(tensor, block);
  }
  const pooled = globalAveragePool(tensor);
  const hidden = reluVector(dense(pooled, bundle.layers.dense1));
  return dense(hidden, bundle.layers.dense2);
}

function residualBlock(input, block) {
  let residual = input;
  let out = relu(conv2dSame(input, block.conv1, block.stride || 1));
  out = conv2dSame(out, block.conv2);
  if (block.shortcut) {
    residual = conv2dSame(input, block.shortcut, block.stride || 1);
  }
  const data = new Float32Array(out.data.length);
  for (let index = 0; index < data.length; index += 1) {
    const value = out.data[index] + residual.data[index];
    data[index] = value > 0 ? value : 0;
  }
  return {
    data,
    channels: out.channels,
    height: out.height,
    width: out.width,
  };
}

function getConvLayerNames(layers) {
  return Object.keys(layers)
    .filter((name) => /^conv\d+$/.test(name))
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
}

function conv2dSame(input, layer, stride = 1) {
  const [outChannels, inChannels, kernelHeight, kernelWidth] = layer.shape;
  const outHeight = Math.ceil(input.height / stride);
  const outWidth = Math.ceil(input.width / stride);
  const output = new Float32Array(outChannels * outHeight * outWidth);
  const padY = Math.floor(kernelHeight / 2);
  const padX = Math.floor(kernelWidth / 2);

  for (let oc = 0; oc < outChannels; oc += 1) {
    const outChannelOffset = oc * outHeight * outWidth;
    for (let y = 0; y < outHeight; y += 1) {
      for (let x = 0; x < outWidth; x += 1) {
        let sum = layer.bias[oc] || 0;
        const centerY = y * stride;
        const centerX = x * stride;
        for (let ic = 0; ic < inChannels; ic += 1) {
          const inChannelOffset = ic * input.height * input.width;
          for (let ky = 0; ky < kernelHeight; ky += 1) {
            const iy = centerY + ky - padY;
            if (iy < 0 || iy >= input.height) continue;
            for (let kx = 0; kx < kernelWidth; kx += 1) {
              const ix = centerX + kx - padX;
              if (ix < 0 || ix >= input.width) continue;
              const weightIndex = (((oc * inChannels + ic) * kernelHeight + ky) * kernelWidth) + kx;
              sum += input.data[inChannelOffset + iy * input.width + ix] * layer.weight[weightIndex];
            }
          }
        }
        output[outChannelOffset + y * outWidth + x] = sum;
      }
    }
  }

  return {
    data: output,
    channels: outChannels,
    height: outHeight,
    width: outWidth,
  };
}

function maxPool2x2(input) {
  const outHeight = Math.floor(input.height / 2);
  const outWidth = Math.floor(input.width / 2);
  const output = new Float32Array(input.channels * outHeight * outWidth);
  for (let channel = 0; channel < input.channels; channel += 1) {
    const inChannelOffset = channel * input.height * input.width;
    const outChannelOffset = channel * outHeight * outWidth;
    for (let y = 0; y < outHeight; y += 1) {
      for (let x = 0; x < outWidth; x += 1) {
        const baseY = y * 2;
        const baseX = x * 2;
        let value = -Infinity;
        for (let yy = 0; yy < 2; yy += 1) {
          for (let xx = 0; xx < 2; xx += 1) {
            const sample = input.data[inChannelOffset + (baseY + yy) * input.width + baseX + xx];
            if (sample > value) value = sample;
          }
        }
        output[outChannelOffset + y * outWidth + x] = value;
      }
    }
  }
  return {
    data: output,
    channels: input.channels,
    height: outHeight,
    width: outWidth,
  };
}

function dense(input, layer) {
  const [outUnits, inUnits] = layer.shape;
  const output = new Float32Array(outUnits);
  for (let out = 0; out < outUnits; out += 1) {
    let sum = layer.bias[out] || 0;
    const offset = out * inUnits;
    for (let index = 0; index < inUnits; index += 1) {
      sum += input[index] * layer.weight[offset + index];
    }
    output[out] = sum;
  }
  return output;
}

function globalAveragePool(input) {
  const output = new Float32Array(input.channels);
  const area = input.height * input.width || 1;
  for (let channel = 0; channel < input.channels; channel += 1) {
    const offset = channel * input.height * input.width;
    let sum = 0;
    for (let index = 0; index < area; index += 1) sum += input.data[offset + index];
    output[channel] = sum / area;
  }
  return output;
}

function relu(tensor) {
  for (let index = 0; index < tensor.data.length; index += 1) {
    if (tensor.data[index] < 0) tensor.data[index] = 0;
  }
  return tensor;
}

function reluVector(vector) {
  for (let index = 0; index < vector.length; index += 1) {
    if (vector[index] < 0) vector[index] = 0;
  }
  return vector;
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exps = Array.from(logits, (value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0) || 1;
  return exps.map((value) => value / sum);
}
