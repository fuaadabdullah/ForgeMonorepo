import React from 'react';
import { trpc } from '../src/utils/trpc';

export default function Home() {
  const hello = trpc.hello.useQuery({ name: 'World' });
  const chat = trpc.chat.useMutation();
  const llmMetrics = trpc.llmMetrics.useQuery();
  const featureFlags = trpc.featureFlags.useQuery();

  const handleChat = async () => {
    await chat.mutateAsync({ message: 'Hello from dashboard!' });
  };

  return (
    <main className="dashboard">
      <h1>🏰 ForgeTM Dashboard</h1>
      <p>Welcome to the unified LLM gateway and feature flag dashboard.</p>

      <section className="dashboard-section">
        <h2>tRPC Integration</h2>
        <p>{hello.data ? hello.data.message : 'Loading...'}</p>
        <button className="dashboard-button" onClick={handleChat} disabled={chat.isPending}>
          {chat.isPending ? 'Sending...' : 'Send Chat Message'}
        </button>
        {chat.data && <p>Response: {JSON.stringify(chat.data)}</p>}
      </section>

      <section className="dashboard-section">
        <h2>LLM Gateway Metrics</h2>
        <div className="dashboard-status">
          <p><strong>Providers:</strong> {llmMetrics.data?.providers.join(', ') || 'Loading...'}</p>
          <p><strong>Available Models:</strong> {llmMetrics.data?.models.length || 0}</p>
          <p><strong>Total Requests:</strong> {llmMetrics.data?.totalRequests || 0}</p>
          <p><strong>Total Cost:</strong> ${llmMetrics.data?.totalCost || 0}</p>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Feature Flags</h2>
        <div className="dashboard-status">
          <p><strong>Streaming:</strong> {featureFlags.data?.enableStreaming ? '✅ Enabled' : '❌ Disabled'}</p>
          <p><strong>Caching:</strong> {featureFlags.data?.enableCaching ? '✅ Enabled' : '❌ Disabled'}</p>
          <p><strong>Logging:</strong> {featureFlags.data?.enableLogging ? '✅ Enabled' : '❌ Disabled'}</p>
          <p><strong>Tracing:</strong> {featureFlags.data?.enableTracing ? '✅ Enabled' : '❌ Disabled'}</p>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Quick Actions</h2>
        <button className="dashboard-button" onClick={() => window.open('/api/trpc', '_blank')}>
          View tRPC API
        </button>
        <button className="dashboard-button" onClick={() => window.open('http://localhost:8000/docs', '_blank')}>
          View Backend API
        </button>
        <button className="dashboard-button" onClick={() => window.open('http://localhost:8000/health', '_blank')}>
          Check Backend Health
        </button>
      </section>
    </main>
  );
}
