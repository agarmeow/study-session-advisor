import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  Sparkles,
  Coffee,
  AlertTriangle,
  Play,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { DailySchedule, Task } from '../../types';
import { api } from '../../services/api';

interface PlannerViewProps {
  tasks: Task[];
  onStartStudy?: (taskName: string, durationMinutes: number) => void;
  onNavigateToTechnical?: () => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  tasks: _tasks,
  onStartStudy,
  onNavigateToTechnical,
}) => {
  // Input parameters (slider & break duration)
  const [availableTimeMinutes, setAvailableTimeMinutes] = useState<number>(180);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(10);

  // Active calculated schedule state
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [lastAppliedBudget, setLastAppliedBudget] = useState<number>(180);
  const [lastAppliedBreak, setLastAppliedBreak] = useState<number>(10);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current user inputs differ from the currently displayed schedule
  const isStale =
    schedule !== null &&
    (availableTimeMinutes !== lastAppliedBudget || breakDurationMinutes !== lastAppliedBreak);

  const hours = (availableTimeMinutes / 60).toFixed(1);

  const handleGenerate = async (budgetToUse = availableTimeMinutes, breakToUse = breakDurationMinutes) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.generateSchedule(budgetToUse, breakToUse);
      setSchedule(data);
      setLastAppliedBudget(budgetToUse);
      setLastAppliedBreak(breakToUse);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schedule. Please try again.');
      // Preserves existing valid schedule upon failure!
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Generate initial baseline schedule on mount
    handleGenerate(180, 10);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#fdf2f1] text-[#c93f35] border border-[#f8d4d1]">
              <CalendarDays className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Smart Daily Planner
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Greedy Best-First Search schedule construction fitting your available time budget with recovery rest breaks.
          </p>
        </div>

        {/* Header Action Button */}
        <button
          onClick={() => handleGenerate(availableTimeMinutes, breakDurationMinutes)}
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs shadow-xs transition ${
            isStale
              ? 'bg-[#e0564c] hover:bg-[#cf473d] text-white ring-2 ring-[#e0564c]/20'
              : 'bg-stone-900 hover:bg-stone-800 text-white'
          } disabled:opacity-50`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Calculating Schedule...</span>
            </>
          ) : isStale ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Update Schedule (Inputs Changed)</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalculate Schedule</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Planning Controls Card */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#c93f35]" />
            Planning Time Budget & Rest Parameters
          </h2>
          {isStale && (
            <span className="text-[11px] font-semibold text-[#c93f35] bg-[#fdf2f1] px-2.5 py-0.5 rounded-full border border-[#f8d4d1] animate-pulse">
              Inputs changed — update to refresh
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available Time Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="budget-slider" className="font-medium text-stone-700">
                Available Study Time Today
              </label>
              <span className="font-semibold text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                {hours} hrs ({availableTimeMinutes}m)
              </span>
            </div>
            <input
              id="budget-slider"
              type="range"
              min={30}
              max={480}
              step={15}
              value={availableTimeMinutes}
              onChange={(e) => setAvailableTimeMinutes(Number(e.target.value))}
              className="w-full accent-[#e0564c] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-mono">
              <span>30m</span>
              <span>2h (120m)</span>
              <span>3h (180m)</span>
              <span>5h (300m)</span>
              <span>8h (480m)</span>
            </div>
          </div>

          {/* Preferred Rest Break */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-stone-700">
              Rest Break Between Coursework Tasks
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setBreakDurationMinutes(duration)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition ${
                    breakDurationMinutes === duration
                      ? 'bg-[#fdf2f1] text-[#c93f35] border-[#f8d4d1] font-semibold shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>{duration} mins</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Rest intervals are automatically inserted between scheduled study tasks to prevent cognitive fatigue.
            </p>
          </div>
        </div>

        {/* In-Card Prompt & Action Bar when inputs are modified */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/60 -mx-4 -mb-4 p-4 rounded-b-xl">
          <div className="text-xs text-stone-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-stone-400 flex-shrink-0" />
            {isStale ? (
              <span>
                You adjusted the budget to <strong>{availableTimeMinutes}m</strong> ({breakDurationMinutes}m breaks). Click to apply.
              </span>
            ) : (
              <span>
                Schedule is up to date for <strong>{lastAppliedBudget} minutes</strong> budget.
              </span>
            )}
          </div>

          <button
            onClick={() => handleGenerate(availableTimeMinutes, breakDurationMinutes)}
            disabled={isLoading || !isStale}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition ${
              isStale
                ? 'bg-[#e0564c] hover:bg-[#cf473d] text-white cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply & Update Schedule</span>
          </button>
        </div>
      </Card>

      {/* 3. Real Derived Schedule Metrics (Directly from returned active schedule) */}
      {schedule && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-stone-500 block">Available Budget</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-stone-900 font-mono">
                {schedule.available_budget_minutes}m
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                ({(schedule.available_budget_minutes / 60).toFixed(1)}h)
              </span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">Allocated daily envelope</span>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-stone-500 block">Total Planned</span>
              <Badge
                variant={schedule.is_feasible ? 'emerald' : 'coral'}
                size="sm"
              >
                {schedule.is_feasible ? 'Feasible' : 'Exceeded'}
              </Badge>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-stone-900 font-mono">
                {schedule.total_planned_time}m
              </span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block font-mono">
              {schedule.total_study_time}m study + {schedule.total_break_time}m rest
            </span>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-stone-500 block">Scheduled Tasks</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-stone-900 font-mono">
                {schedule.scheduled_tasks.length}
              </span>
              <span className="text-[11px] text-stone-400">tasks fit</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              {schedule.unscheduled_tasks.length} tasks omitted
            </span>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-stone-500 block">Remaining Buffer</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-emerald-700 font-mono">
                {schedule.remaining_available_time}m
              </span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">Unallocated margin</span>
          </div>
        </div>
      )}

      {/* 4. Chronological Visual Schedule Timeline */}
      {schedule && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#c93f35]" />
                Daily Schedule Timeline
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Sequential study intervals and restorative breaks ordered by priority.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {schedule.blocks.length} block{schedule.blocks.length === 1 ? '' : 's'}
            </span>
          </div>

          {schedule.blocks.length === 0 ? (
            <div className="py-12 text-center text-stone-500">
              <Clock className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs font-semibold text-stone-800">No tasks fit within this time budget</p>
              <p className="text-2xs text-stone-400 mt-1 max-w-sm mx-auto">
                Try increasing the available time slider above, or create shorter tasks in My Tasks.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-stone-200 ml-4 pl-4 sm:pl-6 space-y-3.5 my-2">
              {schedule.blocks.map((block, idx) => {
                const isStudy = block.block_type === 'study';

                return (
                  <div key={idx} className="relative group">
                    {/* Circle pin indicator */}
                    <span
                      className={`absolute -left-[23px] sm:-left-[31px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
                        isStudy ? 'bg-[#e0564c] ring-[#f8d4d1]' : 'bg-emerald-500 ring-emerald-100'
                      }`}
                    />

                    <div
                      className={`p-3.5 rounded-lg border transition ${
                        isStudy
                          ? 'bg-white border-stone-200/90 hover:border-stone-300 shadow-2xs'
                          : 'bg-emerald-50/40 border-emerald-100/90 text-emerald-900'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                              {block.start_time} - {block.end_time}
                            </span>
                            <span className="text-[11px] text-stone-400 font-mono">
                              ({block.duration_minutes} min)
                            </span>
                            {isStudy && block.priority_level && (
                              <Badge
                                variant={
                                  block.priority_level.includes('High')
                                    ? 'coral'
                                    : block.priority_level.includes('Medium')
                                    ? 'amber'
                                    : 'slate'
                                }
                                size="sm"
                              >
                                {block.priority_level}
                              </Badge>
                            )}
                            {isStudy && block.subject && (
                              <span className="text-[11px] text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/60">
                                {block.subject}
                              </span>
                            )}
                          </div>

                          <h3
                            className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 ${
                              isStudy ? 'text-stone-900' : 'text-emerald-800'
                            }`}
                          >
                            {isStudy ? (
                              <BookOpen className="w-3.5 h-3.5 text-[#c93f35] flex-shrink-0" />
                            ) : (
                              <Coffee className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            )}
                            <span>{block.task_name}</span>
                          </h3>
                        </div>

                        {/* Direct Study Button */}
                        {isStudy && onStartStudy && (
                          <button
                            type="button"
                            onClick={() => onStartStudy(block.task_name, block.duration_minutes)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-50 hover:bg-[#fdf2f1] hover:text-[#c93f35] text-stone-700 border border-stone-200 transition self-start sm:self-center"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Launch Timer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 5. Unscheduled Tasks Section */}
      {schedule && schedule.unscheduled_tasks.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-stone-900">
              Unscheduled Coursework ({schedule.unscheduled_tasks.length})
            </h3>
          </div>
          <p className="text-2xs text-stone-500 mb-3">
            These tasks exceed the current daily time budget and could not be fitted feasibly:
          </p>

          <div className="space-y-2">
            {schedule.unscheduled_tasks.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-stone-50/70 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-stone-800">{item.task.name}</span>
                  {item.task.subject && (
                    <span className="text-stone-400 ml-2 font-mono text-[11px]">({item.task.subject})</span>
                  )}
                  <div className="text-stone-400 text-[11px] mt-0.5 font-mono">
                    Needs: {item.task.estimated_duration} mins | Due in {item.task.deadline_days} days
                  </div>
                </div>
                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium self-start sm:self-center">
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. Subtle Technical Pointer (NO technical section repeated inside normal planner) */}
      <div className="p-4 rounded-xl border border-stone-200/70 bg-stone-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <span>
            Curious about the search algorithm? Inspect the formal GBFS state space and heuristic formulation.
          </span>
        </div>
        {onNavigateToTechnical && (
          <button
            onClick={onNavigateToTechnical}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#c93f35] hover:underline flex-shrink-0"
          >
            <span>View Technical Details</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
