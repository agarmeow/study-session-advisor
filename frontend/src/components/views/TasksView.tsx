import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { Task } from '../../types';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: {
    name: string;
    subject?: string;
    estimated_duration: number;
    deadline_days: number;
    difficulty: number;
    importance: number;
  }) => Promise<void>;
  onDeleteTask: (index: number) => Promise<void>;
  onResetTasks: () => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onDeleteTask,
  onResetTasks,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(45);
  const [deadlineDays, setDeadlineDays] = useState(2.0);
  const [difficulty, setDifficulty] = useState(5.0);
  const [importance, setImportance] = useState(7.0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedReasonIndex, setExpandedReasonIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Task name is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onAddTask({
        name: name.trim(),
        subject: subject.trim() || 'General',
        estimated_duration: Number(duration),
        deadline_days: Number(deadlineDays),
        difficulty: Number(difficulty),
        importance: Number(importance),
      });
      setName('');
      setSubject('');
      setDuration(45);
      setDeadlineDays(2.0);
      setDifficulty(5.0);
      setImportance(7.0);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority === 'all') return true;
    return t.priority_level === filterPriority;
  });

  const highCount = tasks.filter((t) => t.priority_level === 'High Priority').length;
  const medCount = tasks.filter((t) => t.priority_level === 'Medium Priority').length;
  const lowCount = tasks.filter((t) => t.priority_level === 'Low Priority').length;

  return (
    <div className="space-y-6">
      {/* Priority Summary & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterPriority('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterPriority === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setFilterPriority('High Priority')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterPriority === 'High Priority'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            High ({highCount})
          </button>
          <button
            onClick={() => setFilterPriority('Medium Priority')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterPriority === 'Medium Priority'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Medium ({medCount})
          </button>
          <button
            onClick={() => setFilterPriority('Low Priority')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterPriority === 'Low Priority'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Low ({lowCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onResetTasks()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Reset to default sample tasks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Samples</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Coursework Task</span>
          </button>
        </div>
      </div>

      {/* Task Creation Form Card */}
      {showAddForm && (
        <Card
          title="Create New Coursework Task"
          subtitle="All fields are evaluated dynamically by the 27-rule Mamdani fuzzy prioritizer."
          className="border-rose-200 bg-rose-50/10"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title*
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems Lab 3: Page Replacement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject / Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (min)*: <span className="text-rose-600 font-bold">{duration}m</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 10)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Days to Deadline*: <span className="text-rose-600 font-bold">{deadlineDays}d</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="0.5"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Difficulty (0–10): <span className="text-slate-800 font-bold">{difficulty}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={difficulty}
                  onChange={(e) => setDifficulty(parseFloat(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg mt-3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Importance (0–10): <span className="text-slate-800 font-bold">{importance}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={importance}
                  onChange={(e) => setImportance(parseFloat(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg mt-3"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Evaluating Priority...' : 'Add & Prioritize'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task, idx) => {
            const isHigh = task.priority_level === 'High Priority';
            const isMed = task.priority_level === 'Medium Priority';
            const isExpanded = expandedReasonIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 tracking-tight">
                        {task.name}
                      </h4>
                      <span className="text-xs font-medium text-slate-500">
                        [{task.subject}]
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>⏱️ <b>{task.estimated_duration} min</b></span>
                      <span>•</span>
                      <span>⏳ <b>{task.deadline_days} days</b> to deadline</span>
                      <span>•</span>
                      <span>📚 Diff: <b>{task.difficulty}/10</b></span>
                      <span>•</span>
                      <span>⭐ Imp: <b>{task.importance}/10</b></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <Badge variant={isHigh ? 'coral' : isMed ? 'amber' : 'emerald'}>
                      {task.priority_level} ({task.priority_score}/100)
                    </Badge>

                    <button
                      onClick={() => onDeleteTask(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Fuzzy Reason Note */}
                <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-3 text-xs">
                  <div className="text-slate-600 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className={isExpanded ? '' : 'line-clamp-1'}>
                      <span className="font-semibold text-slate-800">Fuzzy Reason:</span>{' '}
                      {task.priority_reason || 'Computed by Mamdani rules across urgency and importance.'}
                    </p>
                  </div>

                  {task.priority_reason && task.priority_reason.length > 80 && (
                    <button
                      onClick={() => setExpandedReasonIndex(isExpanded ? null : idx)}
                      className="text-2xs font-semibold text-rose-600 hover:text-rose-700 flex-shrink-0"
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl text-center py-12 px-4">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800 text-sm">No tasks matching filter</h4>
            <p className="text-xs text-slate-500 mt-1">
              Add a new assignment or clear the priority filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
