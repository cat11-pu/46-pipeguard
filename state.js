// state.js：进度状态（基线：不落盘、恢复从零开始）
export function initial() {
  return { watermark: 0, buffer: 0, retries: 0 };
}

export function restore(state, options) {
  return { watermark: 0, buffer: 0, retries: 0 };
}
