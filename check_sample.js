import fs from "node:fs";
import { run, resume } from "./pipe.js";
import { initial, restore } from "./state.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/pipeline.json", "utf8"));
const started = spec.state ? restore(spec.state, spec) : initial();
const rest = resume(started, spec.items, spec);
const result = run(spec.items, spec);
const view = render(spec);

emit("已处理的条 =", result.processed);
emit("水位 =", result.watermark);
emit("缓冲峰值 =", result.buffer_peak);
emit("重试次数 =", result.retries);
emit("恢复起点 =", rest.watermark);
emit("重启后重放的条 =", rest.processed);
emit("能不能续跑 =", spec.resumable);
emit("单条超过缓冲上限的错误码 =", spec.too_large_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "已处理的条": [
    "i0",
    "i1",
    "i2"
  ],
  "水位": 3,
  "缓冲峰值": 2,
  "重试次数": 2,
  "恢复起点": 2,
  "重启后重放的条": [
    "i2"
  ],
  "能不能续跑": true,
  "单条超过缓冲上限的错误码": "E_TOO_LARGE"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
