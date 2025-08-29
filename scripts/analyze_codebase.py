import os
import subprocess
import openai

# Set LocalAI API key and endpoint
openai.api_key = os.environ.get("LOCALAI_API_KEY")
openai.api_base = os.environ.get("LOCALAI_API_BASE")

def get_codebase_summary():
    try:
        # Get a list of all files in the repository
        files = subprocess.check_output(["git", "ls-files"], universal_newlines=True).splitlines()

        # Read the contents of each file
        codebase = ""
        for file in files:
            try:
                with open(file, "r") as f:
                    codebase += f"\n--- {file} ---\n" + f.read()
            except Exception as e:
                print(f"Error reading {file}: {e}")

        # Generate a summary of the codebase using LocalAI
        prompt = f"Please provide a summary of the following codebase:\n\n{codebase}"
        response = openai.Completion.create(
            engine="davinci",  # Replace with the appropriate engine
            prompt=prompt,
            max_tokens=1024,
            n=1,
            stop=None,
            temperature=0.7,
        )
        summary = response.choices[0].text.strip()
        return summary
    except Exception as e:
        return f"Error generating codebase summary: {e}"

def identify_codebase_issues():
    try:
        # Get a list of all files in the repository
        files = subprocess.check_output(["git", "ls-files"], universal_newlines=True).splitlines()

        # Read the contents of each file
        codebase = ""
        for file in files:
            try:
                with open(file, "r") as f:
                    codebase += f"\n--- {file} ---\n" + f.read()
            except Exception as e:
                print(f"Error reading {file}: {e}")

        # Identify potential issues in the codebase using LocalAI
        prompt = f"Please identify potential issues (bugs, vulnerabilities, code smells) in the following codebase:\n\n{codebase}"
        response = openai.Completion.create(
            engine="davinci",  # Replace with the appropriate engine
            prompt=prompt,
            max_tokens=1024,
            n=1,
            stop=None,
            temperature=0.7,
        )
        issues = response.choices[0].text.strip()
        return issues
    except Exception as e:
        return f"Error identifying codebase issues: {e}"

if __name__ == "__main__":
    # Get the codebase summary
    summary = get_codebase_summary()
    print("\nCodebase Summary:\n")
    print(summary)

    # Identify potential issues in the codebase
    issues = identify_codebase_issues()
    print("\nPotential Issues:\n")
    print(issues)
