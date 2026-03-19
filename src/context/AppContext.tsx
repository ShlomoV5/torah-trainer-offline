import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Unit, FeedbackType, DayHistory } from '@/types/app';
import { getDateString } from '@/utils/hebrew';

function generateMockHistory(): Record<string, DayHistory> {
  const history: Record<string, DayHistory> = {};
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    history[getDateString(d)] = {
      minutes: Math.floor(Math.random() * 20) + 5,
      exc: Math.floor(Math.random() * 5) + 2,
      med: Math.floor(Math.random() * 3),
      imp: Math.floor(Math.random() * 2),
    };
  }
  return history;
}

const defaultUnit: Unit = {
  id: 1,
  name: "פרשת בראשית",
  book: "Genesis",
  chapter: 1,
  startVerse: 1,
  endVerse: 3,
  verses: [
    {
      text: "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃",
      sections: [{ start: 0, end: 2, audioUrl: null }, { start: 3, end: 6, audioUrl: null }],
      audioUrl: null,
    },
    {
      text: "וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ וְחֹ֖שֶׁךְ עַל־פְּנֵ֣י תְה֑וֹם וְר֣וּחַ אֱלֹהִ֔ים מְרַחֶ֖פֶת עַל־פְּנֵ֥י הַמָּֽיִם׃",
      sections: [],
      audioUrl: null,
    },
    {
      text: "וַיֹּ֥אמֶר אֱלֹהִ֖ים יְהִ֣י א֑וֹר וַֽיְהִי־אֽוֹר׃",
      sections: [],
      audioUrl: null,
    },
  ],
};

const initialState: AppState = {
  units: [defaultUnit],
  activeStudentUnitIndex: 0,
  activeAdminUnitIndex: 0,
  currentVerseIndex: 0,
  currentSession: { minutes: 0, practiceSeconds: 0, exc: 0, med: 0, imp: 0 },
  verseFeedback: [],
  history: generateMockHistory(),
};

const STORAGE_KEY = 'torah-trainer-offline-state-v1';

function normalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function createUrlUnit(sourceUrl: string, existingUnitsCount: number): Unit {
  return {
    id: Date.now(),
    name: `יחידה מקישור ${existingUnitsCount + 1}`,
    book: "Genesis",
    chapter: 1,
    startVerse: 1,
    endVerse: 1,
    verses: [{ text: "פסוק לדוגמה", sections: [], audioUrl: null }],
    sourceUrl,
  };
}

function applyUnitFromQuery(state: AppState): AppState {
  if (typeof window === 'undefined') return state;
  const unitParam = new URLSearchParams(window.location.search).get('unit');
  if (!unitParam) return state;

  const normalizedUrl = normalizeUrl(unitParam);
  if (!normalizedUrl) return state;

  const existingIndex = state.units.findIndex(unit => unit.sourceUrl === normalizedUrl);
  if (existingIndex !== -1) {
    return {
      ...state,
      activeStudentUnitIndex: existingIndex,
      activeAdminUnitIndex: existingIndex,
      currentVerseIndex: 0,
      verseFeedback: [],
    };
  }

  const units = [...state.units, createUrlUnit(normalizedUrl, state.units.length)];
  const newIndex = units.length - 1;
  return {
    ...state,
    units,
    activeStudentUnitIndex: newIndex,
    activeAdminUnitIndex: newIndex,
    currentVerseIndex: 0,
    verseFeedback: [],
  };
}

function loadPersistedState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return applyUnitFromQuery(initialState);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const units = Array.isArray(parsed.units) && parsed.units.length > 0 ? parsed.units : initialState.units;
    const activeStudentUnitIndex = Math.min(Math.max(Number(parsed.activeStudentUnitIndex) || 0, 0), units.length - 1);
    const activeAdminUnitIndex = Math.min(Math.max(Number(parsed.activeAdminUnitIndex) || 0, 0), units.length - 1);
    const hydratedState = {
      ...initialState,
      ...parsed,
      units,
      activeStudentUnitIndex,
      activeAdminUnitIndex,
      currentSession: parsed.currentSession || initialState.currentSession,
      history: parsed.history || initialState.history,
      verseFeedback: Array.isArray(parsed.verseFeedback) ? parsed.verseFeedback : [],
    };
    return applyUnitFromQuery(hydratedState);
  } catch {
    return applyUnitFromQuery(initialState);
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
