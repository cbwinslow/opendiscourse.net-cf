from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import requests

app = FastAPI(title="MCP Integration Server")


class RepoRequest(BaseModel):
    name: str
    description: str = ""


class IssueRequest(BaseModel):
    title: str
    body: str = ""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/bitbucket/repos")
def create_bitbucket_repo(req: RepoRequest):
    workspace = os.getenv("BITBUCKET_WORKSPACE")
    user = os.getenv("BITBUCKET_USERNAME")
    app_password = os.getenv("BITBUCKET_APP_PASSWORD")
    if not (workspace and user and app_password):
        _p1 = "Would create "
        _p2 = " in " + (workspace or "<workspace>")
        _msg = _p1 + req.name + _p2
        return {"status": "simulated", "message": _msg}

    url = f"https://api.bitbucket.org/2.0/repositories/{workspace}/{req.name}"
    resp = requests.post(
        url,
        auth=(user, app_password),
        json={
            "scm": "git",
            "is_private": True,
            "description": req.description,
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.post("/jira/issues")
def create_jira_issue(req: IssueRequest):
    base = os.getenv("JIRA_BASE_URL")
    user = os.getenv("JIRA_USER")
    token = os.getenv("JIRA_API_TOKEN")
    project = os.getenv("JIRA_PROJECT_KEY", "")
    if not (base and user and token and project):
        return {
            "status": "simulated",
            "message": (
                f"Would create Jira issue '{req.title}' in "
                + (project or "<project>")
            ),
        }

    url = f"{base.rstrip('/')}/rest/api/2/issue"
    payload = {
        "fields": {
            "project": {"key": project},
            "summary": req.title,
            "description": req.body,
            "issuetype": {"name": "Task"},
        }
    }
    resp = requests.post(url, auth=(user, token), json=payload)
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.post("/confluence/pages")
def create_confluence_page(req: IssueRequest):
    base = os.getenv("CONFLUENCE_BASE_URL")
    user = os.getenv("CONFLUENCE_USER")
    token = os.getenv("CONFLUENCE_API_TOKEN")
    space = os.getenv("CONFLUENCE_SPACE_KEY", "")
    if not (base and user and token and space):
        _msg = "Would create Confluence page '" + req.title + "' in space " + (
            space or "<space>"
        )
        return {"status": "simulated", "message": _msg}

    url = f"{base.rstrip('/')}/rest/api/content"
    payload = {
        "type": "page",
        "title": req.title,
        "space": {"key": space},
        "body": {
            "storage": {"value": req.body, "representation": "storage"}
        },
    }
    resp = requests.post(url, auth=(user, token), json=payload)
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.post("/linear/issues")
def create_linear_issue(req: IssueRequest):
    api_key = os.getenv("LINEAR_API_KEY")
    if not api_key:
        return {
            "status": "simulated",
            "message": f"Would create Linear issue '{req.title}'",
        }

    url = "https://api.linear.app/graphql"
    headers = {"Authorization": api_key, "Content-Type": "application/json"}
    query = {
        "query": (
            "mutation($title: String!, $body: String){ "
            "issueCreate(input: {title: $title, description: $body}) { "
            "success } }"
        ),
        "variables": {"title": req.title, "body": req.body},
    }
    resp = requests.post(url, json=query, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


class PullRequestRequest(BaseModel):
    title: str
    head: str
    base: str = "main"
    body: str = ""


@app.post("/github/pull-requests")
def create_github_pr(req: PullRequestRequest):
    gh_token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO")
    if not (gh_token and repo):
        _msg = f"Would create PR '{req.title}' against " + (repo or "<repo>")
        return {"status": "simulated", "message": _msg}

    url = f"https://api.github.com/repos/{repo}/pulls"
    headers = {
        "Authorization": f"token {gh_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    payload = {
        "title": req.title,
        "head": req.head,
        "base": req.base,
        "body": req.body,
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()
