/**
 * TMLPD Batch Processing Utilities
 *
 * Queue and process multiple prompts with:
 * - Concurrency control
 * - Priority scheduling
 * - Progress callbacks
 * - Rate limiting
 */
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
    concurrency?: number;
    model?: string;
    stop_on_error?: boolean;
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
export declare class BatchProcessor {
    private queue;
    private results;
    private options;
    private executing;
    private progressCallbacks;
    constructor(options?: BatchOptions);
    /**
     * Add item to batch queue.
     */
    add(item: Omit<BatchItem, "id">): string;
    /**
     * Add multiple items.
     */
    addBatch(items: Array<Omit<BatchItem, "id">>): string[];
    /**
     * Register progress callback.
     */
    onProgress(callback: ProgressCallback): void;
    /**
     * Get current progress.
     */
    getProgress(): BatchProgress;
    /**
     * Execute batch with concurrency control.
     */
    execute(executor: (item: BatchItem) => Promise<BatchResult>): Promise<BatchResult[]>;
    /**
     * Clear queue and results.
     */
    reset(): void;
    /**
     * Get queue size.
     */
    size(): number;
    private sleep;
    private waitForCompletion;
}
/**
 * Helper function for simple batch execution.
 */
export declare function executeBatch(items: Array<{
    prompt: string;
    model?: string;
    priority?: "high" | "normal" | "low";
}>, executor: (prompt: string, model?: string) => Promise<BatchResult>, options?: BatchOptions): Promise<BatchResult[]>;
declare const _default: {
    BatchProcessor: typeof BatchProcessor;
    executeBatch: typeof executeBatch;
};
export default _default;
//# sourceMappingURL=batchProcessor.d.ts.map