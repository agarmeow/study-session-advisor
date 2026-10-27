import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Play,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { MetricCard } from '../common/MetricCard';
import type { DailySchedule, Task } from '../../types';
import { api } from '../../services/api';

interface PlannerViewProps {
  tasks: Task[];
  onStartStudy?: (taskName: string, durationMinutes: number) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({ tasks: _tasks, onStartStudy }) => {
  const [availableTimeMinutes, setAvailableTimeMinutes] = useState<number>(180);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(10);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlgoDetails, setShowAlgoDetails] = useState<boolean>(false);

  const hours = (availableTimeMinutes / 60).toFixed(1);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.generateSchedule(availableTimeMinutes, breakDurationMinutes);
      setSchedule(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Generate initial schedule on mount
    handleGenerate();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-coral-50 text-coral-600 border border-coral-100">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Heuristic Session Planner
            </h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Greedy Best-First Search (GBFS) automated daily scheduler prioritizing urgency, difficulty, and stamina.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-coral-600 text-white font-medium text-sm shadow-sm hover:bg-coral-700 transition disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Computing Schedule...' : 'Regenerate Schedule'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Panel Card */}
      <Card orientation="vertical" padding="lg">
        <h2 className="text-base font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-coral-600" />
          Planning Budget & Constraints
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700">Available Study Time Today</span>
              <span className="font-semibold text-coral-600 bg-coral-50 border border-coral-200 px-2.5 py-0.5 rounded-full text-xs">
                {hours} hrs ({availableTimeMinutes} mins)
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={480}
              step={15}
              value={availableTimeMinutes}
              onChange={(e) => setAvailableTimeMinutes(Number(e.target.value))}
              className="w-full accent-coral-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-neutral-400">
              <span>30 mins</span>
              <span>2 hrs (120m)</span>
              <span>4 hrs (240m)</span>
              <span>6 hrs (360m)</span>
              <span>8 hrs (480m)</span>
            </div>
          </div>

          {/* Break Duration Selector */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-neutral-700">
              Preferred Rest Break Between Tasks
            </span>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setBreakDurationMinutes(duration)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border flex items-center justify-center gap-2 transition ${
                    breakDurationMinutes === duration
                      ? 'bg-coral-50 text-coral-700 border-coral-300 font-semibold'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  {duration} mins
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Short cognitive resets maintain task retention without inducing context switching fatigue.
            </p>
          </div>
        </div>
      </Card>

      {/* Feasibility & Budget Metrics */}
      {schedule && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Time Budget"
            value={`${schedule.available_budget_minutes}m`}
            subtitle={`${(schedule.available_budget_minutes / 60).toFixed(1)} hours allocation`}
            icon={<Clock className="w-5 h-5 text-neutral-500" />}
          />
          <MetricCard
            title="Total Planned"
            value={`${schedule.total_planned_time}m`}
            subtitle={`${schedule.total_study_time}m study + ${schedule.total_break_time}m breaks`}
            icon={<Layers className="w-5 h-5 text-coral-600" />}
            badge={
              schedule.is_feasible ? (
                <Badge variant="success">Feasible</Badge>
              ) : (
                <Badge variant="danger">Exceeded</Badge>
              )
            }
          />
          <MetricCard
            title="Study Time"
            value={`${schedule.total_study_time}m`}
            subtitle={`${schedule.scheduled_tasks.length} task${schedule.scheduled_tasks.length === 1 ? '' : 's'} scheduled`}
            icon={<BookOpen className="w-5 h-5 text-blue-600" />}
          />
          <MetricCard
            title="Remaining Buffer"
            value={`${schedule.remaining_available_time}m`}
            subtitle="Spare unallocated buffer"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />
        </div>
      )}

      {/* Main Timeline View */}
      {schedule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-coral-600" />
              Generated Schedule Timeline
            </h2>
            <span className="text-xs text-neutral-500">
              {schedule.blocks.length} time block{schedule.blocks.length === 1 ? '' : 's'}
            </span>
          </div>

          {schedule.blocks.length === 0 ? (
            <Card orientation="vertical" padding="lg">
              <div className="py-8 text-center text-neutral-500">
                <Clock className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                <p className="font-medium text-neutral-700">No tasks fit within current time budget</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Try increasing your available study time slider above or add shorter tasks in the Task Manager.
                </p>
              </div>
            </Card>
          ) : (
            <div className="relative border-l-2 border-coral-200 ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-4">
              {schedule.blocks.map((block, idx) => {
                const isStudy = block.block_type === 'study';

                return (
                  <div key={idx} className="relative group">
                    {/* Circle timeline pin */}
                    <span
                      className={`absolute -left-[25px] sm:-left-[33px] top-4 w-4 h-4 rounded-full border-2 border-white ring-2 ${
                        isStudy ? 'bg-coral-600 ring-coral-200' : 'bg-emerald-500 ring-emerald-100'
                      }`}
                    />

                    <div
                      className={`p-4 rounded-xl border transition ${
                        isStudy
                          ? 'bg-white border-neutral-200 hover:border-coral-300 hover:shadow-xs'
                          : 'bg-emerald-50/50 border-emerald-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-mono">
                              {block.start_time} - {block.end_time}
                            </span>
                            <span className="text-xs text-neutral-400">
                              ({block.duration_minutes} mins)
                            </span>
                            {isStudy && block.priority_level && (
                              <Badge
                                variant={
                                  block.priority_level === 'High'
                                    ? 'danger'
                                    : block.priority_level === 'Medium'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {block.priority_level} Priority
                              </Badge>
                            )}
                            {isStudy && block.subject && (
                              <span className="text-xs text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                                {block.subject}
                              </span>
                            )}
                          </div>

                          <h3
                            className={`text-sm font-semibold flex items-center gap-2 ${
                              isStudy ? 'text-neutral-900' : 'text-emerald-800'
                            }`}
                          >
                            {isStudy ? (
                              <BookOpen className="w-4 h-4 text-coral-500 flex-shrink-0" />
                            ) : (
                              <Coffee className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            )}
                            {block.task_name}
                          </h3>
                        </div>

                        {/* Action: Quick Study Button */}
                        {isStudy && onStartStudy && (
                          <button
                            type="button"
                            onClick={() => onStartStudy(block.task_name, block.duration_minutes)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral-50 hover:bg-coral-100 text-coral-700 text-xs font-medium border border-coral-200 self-start sm:self-center transition"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Launch Session
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unscheduled Tasks Section */}
      {schedule && schedule.unscheduled_tasks.length > 0 && (
        <Card orientation="vertical" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Unscheduled Tasks ({schedule.unscheduled_tasks.length})
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mb-3">
            The GBFS optimizer excluded these tasks because they exceed the available daily time budget.
          </p>
          <div className="space-y-2">
            {schedule.unscheduled_tasks.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-neutral-800">{item.task.name}</span>
                  {item.task.subject && (
                    <span className="text-neutral-400 ml-2 font-mono">({item.task.subject})</span>
                  )}
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Est: {item.task.estimated_duration} mins | Due in {item.task.deadline_days} days
                  </div>
                </div>
                <div className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-[11px] font-medium">
                  {item.reason}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* GBFS Algorithm Details Expander */}
      {schedule && (
        <Card orientation="vertical" padding="md">
          <button
            type="button"
            onClick={() => setShowAlgoDetails(!showAlgoDetails)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-coral-600" />
              <span className="text-sm font-semibold text-neutral-900">
                AISC Heuristic Search Formalism & Execution Trace
              </span>
            </div>
            {showAlgoDetails ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {showAlgoDetails && (
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-4 text-xs text-neutral-600">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="font-semibold text-neutral-700 block">Algorithm</span>
                  <span className="text-coral-600 font-mono text-sm">
                    {schedule.algorithm_info.algorithm}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="font-semibold text-neutral-700 block">Nodes Expanded</span>
                  <span className="font-mono text-sm text-neutral-800">
                    {schedule.algorithm_info.nodes_expanded} nodes
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="font-semibold text-neutral-700 block">Heuristic Penalty</span>
                  <span className="font-mono text-xs text-neutral-600">
                    h(init): {schedule.algorithm_info.initial_heuristic?.toFixed(2) ?? 'N/A'} → h(final):{' '}
                    {schedule.algorithm_info.final_heuristic?.toFixed(2) ?? 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 leading-relaxed">
                <h4 className="font-semibold text-neutral-800">Formal State Representation:</h4>
                <p>
                  State <span className="font-mono bg-neutral-100 px-1 rounded">S = (T_rem, t_elapsed)</span>, where <span className="font-mono">T_rem</span> is the set of unassigned study tasks and <span className="font-mono">t_elapsed</span> is the accumulated planned time.
                </p>
                <h4 className="font-semibold text-neutral-800">Heuristic Evaluation Function:</h4>
                <p className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 font-mono text-[11px] text-neutral-800">
                  h(n) = Σ [ Priority(t) × (1 + Duration(t) / (Deadline(t) × 60)) ]
                </p>
                <p>
                  Minimizing <span className="font-mono">h(n)</span> guides search toward states that complete the highest priority tasks closest to their deadlines earliest, subject to the hard constraint:
                  <span className="font-mono ml-1">t_elapsed + duration(t) + break_duration ≤ Budget</span>.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
