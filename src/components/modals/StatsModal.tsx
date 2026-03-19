import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getDateString } from '@/utils/hebrew';
import { X } from 'lucide-react';

type Period = 'today' | 'yesterday' | 'week' | 'all';

export default function StatsModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const [period, setPeriod] = useState<Period>('today');

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = getDateString(today);
    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    const getCombinedToday = () => {
      const h = state.history[todayStr] || { minutes: 0, exc: 0, med: 0, imp: 0 };
      return {
        totalMinutes: h.minutes + state.currentSession.minutes,
        totalExc: h.exc + state.currentSession.exc,
        totalMed: h.med + state.currentSession.med,
        totalImp: h.imp + state.currentSession.imp,
      };
    };

    let dailyData: { label: string; minutes: number }[] = [];
    let totals = { totalMinutes: 0, totalExc: 0, totalMed: 0, totalImp: 0 };

    if (period === 'today') {
      totals = getCombinedToday();
      dailyData = [{ label: 'היום', minutes: totals.totalMinutes }];
    } else if (period === 'yesterday') {
      const d = new Date(); d.setDate(today.getDate() - 1);
      const yData = state.history[getDateString(d)] || { minutes: 0, exc: 0, med: 0, imp: 0 };
      totals = { totalMinutes: yData.minutes, totalExc: yData.exc, totalMed: yData.med, totalImp: yData.imp };
      dailyData = [{ label: 'אתמול', minutes: totals.totalMinutes }];
    } else if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const dData = i === 0 ? getCombinedToday() : (() => { const h = state.history[getDateString(d)] || { minutes: 0, exc: 0, med: 0, imp: 0 }; return { totalMinutes: h.minutes, totalExc: h.exc, totalMed: h.med, totalImp: h.imp }; })();
        totals.totalMinutes += dData.totalMinutes;
        totals.totalExc += dData.totalExc;
        totals.totalMed += dData.totalMed;
        totals.totalImp += dData.totalImp;
        dailyData.push({ label: dayNames[d.getDay()], minutes: dData.totalMinutes });
      }
    } else {
      for (let i = 14; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const dData = i === 0 ? getCombinedToday() : (() => { const h = state.history[getDateString(d)] || { minutes: 0, exc: 0, med: 0, imp: 0 }; return { totalMinutes: h.minutes, totalExc: h.exc, totalMed: h.med, totalImp: h.imp }; })();
        totals.totalMinutes += dData.totalMinutes;
        totals.totalExc += dData.totalExc;
        totals.totalMed += dData.totalMed;
        totals.totalImp += dData.totalImp;
        if (i <= 7) dailyData.push({ label: i === 0 ? 'היום' : '', minutes: dData.totalMinutes });
      }
    }

    const totalFeedbacks = totals.totalExc + totals.totalMed + totals.totalImp;
    const avg = totalFeedbacks > 0 ? Math.round(((totals.totalExc * 100) + (totals.totalMed * 57) + (totals.totalImp * 50)) / totalFeedbacks) : 0;

    return { ...totals, dailyData, avg };
  }, [state, period]);

  const maxMinutes = Math.max(...stats.dailyData.map(d => d.minutes), 10);

  return (
    <div className="absolute inset-0 bg-foreground/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground text-2xl">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center text-primary">ההתקדמות שלי</h2>

        <div className="mb-6">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="w-full bg-secondary border-2 border-primary/20 text-secondary-foreground rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="today">היום</option>
            <option value="yesterday">אתמול</option>
            <option value="week">השבוע (7 ימים אחרונים)</option>
            <option value="all">כל הזמן</option>
          </select>
        </div>

        <div className="text-center mb-6">
          <div className="text-sm font-bold text-muted-foreground mb-1">ציון ממוצע לתקופה</div>
          <div className={`text-5xl font-black ${stats.avg >= 85 ? 'text-feedback-excellent' : stats.avg >= 65 ? 'text-feedback-medium' : 'text-feedback-improve'}`}>
            {stats.avg}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-bold text-muted-foreground mb-2 flex justify-between items-end">
            <span>דקות לימוד</span>
            <span className="text-5xl font-black text-primary leading-none">{stats.totalMinutes}</span>
          </div>
          <div className="flex items-end justify-around h-32 gap-1 border-b-2 border-border pb-1">
            {stats.dailyData.map((item, i) => (
              <div key={i} className="flex flex-col items-center flex-grow h-full justify-end">
                <span className="text-[10px] font-bold text-muted-foreground mb-1">{item.minutes}ד'</span>
                <div className="chart-bar w-full max-w-[20px]" style={{ height: `${(item.minutes / maxMinutes) * 100}%` }} />
                <span className="text-xs font-bold text-muted-foreground mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted rounded-2xl p-4 mb-2">
          <div className="text-sm font-bold text-foreground mb-3 text-center">פסוקים שקראתי:</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-feedback-excellent-light rounded-lg p-2 border border-feedback-excellent-border">
              <div className="text-xl font-bold text-feedback-excellent">{stats.totalExc}</div>
              <div className="text-[10px] font-bold text-feedback-excellent">מצוין</div>
            </div>
            <div className="bg-feedback-medium-light rounded-lg p-2 border border-feedback-medium-border">
              <div className="text-xl font-bold text-feedback-medium">{stats.totalMed}</div>
              <div className="text-[10px] font-bold text-feedback-medium">בינוני</div>
            </div>
            <div className="bg-feedback-improve-light rounded-lg p-2 border border-feedback-improve-border">
              <div className="text-xl font-bold text-feedback-improve">{stats.totalImp}</div>
              <div className="text-[10px] font-bold text-feedback-improve">לשיפר</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
