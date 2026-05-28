# A3M Router 🔀 — LLM路由基准测试#1 & 最便宜的带记忆路由器

**🏆 RouterArena基准测试#1 (76.43分) · 最便宜 $0.047/1K请求 · 47家提供商并行执行**

[English](./README.md) | [日本語](./README_ja.md) | [中文](./README_zh.md)

## 核心指标

| 指标 | A3M Router | Sqwish | Azure (微软) | GPT-5 (OpenAI) | RouteLLM (伯克利) |
|------|:-----------:|:------:|:------------:|:--------------:|:-----------------:|
| **排名** | **🏆 #1** | #2 | #3 | #4 | #5 |
| **评分** | **76.43** | 75.27 | 71.87 | 64.32 | 48.07 |
| **成本** | **$0.047** | $0.18 | $0.22 | $10.02 | $0.27 |

> 在RouterArena官方基准测试中获得最高分和最低成本，由独立评估管道验证 (arXiv:2510.00202)

## 独特优势：并行多LLM执行

传统路由器逐个尝试模型（串行回退）。A3M **并行运行多个提供商**，用置信度评分选择最佳结果。

```
传统路由:  模型A ❌ → 模型B ❌ → 模型C ✅  (3次延迟)
A3M路由:  模型A ║ 模型B ║ 模型C → 评分选最佳 ✅  (1次延迟)
```

## 支持的中国LLM

| 提供商 | 模型 | 优势 |
|--------|------|------|
| **DeepSeek** | V3, Coder, Reasoner | 代码+推理，开源权重 |
| **Kimi (月之暗面)** | Kimi-1.5 | 128K上下文，中文最强 |
| **智谱AI (GLM)** | GLM-4, GLM-4V | 中文+双语 |
| **通义千问 (Qwen)** | Qwen2, Qwen2.5-Coder | 通用+代码 |
| **零一 (Yi)** | Yi-1.5, 34B | 双语+长上下文 |
| **MiniMax** | abab6.5 | 1M上下文 |

## 核心功能

- 🏆 **RouterArena #1** — 19个路由器中排名第一
- 🔀 **并行多LLM执行** — 同时运行多个提供商，置信度投票选最佳
- 💰 **最便宜** — $0.047/1K请求，比#2便宜4倍
- 🧠 **带记忆的路由** — 情景记忆跨会话保存，越用越懂你
- 🔄 **语义缓存** — 30%+命中率，节省成本
- 🛡️ **预算强制** — 每查询成本追踪，防止超支
- ⚡ **快速启动** — <100ms，19.5KB，零ML依赖
- 🌐 **47家提供商** — OpenAI, Anthropic, DeepSeek, Groq, NVIDIA等

## 快速开始

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router route "用Python写一个排序函数"
```

```javascript
import { createRouter } from 'adaptive-memory-multi-model-router';

const router = createRouter({ /* 自动检测API密钥 */ });
const result = await router.route('解释量子计算');
console.log(result.response);    // AI回复
console.log(result.provider);    // 使用的提供商
console.log(result.cost);        // 实际成本
```

## 记忆功能

```javascript
const router = createRouter({
  memory: { enabled: true }  // 自动保存对话上下文
});

// 第一次对话
await router.route('我叫小明');           // 记住：用户叫小明
// 第二次对话  
await router.route('我叫什么？');         // 回复：你叫小明！
```

## 基准测试结果

| 路由器 | 评分 | 成本/1K | 开源 |
|--------|:----:|:-------:|:----:|
| **A3M Router** | **76.43** | **$0.047** | ✅ |
| Sqwish | 75.27 | $0.18 | ❌ |
| Azure-Model-Router | 71.87 | $0.22 | ❌ |
| GPT-5 | 64.32 | $10.02 | ❌ |
| RouteLLM | 48.07 | $0.27 | ✅ |

详见 [BENCHMARK.md](./docs/BENCHMARK.md) · [RouterArena PR #113](https://github.com/RouteWorks/RouterArena/pull/113)

## 链接

- 📖 [文档](https://das-rebel.github.io/a3m-router/)
- 🏆 [基准测试](https://das-rebel.github.io/a3m-router/benchmark)
- 🚀 [快速开始](https://das-rebel.github.io/a3m-router/quick-start)
- 🤖 [API参考](https://das-rebel.github.io/a3m-router/api)
- 💬 [讨论区](https://github.com/Das-rebel/a3m-router/discussions)

## 许可

MIT
