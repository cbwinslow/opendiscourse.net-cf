#!/usr/bin/env python3
"""
Report Generation Script

This script generates a human-readable report from the analysis results.
"""
import os
import json
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Paths
ANALYSIS_RESULTS_DIR = "data/analysis_results"
KNOWLEDGE_GRAPH_FILE = "data/knowledge_graph.json"
VECTOR_DB_DIR = "data/vector_db"

def load_json_file(file_path: str) -> Any:
    """Load JSON data from a file."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def generate_markdown_report() -> str:
    """Generate a markdown report from analysis results."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report = [
        "# AI-Powered Codebase Analysis Report",
        f"Generated on: {timestamp}\n",
        "## Overview\n"
    ]
    
    # Load analysis summary
    summary = load_json_file(os.path.join(ANALYSIS_RESULTS_DIR, "analysis_summary.json"))
    if summary:
        report.extend([
            "### Code Analysis Summary\n",
            f"- **Total files analyzed:** {summary.get('total_files_analyzed', 0)}",
            f"- **Files with issues:** {summary.get('files_with_issues', 0)}",
            f"- **Total issues found:** {summary.get('total_issues', 0)}",
            f"- **Security concerns:** {len(summary.get('security_concerns', []))}",
            f"- **Performance issues:** {len(summary.get('performance_issues', []))}\n"
        ])
        
        # Add file type breakdown
        if 'file_types' in summary and summary['file_types']:
            report.append("### File Types Analyzed\n")
            for ext, count in summary['file_types'].items():
                report.append(f"- `{ext}`: {count} files")
            report.append("")
    
    # Load knowledge graph stats if available
    kg_data = load_json_file(KNOWLEDGE_GRAPH_FILE)
    if kg_data:
        report.extend([
            "\n## Knowledge Graph\n",
            f"- **Total nodes:** {len(kg_data.get('nodes', []))}",
            f"- **Total relationships:** {len(kg_data.get('edges', []))}\n"
        ])
    
    # Add security concerns
    if summary and summary.get('security_concerns'):
        report.extend([
            "\n## Security Concerns\n",
            "The following potential security concerns were identified:\n"
        ])
        for i, concern in enumerate(summary['security_concerns'][:10], 1):
            report.append(f"{i}. {concern}")
        if len(summary['security_concerns']) > 10:
            report.append(f"\n... and {len(summary['security_concerns']) - 10} more")
    
    # Add performance issues
    if summary and summary.get('performance_issues'):
        report.extend([
            "\n## Performance Considerations\n",
            "The following performance considerations were identified:\n"
        ])
        for i, issue in enumerate(summary['performance_issues'][:10], 1):
            report.append(f"{i}. {issue}")
        if len(summary['performance_issues']) > 10:
            report.append(f"\n... and {len(summary['performance_issues']) - 10} more")
    
    # Add recommendations
    report.extend([
        "\n## Recommendations\n",
        "1. **Address Critical Issues First**: Focus on high-priority security and performance issues.",
        "2. **Code Quality**: Consider implementing automated code quality checks in your CI/CD pipeline.",
        "3. **Documentation**: Ensure all new code includes proper documentation.",
        "4. **Testing**: Increase test coverage for critical components.",
        "5. **Technical Debt**: Schedule time to address technical debt items.\n",
        "---\n",
        "*This report was generated automatically. Please review the findings carefully.*"
    ])
    
    return "\n".join(report)

def main():
    """Generate and print the analysis report."""
    # Ensure the analysis results directory exists
    os.makedirs(ANALYSIS_RESULTS_DIR, exist_ok=True)
    
    # Generate and print the report
    report = generate_markdown_report()
    print(report)
    
    # Save the report to a file
    report_file = os.path.join(ANALYSIS_RESULTS_DIR, "analysis_report.md")
    with open(report_file, 'w') as f:
        f.write(report)
    
    print(f"\nReport saved to: {report_file}")

if __name__ == "__main__":
    main()
