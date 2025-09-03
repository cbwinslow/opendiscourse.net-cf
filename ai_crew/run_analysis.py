#!/usr/bin/env python3
"""
Main script to run the AI code analysis crew and create GitHub PRs with improvements.
"""
import os
import sys
import json
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from github import Github, InputGitAuthor
from crew import CodebaseAnalysisCrew

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Run AI code analysis crew.')
    parser.add_argument('--repo-path', type=str, default='.',
                      help='Path to the repository root')
    parser.add_argument('--scope', type=str, default='all',
                      choices=['all', 'code-review', 'docs', 'quality', 'improvements'],
                      help='Scope of the analysis')
    parser.add_argument('--create-pr', action='store_true',
                      help='Create a GitHub PR with the changes')
    parser.add_argument('--dry-run', action='store_true',
                      help='Run without making any changes')
    return parser.parse_args()

def setup_github_client():
    """Initialize and return GitHub client."""
    github_token = os.getenv('GITHUB_TOKEN')
    if not github_token:
        print("Error: GITHUB_TOKEN environment variable not set")
        sys.exit(1)
    return Github(github_token)

def create_branch(git, branch_name):
    """Create and checkout a new git branch."""
    try:
        git.checkout('HEAD', b=branch_name)
        print(f"Created and checked out branch: {branch_name}")
        return True
    except Exception as e:
        print(f"Error creating branch: {e}")
        return False

def commit_changes(git, message):
    """Commit changes to git."""
    try:
        git.add('.')
        git.commit('-m', message)
        print("Changes committed")
        return True
    except Exception as e:
        print(f"Error committing changes: {e}")
        return False

def create_github_pr(repo, base_branch, head_branch, title, body):
    """Create a pull request on GitHub."""
    try:
        pr = repo.create_pull(
            title=title,
            body=body,
            base=base_branch,
            head=head_branch,
            maintainer_can_modify=True
        )
        print(f"Created PR: {pr.html_url}")
        return pr
    except Exception as e:
        print(f"Error creating PR: {e}")
        return None

def run_analysis(args):
    """Run the AI analysis crew and handle the results."""
    print(f"Starting AI code analysis (scope: {args.scope})...")
    
    try:
        # Initialize the crew
        crew = CodebaseAnalysisCrew(repo_path=args.repo_path)
        
        # Run the analysis
        print("Running AI analysis crew...")
        results = crew.kickoff()
        
        if not results:
            print("Warning: No results returned from analysis crew")
            return {}
            
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_dir = "analysis_results"
        os.makedirs(results_dir, exist_ok=True)
        results_file = os.path.join(results_dir, f"analysis_results_{timestamp}.json")
        
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"Analysis complete. Results saved to {results_file}")
        return results
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}", file=sys.stderr)
        if hasattr(e, '__traceback__'):
            import traceback
            traceback.print_exc()
        return {}

def main():
    """Main function."""
    args = parse_arguments()
    
    # Run the analysis
    results = run_analysis(args)
    
    if args.dry_run or not args.create_pr:
        print("Dry run or PR creation disabled. Exiting.")
        return
    
    # Set up Git
    from git import Repo
    repo = Repo(args.repo_path)
    git = repo.git
    
    # Get current branch name
    current_branch = repo.active_branch.name
    new_branch = f'ai/improvements-{datetime.now().strftime("%Y%m%d")}'
    
    # Create a new branch
    if not create_branch(git, new_branch):
        print("Failed to create branch. Exiting.")
        return
    
    # Commit changes (if any)
    if repo.is_dirty():
        if not commit_changes(git, f"AI-generated improvements"):
            print("Failed to commit changes. Exiting.")
            return
    else:
        print("No changes to commit.")
    
    # Push changes
    try:
        git.push('--set-upstream', 'origin', new_branch)
        print("Pushed changes to remote")
    except Exception as e:
        print(f"Error pushing changes: {e}")
        return
    
    # Create PR
    github = setup_github_client()
    repo_name = os.getenv('GITHUB_REPOSITORY')
    if not repo_name:
        print("GITHUB_REPOSITORY environment variable not set")
        return
    
    repo = github.get_repo(repo_name)
    pr_title = f"🤖 AI-Generated Improvements ({datetime.now().strftime('%Y-%m-%d')})"
    
    pr_body = """## AI-Generated Improvements
    
This pull request contains automated improvements suggested by our AI code analysis system.

### Changes include:
- Code quality improvements
- Documentation updates
- Test coverage enhancements
- Performance optimizations

Please review these changes carefully before merging.

### Analysis Summary:
"""
    
    # Add analysis summary to PR body
    for key, value in results.items():
        if key != 'raw_result' and value:
            pr_body += f"\n#### {key.replace('_', ' ').title()}\n{value}\n"
    
    pr = create_github_pr(repo, current_branch, new_branch, pr_title, pr_body)
    if pr:
        print(f"PR created: {pr.html_url}")
    else:
        print("Failed to create PR")

if __name__ == "__main__":
    main()
