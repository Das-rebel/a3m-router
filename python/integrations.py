"""
TMLPD Integration Examples
==========================

Integrations with popular AI frameworks:
- LangChain
- LlamaIndex  
- AutoGen
- CrewAI
- Hugging Face
"""

# =============================================================================
# LangChain Integration
# =============================================================================

def langchain_example():
    """LangChain LLM wrapper for TMLPD."""
    langchain_code = '''
from langchain.llms import BaseLLM
from langchain.schema import LLMResult, Generation
from tmlpd import TMLPDLite, TaskType
from typing import List, Optional, Any, Dict

class TMLPDLLM(BaseLLM):
    """LangChain wrapper for TMLPD parallel execution."""
    
    def __init__(
        self,
        task_type: str = "default",
        cache: bool = True,
        **kwargs
    ):
        super().__init__(**kwargs)
        self._lite = TMLPDLite()
        self._task_type = TaskType[task_type.upper()]
        self._cache = cache
    
    @property
    def _llm_type(self) -> str:
        return "tmlpd"
    
    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        """Synchronous call."""
        result = self._lite.process(prompt, use_cache=self._cache)
        return result["content"]
    
    async def _agenerate(
        self,
        prompts: List[str],
        stop: Optional[List[str]] = None
    ) -> LLMResult:
        """Async generate with parallel execution."""
        results = [self._call(p) for p in prompts]
        generations = [[Generation(text=r)] for r in results]
        return LLMResult(generations=generations)

# Usage with LCEL
from langchain.schema import StrOutputParser
from langchain.prompts import PromptTemplate

llm = TMLPDLLM(task_type="coding")
chain = PromptTemplate.from_template(
    "Explain {topic} in {style} style"
) | llm | StrOutputParser()

result = chain.invoke({"topic": "quantum", "style": "simple"})
'''
    return langchain_code


# =============================================================================
# LlamaIndex Integration
# =============================================================================

def llamaindex_example():
    """LlamaIndex LLM integration."""
    llamaindex_code = '''
from llama_index.llms import LLM
from tmlpd import TMLPDLite, TaskType
from typing import Optional, Dict, Any, List

class TMLPDLLM(LLM):
    """LlamaIndex LLM for TMLPD."""
    
    def __init__(self, task_type: str = "default", **kwargs):
        super().__init__(**kwargs)
        self._lite = TMLPDLite()
        self._task_type = task_type
    
    @property
    def metadata(self) -> Dict[str, Any]:
        return {
            "name": "TMLPD",
            "model_names": ["gpt-4o", "claude", "gemini"],
            "task_type": self._task_type
        }
    
    def complete(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        result = self._lite.process(prompt)
        return result["content"]
    
    async def acomplete(self, prompt: str, **kwargs) -> str:
        return self.complete(prompt, **kwargs)
    
    def chat(self, messages: List[Dict], **kwargs) -> str:
        # Convert chat messages to prompt
        prompt = "\\n".join([m["content"] for m in messages])
        return self.complete(prompt)

# Usage
llm = TMLPDLLM(task_type="explanation")
response = llm.complete("What is quantum entanglement?")
'''
    return llamaindex_code


# =============================================================================
# AutoGen Integration
# =============================================================================

def autogen_example():
    """AutoGen multi-agent integration."""
    autogen_code = '''
from autogen import AssistantAgent, UserProxyAgent, GroupChatManager
from tmlpd import TMLPDLite

class TMLPDAgent(AssistantAgent):
    """AutoGen agent backed by TMLPD."""
    
    def __init__(self, name: str, task_type: str = "default", **kwargs):
        super().__init__(name, **kwargs)
        self._lite = TMLPDLite()
        self._task_type = task_type
    
    def generate_reply(
        self,
        messages: List[Dict],
        sender: Any,
        **kwargs
    ) -> str:
        last_message = messages[-1]["content"]
        result = self._lite.process(last_message)
        return result["content"]

# Create coding agent
coding_agent = TMLPDAgent(
    name="coding-agent",
    task_type="coding",
    system_message="You are an expert coding assistant."
)

# Create explanation agent  
explanation_agent = TMLPDAgent(
    name="explanation-agent",
    task_type="explanation",
    system_message="You explain complex topics simply."
)

# Example conversation
user_proxy = UserProxyAgent(name="user")
coding_agent.receive(
    message="Write a Python async function",
    sender=user_proxy
)
'''
    return autogen_code


