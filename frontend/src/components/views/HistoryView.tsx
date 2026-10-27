import React, { useMemo } from 'react';
import {
  History,
  Clock,
  Coffee,
  Activity,
  Award,
  FileSpreadsheet,
  FileCode,
  TrendingUp,
  Smile,
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
import { MetricCard } from '../common/MetricCard';
import type { UserData } from '../../types';
import { api } from '../../services/api';

interface HistoryViewProps {
  userData: UserData | null;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ userData }) => {
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

  // Prepare chart data (reverse or sort chronological)
  const chartData = useMemo(() => {
    return sessions.map((s, idx) => ({
      index: idx + 1,
      name: s.task_name ? (s.task_name.length > 14 ? s.task_name.slice(0, 14) + '…' : s.task_name) : `Session ${idx + 1}`,
      study: s.study_minutes || 0,
      break: s.break_minutes || 0,
      date: s.date || s.timestamp?.split('T')[0] || `S${idx + 1}`
    }));
  }, [sessions]);

  const adaptationOffset = userData?.adaptation_offset ?? 0;
  const lastFeedback = userData?.last_feedback || 'None';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-coral-50 text-coral-600 border border-coral-100">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Session History & Adaptation Analytics
            </h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Review completed study sessions, feedback loops, and how fuzzy recommendations adapt over time.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={api.getExportJsonUrl()}
            download="study_data.json"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-neutral-700 font-medium text-xs border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition shadow-2xs"
          >
            <FileCode className="w-4 h-4 text-neutral-500" />
            Export JSON
          </a>
          <a
            href={api.getExportCsvUrl()}
            download="study_sessions.csv"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-coral-600 text-white font-medium text-xs hover:bg-coral-700 transition shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Study Time"
          value={`${totalStudyMinutes}m`}
          subtitle={`${totalHours} hours accumulated`}
          icon={<Clock className="w-5 h-5 text-coral-600" />}
        />
        <MetricCard
          title="Sessions Completed"
          value={sessions.length.toString()}
          subtitle="Study intervals logged"
          icon={<Award className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Rest Restored"
          value={`${totalBreakMinutes}m`}
          subtitle="Recovery breaks logged"
          icon={<Coffee className="w-5 h-5 text-blue-600" />}
        />
        <MetricCard
          title="Adaptive Offset"
          value={`${adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset}m`}
          subtitle={`Last feedback: ${lastFeedback}`}
          icon={<Activity className="w-5 h-5 text-purple-600" />}
          badge={
            <Badge variant={adaptationOffset === 0 ? 'neutral' : adaptationOffset > 0 ? 'success' : 'warning'}>
              Feedback loop active
            </Badge>
          }
        />
      </div>

      {/* Study Volume Trends Chart */}
      {sessions.length > 0 ? (
        <Card orientation="vertical" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-coral-600" />
                Study Session Progression
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Duration (minutes) across recorded study sessions.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-neutral-600">
                <span className="w-3 h-3 rounded-xs bg-coral-500 inline-block" />
                Study Minutes
              </span>
              <span className="flex items-center gap-1.5 text-neutral-600">
                <span className="w-3 h-3 rounded-xs bg-emerald-400 inline-block" />
                Break Minutes
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="studyColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e0564c" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#e0564c" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="breakColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#737373' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#737373' }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-neutral-100 text-xs space-y-1">
                          <p className="font-semibold text-neutral-800">{data.name}</p>
                          <p className="text-neutral-500">{data.date}</p>
                          <div className="pt-1 space-y-0.5 border-t border-neutral-100">
                            <p className="text-coral-600 font-medium">Study: {data.study} mins</p>
                            <p className="text-emerald-600 font-medium">Break: {data.break} mins</p>
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
                  fill="url(#studyColor)"
                />
                <Area
                  type="monotone"
                  dataKey="break"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#breakColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Card orientation="vertical" padding="lg">
          <div className="py-12 text-center text-neutral-500">
            <Clock className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <h3 className="text-base font-semibold text-neutral-800">No Study Sessions Logged Yet</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
              Start a study session timer in the Advisor view or complete a scheduled task in the Planner to build your intelligence history.
            </p>
          </div>
        </Card>
      )}

      {/* Detailed Log Table */}
      {sessions.length > 0 && (
        <Card orientation="vertical" padding="none">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">
              Session Log Records ({sessions.length})
            </h3>
            <span className="text-xs text-neutral-400">Chronological history</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Study Mins</th>
                  <th className="py-3 px-4">Break Mins</th>
                  <th className="py-3 px-4">User Feedback</th>
                  <th className="py-3 px-4">Post-Break Energy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {sessions.map((session, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3 px-4 font-mono text-neutral-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {session.task_name || 'General Study Session'}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {session.date || (session.timestamp ? session.timestamp.replace('T', ' ').slice(0, 16) : '—')}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-coral-600">
                      {session.study_minutes}m
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-600">
                      {session.break_minutes}m
                    </td>
                    <td className="py-3 px-4">
                      {session.feedback ? (
                        <Badge
                          variant={
                            session.feedback === 'Just right'
                              ? 'success'
                              : session.feedback === 'Too long'
                              ? 'warning'
                              : session.feedback === 'Too short'
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {session.feedback}
                        </Badge>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {session.post_break_energy ? (
                        <span className="inline-flex items-center gap-1 text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                          <Smile className="w-3 h-3 text-neutral-400" />
                          {session.post_break_energy}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
