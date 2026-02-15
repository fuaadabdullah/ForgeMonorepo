import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Navigation from '../components/Navigation';
import Seo from '../components/Seo';
import { initDatadog } from '../utils/datadog-rum';

interface AdminLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  mainId?: string;
  mainLabel?: string;
}

export default function AdminLayout({
  children,
  fullWidth = false,
  mainId,
  mainLabel = 'Admin',
}: AdminLayoutProps) {
  const contentClassName = fullWidth ? 'px-6' : 'max-w-7xl mx-auto p-6';

  useEffect(() => {
    // Initialize DataDog RUM and Logs for admin pages only
    initDatadog().catch((error) => {
      console.warn('Failed to initialize DataDog on admin page:', error);
    });
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <Seo title="Admin" description="Goblin Assistant admin area." robots="noindex,nofollow" />
      <Navigation showLogout={true} variant="admin" />
      {mainId ? (
        <main className={contentClassName} id={mainId} tabIndex={-1} aria-label={mainLabel}>
          {children}
        </main>
      ) : (
        <div className={contentClassName}>{children}</div>
      )}
    </div>
  );
}
