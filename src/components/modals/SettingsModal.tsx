import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Unit } from '@/types/app';
import { X, Lock, CloudDownload, FileUp } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { setState } = useApp();
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const applyImportedUnits = (data: unknown) => {
    if (!Array.isArray(data)) throw new Error('פורמט קובץ לא תקין - נדרש מערך JSON של יחידות');
    const importedUnits = data as Unit[];
    if (importedUnits.length === 0) throw new Error('הקובץ ריק');
    setState(prev => {
      const appendedStart = prev.units.length;
      return {
        ...prev,
        units: [...prev.units, ...importedUnits],
        activeStudentUnitIndex: appendedStart,
        activeAdminUnitIndex: appendedStart,
        currentVerseIndex: 0,
        verseFeedback: [],
      };
    });
    onClose();
    alert(`נטענו ${importedUnits.length} יחידות בהצלחה!`);
  };

  const loadFromUrl = async () => {
    if (!url) return alert('נא להזין כתובת');
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('שגיאה בתקשורת');
      const data = await response.json();
      applyImportedUnits(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      alert('שגיאה בטעינת הנתונים: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const importFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        applyImportedUnits(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
        alert('שגיאה בטעינת הקובץ: ' + message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
          <label className="mt-2 w-full inline-flex items-center justify-center gap-1 bg-card border border-border py-2 rounded-lg text-sm font-bold hover:bg-muted cursor-pointer transition">
            <FileUp size={14} /> ייבוא מקובץ
            <input type="file" accept=".json,application/json" onChange={importFromFile} className="hidden" />
          </label>
        </div>

        <hr className="my-4 border-border" />

        <div className="bg-muted p-4 rounded-xl border border-border">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
            <Lock size={16} /> כניסת מנהל עריכה
          </h3>
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
