# A3M Router 🔀

**智能LLM路由 · 99.5%准确率 · 零ML · 零GPU · 47家提供商**

开源LLM路由代理，使用多信号复杂度评分实现99.5%路由准确率，无需机器学习。自动将每个查询路由到最便宜的可用模型，支持47家提供商。

[English](./README.md) | [日本語](./README_ja.md)

## 核心指标

| 指标 | A3M Router | RouteLLM |
|------|:-----------:|:--------:|
| 路由准确率 | **99.5%** | ~85% |
| 包大小 | **19.5KB** | ~1.5GB |
| 启动时间 | **<100ms** | ~3s |
| GPU需求 | **无** | 需要 |
| 提供商数量 | **47** | 2 |

## 支持的中国LLM

| 提供商 | 模型 | 优势 |
|--------|------|------|
| **DeepSeek** | V3, Coder, Reasoner | 代码+推理，开源权重 |
| **Kimi (Moonshot)** | Kimi-1.5 | 128K上下文，中文最好 |
| **智谱AI (GLM)** | GLM-4, GLM-4V | 中文+双语 |
| **通义千问 (Qwen)** | Qwen2, Qwen2.5-Coder | 通用+代码 |
| **零一 (Yi)** | Yi-1.5, 34B | 双语+长上下文 |
| **MiniMax** | abab6.5 | 1M上下文 |

## 快速开始

```bash
npm install adaptive-memory-multi-model-router   # Node.js
pip install a3m-router                            # Python

npx a3m-router serve                            # 启动代理
```

然后将任何OpenAI SDK指向 `http://localhost:8787/v1`，零代码修改。

## 成本对比

| 月查询量 | 纯GPT-4o | A3M Router | 节省 |
|:--------:|:---------:|:----------:|:----:|
| 10K | $34 | $12 | $22 |
| 100K | $341 | $124 | $218 |
| 1M | $3,411 | $1,236 | $2,175 |

## 开源地址

- **GitHub**: https://github.com/Das-rebel/adaptive-memory-multi-model-router
- **npm**: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- **文档**: https://das-rebel.github.io/adaptive-memory-multi-model-router/

MIT许可证，无需账号，纯本地部署。

## 标签

`LLM路由` `开源LLM` `多提供商AI` `API成本优化` `DeepSeek` `Kimi` `Qwen` `智谱AI` `LLM网关` `AI代理`
