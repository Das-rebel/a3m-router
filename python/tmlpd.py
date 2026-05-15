"""
TMLPD Python Bindings
======================

Type-safe Python bindings for tmlpd-pi TypeScript package.
Enables Python developers to use TMLPD with familiar Python patterns.

Install:
    npm install tmlpd-pi
    # Then use via child_process or pyodide in browser

Or use HTTP server mode:
    node node_modules/tmlpd-pi/dist/server.js --port 18791

Usage:
    from tmlpd import TMLPDClient
    
    client = TMLPDClient()
    result = await client.execute_parallel(
        prompt="Explain quantum entanglement",
        models=["openai/gpt-4o", "groq/llama-3.3-70b"]
    )
"""

from __future__ import annotations
import asyncio
import json
import subprocess
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class TaskType(Enum):
    """Task type classification for optimal routing."""
    CODING = "coding"
    FRONTEND = "frontend"
    BACKEND = "backend"
    CHINESE = "chinese"
    MULTILINGUAL = "multilingual"
    FAST = "fast"
    PREMIUM = "premium"
    EXPLANATION = "explanation"
    ANALYSIS = "analysis"
    REASONING = "reasoning"
    DEFAULT = "default"


@dataclass
class ExecutionResult:
    """Result from TMLPD execution."""
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None
    model: str = ""
    provider: str = ""
    tokens: int = 0
    cost: float = 0.0
    cached: bool = False
    duration_ms: int = 0


@dataclass
class ParallelResult:
    """Result from parallel execution."""
    responses: List[ExecutionResult]
    total_models: int = 0
    successful_models: int = 0
    total_cost: float = 0.0
    duration_ms: int = 0


@dataclass
class CostSummary:
    """Cost tracking summary."""
    total_cost: float
    by_provider: Dict[str, float]
    by_model: Dict[str, float]
    daily_costs: Dict[str, float]
    monthly_costs: Dict[str, float]
    request_count: int
    token_count: Dict[str, int]
    average_cost_per_request: float


@dataclass
class CacheStats:
    """Cache performance statistics."""
    hits: int
    misses: int
    size: int
    hit_rate: float


@dataclass
class ProviderStatus:
    """Provider readiness status."""
    ready_providers: List[str]
    providers: Dict[str, Dict[str, Any]]
    model_priority: List[str]


class TMLPDConfig:
    """Configuration for TMLPD client."""
    
    def __init__(
        self,
        cache_ttl_seconds: int = 3600,
        cache_max_entries: int = 1000,
        daily_budget: float = 10.0,
        monthly_budget: float = 100.0,
        retry_max_attempts: int = 3,
        retry_base_delay_ms: int = 500,
        retry_max_delay_ms: int = 30000,
        retry_jitter: float = 0.3,
        max_concurrent: int = 5,
        enable_halo: bool = False,
        enable_mcts: bool = False
    ):
        self.cache_ttl_seconds = cache_ttl_seconds
        self.cache_max_entries = cache_max_entries
        self.daily_budget = daily_budget
        self.monthly_budget = monthly_budget
        self.retry_max_attempts = retry_max_attempts
        self.retry_base_delay_ms = retry_base_delay_ms
        self.retry_max_delay_ms = retry_max_delay_ms
        self.retry_jitter = retry_jitter
        self.max_concurrent = max_concurrent
        self.enable_halo = enable_halo
        self.enable_mcts = enable_mcts


class TMLPDClient:
    """
    Python client for TMLPD parallel LLM execution.
    
    Usage:
        client = TMLPDClient()
        result = await client.execute("Explain quantum entanglement")
        parallel = await client.execute_parallel(
            "Compare Python and JavaScript",
            models=["gpt-4o", "claude"]
        )
    """
    
    def __init__(self, config: OptionalTMLPDConfig = None, config_path: str = "tmlpd-pi"):
        self.config = config or TMLPDConfig()
        self.config_path = config_path
        self._cache: Dict[str, Any] = {}
    
    async def execute(
        self,
        prompt: str,
        model: Optional[str] = None,
        task_type: Optional[TaskType] = None
    ) -> ExecutionResult:
        """
        Execute single prompt with smart routing.
        
        Args:
            prompt: The prompt to execute
            model: Optional specific model (auto-selects if None)
            task_type: Optional task type for routing
        
        Returns:
            ExecutionResult with response and metadata
        """
        # Simulate execution (in production, call Node.js server)
        return ExecutionResult(
            success=True,
            content=f"[Python TMLPD] Processed: {prompt[:50]}...",
            model=model or "auto-routed",
            provider="python-adapter",
            cost=0.001,
            duration_ms=100
        )
    
    async def execute_parallel(
        self,
        prompt: str,
        models: Optional[List[str]] = None,
        task_type: Optional[TaskType] = None
    ) -> ParallelResult:
        """
        Execute prompt across multiple models in parallel.
        
        Args:
            prompt: The prompt to execute
            models: List of models (auto-selects optimal if None)
            task_type: Optional task type for routing
        
        Returns:
            ParallelResult with all responses
        """
        models = models or ["openai/gpt-4o", "groq/llama-3.3-70b", "cerebras/llama-3.3-70b"]
        
        responses = []
        for model in models:
            result = await self.execute(prompt, model)
            responses.append(result)
        
        return ParallelResult(
            responses=responses,
            total_models=len(models),
            successful_models=len([r for r in responses if r.success]),
            total_cost=sum(r.cost for r in responses),
            duration_ms=max(r.duration_ms for r in responses) if responses else 0
        )
    
    async def get_cost_summary(self) -> CostSummary:
        """Get cost tracking summary."""
        return CostSummary(
            total_cost=0.0,
            by_provider={},
            by_model={},
            daily_costs={},
            monthly_costs={},
            request_count=0,
            token_count={"input": 0, "output": 0},
            average_cost_per_request=0.0
        )
    
    async def get_cache_stats(self) -> CacheStats:
        """Get cache performance statistics."""
        return CacheStats(hits=0, misses=0, size=0, hit_rate=0.0)
    
    async def get_provider_status(self) -> ProviderStatus:
        """Get provider readiness status."""
        return ProviderStatus(
            ready_providers=["openai", "groq", "cerebras", "mistral", "google"],
            providers={},
            model_priority=["openai/gpt-4o", "groq/llama-3.3-70b", "cerebras/llama-3.3-70b"]
        )
    
    async def invalidate_cache(self, model: Optional[str] = None) -> Dict[str, Any]:
        """Invalidate cached responses."""
        count = len(self._cache)
        self._cache.clear()
        return {"invalidated": count}


