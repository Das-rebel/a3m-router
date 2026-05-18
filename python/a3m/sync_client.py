"""A3M Router Python SDK — Synchronous client"""
import httpx
from typing import Optional, List, Dict, Any
from .models import RoutingDecision, CostReport


class A3MRouterSync:
    """Synchronous Python client for A3M Router.

    Usage:
        router = A3MRouterSync()
        response = router.chat("What is 2+2?")
        decision = router.route("Write a Python function")
        print(decision.model, decision.cost)
    """

    def __init__(self, base_url: str = "http://localhost:8787", timeout: float = 30.0):
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout)

    def chat(self, message: str, model: str = "auto", max_tokens: int = 100, **kwargs) -> Dict[str, Any]:
        messages = [{"role": "user", "content": message}]
        if kwargs.get("system"):
            messages.insert(0, {"role": "system", "content": kwargs["system"]})
        response = self._client.post("/v1/chat/completions", json={
            "model": model, "messages": messages,
            "max_tokens": max_tokens, "temperature": kwargs.get("temperature", 0.7),
        })
        response.raise_for_status()
        return response.json()

    def route(self, query: str) -> RoutingDecision:
        response = self._client.post("/v1/route", json={"query": query})
        response.raise_for_status()
        data = response.json()
        return RoutingDecision(
            model=data.get("model", "unknown"), tier=data.get("tier", "unknown"),
            cost=data.get("cost", 0), complexity=data.get("complexity", 0),
            reasoning=data.get("reasoning", ""), fallback_models=data.get("fallback_models", []),
        )

    def route_batch(self, queries: List[str]) -> List[RoutingDecision]:
        return [self.route(q) for q in queries]

    def models(self) -> List[Dict[str, Any]]:
        response = self._client.get("/v1/models")
        response.raise_for_status()
        return response.json().get("data", [])

    def health(self) -> Dict[str, Any]:
        response = self._client.get("/health")
        response.raise_for_status()
        return response.json()

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
