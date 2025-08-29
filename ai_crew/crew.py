"""
CrewAI Configuration for Codebase Analysis and Improvement using Ollama
"""
from typing import Dict, Any
from crewai import Agent, Task, Crew, Process
from langchain_community.llms import Ollama
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CodebaseAnalysisCrew:
    """Crew for analyzing and improving codebases using local Ollama models."""
    
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        self.llm = Ollama(
            model="qwen-coder",
            temperature=0.1,
            base_url="http://localhost:11434"
        )
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
        """Create tasks for the agents."""
        return {
            "code_review": Task(
                description="""
                Analyze the codebase at {} and identify:
                1. Potential bugs and issues
                2. Code smells and anti-patterns
                3. Security vulnerabilities
                4. Performance bottlenecks
                
                Provide a detailed report with code examples and recommendations.
                """.format(self.repo_path),
                agent=self.agents["code_reviewer"],
                expected_output="A detailed code review report with findings and recommendations."
            ),
            "documentation": Task(
                description="""
                Review the codebase at {} and:
                1. Identify missing or outdated documentation
                2. Create/update README files
                3. Add docstrings to functions and classes
                4. Create architecture diagrams if needed
                """.format(self.repo_path),
                agent=self.agents["documentation_specialist"],
                expected_output="Updated documentation and docstrings throughout the codebase."
            ),
            "quality_assurance": Task(
                description="""
                Assess the quality of the codebase at {} by:
                1. Analyzing test coverage
                2. Identifying edge cases
                3. Checking for error handling
                4. Verifying coding standards compliance
                """.format(self.repo_path),
                agent=self.agents["quality_assurance"],
                expected_output="A quality assessment report with test coverage metrics and recommendations."
            ),
            "improvement_proposal": Task(
                description="""
                Based on the findings from other agents, propose:
                1. Architectural improvements
                2. Performance optimizations
                3. Technical debt reduction strategies
                4. Future-proofing recommendations
                """,
                agent=self.agents["improvement_proposer"],
                expected_output="A comprehensive improvement proposal with prioritized recommendations.",
                context=[
                    self.tasks["code_review"],
                    self.tasks["documentation"],
                    self.tasks["quality_assurance"]
                ]
            )
        }
    
    def kickoff(self) -> Dict[str, Any]:
        """Run the crew and return results."""
        crew_instance = Crew(
            agents=list(self.agents.values()),
            tasks=list(self.tasks.values()),
            verbose=2,
            process=Process.sequential
        )
        
        result = crew_instance.kickoff()
        return {
            "code_review": self.tasks["code_review"].output,
            "documentation": self.tasks["documentation"].output,
            "quality_assessment": self.tasks["quality_assurance"].output,
            "improvement_proposal": self.tasks["improvement_proposal"].output,
            "raw_result": result
        }

if __name__ == "__main__":
    crew = CodebaseAnalysisCrew(repo_path=".")
    results = crew.kickoff()
    print("\n=== Analysis Complete ===\n")
    for key, value in results.items():
        if key != "raw_result":
            print("\n=== {} ===\n{}\n".format(key.upper(), value))
