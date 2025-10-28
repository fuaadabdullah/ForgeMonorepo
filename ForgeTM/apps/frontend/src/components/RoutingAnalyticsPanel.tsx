import { QueryObserverResult } from '@tanstack/react-query';

interface RoutingDecision {
  timestamp: string;
  taskType: string;
  selectedProvider: string;
  selectedModel: string;
  reason: string;
  latency?: number;
  cost?: number;
  fallbackUsed?: boolean;
}

interface RoutingStats {
  totalRequests: number;
  providerUsage: Record<string, number>;
  averageLatency: Record<string, number>;
  costSavings: number;
  fallbackRate: number;
  recentDecisions: RoutingDecision[];
}

interface Props {
  query: QueryObserverResult<RoutingStats, Error>;
}

export function RoutingAnalyticsPanel({ query }: Props) {
  if (query.isLoading) {
    return (
      <div>
        <h2>Routing Analytics</h2>
        <p><span className="loader" /> Loading routing statistics…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div>
        <h2>Routing Analytics</h2>
        <div className="empty-state">
          <p>Unable to load routing analytics.</p>
          <code>{query.error.message}</code>
          <button onClick={() => query.refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const stats = query.data;

  if (!stats) {
    return (
      <div>
        <h2>Routing Analytics</h2>
        <div className="empty-state">
          <p>No routing data available yet.</p>
          <p>Start making requests to see analytics.</p>
        </div>
      </div>
    );
  }

  const totalRequests = stats.totalRequests;
  const providerUsage = Object.entries(stats.providerUsage);
  const averageLatencies = Object.entries(stats.averageLatency);

  return (
    <div>
      <h2>Routing Analytics</h2>

      {/* Summary Cards */}
      <div className="analytics-grid">
        <div className="metric-card">
          <div className="metric-value">{totalRequests}</div>
          <div className="metric-label">Total Requests</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">${stats.costSavings.toFixed(2)}</div>
          <div className="metric-label">Cost Savings</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{(stats.fallbackRate * 100).toFixed(1)}%</div>
          <div className="metric-label">Fallback Rate</div>
        </div>
      </div>

      {/* Provider Usage Chart */}
      <div className="chart-section">
        <h3>Provider Usage</h3>
        <div className="usage-bars">
          {providerUsage.map(([provider, count]) => {
            const percentage = totalRequests > 0 ? (count / totalRequests) * 100 : 0;
            return (
              <div key={provider} className="usage-bar">
                <div className="usage-label">
                  <span>{provider.toUpperCase()}</span>
                  <span>{count} requests ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="usage-fill" style={{ width: `${percentage}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Latency Comparison */}
      <div className="chart-section">
        <h3>Average Latency by Provider</h3>
        <div className="latency-grid">
          {averageLatencies.map(([provider, latency]) => (
            <div key={provider} className="latency-card">
              <div className="provider-name">{provider.toUpperCase()}</div>
              <div className="latency-value">{latency.toFixed(0)}ms</div>
              <div className="latency-bar">
                <div
                  className="latency-fill"
                  style={{ width: `${Math.min((latency / 3000) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="decisions-section">
        <h3>Recent Routing Decisions</h3>
        {stats.recentDecisions.length === 0 ? (
          <div className="empty-state">
            <p>No recent decisions to display.</p>
          </div>
        ) : (
          <div className="decisions-list">
            {stats.recentDecisions.slice(0, 10).map((decision, index) => (
              <div key={index} className="decision-item">
                <div className="decision-header">
                  <span className="task-type">{decision.taskType}</span>
                  <span className="timestamp">
                    {new Date(decision.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="decision-details">
                  <span className="provider">{decision.selectedProvider.toUpperCase()}</span>
                  <span className="model">{decision.selectedModel}</span>
                  {decision.latency && (
                    <span className="latency">{decision.latency}ms</span>
                  )}
                  {decision.fallbackUsed && (
                    <span className="fallback-badge">FALLBACK</span>
                  )}
                </div>
                <div className="decision-reason">{decision.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
