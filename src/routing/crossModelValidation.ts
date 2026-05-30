import { getAvailableProviders } from '../providers/providerConfig';
import { getMetrics } from '../observability/metrics';

export interface ValidationResult {
  approved: boolean;
  selectedProvider: string;
  validatedProvider: string;
  reason: string;
  costOverhead: number;
}

export async function validateRouting(
  query: string,
  selectedProvider: string,
  selectedModel: string,
  options?: { validatorProvider?: string }
): Promise<ValidationResult> {
  const metrics = getMetrics();
  const providers = getAvailableProviders();
  const validatorId = options?.validatorProvider || pickValidator(selectedProvider, providers);

  const validationPrompt = `A developer asked: "${query.slice(0, 200)}"
The AI router selected: ${selectedProvider}/${selectedModel}
Was this the RIGHT choice? Answer YES or NO first, then explain in ONE sentence.`;

  try {
    const validatorProvider = providers[validatorId];
    if (!validatorProvider) {
      metrics.incrementCounter('a3m_validation_skipped', { reason: 'no_validator' as any });
      return { approved: true, selectedProvider, validatedProvider: 'none', reason: 'No validator available', costOverhead: 0 };
    }
    const startTime = Date.now();
    const response = await (validatorProvider as any).callProvider(selectedModel, validationPrompt, 50);
    const elapsed = (Date.now() - startTime) / 1000;
    const text = String(response?.content || response?.text || '').trim();
    const approved = text.startsWith('YES') || text.startsWith('yes');
    const reason = text.replace(/^(YES|NO)\s*\|?\s*/, '').trim() || text.slice(0, 100);
    metrics.incrementCounter('a3m_validation_total');
    if (approved) metrics.incrementCounter('a3m_validation_approved');
    else metrics.incrementCounter('a3m_validation_rejected');
    metrics.recordHistogram('a3m_validation_latency_seconds', elapsed);
    return { approved, selectedProvider, validatedProvider: validatorId, reason, costOverhead: 0.0001 };
  } catch {
    metrics.incrementCounter('a3m_validation_error');
    return { approved: true, selectedProvider, validatedProvider: 'error', reason: 'Validation failed', costOverhead: 0 };
  }
}

function pickValidator(selectedProvider: string, providers: Record<string, any>): string {
  const ids = Object.keys(providers).filter(id => id !== selectedProvider);
  if (ids.length === 0) return selectedProvider;
  return ids[0];
}
