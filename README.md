# pipeguard

浏览器单页工作台（原生 ES 模块，零依赖）。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ ，改样例点运行看结果。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js

## 语义

- `pipe.run(items, options)` 逐条处理：缓冲按条大小累计，超过 `buffer_limit` 先背压
  （缓冲清零、记一次重试、再处理同一条）；成功推进水位；处理满 `crash_after` 条后崩溃截断。
  返回 `processed`、`watermark`、`buffer_peak`、`retries`、`values`、`state`。
- `pipe.resume(state, items, options)` 从落盘水位继续：水位之前的条不重复处理，
  `processed` 只列需重放的条，`watermark` 是恢复起点。
- `state.initial()` 给初始进度，`state.restore(state, options)` 给恢复后的进度
  （缓冲占用钳制在上限内）。
- 单条大小超过缓冲上限抛 `E_TOO_LARGE`，不静默丢弃也不无限背压。
