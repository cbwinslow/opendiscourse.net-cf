from fastapi.testclient import TestClient
import os

from mcp_server.app import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_simulated_jira_issue():
    # Ensure no JIRA env vars set
    os.environ.pop("JIRA_BASE_URL", None)
    r = client.post('/jira/issues', json={"title": "t", "body": "b"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "simulated"


def test_simulated_github_pr():
    os.environ.pop("GITHUB_TOKEN", None)
    os.environ.pop("GITHUB_REPO", None)
    r = client.post('/github/pull-requests', json={"title": "pr", "head": "feature"})
    assert r.status_code == 200
    assert r.json().get("status") == "simulated"
