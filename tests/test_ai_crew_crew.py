import os
import json
import types
from unittest.mock import MagicMock




def make_dummy_agent(name):
    a = MagicMock()
    a.name = name
    return a


def test_codebase_analysis_init_and_tasks(tmp_path, monkeypatch):
    # Monkeypatch Ollama so no network calls occur
    dummy_ollama = MagicMock()
    monkeypatch.setitem(os.environ, 'OLLAMA_MODEL', 'qwen:7b')
    monkeypatch.setitem(os.environ, 'OLLAMA_BASE_URL', 'http://localhost:11434')
    monkeypatch.setattr('ai_crew.crew.Ollama', lambda **kwargs: dummy_ollama)

    # Monkeypatch crewai Agent/Task/Crew/Process so we can inspect calls
    fake_agent = MagicMock()
    fake_task = MagicMock()

    monkeypatch.setattr('ai_crew.crew.Agent', lambda **kwargs: fake_agent)
    monkeypatch.setattr('ai_crew.crew.Task', lambda **kwargs: fake_task)

    class FakeCrew:
        def __init__(self, **kwargs):
            self.agents = kwargs.get('agents')
            self.tasks = kwargs.get('tasks')

        def kickoff(self):
            return {'ok': True}

    monkeypatch.setattr('ai_crew.crew.Crew', FakeCrew)
    # Provide a Process object with a 'sequential' attribute used by Crew
    monkeypatch.setattr('ai_crew.crew.Process', types.SimpleNamespace(sequential='sequential'))

    repo = tmp_path / "repo"
    repo.mkdir()

    from ai_crew.crew import CodebaseAnalysisCrew

    crew = CodebaseAnalysisCrew(repo_path=str(repo))

    # Agents and tasks dictionaries should be present
    assert isinstance(crew.agents, dict)
    assert isinstance(crew.tasks, dict)

    # Kickoff should return results and write a file
    results = crew.kickoff()
    assert isinstance(results, dict)

    # Check that a review file was created
    reviews = list((repo / 'ai_reviews').glob('review_*.json'))
    assert len(reviews) == 1
    # Validate JSON contents
    with open(reviews[0], 'r', encoding='utf-8') as f:
        data = json.load(f)
    assert 'timestamp' in data


def test_kickoff_handles_exceptions(tmp_path, monkeypatch):
    # Simulate Crew.kickoff raising
    monkeypatch.setattr('ai_crew.crew.Ollama', lambda **kwargs: MagicMock())
    monkeypatch.setattr('ai_crew.crew.Agent', lambda **kwargs: MagicMock())
    monkeypatch.setattr('ai_crew.crew.Task', lambda **kwargs: MagicMock())

    class BrokenCrew:
        def __init__(self, **kwargs):
            pass

        def kickoff(self):
            raise RuntimeError("simulated failure")

    monkeypatch.setattr('ai_crew.crew.Crew', BrokenCrew)
    monkeypatch.setattr('ai_crew.crew.Process', object())

    from ai_crew.crew import CodebaseAnalysisCrew

    crew = CodebaseAnalysisCrew(repo_path=str(tmp_path))
    res = crew.kickoff()
    assert res.get('status') == 'error'
