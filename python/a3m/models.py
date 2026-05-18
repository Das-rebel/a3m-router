"""Data models for A3M Router Python SDK"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class RoutingDecision:
    """Result of a routing decision."""
    model: str
    tier: str
    cost: float
    complexity: float = 0.0
    reasoning: str = ""
    fallback_models: List[str] = field(default_factory=list)

    @property
    def is_free(self) -> bool:
        return self.cost == 0

    @property
    def is_expert(self) -> bool:
        return self.complexity >= 0.65

    def __str__(self) -> str:
        return f"RoutingDecision(model={self.model}, tier={self.tier}, cost=${self.cost:.6f}, complexity={self.complexity:.2f})"


@dataclass
class CostReport:
    """Cost analytics report."""
    total_requests: int = 0
    total_cost: float = 0.0
    savings_vs_premium: float = 0.0
    by_provider: Dict[str, Any] = field(default_factory=dict)

    @property
    def savings_percentage(self) -> float:
        if self.total_cost + self.savings_vs_premium == 0:
            return 0
        return self.savings_vs_premium / (self.total_cost + self.savings_vs_premium) * 100
