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
    """
    Return a simple health status payload.
    
    Returns:
        dict: JSON-serializable dict with a "status" key set to "ok".
    """
    return {"status": "ok"}


@app.post("/bitbucket/repos")
def create_bitbucket_repo(req: RepoRequest):
    """
    Create a Bitbucket repository or return a simulated response when credentials are missing.
    
    If the environment variables BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, and BITBUCKET_APP_PASSWORD are set, this function sends a POST to the Bitbucket API to create a new repository with the name and description provided in `req`. If any required environment variable is missing, it returns a simulated response describing the would-be creation.
    
    Parameters:
        req (RepoRequest): Request model containing `name` (repository name) and optional `description`.
    
    Returns:
        dict: The parsed JSON response from Bitbucket on success, or a simulated response of the form
        {"status": "simulated", "message": "..."} when credentials are missing.
    
    Raises:
        HTTPException: If the Bitbucket API responds with a non-200/201 status code; the exception's detail contains the API response body.
    """
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
        timeout=10,
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.post("/jira/issues")
def create_jira_issue(req: IssueRequest):
    """
    Create a Jira issue using environment-configured credentials, or return a simulated response when credentials are missing.
    
    If JIRA_BASE_URL, JIRA_USER, JIRA_API_TOKEN, and JIRA_PROJECT_KEY are all set, sends a POST to the Jira REST API to create a Task with the request's title and body and returns the API response JSON. If any required environment variable is missing, returns a simulated dict indicating what would be created.
    
    Parameters:
        req (IssueRequest): Issue payload containing `title` (summary) and `body` (description).
    
    Returns:
        dict: The JSON-decoded response from Jira on success, or a simulated response dict when credentials are not provided.
    
    Raises:
        HTTPException: If the Jira API responds with a non-200/201 status code; the exception's status_code and detail mirror the HTTP response.
    """
    base = os.getenv("JIRA_BASE_URL")
    user = os.getenv("JIRA_USER")
    token = os.getenv("JIRA_API_TOKEN")
    project = os.getenv("JIRA_PROJECT_KEY", "")
    if not (base and user and token and project):
        return {
            "status": "simulated",
            "message": (
                "Would create Jira issue '" + req.title + "' in " +
                (project or "<project>")
            )
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
    """
    Create a Confluence page from the given IssueRequest.
    
    If any of CONFLUENCE_BASE_URL, CONFLUENCE_USER, CONFLUENCE_API_TOKEN, or CONFLUENCE_SPACE_KEY are missing, the function returns a simulated response describing the would-be page creation instead of calling Confluence.
    
    Parameters:
        req (IssueRequest): Request model containing `title` for the page and `body` for page content (stored representation).
    
    Returns:
        dict: If simulated, returns {"status": "simulated", "message": ...}. Otherwise returns the JSON-decoded response from the Confluence Content API on success.
    
    Raises:
        HTTPException: If the Confluence API responds with a non-200/201 status code — the exception's status_code is set to the API response status and detail to the response body.
    """
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
    """
    Create an issue in Linear or return a simulated response when the API key is missing.
    
    If the LINEAR_API_KEY environment variable is not set, returns a simulated payload describing the would-be operation. Otherwise sends a GraphQL mutation to Linear's API to create an issue with the provided title and body.
    
    Parameters:
        req (IssueRequest): Issue payload containing `title` and optional `body`.
    
    Returns:
        dict: If simulated, a dict with keys "status" and "message". If executed, the parsed JSON response from Linear's API.
    
    Raises:
        HTTPException: If the HTTP POST to Linear returns a non-200 status code; the exception's detail contains the response body.
    """
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
    """
    Create a GitHub pull request or return a simulated response when credentials are missing.
    
    If GITHUB_TOKEN and GITHUB_REPO environment variables are set, this posts a pull request to the repository and returns the parsed JSON response from GitHub. If either environment variable is missing, returns a simulated dict describing the would-be operation.
    
    Parameters:
        req (PullRequestRequest): Pull request payload (title, head, base, body). `base` defaults to "main".
    
    Returns:
        dict: The GitHub API response parsed as JSON, or a simulated status dict when running without credentials.
    
    Raises:
        fastapi.HTTPException: If the GitHub API responds with a non-200/201 status code; the HTTP status and response body are included in the exception.
    """
    gh_token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO")
    if not (gh_token and repo):
        _msg = "Would create PR '" + req.title + "' against " + (repo or "<repo>")
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
