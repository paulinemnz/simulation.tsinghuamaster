/**
 * Memory Monitoring Utilities
 * Tracks memory usage and detects potential memory leaks
 */

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

class MemoryMonitor {
  private memoryHistory: MemoryStats[] = [];
  private readonly maxHistorySize = 100; // Keep last 100 measurements
  private readonly leakThresholdMB = 100; // Alert if memory increases by 100MB

  /**
   * Get current memory statistics
   */
  getCurrentMemory(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      timestamp: Date.now()
    };
  }

  /**
   * Record current memory state
   */
  recordMemory(): MemoryStats {
    const stats = this.getCurrentMemory();
    this.memoryHistory.push(stats);
    
    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    return stats;
  }

  /**
   * Get memory statistics summary
   */
  getMemoryStats() {
    const current = this.getCurrentMemory();
    const history = [...this.memoryHistory];
    
    if (history.length === 0) {
      return {
        current,
        trend: 'insufficient_data',
        leakDetected: false,
        history: []
      };
    }

    const first = history[0];
    const last = history[history.length - 1];
    const heapIncrease = last.heapUsed - first.heapUsed;
    const rssIncrease = last.rss - first.rss;

    // Detect potential memory leak
    const leakDetected = heapIncrease > this.leakThresholdMB || rssIncrease > this.leakThresholdMB;

    let trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' = 'insufficient_data';
    if (history.length >= 10) {
      const recent = history.slice(-10);
      const avgRecent = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
      const avgEarly = history.slice(0, 10).reduce((sum, s) => sum + s.heapUsed, 0) / 10;
      
      if (avgRecent > avgEarly * 1.1) {
        trend = 'increasing';
      } else if (avgRecent < avgEarly * 0.9) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }
    }

    return {
      current,
      trend,
      leakDetected,
      heapIncrease: Math.round(heapIncrease * 100) / 100,
      rssIncrease: Math.round(rssIncrease * 100) / 100,
      historyCount: history.length,
      history: history.slice(-20) // Return last 20 measurements
    };
  }

  /**
   * Check if memory usage is within acceptable limits
   */
  checkMemoryHealth(): { healthy: boolean; warnings: string[] } {
    const stats = this.getMemoryStats();
    const warnings: string[] = [];

    // Check current memory usage
    if (stats.current.heapUsed > 500) {
      warnings.push(`High heap usage: ${stats.current.heapUsed}MB`);
    }

    if (stats.current.rss > 1000) {
      warnings.push(`High RSS usage: ${stats.current.rss}MB`);
    }

    // Check for memory leaks
    if (stats.leakDetected) {
      warnings.push(`Potential memory leak detected: heap increased by ${stats.heapIncrease}MB, RSS increased by ${stats.rssIncrease}MB`);
    }

    if (stats.trend === 'increasing' && stats.historyCount >= 10) {
      warnings.push('Memory trend is increasing over time');
    }

    return {
      healthy: warnings.length === 0,
      warnings
    };
  }

  /**
   * Clear memory history
   */
  clearHistory(): void {
    this.memoryHistory = [];
  }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();

// Auto-record memory every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    memoryMonitor.recordMemory();
  }, 30000); // Record every 30 seconds
}
