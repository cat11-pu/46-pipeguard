// state.js：进度状态的落盘与恢复
export function initial() {
  return { watermark: 0, buffer: 0, retries: 0 };
}

export function restore(state, options) {
  const saved = state || {};
  return {
    watermark: saved.watermark || 0,
    buffer: saved.buffer || 0,
    retries: saved.retries || 0
  };
}
