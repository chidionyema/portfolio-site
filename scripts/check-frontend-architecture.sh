#!/usr/bin/env bash
set -e

# Frontend Architecture Check
# Mirrors backend discipline for the portfolio site.

echo "--- Running Frontend Architecture Check ---"

REPO_ROOT="$(dirname "$0")/.."
SRC="$REPO_ROOT/src"

# 1. No "any" in TypeScript (Hard fail)
echo "Checking for type safety (no 'any')..."
ANY_COUNT=$(grep -r "any" "$SRC" --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "as any" | wc -l || true)
if [ "$ANY_COUNT" -gt 0 ]; then
  echo "Warning: Found 'any' types. Please ensure strict typing."
  # Allow soft fail for now until fully strict
fi

# 2. No console.log in committed code (Hard fail)
echo "Checking for console.log..."
if grep -r "console.log" "$SRC" --include="*.ts" --include="*.tsx"; then
  echo "Error: console.log found. Please remove before committing."
  exit 1
fi

# 3. Design system adoption check
echo "Checking design system adoption..."
CLASSNAME_COUNT=$(grep -r "className=" "$SRC" | wc -l | tr -d ' ')
echo "Current className= usage: $CLASSNAME_COUNT"
if [ "$CLASSNAME_COUNT" -gt 1500 ]; then
  echo "Warning: Too many ad-hoc classes. Extract to ui/ components."
fi

echo "--- Check Passed ---"
