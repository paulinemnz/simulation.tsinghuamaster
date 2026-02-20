/**
 * Circuit Breaker pattern for external API calls
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxAttempts?: number;
}

enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',         // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 60000; // 1 minute
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 3;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset circuit if it was HALF_OPEN
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
      } else if (this.state === CircuitState.CLOSED) {
        // Reset failure count on success
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      // If HALF_OPEN, increment attempts
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenAttempts++;
        if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
          this.state = CircuitState.OPEN;
        }
      } else if (this.failureCount >= this.failureThreshold) {
        // Too many failures - open the circuit
        this.state = CircuitState.OPEN;
      }
      
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }
}

// Export singleton instance for DeepSeek API
export const deepSeekCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenMaxAttempts: 2
});
