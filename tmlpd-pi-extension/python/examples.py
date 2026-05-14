#!/usr/bin/env python3
"""
TMLPD Python Usage Examples
Run: python3 examples.py
"""

from tmlpd import TMLPDLite, quick_process, TaskType

def main():
    print("=" * 60)
    print("TMLPD Python - Quick Examples")
    print("=" * 60)
    
    # Example 1: One-liner
    print("\n1. One-liner usage:")
    result = quick_process("What is quantum entanglement?")
    print(f"   Task type: {result['task_type']}")
    
    # Example 2: Task classification
    print("\n2. Task classification:")
    lite = TMLPDLite()
    prompts = [
        "Write Python async function",
        "Explain neural network",
        "Build React component",
        "Create PostgreSQL schema"
    ]
    for p in prompts:
        tt = lite.classify_task(p)
        models = lite.get_optimal_models(tt, 2)
        print(f"   '{p[:30]}...' -> {tt.value} -> {models}")
    
    # Example 3: Caching
    print("\n3. Caching:")
    prompt = "What is the capital of France?"
    r1 = lite.process(prompt, use_cache=True)
    r2 = lite.process(prompt, use_cache=True)
    print(f"   First:  cached={r1['cached']}")
    print(f"   Second: cached={r2['cached']}")
    
    # Example 4: Batch processing
    print("\n4. Batch processing:")
    batch = ["Python", "JavaScript", "TypeScript", "Rust", "Go"]
    results = [lite.process(f"What is {lang}?") for lang in batch]
    for lang, res in zip(batch, results):
        print(f"   {lang}: {res['task_type']}")
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()