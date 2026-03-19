import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { toast } from '@/components/ui/sonner';
import StudentView from '@/components/student/StudentView';
import AdminView from '@/components/admin/AdminView';

function AppContent() {
  const [showAdmin, setShowAdmin] = useState(false);
  const { importStatus } = useApp();

  useEffect(() => {
    if (importStatus === 'success') {
      toast.success('ייבוא הושלם');
    } else if (importStatus === 'failure') {
      toast.error('יש בעיה עם ייבוא הקובץ');
    }
  }, [importStatus]);

  useEffect(() => {
    const handler = () => setShowAdmin(true);
    window.addEventListener('open-admin', handler);
    return () => window.removeEventListener('open-admin', handler);
  }, []);

  return (
    <div className="mobile-container">
      {importStatus === 'in-progress' && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-primary/90 text-primary-foreground py-2 text-sm font-bold"
        >
          מבצע ייבוא…
        </div>
      )}
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
