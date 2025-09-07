from typing import Dict, Any, List
import os
import json
from pathlib import Path
from datetime import datetime
from crewai import Agent, Task, Crew, Process
from langchain_community.llms.ollama import Ollama
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ImplementationCrew:
    """Crew for implementing code changes based on reviews and documentation."""
    
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        self.reviews_dir = os.path.join(repo_path, "ai_reviews")
        self.implementations_dir = os.path.join(repo_path, "ai_implementations")
        
        # Create directories if they don't exist
        os.makedirs(self.reviews_dir, exist_ok=True)
        os.makedirs(self.implementations_dir, exist_ok=True)
        
        # Initialize LLM
        model_name = os.getenv("OLLAMA_MODEL", "qwen:7b")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        self.llm = Ollama(
            model=f"ollama/{model_name}",
            base_url=base_url,
            temperature=0.2,  # Lower temperature for more focused implementation
            top_p=0.9,
            num_ctx=2048
        )
        
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self._create_agents()
        self._create_tasks()
    
    def _create_agents(self):
        """Create the implementation agents."""
        self.agents["senior_developer"] = Agent(
            role="Senior Software Developer",
            goal="Implement high-quality code changes based on code reviews and documentation",
            backstory=(
                "You are an experienced software developer who writes clean, efficient, "
                "and well-documented code. You carefully follow coding standards and "
                "best practices while implementing changes."
            ),
            llm=self.llm,
            verbose=True
        )
        
        self.agents["code_reviewer"] = Agent(
            role="Code Reviewer",
            goal="Review implemented changes for quality and adherence to requirements",
            backstory=(
                "You are a meticulous code reviewer with an eye for detail. You ensure "
                "that all code changes meet the project's standards and requirements "
                "before they are committed."
            ),
            llm=self.llm,
            verbose=True
        )
    
    def _create_tasks(self):
        """Create tasks for the implementation crew."""
        # Find the latest review file
        review_files = list(Path(self.reviews_dir).glob("review_*.json"))
        if not review_files:
            raise FileNotFoundError("No review files found. Run the analysis crew first.")
            
        latest_review = max(review_files, key=os.path.getmtime)
        
        self.tasks["implement_changes"] = Task(
            description=(
                f"Implement the changes suggested in the latest review: {latest_review.name}.\n"
                "Focus on one change at a time and ensure your implementation is complete and correct.\n"
                "For each file you modify, include detailed comments explaining the changes."
            ),
            agent=self.agents["senior_developer"],
            expected_output="A detailed implementation of the suggested changes with proper documentation.",
            output_file=os.path.join(
                self.implementations_dir,
                f"implementation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            )
        )
        
        self.tasks["review_implementation"] = Task(
            description=(
                "Review the implemented changes to ensure they meet the requirements "
                "and follow best practices. Provide specific feedback on any issues found."
            ),
            agent=self.agents["code_reviewer"],
            expected_output="A detailed review of the implementation with specific feedback.",
            context=[self.tasks["implement_changes"]],
            output_file=os.path.join(
                self.reviews_dir,
                f"implementation_review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            )
        )
    
    def execute(self):
        """Execute the implementation crew's tasks."""
        crew = Crew(
            agents=list(self.agents.values()),
            tasks=list(self.tasks.values()),
            verbose=True,
            process=Process.sequential
        )
        
        return crew.kickoff()

def run_implementation_crew(repo_path: str):
    """Run the implementation crew."""
    try:
        crew = ImplementationCrew(repo_path)
        results = crew.execute()
        
        # Save results
        output_dir = os.path.join(repo_path, "ai_implementations")
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(
            output_dir,
            f"implementation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"results": str(results)}, f, indent=2)
            
        return {"status": "success", "output_file": output_file}
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import sys
    repo_path = sys.argv[1] if len(sys.argv) > 1 else "."
    result = run_implementation_crew(repo_path)
    print(json.dumps(result, indent=2))
