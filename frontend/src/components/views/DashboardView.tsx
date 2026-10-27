import React from 'react';
import {
  Sparkles,
  CheckSquare,
  Clock,
  ArrowRight,
  Plus,
  BookOpen,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { MetricCard } from '../common/MetricCard';
import type { UserData } from '../../types';
import type { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  userData: UserData;
  onNavigate: (tab: NavTab) => void;
  onNewTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userData,
  onNavigate,
  onNewTask,
}) => {
  const { tasks = [], sessions = [], preferences } = userData;

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.study_minutes || 0), 0);
  const totalBreakMinutes = sessions.reduce((acc, s) => acc + (s.break_minutes || 0), 0);
  const completedSessionsCount = sessions.length;

  // Next urgent tasks
  const topTasks = [...tasks]
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    .slice(0, 4);

  // Recent 3 sessions
  const recentSessions = [...sessions].reverse().slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card */}
      <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Decision Support Active
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Welcome to your Study Intelligence System
          </h2>
          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed mb-5">
            Optimize your study efficiency with Mamdani fuzzy reasoning and heuristic search.
            Check in your stamina to receive tailored session lengths, or prioritize urgent coursework.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('advisor')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <span>Get Study Recommendation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('planner')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/60 hover:bg-rose-600 text-white border border-white/20 font-semibold text-xs rounded-xl transition-colors"
            >
              <span>Open Smart Planner</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative background blur */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Study Time"
          value={`${totalStudyMinutes} min`}
          subtext={`${(totalStudyMinutes / 60).toFixed(1)}h logged • ${totalBreakMinutes}m breaks`}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          label="Sessions Logged"
          value={completedSessionsCount}
          subtext="Completed study blocks"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <MetricCard
          label="Active Coursework"
          value={tasks.length}
          subtext={`${tasks.filter((t) => t.priority_level === 'High Priority').length} high priority`}
          icon={<CheckSquare className="w-4 h-4" />}
        />
        <MetricCard
          label="Focus Routine"
          value={preferences.focus_style || 'Balanced'}
          subtext={`Preferred time: ${preferences.study_time || 'Morning'}`}
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>

      {/* Dual Column Section: Urgent Coursework & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks (2 cols on lg) */}
        <div className="lg:col-span-2">
          <Card
            title="High-Priority Coursework"
            subtitle="Prioritized dynamically via 27-rule Mamdani fuzzy inference"
            action={
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
              >
                <span>View all ({tasks.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {topTasks.length > 0 ? (
              <div className="space-y-3">
                {topTasks.map((task, idx) => {
                  const isHigh = task.priority_level === 'High Priority';
                  const isMed = task.priority_level === 'Medium Priority';
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900">
                            {task.name}
                          </span>
                          <span className="text-2xs text-slate-500 font-medium">
                            • {task.subject}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-2xs text-slate-500">
                          <span>⏱️ {task.estimated_duration} min</span>
                          <span>•</span>
                          <span>⏳ {task.deadline_days} days to deadline</span>
                          <span>•</span>
                          <span>📚 Diff: {task.difficulty}/10</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge variant={isHigh ? 'coral' : isMed ? 'amber' : 'emerald'}>
                          {task.priority_level || 'Evaluated'} ({task.priority_score || 0}/100)
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No coursework tasks registered yet.</p>
                <button
                  onClick={onNewTask}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Task</span>
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity (1 col on lg) */}
        <div className="lg:col-span-1">
          <Card
            title="Recent Activity"
            subtitle="Recent completed sessions and feedback"
            action={
              <button
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
              >
                <span>Full log</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-900 line-clamp-1">
                        {s.task_name}
                      </span>
                      <span className="text-2xs text-slate-400 flex-shrink-0">
                        {s.date || 'Recent'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-2xs text-slate-500">
                      <span>📚 {s.study_minutes}m study</span>
                      <span>☕ {s.break_minutes}m break</span>
                    </div>
                    {s.feedback && (
                      <div className="mt-2 text-2xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                        <span className="font-medium text-slate-400">Feedback:</span>
                        <span className="font-semibold text-slate-700">{s.feedback}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No session history recorded.</p>
                <p className="text-2xs text-slate-400 mt-1">
                  Complete your first study timer session to start logging analytics.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
