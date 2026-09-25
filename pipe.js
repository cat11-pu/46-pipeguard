// pipe.js：管道推进（基线：一口气全处理、不记水位）
export function run(items, options) {
  return { processed: items.map((item) => item.id), watermark: items.length,
           buffer_peak: 0, retries: 0, values: items.map((item) => item.value), state: {} };
}

export function resume(state, items, options) {
  return { processed: [], watermark: 0, values: [] };
}
