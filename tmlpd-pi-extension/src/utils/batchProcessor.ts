/**
 * TMLPD Batch Processing Utilities
 * 
 * Queue and process multiple prompts with:
 * - Concurrency control
 * - Priority scheduling
 * - Progress callbacks
 * - Rate limiting
 */

import { nanoid } from "nanoid";

export interface BatchItem {
  id: string;
  prompt: string;
  model?: string;
  priority: "high" | "normal" | "low";
  callback?: (result: BatchResult) => void;
  metadata?: Record<string, any>;
}

export interface BatchResult {
  id: string;
  success: boolean;
  content?: string;
  error?: string;
  model: string;
  cost: number;
  duration_ms: number;
  cached: boolean;
}

export interface BatchOptions {
  concurrency?: number;      // Max parallel executions
  model?: string;            // Default model for all
  stop_on_error?: boolean;   // Stop batch on first error
  rate_limit?: {
    requests_per_minute?: number;
    tokens_per_minute?: number;
  };
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
  total_cost: number;
}

export type ProgressCallback = (progress: BatchProgress, result?: BatchResult) => void;

export class BatchProcessor {
  private queue: BatchItem[] = [];
  private results: BatchResult[] = [];
  private options: Required<BatchOptions>;
  private executing: Set<string> = new Set();
  private progressCallbacks: ProgressCallback[] = [];
  
  constructor(options: BatchOptions = {}) {
    this.options = {
      concurrency: options.concurrency || 5,
      model: options.model || "gpt-4o",
      stop_on_error: options.stop_on_error || false,
      rate_limit: options.rate_limit || {}
    };
  }
  
  /**
   * Add item to batch queue.
   */
  add(item: Omit<BatchItem, "id">): string {
    const id = nanoid(8);
    this.queue.push({
      ...item,
      id,
      priority: item.priority || "normal"
    });
    return id;
  }
  
  /**
   * Add multiple items.
   */
  addBatch(items: Array<Omit<BatchItem, "id">>): string[] {
    return items.map(item => this.add(item));
  }
  
  /**
   * Register progress callback.
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }
  
  /**
   * Get current progress.
   */
  getProgress(): BatchProgress {
    return {
      total: this.results.length + this.queue.length + this.executing.size,
      completed: this.results.filter(r => r.success).length,
      failed: this.results.filter(r => !r.success).length,
      in_progress: this.executing.size,
      total_cost: this.results.reduce((sum, r) => sum + r.cost, 0)
    };
  }
  
  /**
   * Execute batch with concurrency control.
   */
  async execute(
    executor: (item: BatchItem) => Promise<BatchResult>
  ): Promise<BatchResult[]> {
    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const total = this.queue.length;
    let index = 0;
    
    // Process with concurrency limit
    while (index < this.queue.length || this.executing.size > 0) {
      // Launch up to concurrency limit
      while (index < this.queue.length && this.executing.size < this.options.concurrency) {
        const item = this.queue[index++];
        this.executing.add(item.id);
        
        // Execute with promise tracking
        executor(item).then(result => {
          this.results.push(result);
          this.executing.delete(item.id);
          
          // Notify progress
          const progress = this.getProgress();
          for (const cb of this.progressCallbacks) {
            cb(progress, result);
          }
        }).catch(error => {
          const result: BatchResult = {
            id: item.id,
            success: false,
            error: error.message,
            model: item.model || this.options.model,
            cost: 0,
            duration_ms: 0,
            cached: false
          };
          this.results.push(result);
          this.executing.delete(item.id);
          
          const progress = this.getProgress();
          for (const cb of this.progressCallbacks) {
            cb(progress, result);
          }
          
          // Check stop_on_error
          if (this.options.stop_on_error) {
            // Cancel remaining items
            this.queue = [];
          }
        });
        
        // Rate limiting: wait between launches
        if (this.options.rate_limit.requests_per_minute) {
          const delay = 60000 / this.options.rate_limit.requests_per_minute;
          await this.sleep(delay);
        }
      }
      
      // Wait for at least one to complete
      if (this.executing.size > 0) {
        await this.waitForCompletion();
      }
    }
    
    return this.results;
  }
  
  /**
   * Clear queue and results.
   */
  reset(): void {
    this.queue = [];
    this.results = [];
    this.executing.clear();
  }
  
  /**
   * Get queue size.
   */
  size(): number {
    return this.queue.length + this.executing.size + this.results.length;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async waitForCompletion(): Promise<void> {
    await new Promise(resolve => {
      const check = () => {
        if (this.executing.size === 0) {
          resolve(null);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
}

/**
 * Helper function for simple batch execution.
 */
export async function executeBatch(
  items: Array<{ prompt: string; model?: string; priority?: "high" | "normal" | "low" }>,
  executor: (prompt: string, model?: string) => Promise<BatchResult>,
  options: BatchOptions = {}
): Promise<BatchResult[]> {
  const processor = new BatchProcessor(options);
  processor.addBatch(items.map(i => ({ ...i, priority: i.priority || "normal" })));
  return processor.execute(async (item) => executor(item.prompt, item.model));
}

export default {
  BatchProcessor,
  executeBatch
};