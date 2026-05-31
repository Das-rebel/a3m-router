import { A3MRouter } from './index';
export type EnsembleStrategy = 'majority' | 'weighted' | 'conservative';
export interface EnsembleResponse {
    finalAnswer: string;
    confidence: number;
    isUncertain: boolean;
    winner: string;
    allResults: Record<string, {
        answer: string;
        score: number;
    }>;
    reasoning: string;
}
export declare class EnsembleOrchestrator {
    private router;
    constructor(router: A3MRouter);
    /**
     * Executes a query across multiple providers in parallel and resolves the best answer.
     */
    executeEnsemble(query: string, providers: string[], strategy?: EnsembleStrategy, weights?: Record<string, number>): Promise<EnsembleResponse>;
}
