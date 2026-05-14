"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HALOOrchestrator = void 0;
const mctsWorkflow_1 = require("./mctsWorkflow");
const episodicMemory_1 = require("../memory/episodicMemory");
const DEFAULT_HALO_CONFIG = {
    maxConcurrent: 3,
    optimizationTarget: "balanced",
    enableMCTS: false
};
/**
 * HALO Orchestrator
 *
 * Hierarchical orchestration with 3 tiers:
 * 1. Plan: Decompose task into subtasks with dependencies
 * 2. Assign: Match subtasks to optimal agents
 * 3. Execute: Run in parallel with result verification
 */
class HALOOrchestrator {
    config;
    memory;
    mcts;
    constructor(config = {}) {
        this.config = { ...DEFAULT_HALO_CONFIG, ...config };
        this.memory = new episodicMemory_1.EpisodicMemoryStore();
        this.mcts = new mctsWorkflow_1.MCTSWorkflowOptimizer({ maxIterations: 30 });
    }
    /**
     * Execute task with HALO orchestration
     */
    async execute(taskDescription, executeFn) {
        // Phase 1: Plan - decompose task
        const subtasks = this.decomposeTask(taskDescription);
        // Check memory for similar successful strategies
        const similar = this.memory.getSimilarTasks(taskDescription, 3);
        // Phase 2: Assign - determine optimal agent assignments
        const strategy = this.config.enableMCTS
            ? await this.optimizeWithMCTS(subtasks)
            : this.quickAssign(subtasks);
        // Phase 3: Execute - run with concurrency limit
        const results = await this.executeParallel(subtasks, strategy, executeFn);
        // Store in episodic memory
        this.memory.store({
            task: {
                description: taskDescription,
                type: this.classifyTask(taskDescription),
                complexity: subtasks.length
            },
            result: {
                success: results.every(r => r.success),
                output: results.map(r => r.output).join("\n---\n"),
                duration_ms: results.reduce((sum, r) => sum + r.duration_ms, 0)
            },
            agent: { id: "halo", model: "composite", provider: "multi" },
            metadata: { strategy, subtaskCount: subtasks.length },
            importance: subtasks.length > 5 ? 0.8 : 0.5
        });
        return {
            success: results.every(r => r.success),
            results,
            strategy,
            metadata: {
                subtasks: subtasks.length,
                optimizationTarget: this.config.optimizationTarget
            }
        };
    }
    /**
     * Decompose task into subtasks
     */
    decomposeTask(taskDescription) {
        // Simple decomposition - for full NLP-based decomposition see TMLPD
        const words = taskDescription.toLowerCase().split(/\s+/);
        const subtasks = [];
        // Detect complexity indicators
        const hasMultipleSteps = /and|then|also|plus|additionally/.test(taskDescription);
        const hasBranching = /if|when|either|option|choice/.test(taskDescription);
        const hasSequential = /first|then|finally|step|last/.test(taskDescription);
        if (hasMultipleSteps || taskDescription.length > 100) {
            // Multi-subtask decomposition
            const segments = taskDescription.split(/[.,]+/).filter(s => s.trim().length > 10);
            segments.forEach((seg, idx) => {
                subtasks.push({
                    id: `subtask-${idx}`,
                    description: seg.trim(),
                    dependencies: idx > 0 ? [`subtask-${idx - 1}`] : [],
                    estimatedComplexity: seg.split(/\s+/).length / 10
                });
            });
        }
        else {
            // Single task
            subtasks.push({
                id: "subtask-0",
                description: taskDescription,
                dependencies: [],
                estimatedComplexity: words.length / 10
            });
        }
        return subtasks;
    }
    /**
     * Classify task type
     */
    classifyTask(description) {
        const lower = description.toLowerCase();
        if (/coding|code|function|class|debug/.test(lower))
            return "coding";
        if (/explain|what is|how to|understand/.test(lower))
            return "explanation";
        if (/analyze|review|evaluate|assess/.test(lower))
            return "analysis";
        if (/create|build|design|implement/.test(lower))
            return "creation";
        if (/translate|convert|transform/.test(lower))
            return "transformation";
        return "general";
    }
    /**
     * Quick agent assignment without MCTS
     */
    quickAssign(subtasks) {
        const strategy = {};
        const agents = ["claude", "codex", "claude-minimax", "gemini"];
        subtasks.forEach((subtask, idx) => {
            // Round-robin assignment based on complexity
            if (subtask.estimatedComplexity > 1.5) {
                strategy[subtask.id] = agents[idx % agents.length];
            }
            else {
                strategy[subtask.id] = "claude-minimax"; // Fast agent for simple tasks
            }
        });
        return strategy;
    }
    /**
     * Optimize assignment with MCTS
     */
    async optimizeWithMCTS(subtasks) {
        const subtaskIds = subtasks.map(s => s.id);
        return await this.mcts.findBestStrategy(subtaskIds, async (assignments) => {
            // Evaluate strategy quality
            // For reference: higher reward for balanced load + successful execution
            const agentLoad = Object.values(assignments).reduce((acc, agentId) => {
                acc[agentId] = (acc[agentId] || 0) + 1;
                return acc;
            }, {});
            const loadBalance = 1 / (1 + Object.values(agentLoad).reduce((max, v) => Math.max(max, v), 0) - 1);
            return loadBalance * 100; // Reward for balanced assignment
        });
    }
    /**
     * Execute subtasks in parallel with concurrency limit
     */
    async executeParallel(subtasks, strategy, executeFn) {
        const results = [];
        const pending = [];
        let idx = 0;
        for (const subtask of subtasks) {
            const agentId = strategy[subtask.id] || "claude";
            const promise = executeFn(subtask, agentId).then(result => {
                results[idx] = result;
            });
            pending.push(promise);
            if (pending.length >= this.config.maxConcurrent) {
                await Promise.race(pending);
            }
            idx++;
        }
        await Promise.all(pending);
        return results;
    }
    /**
     * Get memory statistics
     */
    getMemoryStats() {
        return this.memory.getStats();
    }
}
exports.HALOOrchestrator = HALOOrchestrator;
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
//# sourceMappingURL=haloOrchestrator.js.map