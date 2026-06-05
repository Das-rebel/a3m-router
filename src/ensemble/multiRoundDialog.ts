/**
 * Multi-Round Dialog Optimization
 * 
 * Tracks conversation context over multiple turns and optimizes routing
 * decisions based on accumulated dialogue history.
 * 
 * Key features:
 * - Conversation state management
 * - Topic tracking across turns
 * - Model performance history per topic
 * - Adaptive routing based on dialog state
 */

import { RouteDecision } from '../routing/advancedRouter';

export interface DialogTurn {
  turn: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: number;
  routingDecision?: RouteDecision;
}

export interface DialogState {
  conversationId: string;
  turns: DialogTurn[];
  topics: Set<string>;
  topicHistory: Map<string, number>;  // topic → number of mentions
  modelPerformance: Map<string, Map<string, number>>;  // model → topic → success score
  currentTopic: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: number;
  startedAt: number;
  lastTurnAt: number;
}

export interface MultiRoundConfig {
  /** Max turns to keep in conversation context */
  maxContextTurns: number;
  /** Topic similarity threshold */
  topicThreshold: number;
  /** Performance window size */
  performanceWindow: number;
  /** Enable adaptive complexity tracking */
  trackComplexity: boolean;
}

const DEFAULT_CONFIG: MultiRoundConfig = {
  maxContextTurns: 20,
  topicThreshold: 0.7,
  performanceWindow: 10,
  trackComplexity: true,
};

export class MultiRoundDialogOptimizer {
  private config: MultiRoundConfig;
  private dialogStates: Map<string, DialogState> = new Map();

  constructor(config: Partial<MultiRoundConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create or get existing dialog state
   */
  getDialogState(conversationId: string): DialogState {
    if (!this.dialogStates.has(conversationId)) {
      this.dialogStates.set(conversationId, this.createNewState(conversationId));
    }
    return this.dialogStates.get(conversationId)!;
  }

  /**
   * Create a fresh dialog state
   */
  private createNewState(conversationId: string): DialogState {
    return {
      conversationId,
      turns: [],
      topics: new Set(),
      topicHistory: new Map(),
      modelPerformance: new Map(),
      currentTopic: 'general',
      sentiment: 'neutral',
      complexity: 0,
      startedAt: Date.now(),
      lastTurnAt: Date.now(),
    };
  }

  /**
   * Add a turn to the conversation
   */
  addTurn(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    model?: string,
    routingDecision?: RouteDecision
  ): DialogState {
    const state = this.getDialogState(conversationId);
    
    const turn: DialogTurn = {
      turn: state.turns.length,
      role,
      content,
      model,
      timestamp: Date.now(),
      routingDecision,
    };
    
    state.turns.push(turn);
    state.lastTurnAt = Date.now();
    
    // Update topic tracking
    const topics = this.extractTopics(content);
    topics.forEach(topic => {
      state.topics.add(topic);
      const count = state.topicHistory.get(topic) || 0;
      state.topicHistory.set(topic, count + 1);
    });
    
    // Update current topic to most mentioned
    if (topics.length > 0) {
      state.currentTopic = this.getMostFrequentTopic(state.topicHistory);
    }
    
    // Update complexity
    if (this.config.trackComplexity) {
      state.complexity = this.calculateComplexity(content, state.turns);
    }
    
    // Update model performance if assistant turn with routing decision
    if (role === 'assistant' && model && routingDecision) {
      this.updateModelPerformance(state, model, content);
    }
    
    // Trim old turns if exceeding max
    if (state.turns.length > this.config.maxContextTurns) {
      state.turns = state.turns.slice(-this.config.maxContextTurns);
    }
    
    return state;
  }

  /**
   * Extract topics from content using keyword analysis
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lower = content.toLowerCase();
    
    // Topic keywords
    const topicPatterns: Record<string, string[]> = {
      'coding': ['code', 'programming', 'function', 'debug', 'syntax', 'api', 'software'],
      'data-science': ['data', 'analysis', 'ml', 'machine learning', 'model', 'training', 'dataset'],
      'math': ['equation', 'calculation', 'math', 'number', 'formula', 'algebra'],
      'science': ['experiment', 'hypothesis', 'research', 'physics', 'chemistry', 'biology'],
      'business': ['revenue', 'market', 'customer', 'sales', 'strategy', 'business'],
      'creative': ['story', 'creative', 'writing', 'art', 'design', 'poem'],
      'security': ['security', 'authentication', 'encryption', 'vulnerability', 'auth'],
      'devops': ['deploy', 'docker', 'kubernetes', 'ci/cd', 'infrastructure', 'cloud'],
    };
    
    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          topics.push(topic);
          break;
        }
      }
    }
    
    return topics.length > 0 ? topics : ['general'];
  }

  /**
   * Get most frequently mentioned topic
   */
  private getMostFrequentTopic(topicHistory: Map<string, number>): string {
    let maxCount = 0;
    let mostFrequent = 'general';
    
    for (const [topic, count] of topicHistory) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = topic;
      }
    }
    
