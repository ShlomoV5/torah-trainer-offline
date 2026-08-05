export interface Section {
  start: number;
  end: number;
  audioUrl: string | null;
}

export interface Break {
  wordIndex: number; // The index of the word AFTER which the break occurs
  type: 'petucha' | 'setuma';
}

export interface Verse {
  text: string;
  sections: Section[];
  audioUrl?: string | null;
  breaks?: Break[];
}

export interface Unit {
  id: number;
  name: string;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  verses: Verse[];
  sourceUrl?: string;
}

export interface SessionData {
  minutes: number;
  practiceSeconds: number;
  exc: number;
  med: number;
  imp: number;
}

export interface DayHistory {
  minutes: number;
  exc: number;
  med: number;
  imp: number;
}

export type FeedbackType = 'excellent' | 'medium' | 'improve';

export interface AppState {
  units: Unit[];
  activeStudentUnitIndex: number;
  activeAdminUnitIndex: number;
  currentVerseIndex: number;
  currentSession: SessionData;
  verseFeedback: (FeedbackType | undefined)[];
  history: Record<string, DayHistory>;
}
