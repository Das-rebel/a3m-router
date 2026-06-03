import { createA3MRouter } from './index';
interface RouteDecision {
    primary_model: string;
    tier: 'free' | 'cheap' | 'mid' | 'premium';
    estimated_cost: number;
    complexity: number;
    reasoning: string;
}
export type RouterDecision = RouteDecision;
export declare const A3MRouter: any;
export { createA3MRouter };
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
    constructor(router: InstanceType<typeof A3MRouter>);
    /**
     * Executes a query across multiple providers in parallel and resolves the best answer.
     */
    executeEnsemble(query: string, providers: string[], strategy?: EnsembleStrategy, weights?: Record<string, number>): Promise<EnsembleResponse>;
}
