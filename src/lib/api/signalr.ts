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
  stage: 'started' | 'activated' | 'grace_period' | 'revoked';
  version: number;
  previousVersion: number;
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
  remaining: number;
  retryAfter?: number;
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