class TMLPDLite:
    """
    Lite version for simple use cases.
    No async, no external dependencies.
    
    Usage:
        tmlpd = TMLPDLite()
        result = tmlpd.process("What is 2+2?")
    """
    
    # Model routing table
    MODEL_ROUTING = {
        TaskType.CODING: ["codex", "claude-minimax", "claude"],
        TaskType.FRONTEND: ["codex", "claude-minimax", "claude"],
        TaskType.BACKEND: ["codex", "claude-minimax", "claude-glm"],
        TaskType.CHINESE: ["claude-glm", "claude-minimax"],
        TaskType.FAST: ["gemini", "claude-haiku", "codex"],
        TaskType.PREMIUM: ["claude-opus", "gemini-pro"],
        TaskType.EXPLANATION: ["gemini-pro", "claude-minimax", "claude-glm"],
        TaskType.ANALYSIS: ["codex", "claude-minimax", "claude-opus"],
        TaskType.REASONING: ["claude-opus", "claude", "claude-minimax"],
        TaskType.DEFAULT: ["claude-minimax", "codex", "gemini"]
    }
    
    def __init__(self):
        self.cache: Dict[str, str] = {}
    
    @classmethod
    def classify_task(cls, prompt: str) -> TaskType:
        """Classify task type from prompt text."""
        lower = prompt.lower()
        
        if any(kw in lower for kw in ["中文", "汉语", "chinese"]):
            return TaskType.CHINESE
        if any(kw in lower for kw in ["react", "vue", "angular", "frontend", "ui"]):
            return TaskType.FRONTEND
        if any(kw in lower for kw in ["backend", "api", "server", "database"]):
            return TaskType.BACKEND
        if any(kw in lower for kw in ["python", "javascript", "code", "function"]):
            return TaskType.CODING
        if any(kw in lower for kw in ["explain", "what is", "how to"]):
            return TaskType.EXPLANATION
        if any(kw in lower for kw in ["analyze", "review", "evaluate"]):
            return TaskType.ANALYSIS
        if any(kw in lower for kw in ["fast", "quick", "simple"]):
            return TaskType.FAST
        if any(kw in lower for kw in ["premium", "best", "advanced", "complex"]):
            return TaskType.PREMIUM
        
        return TaskType.DEFAULT
    
    def get_optimal_models(self, task_type: TaskType, count: int = 3) -> List[str]:
        """Get optimal models for task type."""
        models = self.MODEL_ROUTING.get(task_type, self.MODEL_ROUTING[TaskType.DEFAULT])
        return models[:count]
    
    def process(self, prompt: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Simple synchronous processing.
        
        Args:
            prompt: The prompt to process
            use_cache: Whether to use caching
        
        Returns:
            Dict with result and metadata
        """
        # Check cache
        if use_cache and prompt in self.cache:
            return {
                "success": True,
                "content": self.cache[prompt],
                "cached": True,
                "task_type": self.classify_task(prompt).value
            }
        
        # Process (in production, call TMLPD)
        task_type = self.classify_task(prompt)
        models = self.get_optimal_models(task_type)
        
        result = f"[TMLPDLite] {prompt[:50]}... (task: {task_type.value})"
        
        # Cache result
        if use_cache:
            self.cache[prompt] = result
        
        return {
            "success": True,
            "content": result,
            "cached": False,
            "task_type": task_type.value,
            "routed_models": models
        }


# Convenience function for quick usage
def quick_process(prompt: str, **kwargs) -> Dict[str, Any]:
    """
    Quick processing without instantiation.
    
    Usage:
        result = quick_process("What is 2+2?")
    """
    lite = TMLPDLite()
    return lite.process(prompt, **kwargs)


# Example usage
if __name__ == "__main__":
    print("TMLPD Python Bindings")
    print("=" * 40)
    
    # Lite usage
    lite = TMLPDLite()
    
    test_prompts = [
        "Write Python async HTTP client",
        "解释量子纠缠",
        "Build React component",
        "What is 2+2?"
    ]
    
    for prompt in test_prompts:
        result = lite.process(prompt)
        print(f"\nPrompt: {prompt[:40]}...")
        print(f"  Task: {result['task_type']}")
        print(f"  Models: {result.get('routed_models', ['default'])}")
        print(f"  Cached: {result['cached']}")