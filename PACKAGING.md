# Packaging and publishing

This project can publish two artifacts from the repository:

- A Python package built with Poetry (top-level `pyproject.toml`).
- A frontend npm package (under `frontend/`).

CI workflows automatically publish when an annotated tag matching `v*` is pushed.

Secrets to configure in the GitHub repository:

- `PYPI_API_TOKEN` - API token created in your PyPI account for publishing the Python package.
- `NPM_TOKEN` - npm token for publishing the frontend package.

How to release:

1. Bump the version in `pyproject.toml` and/or the frontend `package.json`.
2. Create an annotated tag and push it:

```bash
git tag -a v0.1.0 -m "release v0.1.0"
git push origin v0.1.0
```

The GitHub Actions workflows `release-pypi.yml` and `release-npm.yml` will run on the tag push and publish the artifacts if the required secrets are present.
