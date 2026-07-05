# A3M Router 🔀 — LLMルーティングベンチマーク#1 & 最安値メモリ付きルーター

**🏆 RouterArenaベンチマーク#1 (96.77%) · 最安値 $0.0768/1Kリクエスト · 47+プロバイダー並列実行**

[English](./README.md) | [中文](./README_zh.md) | [日本語](./README_ja.md)

## 主要メトリクス

| メトリクス | A3M Router | Sqwish | Azure (Microsoft) | GPT-5 (OpenAI) | RouteLLM (Berkeley) |
|------------|:----------:|:------:|:------------------:|:---------------:|:-------------------:|
| **ランキング** | **🏆 #1** | #2 | #3 | #4 | #5 |
| **スコア** | **96.77%** | 75.27 | 71.87 | 64.32 | 48.07 |
| **コスト** | **$0.0768** | $0.18 | $0.22 | $10.02 | $0.27 |

> RouterArena公式ベンチマークで最高スコアかつ最低コストを達成（独立評価パイプライン検証 arXiv:2510.00202）

## 独自機能：並列マルチLLM実行

従来のルーターは1つずつモデルを試します（シーケンシャルフォールバック）。A3Mは**複数プロバイダーを並列実行**し、信頼度スコアリングで最良の結果を選択します。

```
従来: モデルA ❌ → モデルB ❌ → モデルC ✅  (3倍レイテンシ)
A3M:  モデルA ║ モデルB ║ モデルC → スコアリングで最良を選択 ✅  (1倍レイテンシ)
```

## 対応中国LLM

| プロバイダー | モデル | 強み |
|------------|--------|------|
| **DeepSeek** | V3, Coder, Reasoner | コード+推論、オープンウェイト |
| **Kimi (Moonshot)** | Kimi-1.5 | 128Kコンテキスト、中国語最強 |
| **Zhipu AI (GLM)** | GLM-4, GLM-4V | 中国語+バイリンガル |
| **Qwen (Alibaba)** | Qwen2, Qwen2.5-Coder | 汎用+コード |
| **Yi (01.AI)** | Yi-1.5, 34B | バイリンガル+長コンテキスト |
| **MiniMax** | abab6.5 | 1Mコンテキスト |

## コア機能

- 🏆 **RouterArena #1** — 19ルーター中1位
- 🔀 **並列マルチLLM実行** — 複数プロバイダー同時実行、信頼度投票
- 💰 **最安値** — $0.0768/1Kリクエスト、#2より4倍安い
- 🧠 **メモリ付きルーティング** — エピソードック記憶でセッション越えコンテキスト保存
- 🔄 **セマンティックキャッシュ** — 30%+ヒット率、コスト節約
- 🛡️ **予算強制** — クエリごとコスト追跡、超過防止
- ⚡ **高速起動** — <100ms、19.5KB、ML依存なし
- 🌐 **47+プロバイダー** — OpenAI, Anthropic, DeepSeek, Groq, NVIDIA等

## クイックスタート

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router route "Pythonでソート関数を書いて"
```

```javascript
import { createRouter } from 'adaptive-memory-multi-model-router';

const router = createRouter({ /* APIキー自動検出 */ });
const result = await router.route('量子コンピューティングを説明して');
console.log(result.response);    // AI応答
console.log(result.provider);    // 使用プロバイダー
console.log(result.cost);        // 実際のコスト
```

## メモリ機能

```javascript
const router = createRouter({
  memory: { enabled: true }  // 会話コンテキスト自動保存
});

// 1回目の会話
await router.route('私の名前は太郎です');    // 記憶：ユーザー名＝太郎
// 2回目の会話
await router.route('私の名前は？');           // 応答：太郎です！
```

## ベンチマーク結果

| ルーター | スコア | コスト/1K | オープンソース |
|----------|:------:|:--------:|:------------:|
| **A3M Router** | **96.77%** | **$0.0768** | ✅ |
| Sqwish | 75.27 | $0.18 | ❌ |
| Azure-Model-Router | 71.87 | $0.22 | ❌ |
| GPT-5 | 64.32 | $10.02 | ❌ |
| RouteLLM | 48.07 | $0.27 | ✅ |

詳細 [BENCHMARK.md](./docs/BENCHMARK.md) · [RouterArena PR #144](https://github.com/RouteWorks/RouterArena/pull/144)

## リンク

- 📖 [ドキュメント](https://das-rebel.github.io/a3m-router/)
- 🏆 [ベンチマーク](https://das-rebel.github.io/a3m-router/benchmark)
- 🚀 [クイックスタート](https://das-rebel.github.io/a3m-router/quick-start)
- 🤖 [APIリファレンス](https://das-rebel.github.io/a3m-router/api)
- 💬 [ディスカッション](https://github.com/Das-rebel/a3m-router/discussions)

## ライセンス

MIT
