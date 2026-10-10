# 已确认资产与候选资产

状态说明：

- 候选：已找到文件，但尚未在本项目最终页面中直接验证。
- 已实现，待验证：已接入当前阶段页面，但还没有完成实际点击/拖动验收。
- 直接交互已通过：在最终页面中完成了真实操作并记录结果。
- 用户已确认：用户明确认可该资产在本项目中的结果。

| 资产 | 文件 | 用途 | 状态 |
|---|---|---|---|
| Three.js 本地模块 | `shared/vendor/three.module.js` | 三维渲染 | 候选副本 |
| Three.js 核心模块 | `shared/vendor/three.core.js` | 三维渲染依赖 | 候选副本 |
| 玻璃器材工厂 | `shared/equipment/approved-equipment-factory.js` | 玻璃材质、烧杯、火柴盒等参考 | 候选副本 |
| 火柴盒与火焰 | 资源库原项目 `approved-equipment-factory.js` | 后续实验一取火与火焰 | 候选，未接入 |
| 萌发种子 | 本项目 `experiment-oxygen/models/germinating-seed.js` | 实验一甲组材料；与煮熟种子同结构，以金黄色区分 | 已重新制作，待用户审核 |
| 煮熟种子 | 本项目 `experiment-oxygen/models/germinating-seed.js` | 实验一乙组材料；与萌发种子同结构，以深褐色区分 | 已重新制作，待用户审核 |
| 装种子的小烧杯 | 本项目 `experiment-oxygen/models/small-beaker.js` | 承装两组种子并拖到对应瓶口完成倾倒 | 已实现，浏览器预览通过，待用户交互审核 |
| 小长匙中的蜡烛 | 本项目 `experiment-oxygen/models/candle-spoon.js` | 深凹匙碗、竖直匙柄承托蜡烛；后续通过匙柄伸入广口瓶 | 已重新制作，待浏览器与用户审核 |
| 火柴盒与火柴 | 本项目 `experiment-oxygen/models/matchbox-reused.js` | 复制资源库已确认的火柴盒、抽屉、火柴头与火焰结构；源文件未修改 | 已接入，待用户直接审核 |
| 透明广口瓶 | 本项目 `experiment-oxygen/models/wide-mouth-bottle.js` | 实验一甲乙瓶 | 已重新制作，待浏览器审核 |
| 广口瓶瓶塞 | 本项目 `experiment-oxygen/models/wide-mouth-bottle.js` | 密封广口瓶；支持点击与拖拽开合 | 已实现，待用户审核 |
| 系列三分区实验台 | 本项目 `shared/bench/respiration-bench.js` | 三个实验的共用台面、分区、物位与右侧窗户 | 已实现，浏览器预览待用户审核 |
| 前方实验操作台 | 本项目 `shared/bench/respiration-bench.js` | 当前步骤操作；划分甲组、共用、乙组操作区 | 已实现，浏览器预览待用户审核 |
| 实验台参考布局 | `apps/无_archive-unused/开发文件/验证光合作用需要二氧化碳/bench-preview.js` | 台面、前挡板、支撑腿与正面略俯视构图的只读参考 | 只读参考，未修改源文件 |
| 昼夜窗户组件 | 本项目 `shared/bench/day-night-window.js` | 0—24 小时天空、太阳、月亮、星空与窗外光照 | 已实现，浏览器预览验证通过 |
| 双层保温瓶 | 本项目 `experiment-three-models/thermos-flask.js` | 实验三甲乙两组容器；明确内胆、外壳、瓶颈和二分之一装种范围 | 已实现并在最终页面自检 |
| 实验三种子床 | 本项目 `experiment-three-models/seed-bed.js` | 等量批量种子平铺至保温瓶有效容积二分之一 | 已实现并在最终页面自检 |
| 玻璃温度计 | 本项目 `experiment-three-models/thermometer.js` | 10—40 ℃刻度、温包和动态液柱 | 已实现并在最终页面自检 |
| 温度计密封塞 | 本项目 `experiment-three-models/perforated-stopper.js` | 温度计穿孔密封；从瓶口正上方向下插入 | 已实现并在最终页面自检 |
| 实验三正式页面 | 本项目 `experiment-energy.html`、`experiment-energy/experiment.js` | 器材转移、直接拖拽、15 秒计时、同步细节图、全屏和归位 | 已完成本地浏览器自检，待用户最终验收 |

规则：候选资产不得在报告中写成“已完成”或“已通过”。
