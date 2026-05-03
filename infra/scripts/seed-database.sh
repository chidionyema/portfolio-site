#!/bin/bash
# =============================================================================
# Seed Database with Demo Data
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load generated environment
if [ -f "$SCRIPT_DIR/../terraform/.env.generated" ]; then
    source "$SCRIPT_DIR/../terraform/.env.generated"
else
    echo "Error: .env.generated not found. Run deploy.sh first."
    exit 1
fi

echo "Running database migrations..."

# Navigate to ritualworks project
RITUALWORKS_DIR="$SCRIPT_DIR/../../ritualworks"

if [ ! -d "$RITUALWORKS_DIR" ]; then
    echo "Error: ritualworks directory not found at $RITUALWORKS_DIR"
    exit 1
fi

cd "$RITUALWORKS_DIR"

# Run migrations for each context
for CONTEXT in Catalog Order Payment Content Identity; do
    echo "Migrating ${CONTEXT}DbContext..."
    dotnet ef database update \
        --context "${CONTEXT}DbContext" \
        --project src \
        --startup-project src \
        --connection "$DATABASE_URL" || echo "Warning: ${CONTEXT}DbContext migration failed"
done

echo ""
echo "Seeding demo data..."

# Seed demo products
psql "$DATABASE_URL" << 'EOF'
-- Demo products for catalog
INSERT INTO catalog.products (id, name, description, price, stock, created_at)
VALUES
    (gen_random_uuid(), 'Clean Architecture Book', 'Learn how to build maintainable software', 49.99, 100, NOW()),
    (gen_random_uuid(), 'DDD Workshop', 'Domain-Driven Design workshop recording', 199.99, 50, NOW()),
    (gen_random_uuid(), 'Event Sourcing Course', 'Master event-driven architectures', 299.99, 25, NOW())
ON CONFLICT DO NOTHING;

-- Demo category
INSERT INTO catalog.categories (id, name, slug, created_at)
VALUES
    (gen_random_uuid(), 'Digital Products', 'digital-products', NOW())
ON CONFLICT DO NOTHING;
EOF

echo ""
echo "=========================================="
echo "Database seeded successfully!"
echo "=========================================="
