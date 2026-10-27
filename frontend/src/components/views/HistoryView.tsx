import React, { useMemo } from 'react';
import {
  FileSpreadsheet,
  FileCode,
  TrendingUp,
  Smile,
  Play,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { UserData } from '../../types';
import { api } from '../../services/api';

interface HistoryViewProps {
  userData: UserData | null;
  onStartStudy?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ userData, onStartStudy }) => {
  const sessions = useMemo(() => {
    return userData?.sessions || [];
  }, [userData]);

  const totalStudyMinutes = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.study_minutes || 0), 0);
  }, [sessions]);

  const totalBreakMinutes = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.break_minutes || 0), 0);
  }, [sessions]);

  const totalHours = (totalStudyMinutes / 60).toFixed(1);

  // Prepare chart data only when >= 2 sessions exist
  const chartData = useMemo(() => {
    return sessions.map((s, idx) => ({
      index: idx + 1,
      name: s.task_name ? (s.task_name.length > 16 ? s.task_name.slice(0, 16) + '…' : s.task_name) : `S${idx + 1}`,
      study: s.study_minutes || 0,
      break: s.break_minutes || 0,
      date: s.date || s.timestamp?.split('T')[0] || `S${idx + 1}`,
    }));
  }, [sessions]);

  const adaptationOffset = userData?.adaptation_offset ?? 0;
  const lastFeedback = userData?.last_feedback || 'None';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Progress & Session History
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Review completed study sessions, feedback adaptation records, and export your personal data.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={api.getExportJsonUrl()}
            download="study_intelligence_data.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-stone-700 font-medium text-xs border border-stone-200 hover:bg-stone-50 transition shadow-2xs"
          >
            <FileCode className="w-3.5 h-3.5 text-stone-500" />
            <span>Export JSON</span>
          </a>
          <a
            href={api.getExportCsvUrl()}
            download="study_sessions.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e0564c] hover:bg-[#cf473d] text-white font-medium text-xs transition shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Total Focus Time</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-stone-900">{totalStudyMinutes}m</span>
            <span className="text-[11px] text-stone-400">({totalHours}h)</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Logged focus minutes</span>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Sessions Completed</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-stone-900">{sessions.length}</span>
            <span className="text-[11px] text-stone-400">sessions</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Study intervals finished</span>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Rest Restored</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-700">{totalBreakMinutes}m</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Recovery buffers taken</span>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Adaptive Offset</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold font-mono ${adaptationOffset !== 0 ? 'text-[#c93f35]' : 'text-stone-700'}`}>
              {adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset}m
            </span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block truncate">Last: {lastFeedback}</span>
        </div>
      </div>

      {/* 3. Study Trends Chart (Only when >= 2 sessions recorded) */}
      {sessions.length >= 2 ? (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#c93f35]" />
                Study Duration Progression
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Logged session minutes across recent study intervals.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-stone-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#e0564c] inline-block" />
                Study (mins)
              </span>
              <span className="flex items-center gap-1 text-stone-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                Break (mins)
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e0564c" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#e0564c" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="breakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 rounded-lg shadow-md border border-stone-200 text-xs space-y-1">
                          <p className="font-semibold text-stone-800">{data.name}</p>
                          <p className="text-stone-400 text-[10px]">{data.date}</p>
                          <div className="pt-1 space-y-0.5 border-t border-stone-100 font-mono">
                            <p className="text-[#c93f35]">Study: {data.study}m</p>
                            <p className="text-emerald-700">Break: {data.break}m</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="study"
                  stroke="#e0564c"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#studyGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="break"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#breakGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {/* 4. Detailed History Table */}
      {sessions.length > 0 ? (
        <Card padding="none">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">
              Completed Session Logs ({sessions.length})
            </h2>
            <span className="text-2xs text-stone-400">Chronological list</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-mono">#</th>
                  <th className="py-2.5 px-4">Coursework Task</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Study</th>
                  <th className="py-2.5 px-4">Break</th>
                  <th className="py-2.5 px-4">Student Feedback</th>
                  <th className="py-2.5 px-4">Post-Break Energy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 font-mono text-[11px]">
                {sessions.map((session, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/60 transition">
                    <td className="py-2.5 px-4 text-stone-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-stone-900">
                      {session.task_name || 'General Study Session'}
                    </td>
                    <td className="py-2.5 px-4 text-stone-500">
                      {session.date || (session.timestamp ? session.timestamp.replace('T', ' ').slice(0, 16) : '—')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#c93f35]">
                      {session.study_minutes}m
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-700">
                      {session.break_minutes}m
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {session.feedback ? (
                        <Badge
                          variant={
                            session.feedback === 'Just right'
                              ? 'emerald'
                              : session.feedback === 'Too long'
                              ? 'amber'
                              : 'blue'
                          }
                          size="sm"
                        >
                          {session.feedback}
                        </Badge>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {session.post_break_energy ? (
                        <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded text-[10px]">
                          <Smile className="w-3 h-3 text-stone-400" />
                          <span>{session.post_break_energy}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card padding="lg">
          <div className="py-12 text-center text-stone-500">
            <Clock className="w-10 h-10 mx-auto text-stone-300 mb-2" />
            <h3 className="text-sm font-semibold text-stone-800">No Study Sessions Logged Yet</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
              Start a focus timer in the Study Advisor or complete a scheduled task in the Planner to log your first session.
            </p>
            {onStartStudy && (
              <button
                onClick={onStartStudy}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e0564c] hover:bg-[#cf473d] text-white rounded-lg text-xs font-semibold shadow-2xs transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start First Study Session</span>
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
