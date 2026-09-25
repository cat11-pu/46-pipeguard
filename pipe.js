// pipe.js：管道推进（逐条处理、背压重试、崩溃截断、水位续跑）
const E_TOO_LARGE = "E_TOO_LARGE";

function tooLargeError(item, limit) {
  const error = new Error(`item ${item.id} size ${item.size} exceeds buffer limit ${limit}`);
  error.code = E_TOO_LARGE;
  return error;
}

// 从第 start 条开始逐条推进：缓冲累计条大小，超限先清零记一次重试再处理同一条；
// 处理满 crash_after 条（全程累计）后崩溃截断。单条超过上限直接抛 E_TOO_LARGE。
function pump(items, start, options, counters) {
  const limit = options.buffer_limit ?? Infinity;
  const crashAfter = options.crash_after ?? Infinity;
  let buffer = counters.buffer;
  let retries = counters.retries;
  let peak = counters.buffer;
  const processed = [];
  const values = [];
  let count = start;
  for (let index = start; index < items.length; index += 1) {
    const item = items[index];
    const size = item.size ?? 1;
    if (size > limit) {
      throw tooLargeError(item, limit);
    }
    if (buffer + size > limit) {
      buffer = 0;
      retries += 1;
    }
    buffer += size;
    if (buffer > peak) {
      peak = buffer;
    }
    processed.push(item.id);
    values.push(item.value);
    count += 1;
    if (count >= crashAfter) {
      break;
    }
  }
  return { processed, values, count, buffer, retries, peak };
}

export function run(items, options = {}) {
  const persisted = options.state ?? {};
  const outcome = pump(items, 0, options, {
    buffer: persisted.buffer ?? 0,
    retries: persisted.retries ?? 0,
  });
  return {
    processed: outcome.processed,
    watermark: outcome.count,
    buffer_peak: outcome.peak,
    retries: outcome.retries,
    values: outcome.values,
    state: { watermark: outcome.count, buffer: outcome.buffer, retries: outcome.retries },
  };
}

export function resume(state, items, options = {}) {
  const start = state && state.watermark ? state.watermark : 0;
  const outcome = pump(items, start, options, {
    buffer: state && state.buffer ? state.buffer : 0,
    retries: state && state.retries ? state.retries : 0,
  });
  return {
    processed: outcome.processed,
    watermark: start,
    buffer_peak: outcome.peak,
    retries: outcome.retries,
    values: outcome.values,
    state: { watermark: outcome.count, buffer: outcome.buffer, retries: outcome.retries },
  };
}
