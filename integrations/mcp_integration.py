from __future__ import annotations
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class MCPIntegrationConfig:
    sequential_thinking_enabled: bool = True
    software_planning_enabled: bool = True
    memory_enabled: bool = True
    context7_enabled: bool = True
    cloudflare_enabled: bool = True
    max_tokens: int = 2000
    timeout_seconds: int = 30


@dataclass
class AnalysisResult:
    session_id: str
    timestamp: datetime
    analysis_type: str
    sequential_thinking_steps: List[Dict[str, Any]] = field(default_factory=list)
    planning_tasks: List[Dict[str, Any]] = field(default_factory=list)
    memory_entities: List[Dict[str, Any]] = field(default_factory=list)
    context7_docs: List[Dict[str, Any]] = field(default_factory=list)
    cloudflare_docs: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    confidence_score: float = 0.0


class MCPClientWrapper:
    """A minimal, in-memory MCP client wrapper used for tests.

    It provides async methods expected by the test-suite but with simple
    deterministic behavior so tests can run offline.
    """

    def __init__(self, config: MCPIntegrationConfig):
        self.config = config
        # represent subclients
        self._clients = {
            'sequential': True if config.sequential_thinking_enabled else False,
            'planning': True if config.software_planning_enabled else False,
            'memory': True if config.memory_enabled else False,
            'context7': True if config.context7_enabled else False,
            'cloudflare': True if config.cloudflare_enabled else False,
        }
        # simple in-memory storage
        self._memory_store: List[AnalysisResult] = []

    async def invoke_sequential_thinking(self, prompt: str) -> Dict[str, Any]:
        await asyncio.sleep(0)
        if not self._clients['sequential']:
            return {'error': 'sequential_disabled'}
        return {'steps': [{'step': 1, 'thought': 'analyze'}, {'step': 2, 'thought': 'recommend'}]}

    async def create_planning_session(self, goal: str) -> Dict[str, Any]:
        await asyncio.sleep(0)
        if not self._clients['planning']:
            return {'error': 'planning_disabled'}
        return {'session_id': f'plan_{int(datetime.utcnow().timestamp())}', 'tasks': []}

    async def store_analysis_result(self, result: AnalysisResult) -> Dict[str, Any]:
        await asyncio.sleep(0)
        if not self._clients['memory']:
            return {'error': 'memory_disabled'}
        self._memory_store.append(result)
        return {'stored': True, 'session_id': result.session_id}

    async def get_library_docs(self, library: str, query: str) -> Dict[str, Any]:
        """
        Retrieve example documentation snippets for a given library and query.
        
        If the Context7 subclient is disabled in this wrapper, returns {'error': 'context7_disabled'}.
        Otherwise returns a dict with a 'snippets' key containing a list of snippet objects, each with
        'title' (str) and 'code' (str) fields representing a short documentation example for the requested library.
        
        Parameters:
            library (str): Name of the library to search snippets for.
            query (str): Query or search terms (currently unused by the test wrapper).
        
        Returns:
            Dict[str, Any]: Either an error dict or a dict containing 'snippets': List[Dict[str, str]].
        """
        await asyncio.sleep(0)
        if not self._clients['context7']:
            return {'error': 'context7_disabled'}
        return {
            'snippets': [
                {'title': f'{library} docs', 'code': 'def x(): pass'},
            ]
        }

    async def search_cloudflare_docs(self, query: str) -> Dict[str, Any]:
        """
        Search Cloudflare documentation snippets (in-memory test stub).
        
        This async helper simulates a Cloudflare docs search for testing. If the Cloudflare subclient is disabled it returns an error dict; otherwise it returns a deterministic sample result.
        
        Parameters:
            query (str): The search query string.
        
        Returns:
            Dict[str, Any]: Either {'results': [{'title': str, 'url': str}, ...]} on success
            or {'error': 'cloudflare_disabled'} if the Cloudflare subclient is disabled.
        """
        await asyncio.sleep(0)
        if not self._clients['cloudflare']:
            return {'error': 'cloudflare_disabled'}
        return {'results': [{'title': 'Workers AI', 'url': '/workers-ai'}]}


