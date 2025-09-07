# AI Code Analysis Crew

This directory contains an AI-powered code analysis system that automatically reviews, documents, and improves your codebase using CrewAI.

## Features

- Automated code review and analysis
- Documentation generation and updates
- Code quality assessment
- Technical improvement proposals
- GitHub integration for automated PRs
- Local model support via Ollama

## Prerequisites

1. Install [Ollama](https://ollama.ai/) and pull the desired model:
   ```bash
   ollama pull qwen-coder
   ```

2. Start the Ollama server (if not running):
   ```bash
   ollama serve
   ```

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables in a `.env` file:
   ```
   # Required for GitHub integration
   GITHUB_TOKEN=your_github_token
   
   # Optional: For Slack notifications
   SLACK_WEBHOOK=your_slack_webhook_url
   
   # Ollama configuration (defaults shown)
   OLLAMA_MODEL=qwen-coder
   OLLAMA_BASE_URL=http://localhost:11434
   ```

## Usage

### Running Locally

```bash
# Analyze the current directory
python run_analysis.py

# Or specify a different directory
python run_analysis.py --repo-path /path/to/repo
```

### Running with Docker

```bash
docker build -t ai-crew .
docker run -e GITHUB_TOKEN=your_token -v $(pwd):/app ai-crew
```

## Agents

### Code Reviewer
- **Role**: Senior Code Reviewer
- **Goal**: Identify potential issues, bugs, and improvements
- **Focus**: Code quality, best practices, security vulnerabilities, performance bottlenecks

### Documentation Specialist
- **Role**: Documentation Specialist
- **Goal**: Create and maintain clear documentation
- **Focus**: README files, docstrings, architecture diagrams, API documentation

### Quality Assurance Engineer
- **Role**: Quality Assurance Engineer
- **Goal**: Ensure code quality and test coverage
- **Focus**: Test coverage, edge cases, error handling, coding standards

### Improvement Proposer
- **Role**: Technical Lead
- **Goal**: Propose architectural improvements
- **Focus**: Refactoring, performance optimization, technical debt reduction

## GitHub Actions Integration

The AI crew can be run automatically via GitHub Actions. The workflow is configured in `.github/workflows/ai_code_review.yml` and includes:

- Weekly scheduled runs
- Manual trigger support
- Report generation
- Pull request creation
- Slack notifications

## Customization

### Model Configuration

Edit `crew.py` to modify the Ollama model settings:

```python
self.llm = Ollama(
    model=os.getenv("OLLAMA_MODEL", "qwen-coder"),
    temperature=0.1,
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
)
```

### Adding New Agents

1. Add a new agent definition in `_create_agents()`
2. Create corresponding tasks in `_create_tasks()`
3. Update the task context as needed

## Troubleshooting

### Common Issues

1. **Ollama server not running**:
   ```bash
   ollama serve
   ```

2. **Model not found**:
   ```bash
   ollama pull qwen-coder
   ```

3. **Missing dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
