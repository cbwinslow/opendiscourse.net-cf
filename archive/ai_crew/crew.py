"""
CrewAI Configuration for Codebase Analysis and Improvement using Ollama
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from crewai import Agent, Task, Crew, Process
from langchain_community.llms.ollama import Ollama
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CodebaseAnalysisCrew:
    """Crew for analyzing and improving codebases using local Ollama models."""
    
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        # Configure Ollama with the correct model path format
        model_name = os.getenv("OLLAMA_MODEL", "qwen:7b")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        # Initialize Ollama with the correct parameters
        # Note: The model name needs to be prefixed with 'ollama/' for the current version
        self.llm = Ollama(
            model=f"ollama/{model_name}",
            base_url=base_url,
            temperature=0.1,
            top_p=0.9,
            num_ctx=2048
        )
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.initialize_crew()
    
    def initialize_crew(self):
        """Initialize agents and tasks."""
        self.agents = self._create_agents()
        self.tasks = self._create_tasks()
    
    def _create_agents(self) -> Dict[str, Agent]:
        """Create and configure all agents."""
        return {
            "code_reviewer": Agent(
                role="Senior Code Reviewer",
                goal="Identify potential issues, bugs, and improvements in the codebase",
                backstory="""
                You are an experienced software engineer with a keen eye for detail.
                You specialize in code quality, best practices, and identifying potential issues.
                Your expertise helps maintain high standards across the codebase.
                """,
                verbose=True,
                allow_delegation=False,
                llm=self.llm
            ),
            "documentation_specialist": Agent(
                role="Documentation Specialist",
                goal="Create and maintain clear, comprehensive documentation",
                backstory="""
                You are a technical writer with deep understanding of software development.
                You excel at creating clear, concise, and useful documentation that helps
                developers understand and work with the codebase effectively.
                """,
                verbose=True,
                allow_delegation=True,
                llm=self.llm
            ),
            "quality_assurance": Agent(
                role="Quality Assurance Engineer",
                goal="Ensure code quality and test coverage",
                backstory="""
                You are a meticulous QA engineer who ensures that all code meets the highest
                quality standards. You focus on test coverage, edge cases, and potential
                failure points in the codebase.
                """,
                verbose=True,
                allow_delegation=True,
                llm=self.llm
            ),
            "improvement_proposer": Agent(
                role="Technical Lead",
                goal="Propose architectural and technical improvements",
                backstory="""
                You are a seasoned technical lead with extensive experience in software architecture.
                Your role is to identify opportunities for refactoring, performance improvements,
                and architectural enhancements.
                """,
                verbose=True,
                allow_delegation=True,
                llm=self.llm
            )
        }
    
    def _create_tasks(self) -> Dict[str, Task]:
        """Create and configure all tasks for the agents."""
        # Initialize tasks dictionary
        tasks = {}
        
        # Define tasks with dependencies
        tasks["code_review"] = Task(
            description=f"""
            Perform a comprehensive code review of the repository at {self.repo_path}.
            Look for bugs, security issues, code smells, and anti-patterns.
            Focus on code quality, performance, and maintainability.
            """,
            agent=self.agents["code_reviewer"],
            expected_output="A detailed code review report with findings and recommendations.",
            output_file="code_review_report.md"
        )
        
        tasks["documentation"] = Task(
            description=f"""
            Review and improve documentation for the codebase at {self.repo_path}.
            Check for missing, outdated, or unclear documentation.
            Ensure all public APIs are properly documented.
            """,
            agent=self.agents["documentation_specialist"],
            expected_output="A documentation report with findings and suggested improvements.",
            output_file="documentation_report.md",
            context=[tasks["code_review"]]
        )
        
        tasks["quality_assurance"] = Task(
            description=f"""
            Perform quality assurance checks on the codebase at {self.repo_path}.
            Look for test coverage issues, flaky tests, and missing test cases.
            Ensure code meets quality standards.
            """,
            agent=self.agents["quality_assurance"],
            expected_output="A QA report with test coverage analysis and quality metrics.",
            output_file="qa_report.md",
            context=[tasks["code_review"]]
        )
        
        tasks["improvement_proposals"] = Task(
            description=f"""
            Based on the code review, documentation, and QA reports,
            create a set of improvement proposals for the codebase at {self.repo_path}.
            Prioritize the proposals based on impact and effort.
            """,
            agent=self.agents["improvement_proposer"],
            expected_output="A set of prioritized improvement proposals with implementation details.",
            output_file="improvement_proposals.md",
            context=[
                tasks["code_review"],
                tasks["documentation"],
                tasks["quality_assurance"]
            ]
        )
        
        return tasks
    
    def kickoff(self) -> Dict[str, Any]:
        """
        Execute the configured crew workflow, collect and normalize task outputs, persist a JSON summary to repo_path/ai_reviews, and return the results.
        
        The function builds a Crew from the instance's agents and tasks, runs it sequentially, and assembles a dictionary containing:
        - "timestamp": ISO timestamp when the results were collected.
        - "code_review", "documentation", "quality_assessment", "improvement_proposals": normalized outputs from the corresponding tasks (kept as JSON-serializable objects when possible; non-serializable values are converted to strings).
        - "raw_result": string representation of the raw Crew kickoff result.
        
        Side effects:
        - Creates (if missing) a directory at <repo_path>/ai_reviews and writes the results to a file named review_<YYYYMMDD_HHMMSS>.json.
        - Prints the saved file path to stdout.
        
        Returns:
            Dict[str, Any]: The results dictionary described above. On error, returns {"status": "error", "error": "<message>"}.
        """
        try:
            crew_instance = Crew(
                agents=list(self.agents.values()),
                tasks=list(self.tasks.values()),
                verbose=True,
                process=Process.sequential
            )
            
            result = crew_instance.kickoff()
            
            # Helper to ensure values are JSON-serializable
            def _normalize(value):
                """
                Return the input value unchanged if it is JSON-serializable; otherwise return its string representation.
                
                The function tests JSON-serializability by attempting json.dumps(value). If serialization succeeds, the original value (e.g., dict, list, number, string) is returned so it can be included in JSON output without alteration. If serialization fails, the function returns str(value) to ensure the caller receives a JSON-encodable fallback.
                """
                try:
                    # If json.dumps succeeds, keep the original object
                    # (dict/list/etc.).
                    json.dumps(value)
                    return value
                except Exception:
                    return str(value)

            # Prepare results
            results = {
                "timestamp": datetime.now().isoformat(),
                "code_review": _normalize(
                    getattr(self.tasks.get("code_review"), "output", None)
                ),
                "documentation": _normalize(
                    getattr(self.tasks.get("documentation"), "output", None)
                ),
                "quality_assessment": _normalize(
                    getattr(self.tasks.get("quality_assurance"), "output", None)
                ),
                # task key is 'improvement_proposals' in _create_tasks
                "improvement_proposals": _normalize(
                    getattr(self.tasks.get("improvement_proposals"), "output", None)
                ),
                "raw_result": str(result)
            }
            
            # Save results to file
            reviews_dir = os.path.join(self.repo_path, "ai_reviews")
            os.makedirs(reviews_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(reviews_dir, f"review_{timestamp}.json")
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2)
            
            print(f"\nReview saved to: {output_file}")
            return results
            
        except Exception as e:
            error_msg = f"Error in analysis crew: {str(e)}"
            print(f"\n{error_msg}")
            return {"status": "error", "error": error_msg}

 

if __name__ == "__main__":
    crew = CodebaseAnalysisCrew(repo_path=".")
    results = crew.kickoff()
    print("\n=== Analysis Complete ===\n")
    for key, value in results.items():
        if key != "raw_result":
            print("\n=== {} ===\n{}\n".format(key.upper(), value))
