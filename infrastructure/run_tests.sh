#!/bin/bash

# Exit on error
set -e

# Change to the scripts directory
cd "$(dirname "$0")"

# Install test dependencies if not already installed
echo "Installing test dependencies..."
python3 -m pip install -r requirements-test.txt

# Run the test script
echo "Running infrastructure tests..."
python3 test_infrastructure.py

# Run any additional tests here
# Example: python3 test_other_components.py

echo "All tests completed successfully!"
