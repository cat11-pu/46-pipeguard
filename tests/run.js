import assert from "node:assert";
import { run, resume } from "../pipe.js";
import { initial, restore } from "../state.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const items = [{ id: "i0", size: 2, value: 1 }, { id: "i1", size: 2, value: 2 }];

check("run returns processed list", () => {
  assert.ok(Array.isArray(run(items, { buffer_limit: 4 }).processed));
});

check("run reports buffer peak", () => {
  assert.strictEqual(typeof run(items, { buffer_limit: 4 }).buffer_peak, "number");
});

check("initial state starts at zero", () => {
  assert.strictEqual(initial().watermark, 0);
});

check("restore returns watermark", () => {
  assert.strictEqual(typeof restore({ watermark: 1 }, { buffer_limit: 4 }).watermark, "number");
});

check("render exposes replayed", () => {
  assert.ok(Array.isArray(render({ items: items, buffer_limit: 4, state: { watermark: 1 } }).replayed));
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
