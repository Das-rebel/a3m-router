/**
 * TMLPD MCTS Workflow Search
 *
 * Monte Carlo Tree Search for workflow optimization.
 * Reference implementation - for full features see TMLPD v2.x
 *
 * Full TMLPD includes:
 * - UCB1 selection policy
 * - Exploration vs exploitation balancing
 * - Workflow state tree building
 * - Strategy learning from execution outcomes
 */
export interface WorkflowState {
    stateId: string;
    subtasks: string[];
    completed: string[];
    assignments: Record<string, string>;
    totalReward: number;
    visits: number;
}
export interface WorkflowAction {
    type: "assign" | "execute" | "parallelize";
    subtaskId?: string;
    agentId?: string;
}
export interface MCTSConfig {
    maxIterations: number;
    explorationConstant: number;
    maxDepth: number;
}
export declare class WorkflowNode {
    state: WorkflowState;
    parent: WorkflowNode | null;
    children: Map<string, WorkflowNode>;
    untriedActions: WorkflowAction[];
    constructor(state: WorkflowState, parent?: WorkflowNode | null);
    get averageReward(): number;
    get isTerminal(): boolean;
    get isFullyExpanded(): boolean;
}
/**
 * MCTS Workflow Optimizer
 *
 * Uses Monte Carlo Tree Search to find optimal workflow strategies.
 *
 * @example
 * ```typescript
 * const optimizer = new MCTSWorkflowOptimizer();
 * const bestStrategy = optimizer.findBestStrategy(task);
 * ```
 */
export declare class MCTSWorkflowOptimizer {
    private config;
    private root;
    private agents;
    constructor(config?: Partial<MCTSConfig>, agents?: string[]);
    /**
     * Set available agents
     */
    setAgents(agents: string[]): void;
    /**
     * Find best workflow strategy using MCTS
     */
    findBestStrategy(subtasks: string[], evaluateFn: (strategy: Record<string, string>) => Promise<number>): Promise<Record<string, string>>;
    private mctsIteration;
    private selectNode;
    private ucb1Select;
    private ucb;
    private expand;
    private generateActions;
    private selectBestChild;
    private backpropagate;
}
/**
 * Reference to Full TMLPD MCTS
 *
 * Full implementation in tmlpd-clean/src/orchestration/mcts_workflow.py
 *
 * Features:
 * - Full UCB1 with proper exploration constant
 * - Deterministic rollout simulation
 * - Strategy caching with performance tracking
 * - Adaptive depth based on task complexity
 */ 
//# sourceMappingURL=mctsWorkflow.d.ts.map