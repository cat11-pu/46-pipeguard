// state.js：进度状态（落盘水位、缓冲占用与重试计数）
function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function initial() {
  return { watermark: 0, buffer: 0, retries: 0 };
}

export function restore(state, options = {}) {
  const source = state ?? {};
  const limit = Number.isFinite(options.buffer_limit) ? options.buffer_limit : Infinity;
  return {
    watermark: numberOr(source.watermark, 0),
    buffer: Math.min(numberOr(source.buffer, 0), limit),
    retries: numberOr(source.retries, 0),
  };
}
