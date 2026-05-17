// Stub declarations for @langchain/core peer dependency
// These allow compilation without installing langchain

declare module '@langchain/core/language_models/chat_models' {
  export interface BaseChatModelParams {
    verbose?: boolean;
    callbacks?: any[];
    metadata?: Record<string, any>;
    tags?: string[];
  }
  export interface BaseChatModelCallOptions {
    timeout?: number;
    signal?: AbortSignal;
    stop?: string[];
  }
}

declare module '@langchain/core/messages' {
  export interface BaseMessage {
    content: string | Record<string, any>[];
    name?: string;
    additional_kwargs?: Record<string, any>;
    type: string;
    id?: string;
  }
  export interface AIMessage extends BaseMessage {
    tool_calls?: any[];
    invalid_tool_calls?: any[];
    usage_metadata?: any;
  }
  export interface AIMessageChunk extends BaseMessage {
    tool_call_chunks?: any[];
    usage_metadata?: any;
  }
  export type MessageContent = string | Record<string, any>[];
  export class HumanMessage {
    content: string | Record<string, any>[];
    name?: string;
    constructor(content: string | Record<string, any>);
  }
  export class SystemMessage {
    content: string;
    constructor(content: string);
  }
  export class AIMessage {
    content: string;
    constructor(content: string);
  }
}

declare module '@langchain/core/outputs' {
  export interface ChatGeneration {
    text: string;
    message: any;
    generationInfo?: Record<string, any>;
  }
  export interface ChatGenerationChunk {
    text: string;
    message: any;
    generationInfo?: Record<string, any>;
  }
  export interface ChatResult {
    generations: ChatGeneration[];
    llmOutput?: Record<string, any>;
  }
}

declare module '@langchain/core/language_models/base' {
  export interface ToolDefinition {
    name: string;
    description?: string;
    parameters?: any;
  }
}

declare module '@langchain/core/language_models/structured_output' {
  export interface StructuredOutputMethodParams {
    schema: any;
    name?: string;
    method?: string;
    includeRaw?: boolean;
  }
}
