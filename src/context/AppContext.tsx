import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Unit, FeedbackType, DayHistory } from '@/types/app';
import { getDateString } from '@/utils/hebrew';

export type ImportStatus = 'idle' | 'in-progress' | 'success' | 'failure';

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
const DEFAULT_QUERY_UNIT_BOOK = 'Genesis';
const PLACEHOLDER_VERSE_TEXT = 'נטען מקישור...';

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

function getNextQueryUnitId(units: Unit[]): number {
  return units.reduce((maxId, unit) => Math.max(maxId, Number(unit.id) || 0), 0) + 1;
}

function getNextQueryUnitName(units: Unit[]): string {
  const prefix = 'יחידה מקישור ';
  const maxSuffix = units.reduce((max, unit) => {
    if (!unit.name?.startsWith(prefix)) return max;
    const suffix = Number(unit.name.slice(prefix.length));
    if (Number.isNaN(suffix)) return max;
    return Math.max(max, suffix);
  }, 0);
  return `${prefix}${maxSuffix + 1}`;
}

function createUrlUnit(sourceUrl: string, units: Unit[]): Unit {
  return {
    id: getNextQueryUnitId(units),
    name: getNextQueryUnitName(units),
    book: DEFAULT_QUERY_UNIT_BOOK,
    chapter: 1,
    startVerse: 1,
    endVerse: 1,
    verses: [{ text: PLACEHOLDER_VERSE_TEXT, sections: [], audioUrl: null }],
    sourceUrl,
  };
}

function validateImportedUnits(data: unknown): Unit[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('פורמט קובץ לא תקין - נדרש מערך JSON של יחידות');
  }
  for (const item of data) {
    if (
      typeof item !== 'object' || item === null ||
      !('id' in item) || !('name' in item) || !('book' in item) ||
      !('chapter' in item) || !('startVerse' in item) || !('endVerse' in item) ||
      !('verses' in item) || !Array.isArray((item as Unit).verses)
    ) {
      throw new Error('פורמט קובץ לא תקין - חסרים שדות נדרשים ביחידה');
    }
  }
  return data as Unit[];
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
      currentVerseIndex: 0,
      verseFeedback: [],
    };
  }

  const units = [...state.units, createUrlUnit(normalizedUrl, state.units)];
  const newIndex = units.length - 1;
  return {
    ...state,
    units,
    activeStudentUnitIndex: newIndex,
    currentVerseIndex: 0,
    verseFeedback: [],
  };
}

function loadPersistedState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return applyUnitFromQuery(initialState);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const units = Array.isArray(parsed.units) ? parsed.units : initialState.units;
    const maxIndex = Math.max(units.length - 1, 0);
    const activeStudentUnitIndex = Math.min(Math.max(Number(parsed.activeStudentUnitIndex) || 0, 0), maxIndex);
    const activeAdminUnitIndex = Math.min(Math.max(Number(parsed.activeAdminUnitIndex) || 0, 0), maxIndex);
    const hydratedState: AppState = {
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
  importStatus: ImportStatus;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadPersistedState());
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Capture initial units at mount time so the import effect can check them
  // without listing the full `state` in its dependency array (one-shot on mount only).
  const initialUnitsRef = useRef(state.units);

  // Deep-link import: fetch Unit[] from ?unit= query param on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unitParam = new URLSearchParams(window.location.search).get('unit');
    if (!unitParam) return;

    const normalizedUrl = normalizeUrl(unitParam);
    if (!normalizedUrl) return;

    const controller = new AbortController();

    const cleanQueryParam = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('unit');
      window.history.replaceState({}, '', url.toString());
    };

    // Check if already imported with real content (non-placeholder)
    const alreadyImported = initialUnitsRef.current.some(
      u => u.sourceUrl === normalizedUrl && u.verses[0]?.text !== PLACEHOLDER_VERSE_TEXT
    );
    if (alreadyImported) {
      cleanQueryParam();
      return;
    }

    setImportStatus('in-progress');

    const doImport = async () => {
      try {
        const response = await fetch(normalizedUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const importedUnits = validateImportedUnits(data).map(u => ({ ...u, sourceUrl: normalizedUrl }));

        setState(prev => {
          const filtered = prev.units.filter(
            u => !(u.sourceUrl === normalizedUrl && u.verses[0]?.text === PLACEHOLDER_VERSE_TEXT)
          );
          const appendedStart = filtered.length;
          return {
            ...prev,
            units: [...filtered, ...importedUnits],
            activeStudentUnitIndex: appendedStart,
            activeAdminUnitIndex: appendedStart,
            currentVerseIndex: 0,
            verseFeedback: [],
          };
        });
        setImportStatus('success');
        cleanQueryParam();
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.error('[torah-trainer] deep-link import failed:', err);
        setState(prev => ({
          ...prev,
          units: prev.units.filter(
            u => !(u.sourceUrl === normalizedUrl && u.verses[0]?.text === PLACEHOLDER_VERSE_TEXT)
          ),
        }));
        setImportStatus('failure');
        cleanQueryParam();
      }
    };

    doImport();
    return () => controller.abort();
  }, []);

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
    <AppContext.Provider value={{ state, setState, setFeedback, goToNextVerse, goToPrevVerse, activeAudioRef, stopAnyAudio, playAudioUrl, importStatus }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
