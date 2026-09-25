// pipe.js：逐条推进的管道。
// 缓冲按条大小累计：加上当前条会超过上限时先背压（缓冲清零、记一次重试、再处理同一条）；
// 单条成功就推进水位；处理到第 crashAfter 条时崩溃截断，此时仍在缓冲里、尚未随冲刷
// 落盘的条会丢失，重启后必须重放（各记一次重试），已落盘的条不得重复处理。
function tooLargeError(item, options) {
  const code = (options && options.too_large_code) || "E_TOO_LARGE";
  const error = new Error(
    "条 " + item.id + " 大小 " + item.size + " 超过缓冲上限 " + options.buffer_limit
  );
  error.code = code;
  return error;
}

export function run(items, options) {
  const limit = options.buffer_limit;
  const crashAfter = options.crash_after;

  let buffer = 0;            // 当前缓冲占用
  let watermark = 0;         // 已成功推进的水位（内存进度）
  let retries = 0;           // 背压/重放累计重试次数
  let peak = 0;              // 缓冲占用峰值
  let buffered = 0;          // 自上次冲刷落盘以来仍留在缓冲里的条数
  const processed = [];
  const values = [];
  let checkpoint = { watermark: 0, buffer: 0, retries: 0 };
  let crashed = false;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    // 单条就超过上限：直接报错，不能静默丢弃，也不能靠无限背压拖住管道。
    if (item.size > limit) {
      throw tooLargeError(item, options);
    }

    // 放入当前条会超限：先背压，把缓冲冲刷下游、清零，记一次重试，再处理同一条。
    if (buffer + item.size > limit) {
      buffer = 0;
      buffered = 0;
      retries += 1;
      checkpoint = { watermark, buffer: 0, retries };
    }

    buffer += item.size;
    buffered += 1;
    if (buffer > peak) { peak = buffer; }
    processed.push(item.id);
    values.push(item.value);
    watermark += 1;

    // 崩在第 crashAfter 条之后：截断，缓冲里未落盘的条随断电丢失。
    if (crashAfter != null && watermark >= crashAfter) {
      crashed = true;
      break;
    }
  }

  let durable;
  if (crashed) {
    // 丢失的缓冲条重启后各重放一次，记为重试；落盘状态停在最后一次冲刷边界。
    retries += buffered;
    durable = { watermark: checkpoint.watermark, buffer: 0, retries: checkpoint.retries };
  } else {
    // 正常收尾：冲刷剩余缓冲，全部进度落盘。
    durable = { watermark, buffer: 0, retries };
  }

  return {
    processed,
    watermark,
    buffer_peak: peak,
    retries,
    values,
    state: durable
  };
}

export function resume(state, items, options) {
  const from = (state && state.watermark) || 0;
  if (options && options.resumable === false) {
    return { processed: [], watermark: from, values: [], retries: state && state.retries || 0 };
  }

  // 水位之前的条已落盘，绝不重放；只需重放水位之后、崩溃点之前“处理过但没落下”的条。
  const end = options && options.crash_after != null ? options.crash_after : items.length;
  const candidates = items.slice(from, end);

  const limit = options.buffer_limit;
  let buffer = (state && state.buffer) || 0;
  let retries = (state && state.retries) || 0;
  let peak = buffer;
  const replayed = [];
  const values = [];

  for (const item of candidates) {
    if (item.size > limit) {
      throw tooLargeError(item, options);
    }
    if (buffer + item.size > limit) {
      buffer = 0;
      retries += 1;
    }
    buffer += item.size;
    if (buffer > peak) { peak = buffer; }
    replayed.push(item.id);
    values.push(item.value);
  }

  // 返回的 watermark 是本次恢复的起点；replayed 只列真正需要重放的条。
  return {
    processed: replayed,
    watermark: from,
    values,
    retries,
    buffer_peak: peak,
    state: { watermark: from, buffer: 0, retries }
  };
}
