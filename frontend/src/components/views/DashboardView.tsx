import React from 'react';
import {
  Compass,
  CheckSquare,
  ArrowRight,
  Plus,
  Play,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { UserData } from '../../types';
import type { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  userData: UserData;
  onNavigate: (tab: NavTab) => void;
  onNewTask: () => void;
  onStartTask?: (taskName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userData,
  onNavigate,
  onNewTask,
  onStartTask,
}) => {
  const { tasks = [], sessions = [], preferences, adaptation_offset = 0 } = userData;

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.study_minutes || 0), 0);
  const totalBreakMinutes = sessions.reduce((acc, s) => acc + (s.break_minutes || 0), 0);
  const completedSessionsCount = sessions.length;

  // Sorted tasks by priority score descending
  const sortedTasks = [...tasks].sort(
    (a, b) => (b.priority_score || 0) - (a.priority_score || 0)
  );
  const topTasks = sortedTasks.slice(0, 4);
  const urgentTask = sortedTasks.find((t) => (t.deadline_days ?? 99) <= 2) || sortedTasks[0];

  // Recent 3 sessions
  const recentSessions = [...sessions].reverse().slice(0, 3);

  // Today's Date formatting
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* 1. Compact Editorial Greeting Header (No giant gradient!) */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {todayFormatted}
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span className="text-[11px] text-stone-500 font-medium">
              Routine: {preferences?.study_time || 'Morning'} • {preferences?.focus_style || 'Balanced'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            {urgentTask ? (
              <span>
                Focus target: <span className="text-[#c93f35] font-semibold">{urgentTask.name}</span>
              </span>
            ) : (
              <span>Ready for today's study?</span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            {tasks.length > 0
              ? `You have ${tasks.length} active coursework task${tasks.length === 1 ? '' : 's'}. Check your stamina to generate an optimal focus interval.`
              : 'Add your courses and assignments to receive fuzzy-prioritized study recommendations.'}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => onNavigate('advisor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#e0564c] hover:bg-[#cf473d] text-white text-xs font-semibold shadow-xs transition"
          >
            <Compass className="w-4 h-4" />
            <span>Check Stamina & Advise</span>
          </button>
          <button
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-medium border border-stone-200 transition"
          >
            <CalendarDays className="w-4 h-4 text-stone-500" />
            <span>Open Planner</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Status Strip: Answering "How much time / progress do I have?" */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Total Focus Time</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-stone-900 font-mono">{totalStudyMinutes}m</span>
            <span className="text-[11px] text-stone-400">({(totalStudyMinutes / 60).toFixed(1)}h)</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">{completedSessionsCount} sessions completed</span>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Active Tasks</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-stone-900 font-mono">{tasks.length}</span>
            <span className="text-[11px] text-stone-400">in queue</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            {tasks.filter((t) => t.priority_level?.includes('High')).length} high priority
          </span>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Rest Taken</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-emerald-700 font-mono">{totalBreakMinutes}m</span>
            <span className="text-[11px] text-stone-400">breaks</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Recovery buffers logged</span>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block">Adaptive Tuning</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold font-mono ${adaptation_offset !== 0 ? 'text-[#c93f35]' : 'text-stone-700'}`}>
              {adaptation_offset > 0 ? `+${adaptation_offset}` : adaptation_offset}m
            </span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Personalized feedback loop</span>
        </div>
      </div>

      {/* 3. Primary Content & Supporting Side Panel: Answering "What should I work on today?" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: What to work on today (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            padding="md"
            title="Today's Priority Coursework"
            subtitle="Ranked dynamically by the 27-rule Mamdani fuzzy prioritizer"
            action={
              tasks.length > 0 ? (
                <button
                  onClick={() => onNavigate('tasks')}
                  className="text-xs font-medium text-[#c93f35] hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage tasks ({tasks.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null
            }
          >
            {topTasks.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {topTasks.map((task, idx) => {
                  const isUrgent = (task.deadline_days ?? 99) <= 2;
                  const isHigh = task.priority_level?.includes('High');

                  return (
                    <div
                      key={idx}
                      className="py-3 sm:py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-stone-900 group-hover:text-[#c93f35] transition-colors">
                            {task.name}
                          </span>
                          {task.subject && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                              {task.subject}
                            </span>
                          )}
                          {isUrgent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Due in {task.deadline_days}d
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-2xs text-stone-500 font-mono">
                          <span>⏱ {task.estimated_duration}m duration</span>
                          <span>•</span>
                          <span>Due: {task.deadline_days} days</span>
                          <span>•</span>
                          <span>Diff: {task.difficulty}/10</span>
                          <span>•</span>
                          <span>Imp: {task.importance}/10</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                        <Badge
                          variant={
                            isHigh
                              ? 'coral'
                              : task.priority_level?.includes('Medium')
                              ? 'amber'
                              : 'slate'
                          }
                          size="sm"
                        >
                          Score: {Math.round(task.priority_score || 0)}
                        </Badge>

                        {onStartTask && (
                          <button
                            type="button"
                            onClick={() => onStartTask(task.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-50 hover:bg-[#fdf2f1] hover:text-[#c93f35] text-stone-700 border border-stone-200/80 transition"
                            title="Launch this task in Study Advisor"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Study</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <CheckSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-stone-800">No coursework tasks registered yet</h4>
                <p className="text-2xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Add your current assignments or exam topics. The fuzzy prioritizer will rank them by urgency and difficulty.
                </p>
                <button
                  onClick={onNewTask}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Task</span>
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Right: How to start & Recent History (1 col) */}
        <div className="space-y-4">
          {/* Quick Launch Card */}
          <Card padding="md" title="How to Start Today">
            <div className="space-y-3 text-xs">
              <div
                onClick={() => onNavigate('advisor')}
                className="p-3 rounded-lg border border-stone-200/80 bg-stone-50 hover:bg-[#fdf2f1] hover:border-[#f8d4d1] cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 group-hover:text-[#c93f35]">
                    1. Check-In Stamina
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#c93f35]" />
                </div>
                <p className="text-2xs text-stone-500 mt-1">
                  Rate your sleep and energy to receive adapted study & break recommendations.
                </p>
              </div>

              <div
                onClick={() => onNavigate('planner')}
                className="p-3 rounded-lg border border-stone-200/80 bg-stone-50 hover:bg-stone-100/70 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 group-hover:text-stone-900">
                    2. Plan Today's Schedule
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
                </div>
                <p className="text-2xs text-stone-500 mt-1">
                  Specify your available time budget and let GBFS schedule tasks feasibly with rest breaks.
                </p>
              </div>
            </div>
          </Card>

          {/* Recent Activity (only when sessions exist) */}
          {recentSessions.length > 0 && (
            <Card
              padding="md"
              title="Recent Activity"
              action={
                <button
                  onClick={() => onNavigate('history')}
                  className="text-xs text-[#c93f35] font-medium hover:underline inline-flex items-center gap-1"
                >
                  <span>History</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              }
            >
              <div className="space-y-2.5">
                {recentSessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-stone-100 bg-stone-50/50 text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-stone-800 line-clamp-1">{s.task_name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{s.date || 'Recent'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span className="font-mono text-[#c93f35] font-medium">{s.study_minutes}m study</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-700 font-medium">{s.break_minutes}m break</span>
                      {s.feedback && (
                        <>
                          <span>•</span>
                          <span className="text-stone-600 bg-white px-1.5 py-0.2 rounded border border-stone-200 text-[10px]">
                            {s.feedback}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
