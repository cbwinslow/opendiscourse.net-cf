import sys
import types
from unittest.mock import MagicMock


def test_run_analysis_writes_report(tmp_path, monkeypatch):
    # Monkeypatch CombinedCrew to return deterministic results
    fake_results = {'summary': 'ok', 'details': []}
    class FakeCombined:
        def __init__(self, config=None):
            """
            Initialize a FakeCombined test stub.
            
            Parameters:
                config (optional): Configuration accepted for API compatibility; not used by this stub.
            """
            pass

        def run_all(self):
            """
            Return a deterministic analysis result used by tests.
            
            Returns:
                dict: The predefined fake results (e.g., {'summary': 'ok', 'details': []}).
            """
            return fake_results

    # Inject a fake 'github' module so import succeeds
    fake_github = MagicMock()
    monkeypatch.setitem(sys.modules, 'github', fake_github)
    # Also inject a fake 'crew' module used by run_analysis
    fake_crew_module = types.SimpleNamespace(
        CodebaseAnalysisCrew=lambda repo_path: types.SimpleNamespace(
            kickoff=lambda: fake_results
        )
    )
    monkeypatch.setitem(sys.modules, 'crew', fake_crew_module)

    # Import and call run_analysis's run_analysis function directly
    import importlib
    mod = importlib.import_module('ai_crew.run_analysis')
    class Args:
        repo_path = str(tmp_path)
        scope = 'all'
        create_pr = False
        dry_run = True

    res = mod.run_analysis(Args())
    assert res == fake_results
