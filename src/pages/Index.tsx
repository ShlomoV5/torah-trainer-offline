import { useState, useEffect } from 'react';
import { AppProvider } from '@/context/AppContext';
import StudentView from '@/components/student/StudentView';
import AdminView from '@/components/admin/AdminView';

function AppContent() {
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const handler = () => setShowAdmin(true);
    window.addEventListener('open-admin', handler);
    return () => window.removeEventListener('open-admin', handler);
  }, []);

  return (
    <div className="mobile-container">
      <StudentView />
      {showAdmin && <AdminView onExit={() => setShowAdmin(false)} />}
    </div>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
