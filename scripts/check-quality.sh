#!/usr/bin/env bash
# Portfolio site quality gates — run in CI or pre-push.
# Catches the classes of bugs found in the staff review.
set -euo pipefail

cd "$(dirname "$0")/.."
ERRORS=0

echo "=== Quality Gates ==="

# 1. No 'as any' casts (hiding type errors)
echo -n "  No 'as any' casts... "
MATCHES=$(grep -rn 'as any' src/components/ src/hooks/ src/lib/ --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v 'node_modules' | grep -v '.d.ts' || true)
if [ -n "$MATCHES" ]; then
  echo "FAIL"
  echo "$MATCHES" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 2. No ${...} in JSX text nodes (template literal bug)
echo -n "  No raw \${} in JSX text... "
MATCHES=$(grep -rn '>\$\{' src/components/ --include='*.tsx' 2>/dev/null | grep -v '{`' | grep -v 'node_modules' || true)
if [ -n "$MATCHES" ]; then
  echo "FAIL"
  echo "$MATCHES" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 3. No invalid Tailwind opacity classes (border-white/8 instead of border-white/[0.08])
echo -n "  No invalid Tailwind opacity... "
MATCHES=$(grep -rn -E '(border|bg|text)-(white|black)/[0-9]{1,2}[^0]' src/components/ --include='*.tsx' 2>/dev/null | grep -v '/\[' | grep -v '/5\b' | grep -v '/10\b' | grep -v '/20\b' | grep -v '/25\b' | grep -v '/30\b' | grep -v '/40\b' | grep -v '/50\b' | grep -v '/60\b' | grep -v '/70\b' | grep -v '/75\b' | grep -v '/80\b' | grep -v '/90\b' | grep -v '/95\b' | grep -v '/100\b' | grep -v 'node_modules' || true)
if [ -n "$MATCHES" ]; then
  echo "FAIL"
  echo "$MATCHES" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 4. No empty catch blocks (swallowed errors)
echo -n "  No empty catch blocks... "
COUNT=$(grep -rn 'catch\s*{' src/components/ src/hooks/ --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v 'catch (e)' | grep -v 'catch (err)' | grep -v 'node_modules' | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "WARN ($COUNT empty catch blocks)"
else
  echo "OK"
fi

# 5. No navigator.clipboard without try/catch
echo -n "  Clipboard API guarded... "
MATCHES=$(grep -rn 'navigator\.clipboard' src/components/ --include='*.tsx' -A2 2>/dev/null | grep -v 'try' | grep -v 'catch' | grep -v 'node_modules' | grep 'clipboard' || true)
if [ -n "$MATCHES" ]; then
  echo "WARN (clipboard without try/catch)"
  echo "$MATCHES" | head -3
else
  echo "OK"
fi

# 6. TypeScript check (only count new errors, exclude known pre-existing)
echo -n "  TypeScript (new errors only)... "
NEW_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "ChaosTimelineStrip\|StatusStrip\|Reveal\|vitest" | wc -l | tr -d ' ')
if [ "$NEW_ERRORS" -gt 0 ]; then
  echo "FAIL ($NEW_ERRORS new TS errors)"
  npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "ChaosTimelineStrip\|StatusStrip\|Reveal\|vitest" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 7. Build check
echo -n "  Astro build... "
if npm run build > /dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "=== $ERRORS quality gate(s) FAILED ==="
  exit 1
else
  echo "=== All quality gates passed ==="
fi
