# A3M Router 🔀

**Intelligent LLMルーティング · 99.5%精度 · ML不要 · GPU不要 · 47プロバイダー**

マルチシグナル複雑度スコアを使用して99.5%のルーティング精度を実現し、機械学習なしで動作します。各クエリを最も安価な利用可能なモデルに自動ルートします。

## 対応中国LLM

| プロバイダー | モデル | 強み |
|------------|--------|------|
| **DeepSeek** | V3, Coder, Reasoner | コード+推論、オープンウェイト |
| **Kimi (Moonshot)** | Kimi-1.5 | 128Kコンテキスト、中国語最強 |
| **Zhipu AI (GLM)** | GLM-4, GLM-4V | 中国語+バイリンガル |
| **Qwen (Alibaba)** | Qwen2, Qwen2.5-Coder | 汎用+コード |
| **Yi (01.AI)** | Yi-1.5, 34B | バイリンガル+長コンテキスト |
| **MiniMax** | abab6.5 | 1Mコンテキスト |

## クイックスタート

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve
```

OpenAI SDKを`http://localhost:8787/v1`に向けるだけで、コード変更不要。

## オープンソース

- **GitHub**: https://github.com/Das-rebel/adaptive-memory-multi-model-router
- **npm**: https://www.npmjs.com/package/adaptive-memory-multi-model-router

MITライセンス。

## タグ

`LLMルーティング` `オープンソースLLM` `マルチプロバイダーAI` `APIコスト最適化` `DeepSeek` `Kimi` `Qwen`