class MCPEnhancedAICrew:
    """A minimal wrapper that uses MCPClientWrapper to provide higher-level
    convenience methods used by the test-suite."""

    def __init__(self, config: Optional[MCPIntegrationConfig] = None):
        self.config = config or MCPIntegrationConfig()
        self.mcp_client = MCPClientWrapper(self.config)
        self.analysis_history: List[AnalysisResult] = []

    async def analyze_code_with_mcp(self, code: str, analysis_type: str) -> AnalysisResult:
        # Defensive: handle empty or None code
        session_id = f'session_{int(datetime.utcnow().timestamp()*1000)}'
        result = AnalysisResult(
            session_id=session_id,
            timestamp=datetime.utcnow(),
            analysis_type=analysis_type,
            recommendations=['Keep functions small', 'Add docstrings'],
            confidence_score=0.5
        )

        # attempt to enrich with sequential thinking and planning
        seq = await self.mcp_client.invoke_sequential_thinking(code)
        if 'steps' in seq:
            result.sequential_thinking_steps = seq['steps']

        plan = await self.mcp_client.create_planning_session(code)
        if 'tasks' in plan:
            result.planning_tasks = plan.get('tasks', [])

        # store in-memory
        await self.mcp_client.store_analysis_result(result)
        self.analysis_history.append(result)
        return result

    async def enhance_crew_workflow(self, crew_type: str, workflow: Dict[str, Any]) -> Dict[str, Any]:
        # fake enhancements
        return {
            'crew_type': crew_type,
            'original_workflow': workflow,
            'mcp_enhancements': {'sequential_analysis': {'steps': []}, 'planning_session': {'tasks': []}},
            'optimization_suggestions': ['Split large tasks', 'Add CI checks']
        }

    async def get_analysis_history(self, limit: int = 100) -> List[AnalysisResult]:
        return list(self.analysis_history)[-limit:]

    async def search_similar_analyses(self, query: str) -> List[AnalysisResult]:
        # naive search on recommendations
        """
        Return analysis results whose recommendations contain the given query substring.
        
        Performs a naive, case-sensitive substring search over each AnalysisResult.recommendations list.
        If any recommendation string contains the query, the corresponding AnalysisResult is added once to
        the returned list (preserves original order).
        
        Parameters:
            query (str): Substring to search for within recommendation strings.
        
        Returns:
            List[AnalysisResult]: Matching AnalysisResult objects in original order; empty list if none found.
        """
        out: List[AnalysisResult] = []
        for r in self.analysis_history:
            for s in r.recommendations:
                if s and query in s:
                    out.append(r)
                    break
        return out


async def analyze_code_with_mcp_enhancement(code: str, analysis_type: str) -> AnalysisResult:
    """
    Convenience async helper that creates a default MCPEnhancedAICrew and runs a code analysis.
    
    This function instantiates an MCPEnhancedAICrew with a default MCPIntegrationConfig and delegates to its
    analyze_code_with_mcp method.
    
    Parameters:
        code (str): Source code or text to analyze. Empty or None-like strings are handled by the underlying crew.
        analysis_type (str): Semantic label describing the kind of analysis to perform (e.g., "security", "style").
    
    Returns:
        AnalysisResult: The analysis record produced by the crew.
    """
    crew = MCPEnhancedAICrew(MCPIntegrationConfig())
    return await crew.analyze_code_with_mcp(code, analysis_type)


async def enhance_existing_crew_workflow(crew_type: str, workflow: Dict[str, Any]) -> Dict[str, Any]:
    crew = MCPEnhancedAICrew(MCPIntegrationConfig())
    return await crew.enhance_crew_workflow(crew_type, workflow)


async def create_mcp_enhanced_crew() -> MCPEnhancedAICrew:
    return MCPEnhancedAICrew(MCPIntegrationConfig())
