import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Play,
  X,
} from 'lucide-react';
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
  onStudyTask?: (taskName: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onDeleteTask,
  onResetTasks,
  onStudyTask,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
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
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority === 'all') return true;
    return t.priority_level?.includes(filterPriority);
  });

  const highCount = tasks.filter((t) => t.priority_level?.includes('High')).length;
  const medCount = tasks.filter((t) => t.priority_level?.includes('Medium')).length;
  const lowCount = tasks.filter((t) => t.priority_level?.includes('Low')).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Coursework Priority Queue
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            27-rule Mamdani fuzzy system maps urgency, importance, and difficulty to priority scores.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onResetTasks()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg border border-stone-200 transition"
            title="Reset to default sample coursework tasks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Samples</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#e0564c] hover:bg-[#cf473d] text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Coursework Task</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Filter Chips Bar */}
      <div className="flex items-center gap-1.5 bg-stone-100/80 p-1 rounded-lg w-fit border border-stone-200/80">
        <button
          onClick={() => setFilterPriority('all')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition ${
            filterPriority === 'all'
              ? 'bg-white text-stone-900 font-semibold shadow-2xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilterPriority('High')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition ${
            filterPriority === 'High'
              ? 'bg-white text-[#c93f35] font-semibold shadow-2xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          High ({highCount})
        </button>
        <button
          onClick={() => setFilterPriority('Medium')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition ${
            filterPriority === 'Medium'
              ? 'bg-white text-amber-800 font-semibold shadow-2xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Medium ({medCount})
        </button>
        <button
          onClick={() => setFilterPriority('Low')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition ${
            filterPriority === 'Low'
              ? 'bg-white text-emerald-800 font-semibold shadow-2xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Low ({lowCount})
        </button>
      </div>

      {/* 3. Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task, idx) => {
            const isHigh = task.priority_level?.includes('High');
            const isMed = task.priority_level?.includes('Medium');
            const isExpanded = expandedReasonIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:border-stone-300 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-xs sm:text-sm text-stone-900">
                        {task.name}
                      </h3>
                      {task.subject && (
                        <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                          {task.subject}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 font-mono">
                      <span>⏱ {task.estimated_duration}m duration</span>
                      <span>•</span>
                      <span>Due in {task.deadline_days} days</span>
                      <span>•</span>
                      <span>Diff: {task.difficulty}/10</span>
                      <span>•</span>
                      <span>Imp: {task.importance}/10</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                    <Badge variant={isHigh ? 'coral' : isMed ? 'amber' : 'slate'}>
                      {task.priority_level} (Score {Math.round(task.priority_score || 0)})
                    </Badge>

                    {onStudyTask && (
                      <button
                        onClick={() => onStudyTask(task.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-50 hover:bg-[#fdf2f1] hover:text-[#c93f35] text-stone-700 border border-stone-200 transition"
                        title="Study this task in Advisor"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Study</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteTask(idx)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete task"
                      aria-label={`Delete task ${task.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Priority Reason Note */}
                <div className="pt-2.5 border-t border-stone-100 flex items-start justify-between gap-3 text-xs">
                  <div className="text-stone-600 flex items-start gap-1.5 leading-relaxed">
                    <HelpCircle className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
                    <p className={isExpanded ? '' : 'line-clamp-1'}>
                      <span className="font-medium text-stone-800">Fuzzy Reason:</span>{' '}
                      {task.priority_reason || 'Evaluated across deadline urgency and weight.'}
                    </p>
                  </div>

                  {task.priority_reason && task.priority_reason.length > 70 && (
                    <button
                      onClick={() => setExpandedReasonIndex(isExpanded ? null : idx)}
                      className="text-[11px] font-medium text-[#c93f35] hover:underline flex-shrink-0"
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl text-center py-12 px-4">
            <CheckSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h4 className="font-semibold text-stone-800 text-xs sm:text-sm">No tasks matching current filter</h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Add coursework tasks to evaluate and schedule your upcoming deadlines.
            </p>
          </div>
        )}
      </div>

      {/* 4. Task Creation Dialog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#fdf2f1] text-[#c93f35] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Add Coursework Task</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="modal-task-title" className="block text-xs font-medium text-stone-700">
                    Task Title*
                  </label>
                  <input
                    id="modal-task-title"
                    type="text"
                    placeholder="e.g. Distributed Systems Lab 2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#e0564c]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="modal-task-subject" className="block text-xs font-medium text-stone-700">
                    Subject
                  </label>
                  <input
                    id="modal-task-subject"
                    type="text"
                    placeholder="e.g. CS 402"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#e0564c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="modal-task-duration" className="block text-xs font-medium text-stone-700">
                    Duration (minutes)*
                  </label>
                  <input
                    id="modal-task-duration"
                    type="number"
                    min="10"
                    max="300"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 10)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-800 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-task-deadline" className="block text-xs font-medium text-stone-700">
                    Days to Deadline*
                  </label>
                  <input
                    id="modal-task-deadline"
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-800 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">Difficulty (0–10)</span>
                    <span className="font-mono text-stone-900 font-semibold">{difficulty}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseFloat(e.target.value))}
                    className="w-full accent-[#e0564c] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">Importance (0–10)</span>
                    <span className="font-mono text-stone-900 font-semibold">{importance}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={importance}
                    onChange={(e) => setImportance(parseFloat(e.target.value))}
                    className="w-full accent-[#e0564c] cursor-pointer"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#e0564c] hover:bg-[#cf473d] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                >
                  {submitting ? 'Prioritizing...' : 'Save & Prioritize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
