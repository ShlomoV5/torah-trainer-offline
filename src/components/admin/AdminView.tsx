import { useState, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { toHebrewLetter, BOOK_OPTIONS } from '@/utils/hebrew';
import { Plus, Trash2, FileDown, FileUp, Mic, Square, Upload, Play, Scissors } from 'lucide-react';

// Audio block component - extracted outside to avoid remount issues
function AudioBlock({ 
  target, 
  label, 
  audioUrl, 
  isRecording, 
  onToggleRecording, 
  onUpload, 
  onPlay, 
  onDelete 
}: { 
  target: 'full' | number; 
  label: string; 
  audioUrl: string | null; 
  isRecording: boolean;
  onToggleRecording: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlay: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-muted p-3 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-foreground text-sm">{label}</span>
        {audioUrl ? (
          <span className="text-xs bg-feedback-excellent-light text-feedback-excellent px-2 py-1 rounded-full">✓ שמע נשמר</span>
        ) : (
          <span className="text-xs text-muted-foreground">אין שמע</span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={onToggleRecording}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
            isRecording ? 'bg-destructive text-destructive-foreground recording-pulse' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
          }`}
        >
          {isRecording ? <><Square size={12} /> עצור הקלטה</> : <><Mic size={12} /> הקלט</>}
        </button>
        <label className="bg-card text-muted-foreground border border-border px-3 py-1.5 rounded-md text-xs font-bold hover:bg-muted cursor-pointer flex items-center gap-1">
          <Upload size={12} /> העלה קובץ
          <input type="file" accept="audio/*" onChange={onUpload} className="hidden" />
        </label>
        {audioUrl && (
          <>
            <button onClick={onPlay} className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-xs font-bold hover:bg-secondary/80 flex items-center gap-1">
              <Play size={12} /> נגן
            </button>
            <button onClick={onDelete} className="bg-muted text-muted-foreground px-3 py-1.5 rounded-md text-xs hover:bg-destructive/10 hover:text-destructive flex items-center gap-1">
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminView({ onExit }: { onExit: () => void }) {
  const { state, setState, stopAnyAudio, playAudioUrl } = useApp();
  const [editingVerseIdx, setEditingVerseIdx] = useState(0);
  const [editorSel, setEditorSel] = useState<{ start: number; end: number }>({ start: -1, end: -1 });
  const [fetchStatus, setFetchStatus] = useState('');
  const [recordingTarget, setRecordingTarget] = useState<string | number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use ref for editingVerseIdx to avoid stale closures in recording callbacks
  const editingVerseIdxRef = useRef(editingVerseIdx);
  editingVerseIdxRef.current = editingVerseIdx;

  const unit = state.units[state.activeAdminUnitIndex];
  const verse = unit?.verses?.[editingVerseIdx];

  const updateUnit = (key: string, value: any) => {
    setState(prev => {
      const units = [...prev.units];
      const u = { ...units[prev.activeAdminUnitIndex] };
      (u as any)[key] = key === 'name' || key === 'book' ? value : parseInt(value);
      units[prev.activeAdminUnitIndex] = u;
      return { ...prev, units };
    });
    if (key !== 'name') {
      setFetchStatus('שואב...');
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => autoFetchVerses(), 600);
    }
  };

  const autoFetchVerses = async () => {
    const u = state.units[state.activeAdminUnitIndex];
    if (!u || u.startVerse > u.endVerse) {
      setFetchStatus('שגיאה בטווח');
      return;
    }
    try {
      const response = await fetch(`https://www.sefaria.org/api/texts/${u.book}_${u.chapter}?context=0`);
      if (!response.ok) throw new Error('שגיאה');
      const data = await response.json();
      if (!data.he || !Array.isArray(data.he)) throw new Error('פרק אינו קיים');
      const newVerses = [];
      for (let i = u.startVerse; i <= u.endVerse; i++) {
        const apiIndex = i - 1;
        if (apiIndex < data.he.length && data.he[apiIndex]) {
          const cleanText = data.he[apiIndex].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
          newVerses.push({ text: cleanText, sections: [], audioUrl: null });
        } else {
          newVerses.push({ text: `(פסוק ${toHebrewLetter(i)} חסר)`, sections: [], audioUrl: null });
        }
      }
      setState(prev => {
        const units = [...prev.units];
        units[prev.activeAdminUnitIndex] = { ...units[prev.activeAdminUnitIndex], verses: newVerses };
        return { ...prev, units };
      });
      setEditingVerseIdx(0);
      setFetchStatus('✓ הושלם');
    } catch {
      setFetchStatus('שגיאה');
    }
  };

  const createNewUnit = () => {
    setState(prev => {
      const newUnit = { id: Date.now(), name: "יחידה חדשה", book: "Genesis", chapter: 1, startVerse: 1, endVerse: 1, verses: [{ text: "פסוק לדוגמה", sections: [], audioUrl: null }] };
      const units = [...prev.units, newUnit];
      return { ...prev, units, activeAdminUnitIndex: units.length - 1 };
    });
    setEditingVerseIdx(0);
  };

  const deleteCurrentUnit = () => {
    if (state.units.length <= 1) return alert('לא ניתן למחוק את היחידה היחידה.');
    if (!confirm('האם אתה בטוח שברצונך למחוק יחידה זו?')) return;
    setState(prev => {
      const units = prev.units.filter((_, i) => i !== prev.activeAdminUnitIndex);
      return { ...prev, units, activeAdminUnitIndex: 0 };
    });
    setEditingVerseIdx(0);
  };

  const handleWordClick = (index: number) => {
    setEditorSel(prev => {
      if (prev.start === -1 || prev.end !== -1) {
        return { start: index, end: -1 };
      } else {
        let s = prev.start, e = index;
        if (e < s) { e = s; s = index; }
        return { start: s, end: e };
      }
    });
  };

  const saveSection = () => {
    if (editorSel.start === -1 || editorSel.end === -1) return alert('בחר התחלה וסיום לקטע');
    setState(prev => {
      const units = [...prev.units];
      const u = { ...units[prev.activeAdminUnitIndex] };
      const verses = [...u.verses];
      const v = { ...verses[editingVerseIdx] };
      const sections = [...(v.sections || []), { start: editorSel.start, end: editorSel.end, audioUrl: null }];
      sections.sort((a, b) => a.start - b.start);
      v.sections = sections;
      verses[editingVerseIdx] = v;
      u.verses = verses;
      units[prev.activeAdminUnitIndex] = u;
      return { ...prev, units };
    });
    setEditorSel({ start: -1, end: -1 });
  };

  const clearSections = () => {
    setState(prev => {
      const units = [...prev.units];
      const u = { ...units[prev.activeAdminUnitIndex] };
      const verses = [...u.verses];
      verses[editingVerseIdx] = { ...verses[editingVerseIdx], sections: [] };
      u.verses = verses;
      units[prev.activeAdminUnitIndex] = u;
      return { ...prev, units };
    });
  };

  // Audio functions - uses ref to avoid stale closure
  const saveAudioData = useCallback((target: number, dataUrl: string) => {
    const vIdx = editingVerseIdxRef.current;
    setState(prev => {
      const units = [...prev.units];
      const u = { ...units[prev.activeAdminUnitIndex] };
      const verses = [...u.verses];
      const v = { ...verses[vIdx] };
      const sections = [...v.sections];
      sections[target] = { ...sections[target], audioUrl: dataUrl };
      v.sections = sections;
      verses[vIdx] = v;
      u.verses = verses;
      units[prev.activeAdminUnitIndex] = u;
      return { ...prev, units };
    });
  }, [setState]);

  const deleteAudio = (target: number) => {
    if (!confirm('למחוק את קובץ השמע?')) return;
    setState(prev => {
      const units = [...prev.units];
      const u = { ...units[prev.activeAdminUnitIndex] };
      const verses = [...u.verses];
      const v = { ...verses[editingVerseIdx] };
      const sections = [...v.sections];
      sections[target] = { ...sections[target], audioUrl: null };
      v.sections = sections;
      verses[editingVerseIdx] = v;
      u.verses = verses;
      units[prev.activeAdminUnitIndex] = u;
      return { ...prev, units };
    });
  };

  // CRITICAL: getUserMedia called directly in click handler
  const toggleRecording = async (target: number) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      setRecordingTarget(null);
      return;
    }
    try {
      stopAnyAudio();
      // getUserMedia called directly from user click handler
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      setRecordingTarget(target);

      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          saveAudioData(target, reader.result as string);
        };
      };
      recorder.start();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        alert("גישה למיקרופון נדחתה. אנא אשר הרשאה בדפדפן.");
      } else {
        alert("לא ניתן לגשת למיקרופון: " + err.message);
      }
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, target: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      saveAudioData(target, ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be uploaded again
    e.target.value = '';
  };

  // Export/Import
  const exportData = () => {
    const dataStr = JSON.stringify(state.units);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barmitzvah_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setState(prev => ({ ...prev, units: data, activeAdminUnitIndex: 0 }));
          setEditingVerseIdx(0);
          alert('הנתונים יובאו בהצלחה!');
        } else alert('פורמט קובץ לא נתמך');
      } catch (err: any) { alert('שגיאה: ' + err.message); }
    };
    reader.readAsText(file);
  };

  const words = verse?.text?.split(' ') || [];
  const chapterOptions = Array.from({ length: 150 }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 bg-card z-40 flex flex-col h-full overflow-hidden" dir="rtl">
      <header className="bg-foreground text-background p-4 shadow-md flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold">ניהול יחידות לימוד</h1>
        <button onClick={onExit} className="bg-destructive text-destructive-foreground px-3 py-1 rounded text-sm hover:bg-destructive/90">יציאה</button>
      </header>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted">
        {/* Export/Import */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm border-r-4 border-r-success">
          <h3 className="font-bold text-foreground mb-2 flex items-center gap-1">
            <FileDown size={16} className="text-success" /> שמירת נתונים (כולל שמע)
          </h3>
          <p className="text-xs text-destructive mb-3 font-bold">חשוב! ללא ייצוא הנתונים לקובץ, רענון הדף ימחק את כל ההקלטות.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportData} className="bg-feedback-excellent-light text-feedback-excellent px-4 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition flex-grow text-center flex items-center justify-center gap-1">
              <FileDown size={14} /> ייצא קובץ JSON
            </button>
            <label className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition flex-grow text-center cursor-pointer flex items-center justify-center gap-1">
              <FileUp size={14} /> יבא מקובץ
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Unit selection */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-foreground">בחר יחידה לעריכה:</label>
              <span className="text-xs text-muted-foreground font-bold">{fetchStatus}</span>
            </div>
            <select
              value={state.activeAdminUnitIndex}
              onChange={e => { setState(prev => ({ ...prev, activeAdminUnitIndex: parseInt(e.target.value) })); setEditingVerseIdx(0); }}
              className="w-full border-2 border-primary/20 rounded-lg p-2 bg-secondary text-secondary-foreground font-bold"
            >
              {state.units.map((u, i) => <option key={u.id} value={i}>{u.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={createNewUnit} className="flex-grow bg-primary text-primary-foreground py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition flex items-center justify-center gap-1">
                <Plus size={14} /> יחידה חדשה
              </button>
              <button onClick={deleteCurrentUnit} className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm hover:bg-destructive/20 transition">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Source & fetch */}
        {unit && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm border-t-4 border-t-primary">
            <h3 className="font-bold text-lg mb-1 border-b border-border pb-2">מקור ושאיבת פסוקים</h3>
            <div className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">שם היחידה:</label>
                <input
                  type="text"
                  value={unit.name}
                  onChange={e => updateUnit('name', e.target.value)}
                  className="w-full border border-border rounded p-2 text-sm bg-muted"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">ספר:</label>
                  <select value={unit.book} onChange={e => updateUnit('book', e.target.value)} className="w-full border border-border rounded p-2 text-sm bg-muted">
                    {BOOK_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">פרק:</label>
                  <select value={unit.chapter} onChange={e => updateUnit('chapter', e.target.value)} className="w-full border border-border rounded p-2 text-sm bg-muted">
                    {chapterOptions.map(n => <option key={n} value={n}>{toHebrewLetter(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">מפסוק:</label>
                  <select value={unit.startVerse} onChange={e => updateUnit('startVerse', e.target.value)} className="w-full border border-border rounded p-2 text-sm bg-muted">
                    {chapterOptions.map(n => <option key={n} value={n}>{toHebrewLetter(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">עד פסוק:</label>
                  <select value={unit.endVerse} onChange={e => updateUnit('endVerse', e.target.value)} className="w-full border border-border rounded p-2 text-sm bg-muted">
                    {chapterOptions.map(n => <option key={n} value={n}>{toHebrewLetter(n)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editing & Audio */}
        {unit && verse && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-10">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Mic size={16} className="text-primary" /> חלוקה והקלטה
              </h3>
              <select
                value={editingVerseIdx}
                onChange={e => { setEditingVerseIdx(parseInt(e.target.value)); setEditorSel({ start: -1, end: -1 }); }}
                className="border border-border rounded p-1 text-sm bg-muted max-w-[120px]"
              >
                {unit.verses.map((_, i) => (
                  <option key={i} value={i}>פסוק {toHebrewLetter(unit.startVerse + i)}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-muted-foreground mb-3 bg-secondary p-2 rounded">
              כדי ליצור קטע, לחץ על מילת ההתחלה ועל מילת הסיום.
            </div>

            <div className="border border-border p-4 rounded-lg bg-muted mb-4 text-center leading-normal" dir="rtl" style={{ fontFamily: "'Taamey David', 'Heebo', serif", fontSize: '2rem', fontWeight: 700 }}>
              {words.map((word, i) => {
                const secIdx = (verse.sections || []).findIndex(s => i >= s.start && i <= s.end);
                let extraClass = '';
                if (i === editorSel.start) extraClass = 'start-word';
                else if (i === editorSel.end) extraClass = 'end-word';
                else if (editorSel.end !== -1 && i >= editorSel.start && i <= editorSel.end) extraClass = 'selected-range';

                return (
                  <span
                    key={i}
                    className={`edit-word ${extraClass}`}
                    style={secIdx !== -1 ? { borderBottom: secIdx % 2 === 0 ? '3px solid hsl(var(--section-odd))' : '3px solid hsl(var(--section-even))' } : undefined}
                    onClick={() => handleWordClick(i)}
                  >
                    {word}
                  </span>
                );
              })}
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={saveSection} className="flex-grow bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2">
                <Scissors size={14} /> שמור כקטע נפרד
              </button>
              <button onClick={clearSections} className="bg-destructive/10 text-destructive px-4 rounded-lg hover:bg-destructive/20 transition">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="font-bold text-sm flex items-center gap-1">
                <Play size={14} className="text-primary" /> קובצי שמע והקלטות:
              </h4>
              {verse.sections.length > 0 ? (
                verse.sections.map((sec, idx) => {
                  const secWords = words.slice(sec.start, sec.end + 1).join(' ');
                  const shortText = secWords.length > 15 ? secWords.substring(0, 15) + '...' : secWords;
                  return (
                    <AudioBlock 
                      key={idx} 
                      target={idx} 
                      label={`קטע ${idx + 1}: ${shortText}`} 
                      audioUrl={sec.audioUrl}
                      isRecording={recordingTarget === idx}
                      onToggleRecording={() => toggleRecording(idx)}
                      onUpload={(e) => handleUpload(e, idx)}
                      onPlay={() => playAudioUrl(sec.audioUrl)}
                      onDelete={() => deleteAudio(idx)}
                    />
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground p-2 text-center bg-muted rounded border border-dashed border-border">
                  לא הוגדרו קטעים לפסוק זה. סמן מילים ולחץ "שמור כקטע נפרד".
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
