# crew4ai

Small toolkit to run local crew experiments and scans.

Files of note:
 - `configs/` — crew configuration presets (small/medium/large/agentless)
 - `Dockerfile.slim` — minimal image for CI and quick tests
 - `Dockerfile.full` — full dev image including tools
 - `run_podman_scan.sh` — helper to build with podman and run trivy scans

# Crew4AI

This scaffold defines a crew specialized in code review, vulnerability testing, diagrams, and expert recommendations. It is a placeholder for automation and human-in-the-loop tasks.

To run automated scans, see `run_scans.sh`.

Try it locally:

```bash
cd crew4ai
./build_and_scan.sh
```
