"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCTSWorkflowOptimizer = exports.WorkflowNode = void 0;
const nanoid_1 = require("nanoid");
const DEFAULT_MCTS_CONFIG = {
    maxIterations: 50,
    explorationConstant: 1.414, // sqrt(2) for UCB1
    maxDepth: 5
};
class WorkflowNode {
    state;
    parent;
    children;
    untriedActions;
    constructor(state, parent = null) {
        this.state = state;
        this.parent = parent;
        this.children = new Map();
        this.untriedActions = [];
    }
    get averageReward() {
        return this.state.visits > 0 ? this.state.totalReward / this.state.visits : 0;
    }
    get isTerminal() {
        return this.state.subtasks.length === this.state.completed.length;
    }
    get isFullyExpanded() {
        return this.untriedActions.length === 0 && this.children.size > 0;
    }
}
exports.WorkflowNode = WorkflowNode;
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
class MCTSWorkflowOptimizer {
    config;
    root = null;
    agents;
    constructor(config = {}, agents = []) {
        this.config = { ...DEFAULT_MCTS_CONFIG, ...config };
        this.agents = agents;
    }
    /**
     * Set available agents
     */
    setAgents(agents) {
        this.agents = agents;
    }
    /**
     * Find best workflow strategy using MCTS
     */
    async findBestStrategy(subtasks, evaluateFn // Returns reward
    ) {
        const initialState = {
            stateId: (0, nanoid_1.nanoid)(8),
            subtasks,
            completed: [],
            assignments: {},
            totalReward: 0,
            visits: 0
        };
        this.root = new WorkflowNode(initialState);
        // Initialize untried actions
        if (this.root) {
            this.root.untriedActions = this.generateActions(subtasks);
        }
        // MCTS iterations
        for (let i = 0; i < this.config.maxIterations; i++) {
            await this.mctsIteration(evaluateFn);
        }
        // Return best strategy
        if (this.root && this.root.children.size > 0) {
            const bestChild = this.selectBestChild(this.root);
            return bestChild?.state.assignments || {};
        }
        else {
            return {};
        }
    }
    async mctsIteration(evaluateFn) {
        if (!this.root)
            return;
        let node = this.selectNode(this.root);
        if (!node)
            return;
        // Expansion
        if (node.untriedActions.length > 0) {
            const action = node.untriedActions.pop();
            node = this.expand(node, action);
        }
        // Simulation (simplified - evaluate async)
        if (node) {
            const reward = await evaluateFn(node.state.assignments);
            this.backpropagate(node, reward);
        }
    }
    selectNode(node) {
        while (node && !node.isTerminal) {
            if (node.isFullyExpanded) {
                node = this.ucb1Select(node);
            }
            else {
                return node;
            }
        }
        return node;
    }
    ucb1Select(node) {
        let bestChild = null;
        let bestUCB = -Infinity;
        for (const child of node.children.values()) {
            const ucb = this.ucb(child);
            if (ucb > bestUCB) {
                bestUCB = ucb;
                bestChild = child;
            }
        }
        return bestChild || node;
    }
    ucb(node) {
        if (node.state.visits === 0)
            return Infinity;
        const parentVisits = node.parent?.state.visits || 1;
        return node.averageReward +
            this.config.explorationConstant * Math.sqrt(Math.log(parentVisits) / node.state.visits);
    }
    expand(node, action) {
        const newAssignments = { ...node.state.assignments };
        if (action.type === "assign" && action.subtaskId && action.agentId) {
            newAssignments[action.subtaskId] = action.agentId;
        }
        const newState = {
            stateId: (0, nanoid_1.nanoid)(8),
            subtasks: node.state.subtasks,
            completed: [...node.state.completed],
            assignments: newAssignments,
            totalReward: 0,
            visits: 0
        };
        const child = new WorkflowNode(newState, node);
        node.children.set(newState.stateId, child);
        child.untriedActions = this.generateActions(newState.subtasks);
        return child;
    }
    generateActions(subtasks) {
        const actions = [];
        const availableAgents = this.agents.length > 0 ? this.agents : ["claude", "codex", "gemini"];
        subtasks.forEach(subtask => {
            availableAgents.forEach(agent => {
                actions.push({
                    type: "assign",
                    subtaskId: subtask,
                    agentId: agent
                });
            });
        });
        return actions;
    }
    selectBestChild(node) {
        let best = null;
        let bestReward = -Infinity;
        for (const child of node.children.values()) {
            if (child.averageReward > bestReward) {
                bestReward = child.averageReward;
                best = child;
            }
        }
        return best;
    }
    backpropagate(node, reward) {
        while (node) {
            node.state.visits++;
            node.state.totalReward += reward;
            node = node.parent;
        }
    }
}
exports.MCTSWorkflowOptimizer = MCTSWorkflowOptimizer;
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
//# sourceMappingURL=mctsWorkflow.js.map