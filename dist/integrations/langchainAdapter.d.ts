/**
 * A3M Router - LangChain Adapter
 *
 * Drop-in replacement for ChatOpenAI from @langchain/openai.
 * Routes all LLM calls through the A3M Router for cost optimization,
 * load balancing, and intelligent provider selection.
 *
 * @example
 * ```typescript
 * import { A3MChatModel } from 'adaptive-memory-multi-model-router/langchain';
 * import { HumanMessage } from '@langchain/core/messages';
 *
 * const model = new A3MChatModel({
 *   modelName: 'auto', // or 'groq/llama-3.3-70b-versatile'
 *   temperature: 0.7,
 * });
 *
 * const response = await model.invoke([
 *   new HumanMessage("What is 2+2?")
 * ]);
 *
 * // Streaming
 * const stream = await model.stream([
 *   new HumanMessage("Tell me a story")
 * ]);
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.content as string);
 * }
 * ```
 *
 * LangChain is a PEER DEPENDENCY. Install it separately:
 *   npm install @langchain/core @langchain/openai
 */
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import type { StructuredOutputMethodParams } from '@langchain/core/language_models/structured_output';
import { type ProviderDefinition } from '../providers/providerConfig.js';
export interface A3MChatModelOptions {
    /** A3M router instance (creates default if not provided) */
    router?: any;
    /** Model to use: 'auto' for router selection, or 'provider/model' */
    modelName?: string;
    /** Temperature (0-2) */
    temperature?: number;
    /** Max output tokens */
    maxTokens?: number;
    /** Top-p sampling */
    topP?: number;
    /** Frequency penalty (-2 to 2) */
    frequencyPenalty?: number;
    /** Presence penalty (-2 to 2) */
    presencePenalty?: number;
    /** Stop sequences */
    stop?: string[];
    /** Timeout in ms */
    timeout?: number;
    /** API key override (uses env vars if not set) */
    apiKey?: string;
    /** Base URL override */
    baseUrl?: string;
    /** Provider format hint */
    format?: 'openai' | 'anthropic' | 'google';
    /** Extra headers to send with requests */
    headers?: Record<string, string>;
    /** Tags for tracing */
    tags?: string[];
    /** Metadata for tracing */
    metadata?: Record<string, any>;
    /** Verbose logging */
    verbose?: boolean;
}
export interface A3MToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export declare class A3MChatModel {
    lc_namespace: string[];
    lc_sequential: boolean;
    lc_runnable: boolean;
    private modelName;
    private temperature;
    private maxTokens;
    private topP?;
    private frequencyPenalty?;
    private presencePenalty?;
    private stop?;
    private timeout;
    private apiKey?;
    private baseUrl?;
    private format?;
    private extraHeaders?;
    private verbose;
    private boundTools;
    private registry;
    constructor(options?: A3MChatModelOptions & Record<string, any>);
    get model(): string;
    get identifyingParams(): Record<string, any>;
    get lc_aliases(): Record<string, string>;
    toJSON(): Record<string, any>;
    static deserialize(data: Record<string, any>): Promise<A3MChatModel>;
    _generate(messages: BaseMessage[], options?: BaseChatModelCallOptions & {
        tools?: any[];
    }): Promise<ChatResult>;
    invoke(input: BaseMessage[] | string, options?: BaseChatModelCallOptions & {
        tools?: any[];
    }): Promise<any>;
    _streamResponseChunks(messages: BaseMessage[], options?: BaseChatModelCallOptions & {
        tools?: any[];
    }): AsyncGenerator<ChatGenerationChunk>;
    stream(input: BaseMessage[] | string, options?: BaseChatModelCallOptions & {
        tools?: any[];
    }): AsyncGenerator<any>;
    bindTools(tools: any[]): A3MChatModel;
    withStructuredOutput<T extends Record<string, any>>(schema: any, config?: StructuredOutputMethodParams | boolean): any;
    /**
     * Get the list of available providers
     */
    getAvailableProviders(): Record<string, ProviderDefinition>;
    /**
     * Get provider status from the registry
     */
    getProviderStatus(): any;
    /**
     * Switch the model at runtime
     */
    withModel(modelName: string): A3MChatModel;
    /**
     * Set temperature
     */
    withTemperature(temperature: number): A3MChatModel;
    /** LLM type identifier for LangChain compatibility */
    _llmType(): string;
}
/**
 * Create an A3MChatModel pre-configured for a specific provider
 */
export declare function createA3MChatModel(provider: string, options?: Omit<A3MChatModelOptions, 'modelName'>): A3MChatModel;
/**
 * Create an A3MChatModel with automatic routing
 */
export declare function createAutoRoutingChatModel(options?: Omit<A3MChatModelOptions, 'modelName'>): A3MChatModel;
//# sourceMappingURL=langchainAdapter.d.ts.map