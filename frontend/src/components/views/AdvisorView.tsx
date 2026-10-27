import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Coffee,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type {
  Task,
  RecommendationRequest,
  RecommendationResponse,
} from '../../types';
import { api } from '../../services/api';

interface AdvisorViewProps {
  tasks: Task[];
  onSessionLogged: () => void;
  activeRecommendation: RecommendationResponse | null;
  setActiveRecommendation: (rec: RecommendationResponse | null) => void;
  initialTaskName?: string;
}

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  tasks,
  onSessionLogged,
  activeRecommendation,
  setActiveRecommendation,
  initialTaskName,
}) => {
  // Input form state
  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [energy, setEnergy] = useState<'Drained' | 'Okay' | 'Energized'>('Okay');
  const [deadline, setDeadline] = useState<'Today' | 'Near' | 'Far'>('Near');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [selectedTask, setSelectedTask] = useState<string>(initialTaskName || 'General Study Session');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showFiredRules, setShowFiredRules] = useState<boolean>(false);

  // Sync initialTaskName if it changes from outside
  useEffect(() => {
    if (initialTaskName) {
      setSelectedTask(initialTaskName);
    }
  }, [initialTaskName]);

  // Timer state
  const [timerMode, setTimerMode] = useState<'study' | 'break'>('study');
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [timerTaskName, setTimerTaskName] = useState<string>(initialTaskName || 'General Study Session');
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);

  // Feedback form state
  const [feedbackChoice, setFeedbackChoice] = useState<string>('Just right');
  const [postBreakEnergy, setPostBreakEnergy] = useState<string>('Better ⚡');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer countdown effect
  useEffect(() => {
    if (timerState === 'running') {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, timerMode]);

  const handleTimerComplete = () => {
    if (timerMode === 'study') {
      const breakMinutes = activeRecommendation?.adapted.final_break_minutes || 10;
      setTimerMode('break');
      setTotalSeconds(breakMinutes * 60);
      setRemainingSeconds(breakMinutes * 60);
      setTimerState('paused');
    } else {
      setTimerState('completed');
      setShowFeedbackModal(true);
    }
  };

  const handleGenerateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const energyMap = { Drained: 1.5, Okay: 5.0, Energized: 8.5 };
    const deadlineMap = { Today: 0.5, Near: 2.5, Far: 8.0 };
    const difficultyMap = { Easy: 2.5, Medium: 5.0, Hard: 8.5 };

    const req: RecommendationRequest = {
      sleep_hours: sleepHours,
      energy: energyMap[energy],
      energy_label: energy === 'Drained' ? 'Drained (Low energy)' : energy === 'Energized' ? 'Energized (Fresh)' : 'Okay (Steady)',
      days_to_deadline: deadlineMap[deadline],
      deadline_label: deadline === 'Today' ? 'Today / Imminent (< 24 hours)' : deadline === 'Near' ? 'In 2–3 Days (Near)' : 'In a Week or Later (Far)',
      difficulty: difficultyMap[difficulty],
      difficulty_label: difficulty === 'Hard' ? 'Hard (Challenging)' : difficulty === 'Easy' ? 'Easy (Familiar review)' : 'Medium (Standard coursework)',
      task_name: selectedTask,
    };

    try {
      const res = await api.getRecommendation(req);
      setActiveRecommendation(res);
      // Pre-load duration into timer
      const studyMins = res.adapted.final_study_minutes;
      setTotalSeconds(studyMins * 60);
      setRemainingSeconds(studyMins * 60);
      setTimerMode('study');
      setTimerState('idle');
      setTimerTaskName(selectedTask);
    } catch (err: any) {
      setError(err.message || 'Failed to compute recommendation');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendationIntoTimer = () => {
    if (!activeRecommendation) return;
    const studyMins = activeRecommendation.adapted.final_study_minutes;
    setTotalSeconds(studyMins * 60);
    setRemainingSeconds(studyMins * 60);
    setTimerMode('study');
    setTimerState('running');
    setTimerTaskName(activeRecommendation.task_name || 'General Study Session');
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const studyMins = activeRecommendation?.adapted.final_study_minutes || 25;
      const breakMins = activeRecommendation?.adapted.final_break_minutes || 10;
      await api.recordSession({
        task_name: timerTaskName,
        study_minutes: studyMins,
        break_minutes: breakMins,
        feedback: feedbackChoice,
        post_break_energy: postBreakEnergy,
      });
      setShowFeedbackModal(false);
      setTimerState('idle');
      setTimerMode('study');
      setTotalSeconds(25 * 60);
      setRemainingSeconds(25 * 60);
      onSessionLogged();
    } catch (err: any) {
      alert(`Error recording session: ${err.message}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Timer values
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Compact Check-In Form */}
      <Card
        padding="md"
        title="Stamina Check-In & Study Advisor"
        subtitle="Mamdani fuzzy inference evaluates your physical reserves and topic complexity to recommend an ideal study interval."
      >
        <form onSubmit={handleGenerateRecommendation} className="space-y-5">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Physical Stamina */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-stone-700">Sleep Last Night</span>
                  <span className="font-semibold text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {sleepHours} hours
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full accent-[#e0564c] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-0.5">
                  <span>0h (Severe deficit)</span>
                  <span>6h</span>
                  <span>8h (Restful)</span>
                  <span>12h</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-stone-700 mb-1.5">
                  Current Energy Level
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Drained', label: 'Drained', sub: 'Low stamina' },
                    { id: 'Okay', label: 'Okay', sub: 'Moderate' },
                    { id: 'Energized', label: 'Energized', sub: 'Peak focus' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEnergy(item.id as any)}
                      className={`py-2 px-2.5 text-center rounded-lg border text-xs transition ${
                        energy === item.id
                          ? 'border-[#f8d4d1] bg-[#fdf2f1] text-[#c93f35] font-semibold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="leading-tight">{item.label}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Academic Context */}
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium text-stone-700 mb-1.5">
                  Nearest Due Date
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Today', label: 'Today', sub: '< 24h urgent' },
                    { id: 'Near', label: '2–3 Days', sub: 'Coming up' },
                    { id: 'Far', label: '1+ Week', sub: 'Relaxed' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDeadline(item.id as any)}
                      className={`py-2 px-2.5 text-center rounded-lg border text-xs transition ${
                        deadline === item.id
                          ? 'border-[#f8d4d1] bg-[#fdf2f1] text-[#c93f35] font-semibold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="leading-tight">{item.label}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-stone-700 mb-1.5">
                  Topic Difficulty
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Easy', label: 'Easy', sub: 'Review' },
                    { id: 'Medium', label: 'Medium', sub: 'Standard' },
                    { id: 'Hard', label: 'Hard', sub: 'Complex' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDifficulty(item.id as any)}
                      className={`py-2 px-2.5 text-center rounded-lg border text-xs transition ${
                        difficulty === item.id
                          ? 'border-[#f8d4d1] bg-[#fdf2f1] text-[#c93f35] font-semibold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="leading-tight">{item.label}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Task Assignment Dropdown & Primary Action */}
          <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-sm">
              <label htmlFor="task-select" className="block text-[11px] font-medium text-stone-600 mb-1">
                Study target (optional):
              </label>
              <select
                id="task-select"
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full text-xs rounded-lg border border-stone-200 p-2 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#e0564c]"
              >
                <option value="General Study Session">General Study Session</option>
                {tasks.map((t, idx) => (
                  <option key={idx} value={t.name}>
                    {t.name} ({t.subject || 'Coursework'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#e0564c] hover:bg-[#cf473d] text-white font-semibold text-xs rounded-lg shadow-xs transition disabled:opacity-50 self-end sm:self-auto"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Evaluating Rules...' : 'Get Study Recommendation'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
        </form>
      </Card>

      {/* 2. Structured Recommendation Results */}
      {activeRecommendation && (
        <Card padding="md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c93f35] block">
                Fuzzy Advisory Output
              </span>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 mt-0.5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#c93f35]" />
                Target: {activeRecommendation.task_name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="coral">81-Rule Mamdani Inference</Badge>
            </div>
          </div>

          {/* 4 Clean Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-stone-500 block">Recommended Study</span>
              <div className="text-xl font-bold font-mono text-[#c93f35] mt-1">
                {activeRecommendation.adapted.final_study_minutes}m
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Base fuzzy: {activeRecommendation.fuzzy.study_minutes}m
              </span>
            </div>

            <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-stone-500 block">Recommended Break</span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {activeRecommendation.adapted.final_break_minutes}m
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Rest recharge interval</span>
            </div>

            <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-stone-500 block">Study Intensity</span>
              <div className="text-sm font-bold text-stone-900 mt-1 truncate">
                {activeRecommendation.fuzzy.intensity}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Score: {activeRecommendation.fuzzy.intensity_score}/10
              </span>
            </div>

            <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-stone-500 block">Rest Needed</span>
              <div className="text-sm font-bold text-stone-900 mt-1 truncate">
                {activeRecommendation.fuzzy.rest_needed}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Score: {activeRecommendation.fuzzy.rest_score}/10
              </span>
            </div>
          </div>

          {/* Plain-English Explanation Guidance */}
          <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200/70 space-y-2 text-xs leading-relaxed text-stone-700">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#c93f35]" />
              <span>Guidance & Rationale</span>
            </div>
            <p className="font-medium text-stone-800">{activeRecommendation.explanation.guidance}</p>
            <p className="text-stone-600">{activeRecommendation.explanation.stamina_note}</p>

            {activeRecommendation.explanation.context_notes.length > 0 && (
              <div className="pt-2 border-t border-stone-200/60 space-y-0.5 text-[11px] text-stone-500">
                {activeRecommendation.explanation.context_notes.map((note, i) => (
                  <p key={i}>• {note}</p>
                ))}
              </div>
            )}
          </div>

          {/* Action to Load Into Focus Timer */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFiredRules(!showFiredRules)}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium inline-flex items-center gap-1"
            >
              <span>{showFiredRules ? 'Hide Fired Rules' : 'Inspect Fired Rules'}</span>
              {showFiredRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={loadRecommendationIntoTimer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#e0564c] hover:bg-[#cf473d] text-white font-semibold text-xs rounded-lg shadow-2xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load into Timer & Start</span>
            </button>
          </div>

          {/* Expandable Rules Details */}
          {showFiredRules && activeRecommendation.fuzzy.fired_rules && (
            <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200 text-2xs space-y-2 max-h-48 overflow-y-auto font-mono">
              <span className="font-semibold text-stone-700 block font-sans">
                Active Mamdani Rules ({activeRecommendation.fuzzy.fired_rules.length} fired):
              </span>
              {activeRecommendation.fuzzy.fired_rules.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-stone-200/60 last:border-0">
                  <span className="text-stone-700">
                    IF Sleep({item.rule[0]}) AND Energy({item.rule[1]}) AND Urgency({item.rule[2]}) AND Diff({item.rule[3]})
                  </span>
                  <span className="text-[#c93f35] font-semibold">μ = {item.strength.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. Focus Countdown Timer */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#c93f35]" />
            <h2 className="text-sm font-semibold text-stone-900">Study & Rest Focus Timer</h2>
          </div>
          <Badge variant={timerMode === 'study' ? 'coral' : 'emerald'} size="sm">
            {timerMode === 'study' ? 'Study Block' : 'Rest Break'}
          </Badge>
        </div>

        <div className="max-w-md mx-auto text-center py-4 space-y-4">
          <div className="text-xs font-medium text-stone-500">
            Target: <strong className="text-stone-800">{timerTaskName}</strong>
          </div>

          {/* Big countdown timer */}
          <div className="tabular-nums text-6xl font-bold text-stone-900 tracking-tight font-mono my-2">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>

          {/* Visual progress bar */}
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                timerMode === 'study' ? 'bg-[#e0564c]' : 'bg-emerald-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {timerState === 'running' ? (
              <button
                onClick={() => setTimerState('paused')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={() => setTimerState('running')}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[#e0564c] hover:bg-[#cf473d] text-white shadow-xs transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Focus</span>
              </button>
            )}

            <button
              onClick={() => {
                setTimerState('idle');
                setRemainingSeconds(totalSeconds);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setRemainingSeconds((prev) => Math.max(0, prev - 60))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              title="Advance timer by 1 minute"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+1m</span>
            </button>

            {timerMode === 'study' ? (
              <button
                onClick={() => {
                  const breakMinutes = activeRecommendation?.adapted.final_break_minutes || 10;
                  setTimerMode('break');
                  setTotalSeconds(breakMinutes * 60);
                  setRemainingSeconds(breakMinutes * 60);
                  setTimerState('paused');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>To Break</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const studyMinutes = activeRecommendation?.adapted.final_study_minutes || 25;
                  setTimerMode('study');
                  setTotalSeconds(studyMinutes * 60);
                  setRemainingSeconds(studyMinutes * 60);
                  setTimerState('paused');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#fdf2f1] text-[#c93f35] hover:bg-[#fae6e4] border border-[#f8d4d1] transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Back to Study</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Feedback Dialog Modal (appears upon completion) */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Session Completed!</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                How did this session feel? Your feedback tunes future duration recommendations.
              </p>
            </div>

            <form onSubmit={handleSaveFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Duration Assessment:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Too short', 'Just right', 'Too long'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFeedbackChoice(opt)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition ${
                        feedbackChoice === opt
                          ? 'border-[#f8d4d1] bg-[#fdf2f1] text-[#c93f35] font-semibold'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Post-Break Energy:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Better ⚡', 'Unchanged', 'Lower 😴'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPostBreakEnergy(opt)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition ${
                        postBreakEnergy === opt
                          ? 'border-[#f8d4d1] bg-[#fdf2f1] text-[#c93f35] font-semibold'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-4 py-1.5 rounded-lg bg-[#e0564c] hover:bg-[#cf473d] text-white text-xs font-semibold shadow-2xs transition"
                >
                  {submittingFeedback ? 'Saving...' : 'Save & Adapt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
