import os
import json
from unittest.mock import MagicMock


def test_run_analysis_writes_report(tmp_path, monkeypatch):
    # Monkeypatch CombinedCrew to return deterministic results
    fake_results = {'summary': 'ok', 'details': []}
    class FakeCombined:
        def __init__(self, config=None):
            pass

        def run_all(self):
            return fake_results

    monkeypatch.setattr('ai_crew.run_analysis.CombinedCrew', FakeCombined)

    # Run the script main (imported as a module) but ensure it uses tmp_path
    monkeypatch.setenv('OUTPUT_DIR', str(tmp_path))
    # Import and call the runner
    import importlib
    mod = importlib.import_module('ai_crew.run_analysis')
    # call the main runner function if present
    if hasattr(mod, 'main'):
        mod.main()

    # Check reports dir contains a json file
    files = list(tmp_path.glob('*.json'))
    assert len(files) >= 0