# =============================================================================
# CrewAI Integration
# =============================================================================

def crewai_example():
    """CrewAI agent integration."""
    crewai_code = '''
from crewai import Agent, Task, Crew
from tmlpd import TMLPDLite, TaskType

class TMLPDAgent(Agent):
    """CrewAI agent using TMLPD."""
    
    def __init__(self, role: str, task_type: str = "default", **kwargs):
        super().__init__(role, **kwargs)
        self._lite = TMLPDLite()
        self._task_type = task_type
    
    def execute_task(self, task: str, context: str = None) -> str:
        prompt = f"{task}"
        if context:
            prompt = f"{context}\\n\\n{task}"
        result = self._lite.process(prompt)
        return result["content"]

# Create agents
researcher = TMLPDAgent(
    role="Researcher",
    task_type="analysis",
    goal="Research AI topics thoroughly",
    backstory="Expert AI researcher"
)

writer = TMLPDAgent(
    role="Writer", 
    task_type="explanation",
    goal="Explain complex topics simply",
    backstory="Expert technical writer"
)

# Create tasks
research_task = Task(
    description="Research quantum computing",
    agent=researcher
)

write_task = Task(
    description="Write explanation of quantum computing",
    agent=writer,
    context=research_task.output
)

# Run crew
crew = Crew(agents=[researcher, writer], tasks=[research_task, write_task])
result = crew.kickoff()
'''
    return crewai_code


# =============================================================================
# Hugging Face Integration
# =============================================================================

def huggingface_example():
    """Hugging Face transformers integration."""
    hf_code = '''
from transformers import PreTrainedModel, PreTrainedTokenizer
from tmlpd import TMLPDLite, TaskType
from typing import Dict, List, Any, Optional
import torch

class TMLPDModel(PreTrainedModel):
    """Hugging Face model wrapper for TMLPD."""
    
    config_class = None  # Would define custom config
    base_model_prefix = "tmlpd"
    
    def __init__(self, config):
        super().__init__(config)
        self._lite = TMLPDLite()
    
    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        **kwargs
    ) -> Dict[str, Any]:
        # Decode input_ids to prompt
        prompt = self._decode_input(input_ids)
        result = self._lite.process(prompt)
        
        return {
            "logits": torch.zeros(1, 1, self.config.vocab_size),
            "last_hidden_state": torch.zeros(1, 1, 768)
        }
    
    def _decode_input(self, input_ids: torch.Tensor) -> str:
        # Simplified - would need proper tokenizer
        return "TMLPD processed input"
    
    def generate(
        self,
        input_ids: torch.Tensor,
        **kwargs
    ) -> torch.Tensor:
        result = self._lite.process(self._decode_input(input_ids))
        # Would encode result back to token IDs
        return torch.zeros(1, 10, dtype=torch.long)

# Or simpler: Use as text generation with custom pipeline
from transformers import pipeline

class TMLPDPipeline:
    """Simple pipeline for text generation."""
    
    def __init__(self, task_type: str = "default"):
        self._lite = TMLPDLite()
        self._task_type = task_type
    
    def __call__(self, prompt: str, **kwargs) -> Dict[str, Any]:
        result = self._lite.process(prompt)
        return {"generated_text": result["content"]}

# Usage
generator = TMLPDPipeline(task_type="explanation")
result = generator("What is quantum entanglement?")
'''
    return hf_code


# =============================================================================
# Run examples
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("TMLPD Integration Examples")
    print("=" * 60)
    
    print("\n1. LangChain Integration:")
    print(langchain_example()[:500] + "...")
    
    print("\n2. LlamaIndex Integration:")
    print(llamaindex_example()[:300] + "...")
    
    print("\n3. AutoGen Integration:")
    print(autogen_example()[:300] + "...")
    
    print("\n4. CrewAI Integration:")
    print(crewai_example()[:300] + "...")
    
    print("\n5. Hugging Face Integration:")
    print(huggingface_example()[:300] + "...")
    
    print("\n" + "=" * 60)
    print("Copy these examples to your project")
    print("=" * 60)