import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Lock, CloudDownload } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { state, setState, stopAnyAudio } = useApp();
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const loadFromUrl = async () => {
    if (!url) return alert('נא להזין כתובת');
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('שגיאה בתקשורת');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('פורמט קובץ לא תקין');
      setState(prev => ({ ...prev, units: data, activeStudentUnitIndex: 0, currentVerseIndex: 0, verseFeedback: [] }));
      onClose();
      alert('הנתונים נטענו בהצלחה!');
    } catch (e: any) {
      alert('שגיאה בטעינת הנתונים: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const checkLogin = () => {
    if (password === '1234') {
      stopAnyAudio();
      setPassword('');
      onClose();
      setShowAdmin(true);
    } else {
      alert('סיסמה שגויה');
    }
  };

  // If admin should be shown, we dispatch an event
  // Actually let's use a callback pattern
  const handleAdminLogin = () => {
    if (password === '1234') {
      setPassword('');
      onClose();
      // Dispatch custom event to open admin
      window.dispatchEvent(new CustomEvent('open-admin'));
    } else {
      alert('סיסמה שגויה');
    }
  };

  return (
    <div className="absolute inset-0 bg-foreground/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center text-foreground">הגדרות</h2>

        <div className="mb-6 bg-secondary p-4 rounded-xl border border-primary/10">
          <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-1">
            <CloudDownload size={16} /> טעינת קורס מכתובת (URL)
          </h3>
          <p className="text-xs text-muted-foreground mb-2">הדבק כאן את הקישור שקיבלת מהמורה:</p>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border border-border bg-card p-2 rounded-lg text-sm mb-2 text-left"
            dir="ltr"
          />
          <button
            onClick={loadFromUrl}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? 'טוען...' : 'טען נתונים'}
          </button>
        </div>

        <hr className="my-4 border-border" />

        <div className="bg-muted p-4 rounded-xl border border-border">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
            <Lock size={16} /> כניסת מנהל עריכה
          </h3>
          <p className="text-[10px] text-muted-foreground mb-2">(סיסמה לאבטיפוס: 1234)</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="הזן סיסמה..."
            className="w-full border border-border bg-card p-2 rounded-lg mb-2 text-center"
            dir="ltr"
            onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
          />
          <button
            onClick={handleAdminLogin}
            className="w-full bg-foreground text-background py-2 rounded-lg text-sm font-bold hover:opacity-90 transition"
          >
            היכנס למערכת
          </button>
        </div>
      </div>
    </div>
  );
}
