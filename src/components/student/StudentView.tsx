import { useState, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronRight, ChevronLeft, Play, Clock, BarChart3, Settings, Plus, Trash2 } from 'lucide-react';
import StatsModal from '@/components/modals/StatsModal';
import SettingsModal from '@/components/modals/SettingsModal';

export default function StudentView() {
  const { state, setState, setFeedback, goToNextVerse, goToPrevVerse, stopAnyAudio, playAudioUrl } = useApp();
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playingWords, setPlayingWords] = useState<Set<number>>(new Set());
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unit = state.units[state.activeStudentUnitIndex];
  const verse = unit?.verses?.[state.currentVerseIndex];
  const words = verse?.text?.split(' ') || [];

  const clearPlaying = useCallback(() => {
    setPlayingWords(new Set());
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
  }, []);

  // Play full verse by concatenating section audio sequentially
  const playCurrentVerse = useCallback(() => {
    if (!verse) return;
    clearPlaying();
    const sections = verse.sections || [];
    
    if (sections.length === 0) return; // No sections, nothing to play

    let currentSectionIdx = 0;

    const playNextSection = () => {
      if (currentSectionIdx >= sections.length) {
        clearPlaying();
        return;
      }
      const sec = sections[currentSectionIdx];
      // Mark entire section
      const wordIndices = new Set<number>();
      for (let i = sec.start; i <= sec.end; i++) wordIndices.add(i);
      setPlayingWords(wordIndices);

      if (sec.audioUrl) {
        playAudioUrl(sec.audioUrl, () => {
          currentSectionIdx++;
          playNextSection();
        });
      } else {
        // No audio for this section - briefly highlight then move on
        setTimeout(() => {
          currentSectionIdx++;
          playNextSection();
        }, 1000);
      }
    };

    playNextSection();
  }, [verse, playAudioUrl, clearPlaying]);

  // Play a single section - mark ALL words in section
  const playSection = useCallback((sectionIndex: number) => {
    if (!verse) return;
    clearPlaying();
    const sec = verse.sections[sectionIndex];
    const wordIndices = new Set<number>();
    for (let i = sec.start; i <= sec.end; i++) wordIndices.add(i);
    
    setPlayingWords(wordIndices);
    if (sec.audioUrl) {
      playAudioUrl(sec.audioUrl, clearPlaying);
    } else {
      // No audio - just highlight briefly
      setTimeout(clearPlaying, 1500);
    }
  }, [verse, playAudioUrl, clearPlaying]);

  const changeUnit = (idx: number) => {
    stopAnyAudio();
    clearPlaying();
    setState(prev => ({
      ...prev,
      activeStudentUnitIndex: idx,
      currentVerseIndex: 0,
      verseFeedback: [],
    }));
  };

  const addUnit = () => {
    const newUnit = {
      id: Date.now(),
      name: `יחידה ${state.units.length + 1}`,
      book: 'Genesis',
      chapter: 1,
      startVerse: 1,
      endVerse: 1,
      verses: [{ text: 'פסוק לדוגמה', sections: [], audioUrl: null }],
    };
    setState(prev => ({
      ...prev,
      units: [...prev.units, newUnit],
      activeStudentUnitIndex: prev.units.length,
      activeAdminUnitIndex: prev.units.length,
      currentVerseIndex: 0,
      verseFeedback: [],
    }));
  };

  const removeUnit = () => {
    if (state.units.length <= 1) {
      alert('לא ניתן למחוק את היחידה האחרונה.');
      return;
    }
    if (!confirm('האם למחוק את היחידה הנוכחית?')) return;
    const removedIndex = state.activeStudentUnitIndex;
    setState(prev => {
      const units = prev.units.filter((_, idx) => idx !== removedIndex);
      const nextIndex = Math.min(removedIndex, units.length - 1);
      return {
        ...prev,
        units,
        activeStudentUnitIndex: nextIndex,
        activeAdminUnitIndex: Math.min(prev.activeAdminUnitIndex, units.length - 1),
        currentVerseIndex: 0,
        verseFeedback: [],
      };
    });
    stopAnyAudio();
    clearPlaying();
  };

  const timerDisplay = `${String(state.currentSession.minutes).padStart(2, '0')}:${String(state.currentSession.practiceSeconds % 60).padStart(2, '0')}`;
  const currentFeedback = state.verseFeedback[state.currentVerseIndex];
  const settingsModal = showSettings ? <SettingsModal onClose={() => setShowSettings(false)} /> : null;

  if (!unit) {
    return (
      <>
        <div className="flex h-full items-center justify-center text-muted-foreground text-center px-6" dir="rtl">
          <p>
            לא נטענה יחידת לימוד, לחץ{' '}
            <button
              onClick={() => setShowSettings(true)}
              className="text-primary underline font-bold hover:opacity-80 transition"
            >
              כאן
            </button>{' '}
            כדי לטעון
          </p>
        </div>
        {settingsModal}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="bg-header text-header-foreground p-4 rounded-b-2xl shadow-md z-10 flex-shrink-0">
        <div className="flex justify-between items-center mb-2 gap-2">
          <button onClick={() => setShowSettings(true)} className="opacity-70 hover:opacity-100 flex-shrink-0 text-lg">
            <Settings size={20} />
          </button>
          <select
            value={state.activeStudentUnitIndex}
            onChange={e => changeUnit(parseInt(e.target.value))}
            className="bg-primary/80 border border-primary-foreground/20 text-primary-foreground text-base font-bold rounded-lg p-2 flex-grow text-center appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-foreground/40"
          >
            {state.units.map((u, idx) => (
              <option key={u.id} value={idx}>{u.name}</option>
            ))}
          </select>
          <button
            onClick={addUnit}
            className="opacity-70 hover:opacity-100 flex-shrink-0 text-lg"
            title="הוסף יחידה"
            aria-label="הוסף יחידה"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={removeUnit}
            className="opacity-70 hover:opacity-100 flex-shrink-0 text-lg"
            title="מחק יחידה"
            aria-label="מחק יחידה"
          >
            <Trash2 size={20} />
          </button>
          <button onClick={() => setShowStats(true)} className="opacity-70 hover:opacity-100 flex-shrink-0 text-lg">
            <BarChart3 size={20} />
          </button>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span>פסוק {state.currentVerseIndex + 1} מתוך {unit.verses.length}</span>
          <span>התקדמות יחידה</span>
        </div>
        <div className="flex gap-1 h-2 w-full mt-1">
          {unit.verses.map((_, i) => {
            const fb = state.verseFeedback[i];
            let bgClass = 'bg-primary/40';
            if (fb === 'excellent') bgClass = 'bg-feedback-excellent';
            else if (fb === 'medium') bgClass = 'bg-feedback-medium';
            else if (fb === 'improve') bgClass = 'bg-feedback-improve';
            return (
              <div
                key={i}
                className={`flex-grow rounded-full transition-colors duration-300 ${bgClass} ${i === state.currentVerseIndex ? 'ring-2 ring-primary-foreground ring-offset-1 ring-offset-header' : ''}`}
              />
            );
          })}
        </div>
      </header>

      {/* Verse area */}
      <main className="flex-1 min-h-0 relative w-full flex items-center justify-center py-2">
        <button
          onClick={goToPrevVerse}
          disabled={state.currentVerseIndex === 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card rounded-full shadow flex items-center justify-center text-primary active:bg-muted disabled:opacity-30 z-20 transition"
        >
          <ChevronRight size={20} />
        </button>

        <div className="pasuk-font text-center px-12 py-4 w-full h-full overflow-y-auto select-none verse-scroll" dir="rtl">
          {words.map((word, index) => {
            const sectionIndex = (verse?.sections || []).findIndex(s => index >= s.start && index <= s.end);
            let colorClass = 'section-unassigned';
            if (sectionIndex !== -1) colorClass = sectionIndex % 2 === 0 ? 'section-odd' : 'section-even';
            const isPlaying = playingWords.has(index);

            return (
              <span
                key={index}
                className={`word ${colorClass} ${isPlaying ? 'playing' : ''}`}
                onClick={() => {
                  if (sectionIndex !== -1) playSection(sectionIndex);
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        <button
          onClick={goToNextVerse}
          disabled={state.currentVerseIndex === unit.verses.length - 1}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card rounded-full shadow flex items-center justify-center text-primary active:bg-muted disabled:opacity-30 z-20 transition"
        >
          <ChevronLeft size={20} />
        </button>
      </main>

      {/* Bottom panel */}
      <div className="bg-card p-6 rounded-t-3xl shadow-[0_-4px_6px_-1px_hsl(var(--foreground)/0.1)] flex-shrink-0 z-10 relative">
        <div className="mb-4">
          <button
            onClick={playCurrentVerse}
            className="w-full flex items-center justify-center bg-secondary text-secondary-foreground p-3 rounded-2xl active:bg-secondary/80 transition gap-2"
          >
            <Play size={20} />
            <span className="text-sm font-bold">השמע קריאת פסוק מלא</span>
          </button>
          <div className="text-center text-xs text-muted-foreground mt-2 mb-4 font-medium">
            או לחץ על מילה כדי לשמוע את הקטע שלה
          </div>

          <div className="bg-muted p-3 rounded-2xl border border-border">
            <div className="text-center text-sm font-bold text-muted-foreground mb-2">איך קראת? (משוב עצמי)</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFeedback('excellent')}
                className={`p-2 rounded-xl font-bold text-sm border-2 transition ${
                  currentFeedback === 'excellent'
                    ? 'bg-feedback-excellent text-card border-feedback-excellent shadow-inner'
                    : 'bg-card text-feedback-excellent border-feedback-excellent-border hover:bg-feedback-excellent-light'
                }`}
              >
                מצוין
              </button>
              <button
                onClick={() => setFeedback('medium')}
                className={`p-2 rounded-xl font-bold text-sm border-2 transition ${
                  currentFeedback === 'medium'
                    ? 'bg-feedback-medium text-card border-feedback-medium shadow-inner'
                    : 'bg-card text-feedback-medium border-feedback-medium-border hover:bg-feedback-medium-light'
                }`}
              >
                בינוני
              </button>
              <button
                onClick={() => setFeedback('improve')}
                className={`p-2 rounded-xl font-bold text-sm border-2 transition ${
                  currentFeedback === 'improve'
                    ? 'bg-feedback-improve text-card border-feedback-improve shadow-inner'
                    : 'bg-card text-feedback-improve border-feedback-improve-border hover:bg-feedback-improve-light'
                }`}
              >
                צריך לשפר
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
          <Clock size={14} />
          <span>זמן אימון היום:</span>
          <span className="font-bold text-primary">{timerDisplay}</span>
        </div>
      </div>

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {settingsModal}
    </div>
  );
}
