// app.js：渲染结果
import { run, resume } from "./pipe.js";
import { initial, restore } from "./state.js";

export function render(spec) {
  const started = spec.state ? restore(spec.state, spec) : initial();
  const rest = resume(started, spec.items, spec);
  const result = run(spec.items, spec);
  return { processed: result.processed, watermark: result.watermark,
           buffer_peak: result.buffer_peak, retries: result.retries,
           resumed_from: rest.watermark, replayed: rest.processed,
           values: result.values, state: result.state };
}
