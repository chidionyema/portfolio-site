# Backend Database Migrations: Demo Schema

To support the interactive Production Playground, the `haworks-platform` backend cluster requires the following PostgreSQL schema. This ensures session isolation and real-world persistence for the Concurrency and Outbox demos.

---

## 1. Schema Creation
```sql
CREATE SCHEMA IF NOT EXISTS demo;
```

---

## 2. Inventory Table (Optimistic Concurrency)
Uses the system `xmin` column for frictionless version checking in EF Core.

```sql
CREATE TABLE demo.inventory (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data
INSERT INTO demo.inventory (id, name, quantity)
VALUES ('00000000-0000-0000-0000-000000000001', 'Widget Pro Cluster', 50);
```

---

## 3. Outbox Messages (Transactional Integrity)
Stores events that are waiting to be dispatched to RabbitMQ.

```sql
CREATE TABLE demo.outbox_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    event_type VARCHAR(200) NOT NULL,
    payload JSONB NOT NULL,
    occurred_on TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_on TIMESTAMP WITH TIME ZONE -- NULL if not yet relayed to RabbitMQ
);

-- Index for the background relay service
CREATE INDEX idx_outbox_unprocessed ON demo.outbox_messages (occurred_on) 
WHERE processed_on IS NULL;
```

---

## 4. EF Core Configuration (Reference)

### Inventory Model
```csharp
builder.ToTable("inventory", "demo");
builder.Property(e => e.Xmin).HasColumnName("xmin").HasColumnType("xid").IsRowVersion();
```

### Outbox Model
```csharp
builder.ToTable("outbox_messages", "demo");
builder.Property(e => e.Payload).HasColumnType("jsonb");
```