    return mostFrequent;
  }

  /**
   * Calculate complexity based on content and history
   */
  private calculateComplexity(content: string, turns: DialogTurn[]): number {
    // Base complexity from content length
    let complexity = Math.min(1, content.length / 1000);
    
    // Increase for technical terms
    const technicalTerms = ['algorithm', 'architecture', 'optimization', 'performance', 'concurrent', 'distributed'];
    for (const term of technicalTerms) {
      if (content.toLowerCase().includes(term)) {
        complexity += 0.1;
      }
    }
    
    // Increase with conversation depth
    complexity += Math.min(0.3, turns.length * 0.02);
    
    return Math.min(1, complexity);
  }

  /**
   * Update model performance tracking for a topic
   */
  private updateModelPerformance(state: DialogState, model: string, response: string) {
    if (!state.modelPerformance.has(model)) {
      state.modelPerformance.set(model, new Map());
    }
    
    const modelScores = state.modelPerformance.get(model)!;
    const currentTopic = state.currentTopic;
    
    // Simple success scoring based on response length and quality indicators
    const qualityScore = this.scoreResponseQuality(response);
    const currentScore = modelScores.get(currentTopic) || 0;
    
    // Rolling average
    const newScore = (currentScore * (this.config.performanceWindow - 1) + qualityScore) / this.config.performanceWindow;
    modelScores.set(currentTopic, newScore);
  }

  /**
   * Score response quality (simple heuristic)
   */
  private scoreResponseQuality(response: string): number {
    let score = 0.5;  // Base score
    
    // Longer responses often indicate more thorough answers
    if (response.length > 200) score += 0.1;
    if (response.length > 500) score += 0.1;
    
    // Code blocks indicate technical content
    if (response.includes('```')) score += 0.1;
    
    // Lists and structured content
    if (response.includes('\n-')) score += 0.05;
    if (response.includes('\n1.')) score += 0.05;
    
    return Math.min(1, score);
  }

  /**
   * Get best model for current topic based on history
   */
  getBestModelForTopic(conversationId: string, availableModels: string[]): string | null {
    const state = this.getDialogState(conversationId);
    const currentTopic = state.currentTopic;
    
    let bestModel: string | null = null;
    let bestScore = -1;
    
    for (const model of availableModels) {
      const modelScores = state.modelPerformance.get(model);
      if (modelScores) {
        const topicScore = modelScores.get(currentTopic) || 0.5;
        if (topicScore > bestScore) {
          bestScore = topicScore;
          bestModel = model;
        }
      }
    }
    
    return bestModel;
  }

  /**
   * Build optimized context for next query
   */
  buildOptimizedContext(conversationId: string, newQuery: string): string {
    const state = this.getDialogState(conversationId);
    const contextParts: string[] = [];
    
    // Add conversation summary
    contextParts.push(`Topic: ${state.currentTopic}`);
    contextParts.push(`Complexity: ${(state.complexity * 100).toFixed(0)}%`);
    contextParts.push(`Turns: ${state.turns.length}`);
    
    // Add relevant recent turns (last 3-5)
    const recentTurns = state.turns.slice(-5);
    for (const turn of recentTurns) {
      const prefix = turn.role === 'user' ? 'Q' : 'A';
      const modelTag = turn.model ? `[${turn.model}]` : '';
      contextParts.push(`${prefix}${modelTag}: ${turn.content.slice(0, 200)}`);
    }
    
    // Add new query
    contextParts.push(`New query: ${newQuery}`);
    
    return contextParts.join('\n');
  }

  /**
   * Get routing hints based on dialog state
   */
  getRoutingHints(conversationId: string): Record<string, number> {
    const state = this.getDialogState(conversationId);
    
    return {
      complexity: state.complexity,
      topicAffinity: this.topicAffinityScore(state.currentTopic),
      depth: Math.min(1, state.turns.length / 20),
      sentiment: state.sentiment === 'negative' ? 0.8 : 0.5,
    };
  }

  /**
   * Calculate topic affinity for routing
   */
  private topicAffinityScore(topic: string): number {
    const topicScores: Record<string, number> = {
      'coding': 0.9,
      'security': 0.95,
      'devops': 0.85,
      'data-science': 0.8,
      'math': 0.7,
      'science': 0.75,
      'business': 0.6,
      'creative': 0.5,
      'general': 0.5,
    };
    
    return topicScores[topic] || 0.5;
  }

  /**
   * Clear dialog state
   */
  clearState(conversationId: string): void {
    this.dialogStates.delete(conversationId);
  }

  /**
   * Get dialog summary
   */
  getSummary(conversationId: string): {
    turns: number;
    topics: string[];
    currentTopic: string;
    complexity: number;
    duration: number;
    modelsUsed: string[];
  } {
    const state = this.getDialogState(conversationId);
    
    return {
      turns: state.turns.length,
      topics: [...state.topics],
      currentTopic: state.currentTopic,
      complexity: state.complexity,
      duration: Date.now() - state.startedAt,
      modelsUsed: [...state.modelPerformance.keys()],
    };
  }
}

// Export singleton instance
export const dialogOptimizer = new MultiRoundDialogOptimizer();

// Default export
export default dialogOptimizer;