/**
 * TMLPD HALO Orchestrator Reference
 *
 * Hierarchical Autonomous Logic-Oriented Orchestration
 *
 * Reference implementation - for full features see TMLPD v2.x
 *
 * Full TMLPD includes:
 * - 3-tier hierarchical planning
 * - TaskPlanner: Decompose with dependencies
 * - RoleAssigner: Specialized agent assignment
 * - ExecutionEngine: Parallel with verification
 * - 19.6% improvement on complex tasks
 */
export interface SubTask {
    id: string;
    description: string;
    dependencies: string[];
    estimatedComplexity: number;
}
export interface AgentAssignment {
    subtaskId: string;
    agentId: string;
    model: string;
    estimatedDuration: number;
}
export interface ExecutionResult {
    subtaskId: string;
    success: boolean;
    output: string;
    duration_ms: number;
}
export interface HALOConfig {
    maxConcurrent: number;
    optimizationTarget: "quality" | "cost" | "balanced";
    enableMCTS: boolean;
}
/**
 * HALO Orchestrator
 *
 * Hierarchical orchestration with 3 tiers:
 * 1. Plan: Decompose task into subtasks with dependencies
 * 2. Assign: Match subtasks to optimal agents
 * 3. Execute: Run in parallel with result verification
 */
export declare class HALOOrchestrator {
    private config;
    private memory;
    private mcts;
    constructor(config?: Partial<HALOConfig>);
    /**
     * Execute task with HALO orchestration
     */
    execute(taskDescription: string, executeFn: (subtask: SubTask, agentId: string) => Promise<ExecutionResult>): Promise<{
        success: boolean;
        results: ExecutionResult[];
        strategy: Record<string, string>;
        metadata: any;
    }>;
    /**
     * Decompose task into subtasks
     */
    decomposeTask(taskDescription: string): SubTask[];
    /**
     * Classify task type
     */
    classifyTask(description: string): string;
    /**
     * Quick agent assignment without MCTS
     */
    quickAssign(subtasks: SubTask[]): Record<string, string>;
    /**
     * Optimize assignment with MCTS
     */
    private optimizeWithMCTS;
    /**
     * Execute subtasks in parallel with concurrency limit
     */
    private executeParallel;
    /**
     * Get memory statistics
     */
    getMemoryStats(): {
        total_entries: number;
        indexed_keywords: number;
        success_rate: number;
        avg_duration_ms: number;
    };
}
/**
 * Reference to Full TMLPD HALO
 *
 * Full implementation in tmlpd-clean/src/orchestration/halo_orchestrator.py
 *
 * Features:
 * - NLP-based task decomposition
 * - Dependency graph resolution
 * - Agent capability matching
 * - Result verification and retry
 * - Multi-round refinement for low confidence
 */ 
//# sourceMappingURL=haloOrchestrator.d.ts.map