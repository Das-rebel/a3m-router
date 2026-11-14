/**
 * Personal Agent Router (Idea #2)
 *
 * "open sourced the small model we trained as a personal agent router" (vault).
 * Trains a small model on the user's own routing history so decisions improve
 * over time. Stores (prompt-features -> chosen provider) pairs in episodic
 * memory and fits a lightweight logistic model (or falls back to frequency
 * prior when data is sparse).
 */

export interface RoutingExample {
  promptFeatures: number[];
  chosenProvider: string;
  reward: number; // 0..1
}

export class PersonalAgentRouter {
  private examples: RoutingExample[] = [];
  private minExamples = 50;

  async record(example: RoutingExample) {
    this.examples.push(example);
  }

  async predict(promptFeatures: number[]): Promise<string | null> {
    const examples = this.examples;
    if (examples.length < this.minExamples) return null; // fall back to base router
    // Frequency prior weighted by reward (placeholder for learned model)
    const scores: Record<string, number> = {};
    for (const e of examples) {
      const sim = cosine(promptFeatures, e.promptFeatures);
      scores[e.chosenProvider] = (scores[e.chosenProvider] || 0) + sim * e.reward;
    }
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
}

function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export default PersonalAgentRouter;
