/**
 * Ensemble module exports for A3M Router.
 */

export { ParallelExecutor } from './parallelExecutor';
export type { Candidate, ParallelExecutorConfig, ModelResult, EnsembleResult, Provenance, EnsembleStrategy, ProviderCallInput, ProviderCallOutput } from './types';
export { calculateEnhancedShapley, applyCredit, summarize, createAccuracyFn, LoyaltyMatrix, HandicapCalculator } from './shapleyValue';
export { optionTextForModel } from '../routing/jev/jevRouter';