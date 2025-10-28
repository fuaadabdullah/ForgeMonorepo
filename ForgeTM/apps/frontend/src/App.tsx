import { LoginForm } from './components/LoginForm';
import { OllamaModelPanel } from './components/OllamaModelPanel';
import { ProvidersHealthPanel } from './components/ProvidersHealthPanel';
import { RAGExplorerPanel } from './components/RAGExplorerPanel';
import { RegisterForm } from './components/RegisterForm';
import { RoutingAnalyticsPanel } from './components/RoutingAnalyticsPanel';
import { useAuth } from './contexts/AuthContext';
import { useOllamaModels } from './hooks/useOllamaModels';
import { useProviderHealth } from './hooks/useProviderHealth';
import { usePullModel } from './hooks/usePullModel';
import { useRoutingAnalytics } from './hooks/useRoutingAnalytics';
import { PullModelRequest } from './lib/types';

export default function App() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const healthQuery = useProviderHealth();
  const modelsQuery = useOllamaModels();
  const pullModelMutation = usePullModel(modelsQuery.refetch);
  const routingAnalyticsQuery = useRoutingAnalytics();

  const handlePullModel = async (payload: PullModelRequest) => {
    await pullModelMutation(payload);
  };

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <header>
          <h1>ForgeTM Model Manager</h1>
          <p>AI Model Management Platform</p>
        </header>
        <main className="auth-container">
          <div className="auth-forms">
            <div className="auth-form">
              <h2>Login</h2>
              <LoginForm />
            </div>
            <div className="auth-form">
              <h2>Register</h2>
              <RegisterForm />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <div className="header-content">
          <div>
            <h1>ForgeTM Model Manager</h1>
            <p>Monitor providers, manage local Ollama models, and analyze routing decisions.</p>
          </div>
          <div className="user-info">
            <span>Welcome, {user?.username}!</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      <main>
        <section>
          <ProvidersHealthPanel query={healthQuery} />
        </section>
        <section>
          <OllamaModelPanel query={modelsQuery} onPull={handlePullModel} />
        </section>
        <section>
          <RoutingAnalyticsPanel query={routingAnalyticsQuery as any} />
        </section>
        <section>
          <RAGExplorerPanel />
        </section>
      </main>
    </div>
  );
}
