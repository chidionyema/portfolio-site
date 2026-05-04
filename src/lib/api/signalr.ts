import * as signalR from '@microsoft/signalr';

const SIGNALR_URL = import.meta.env.PUBLIC_SIGNALR_URL || 'https://api.chidionyema.dev/hubs/demo';

export interface SagaStepEvent {
  sessionId: string;
  traceId?: string;
  step: string;
  service: string;
  status: 'success' | 'failed' | 'pending' | 'compensating' | 'processing';
  description?: string;
  latencyMs?: number;
  timestamp: string;
}

export interface VaultRotationEvent {
  sessionId: string;
  traceId?: string;
  // Backend emits 'rotating' and 'rotated' today (DemoVaultService). The
  // demo's UI maps these to internal labels (started / activated / etc).
  stage: 'rotating' | 'rotated';
  version: number;
  previousVersion: string | null;
  timestamp: string;
}

export interface CircuitBreakerEvent {
  sessionId: string;
  traceId?: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastError?: string;
  timestamp: string;
}

export interface RateLimitEvent {
  sessionId: string;
  traceId?: string;
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number | null;
  timestamp: string;
}

export interface EventFlowEvent {
  sessionId: string;
  traceId?: string;
  eventId: string;
  stage: 'persisted' | 'relayed' | 'consumed';
  data?: string | null;
  timestamp: string;
}

class SignalRClient {
  private connection: signalR.HubConnection | null = null;
  private started: Promise<void> | null = null;

  public getConnection(): signalR.HubConnection {
    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_URL)
        .withAutomaticReconnect()
        .build();
    }
    return this.connection;
  }

  public async start(): Promise<void> {
    if (this.started) return this.started;
    const conn = this.getConnection();
    this.started = conn.start();
    try {
      await this.started;
    } catch (err) {
      this.started = null;
      throw err;
    }
  }

  public async subscribe(sessionId: string): Promise<void> {
    await this.start();
    await this.connection?.invoke('SubscribeToSession', sessionId);
  }
}

export const signalRClient = new SignalRClient();
