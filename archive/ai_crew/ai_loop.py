#!/usr/bin/env python3
"""
AI Crew Loop - Coordinates between analysis and implementation crews.

This script runs the analysis and implementation crews in a loop,
allowing them to iteratively improve the codebase.
"""
import os
import sys
import time
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ai_loop.log')
    ]
)
logger = logging.getLogger(__name__)

def run_analysis_crew(repo_path: str) -> Dict[str, Any]:
    """Run the analysis crew and return results."""
    try:
        logger.info("Starting analysis crew...")
        from crew import CodebaseAnalysisCrew
        crew = CodebaseAnalysisCrew(repo_path)
        results = crew.kickoff()
        
        # Save results
        output_dir = os.path.join(repo_path, "ai_reviews")
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(
            output_dir,
            f"review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Analysis completed. Results saved to {output_file}")
        return {"status": "success", "output_file": output_file}
    except Exception as e:
        logger.error(f"Error in analysis crew: {str(e)}", exc_info=True)
        return {"status": "error", "error": str(e)}

def run_implementation_crew(repo_path: str) -> Dict[str, Any]:
    """Run the implementation crew and return results."""
    try:
        logger.info("Starting implementation crew...")
        from implementation_crew import ImplementationCrew, run_implementation_crew as run_impl
        return run_impl(repo_path)
    except Exception as e:
        logger.error(f"Error in implementation crew: {str(e)}", exc_info=True)
        return {"status": "error", "error": str(e)}

def main():
    """Main function to run the AI crew loop."""
    # Get repository path from command line or use current directory
    repo_path = sys.argv[1] if len(sys.argv) > 1 else "."
    repo_path = os.path.abspath(repo_path)
    
    # Configuration
    max_iterations = 10  # Number of analysis/implementation cycles to run
    iteration_delay = 300  # Delay between iterations in seconds (5 minutes)
    
    logger.info(f"Starting AI Crew Loop for repository: {repo_path}")
    logger.info(f"Will run for a maximum of {max_iterations} iterations")
    
    # Create necessary directories
    os.makedirs(os.path.join(repo_path, "ai_reviews"), exist_ok=True)
    os.makedirs(os.path.join(repo_path, "ai_implementations"), exist_ok=True)
    
    # Main loop
    for iteration in range(1, max_iterations + 1):
        logger.info(f"\n{'='*50}")
        logger.info(f"Starting iteration {iteration}/{max_iterations}")
        logger.info(f"Current time: {datetime.now().isoformat()}")
        
        # Run analysis crew
        logger.info("\n[ANALYSIS PHASE]")
        analysis_result = run_analysis_crew(repo_path)
        
        if analysis_result.get("status") != "success":
            logger.error("Analysis phase failed. Waiting before next iteration...")
            time.sleep(iteration_delay)
            continue
        
        # Run implementation crew
        logger.info("\n[IMPLEMENTATION PHASE]")
        implementation_result = run_implementation_crew(repo_path)
        
        if implementation_result.get("status") != "success":
            logger.error("Implementation phase failed. Waiting before next iteration...")
            time.sleep(iteration_delay)
            continue
        
        # Log completion of iteration
        logger.info(f"\nCompleted iteration {iteration}/{max_iterations}")
        
        # Only sleep if there are more iterations to go
        if iteration < max_iterations:
            logger.info(f"Waiting {iteration_delay} seconds before next iteration...")
            time.sleep(iteration_delay)
    
    logger.info("\nAI Crew Loop completed successfully!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\nAI Crew Loop interrupted by user. Exiting...")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        sys.exit(1)
