import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Unit, FeedbackType, DayHistory } from '@/types/app';
import { getDateString } from '@/utils/hebrew';

const initialUnits: Unit[] = [];
const initialHistory: Record<string, DayHistory> = {};

const initialState: AppState = {
  units: initialUnits,
  activeStudentUnitIndex: 0,
  activeAdminUnitIndex: 0,
  currentVerseIndex: 0,
  currentSession: { minutes: 0, practiceSeconds: 0, exc: 0, med: 0, imp: 0 },
  verseFeedback: [],
  history: initialHistory,
};

const STORAGE_KEY = 'torah-trainer-offline-state-v1';

function loadPersistedState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const units = Array.isArray(parsed.units) ? parsed.units : initialState.units;
    const maxIndex = Math.max(units.length - 1, 0);
    const activeStudentUnitIndex = Math.min(Math.max(Number(parsed.activeStudentUnitIndex) || 0, 0), maxIndex);
    const activeAdminUnitIndex = Math.min(Math.max(Number(parsed.activeAdminUnitIndex) || 0, 0), maxIndex);
    return {
      ...initialState,
      ...parsed,
      units,
      activeStudentUnitIndex,
      activeAdminUnitIndex,
      currentSession: parsed.currentSession || initialState.currentSession,
      history: parsed.history || initialState.history,
      verseFeedback: Array.isArray(parsed.verseFeedback) ? parsed.verseFeedback : [],
    };
  } catch {
    return initialState;
  }
}

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setFeedback: (type: FeedbackType) => void;
  goToNextVerse: () => void;
  goToPrevVerse: () => void;
  activeAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  stopAnyAudio: () => void;
  playAudioUrl: (url: string | null, onEnd?: () => void) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadPersistedState());
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setState(prev => {
        const newSeconds = prev.currentSession.practiceSeconds + 1;
        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            practiceSeconds: newSeconds,
            minutes: Math.floor(newSeconds / 60),
          },
        };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors (quota/private mode)
    }
  }, [state]);

  const stopAnyAudio = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
  }, []);

  const playAudioUrl = useCallback((url: string | null, onEnd?: () => void) => {
    stopAnyAudio();
    if (!url) return;
    const audio = new Audio(url);
    activeAudioRef.current = audio;
    audio.play().catch(() => alert('שגיאה בניגון השמע'));
    audio.onended = () => {
      activeAudioRef.current = null;
      onEnd?.();
    };
  }, [stopAnyAudio]);

  const setFeedback = useCallback((type: FeedbackType) => {
    setState(prev => {
      const newFeedback = [...prev.verseFeedback];
      newFeedback[prev.currentVerseIndex] = type;
      return {
        ...prev,
        verseFeedback: newFeedback,
        currentSession: {
          ...prev.currentSession,
          exc: prev.currentSession.exc + (type === 'excellent' ? 1 : 0),
          med: prev.currentSession.med + (type === 'medium' ? 1 : 0),
          imp: prev.currentSession.imp + (type === 'improve' ? 1 : 0),
        },
      };
    });
  }, []);

  const goToNextVerse = useCallback(() => {
    stopAnyAudio();
    setState(prev => {
      const unit = prev.units[prev.activeStudentUnitIndex];
      if (!unit || prev.currentVerseIndex >= unit.verses.length - 1) return prev;
      return { ...prev, currentVerseIndex: prev.currentVerseIndex + 1 };
    });
  }, [stopAnyAudio]);

  const goToPrevVerse = useCallback(() => {
    stopAnyAudio();
    setState(prev => {
      if (prev.currentVerseIndex <= 0) return prev;
      return { ...prev, currentVerseIndex: prev.currentVerseIndex - 1 };
    });
  }, [stopAnyAudio]);

  return (
    <AppContext.Provider value={{ state, setState, setFeedback, goToNextVerse, goToPrevVerse, activeAudioRef, stopAnyAudio, playAudioUrl }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
