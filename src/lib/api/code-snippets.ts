export const CODE_SNIPPETS: Record<string, string> = {
  checkout: `// MassTransit Automatonymous State Machine
public class OrderSaga : MassTransitStateMachine<OrderState>
{
    public OrderSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => OrderStarted, x => x.CorrelateById(m => m.Message.OrderId));

        Initially(
            When(OrderStarted)
                .Then(context => context.Saga.CustomerName = context.Message.CustomerName)
                .TransitionTo(AwaitingStock)
                .Publish(context => new ReserveStockCommand(context.Saga.CorrelationId))
        );

        During(AwaitingStock,
            When(StockReserved)
                .TransitionTo(AwaitingPayment)
                .Publish(context => new ProcessPaymentCommand(context.Saga.CorrelationId)),
            When(StockUnavailable)
                .TransitionTo(Faulted)
                .Then(context => logger.LogWarning("Order {Id} failed: Stock out", context.Saga.CorrelationId))
        );
    }
}`,

  events: `// Transactional Outbox Pattern with Entity Framework Core
public async Task Handle(CreateOrderCommand command)
{
    await using var transaction = await _db.Database.BeginTransactionAsync();
    
    // 1. Persist business state
    var order = Order.Create(command.Items);
    _db.Orders.Add(order);
    
    // 2. Persist integration event in the same transaction
    var outboxMessage = new OutboxMessage(
        Guid.NewGuid(),
        "OrderCreated",
        JsonSerializer.Serialize(new OrderCreatedEvent(order.Id)),
        DateTime.UtcNow
    );
    _db.OutboxMessages.Add(outboxMessage);
    
    await _db.SaveChangesAsync();
    await transaction.CommitAsync();
    
    // Background Relay (OutboxProcessor.cs) will pick this up every 500ms
}`,

  circuit: `// Polly v8 Resilience Pipeline Configuration
var pipeline = new ResiliencePipelineBuilder()
    .AddRetry(new RetryStrategyOptions
    {
        ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>(),
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential
    })
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(10),
        MinimumThroughput = 5,
        BreakDuration = TimeSpan.FromSeconds(30),
        OnOpened = args => logger.LogWarning("Circuit Opened for {Service}", args.Context.OperationKey)
    })
    .AddHedging(new HedgingStrategyOptions
    {
        ShouldHandle = new PredicateBuilder().Handle<TimeoutException>(),
        MaxHedgedAttempts = 2,
        HedgingDelay = TimeSpan.FromMilliseconds(250)
    })
    .Build();`,

  stampede: `// .NET 9 HybridCache with Thundering Herd Protection
public async Task<Product> GetProductAsync(string id, CancellationToken ct)
{
    // HybridCache handles L1 (Memory) and L2 (Redis) automatically.
    // It also implements an internal async lock per-key to prevent 
    // multiple concurrent DB calls for the same missing key.
    return await _cache.GetOrCreateAsync(
        $"product:{id}",
        async cancel => await _db.Products.FindAsync(id, cancel),
        new HybridCacheEntryOptions { 
            Expiration = TimeSpan.FromMinutes(5),
            LocalRetention = TimeSpan.FromMinutes(1) 
        },
        token: ct
    );
}`,

  vault: `// Zero-Downtime PostgreSQL Rotation (Vault Service)
public async Task<DbConnection> GetActiveConnectionAsync()
{
    // 1. Check local cache for unexpired Vault credentials
    if (_cache.TryGet("db_creds", out var creds) && !creds.IsNearExpiry())
    {
        return CreateConnection(creds);
    }

    // 2. Fetch new Dynamic Role from Vault API
    var response = await _vaultClient.V1.Secrets.Database
        .GetCredentialsAsync("readonly-role");

    var newCreds = new DatabaseCredentials(
        response.Data.Username, 
        response.Data.Password
    );

    // 3. Gracefully swap connection pool
    _cache.Set("db_creds", newCreds);
    return CreateConnection(newCreds);
}`,

  idempotency: `// Redis-backed Idempotency Middleware
public async Task InvokeAsync(HttpContext context)
{
    if (!context.Request.Headers.TryGetValue("X-Idempotency-Key", out var key))
    {
        await _next(context);
        return;
    }

    // Atomic 'SET NX' to check and claim the key in Redis
    var isNew = await _redis.StringSetAsync(
        $"idm:{key}", 
        "processing", 
        TimeSpan.FromMinutes(10), 
        When.NotExists
    );

    if (!isNew)
    {
        context.Response.StatusCode = 429; // Conflict/Too Many Requests
        await context.Response.WriteAsync("Duplicate request detected.");
        return;
    }

    await _next(context);
}`,

  concurrency: `// EF Core Optimistic Concurrency with Postgres xmin
public sealed class InventoryConfiguration : IEntityTypeConfiguration<Inventory>
{
    public void Configure(EntityTypeBuilder<Inventory> builder)
    {
        builder.ToTable("inventory");

        // The 'xmin' column is a system column in Postgres that 
        // changes automatically on every row update.
        builder.Property(e => e.Version)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .IsRowVersion();
    }
}

// In Repository:
// Throws DbUpdateConcurrencyException if 'xmin' changed since Read
await _context.SaveChangesAsync();`,

  ratelimit: `// Redis Fixed Window Rate Limiting
public async Task<bool> IsAllowedAsync(string clientId)
{
    var key = $"ratelimit:{clientId}:{DateTime.UtcNow:mm}";
    
    // Atomic increment and expiry set
    var count = await _redis.StringIncrementAsync(key);
    if (count == 1)
    {
        await _redis.KeyExpireAsync(key, TimeSpan.FromSeconds(60));
    }

    return count <= _options.MaxRequestsPerMinute;
}`
};
