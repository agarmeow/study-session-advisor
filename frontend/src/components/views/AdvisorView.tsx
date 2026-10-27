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
  CheckCircle2,
  AlertCircle,
  Sliders,
  ThumbsUp,
  Plus,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type {
  Task,
  RecommendationRequest,
  RecommendationResponse,
  SessionRecord,
} from '../../types';
import { api } from '../../services/api';

interface AdvisorViewProps {
  tasks: Task[];
  onSessionLogged: () => void;
  activeRecommendation: RecommendationResponse | null;
  setActiveRecommendation: (rec: RecommendationResponse | null) => void;
  initialTaskName?: string;
  adaptationOffset?: number;
  lastFeedback?: string | null;
}

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  tasks,
  onSessionLogged,
  activeRecommendation,
  setActiveRecommendation,
  initialTaskName,
  adaptationOffset = 0,
  lastFeedback,
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

  // Timer configuration & tracking state
  const [timerMode, setTimerMode] = useState<'study' | 'break'>('study');
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'finished' | 'feedback_submitted'>('idle');
  const [plannedStudyMinutes, setPlannedStudyMinutes] = useState<number>(25);
  const [plannedBreakMinutes, setPlannedBreakMinutes] = useState<number>(10);
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [elapsedStudySeconds, setElapsedStudySeconds] = useState<number>(0);
  const [elapsedBreakSeconds, setElapsedBreakSeconds] = useState<number>(0);
  const [timerTaskName, setTimerTaskName] = useState<string>(initialTaskName || 'General Study Session');

  // Completion & Feedback state
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<SessionRecord | null>(null);
  const [postBreakEnergy, setPostBreakEnergy] = useState<string>('Better ⚡');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<{
    submitted: boolean;
    choice?: string;
    newOffset?: number;
    message?: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer countdown effect
  useEffect(() => {
    if (timerState === 'running') {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            handleCountdownZero();
            return 0;
          }
          return prev - 1;
        });

        if (timerMode === 'study') {
          setElapsedStudySeconds((prev) => prev + 1);
        } else {
          setElapsedBreakSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerState, timerMode]);

  // When timer naturally reaches zero
  const handleCountdownZero = () => {
    if (timerMode === 'study') {
      // Study interval completed! Switch to scheduled break
      const breakMins = plannedBreakMinutes;
      setTimerMode('break');
      setTotalSeconds(breakMins * 60);
      setRemainingSeconds(breakMins * 60);
      setTimerState('paused');
    } else {
      // Break countdown completed! Automatically finish session
      handleFinishSession();
    }
  };

  // Generate Fuzzy Recommendation
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
      const studyMins = res.adapted.final_study_minutes;
      const breakMins = res.adapted.final_break_minutes;

      setPlannedStudyMinutes(studyMins);
      setPlannedBreakMinutes(breakMins);
      setTotalSeconds(studyMins * 60);
      setRemainingSeconds(studyMins * 60);
      setElapsedStudySeconds(0);
      setElapsedBreakSeconds(0);
      setTimerMode('study');
      setTimerState('idle');
      setTimerTaskName(selectedTask);
      setCompletedSession(null);
      setFeedbackStatus(null);
      setSessionSaveError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to compute recommendation');
    } finally {
      setLoading(false);
    }
  };

  // Load into Timer and start
  const loadRecommendationIntoTimer = () => {
    if (!activeRecommendation) return;
    const studyMins = activeRecommendation.adapted.final_study_minutes;
    const breakMins = activeRecommendation.adapted.final_break_minutes;
    setPlannedStudyMinutes(studyMins);
    setPlannedBreakMinutes(breakMins);
    setTotalSeconds(studyMins * 60);
    setRemainingSeconds(studyMins * 60);
    setElapsedStudySeconds(0);
    setElapsedBreakSeconds(0);
    setTimerMode('study');
    setTimerState('running');
    setTimerTaskName(activeRecommendation.task_name || 'General Study Session');
    setCompletedSession(null);
    setFeedbackStatus(null);
    setSessionSaveError(null);
  };

  // 1. Finish Session Action (running or paused, early or completed)
  const handleFinishSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsSavingSession(true);
    setSessionSaveError(null);

    // Calculate actual study minutes
    let actualStudyMins = Math.round(elapsedStudySeconds / 60);
    if (timerMode === 'study' && remainingSeconds === 0) {
      actualStudyMins = plannedStudyMinutes;
    }
    actualStudyMins = Math.max(1, actualStudyMins);

    let actualBreakMins = Math.round(elapsedBreakSeconds / 60);
    if (timerMode === 'break' && remainingSeconds === 0) {
      actualBreakMins = plannedBreakMinutes;
    }

    const completionTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await api.recordSession({
        task_name: timerTaskName,
        study_minutes: actualStudyMins,
        planned_study_minutes: plannedStudyMinutes,
        actual_study_minutes: actualStudyMins,
        break_minutes: actualBreakMins,
        completion_time: completionTimeStr,
      });

      setCompletedSession(res.session);
      setTimerState('finished');
      setFeedbackStatus(null);
      onSessionLogged(); // Refreshes application history & metrics
    } catch (err: any) {
      setSessionSaveError(err.message || 'Failed to record session on backend. Please retry.');
    } finally {
      setIsSavingSession(false);
    }
  };

  // 2. Adaptive Feedback Submission
  const handleSubmitFeedback = async (choice: 'Too Short' | 'Just Right' | 'Too Long') => {
    if (!completedSession) return;
    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const res = await api.submitFeedback({
        session_id: completedSession.id,
        feedback: choice,
        post_break_energy: postBreakEnergy,
      });

      setFeedbackStatus({
        submitted: true,
        choice,
        newOffset: res.new_adaptation_offset,
        message: res.message,
      });
      setTimerState('feedback_submitted');
      onSessionLogged(); // Updates adaptive offset across the whole application
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // 3. Reset Timer Action (Does NOT record any session)
  const handleResetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState('idle');
    setTimerMode('study');
    setTotalSeconds(plannedStudyMinutes * 60);
    setRemainingSeconds(plannedStudyMinutes * 60);
    setElapsedStudySeconds(0);
    setElapsedBreakSeconds(0);
    setSessionSaveError(null);
    setCompletedSession(null);
    setFeedbackStatus(null);
  };

  // +1 minute manual advance
  const handleAdvanceOneMinute = () => {
    setRemainingSeconds((prev) => {
      const next = Math.max(0, prev - 60);
      if (next === 0 && prev > 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        handleCountdownZero();
      }
      return next;
    });

    if (timerMode === 'study') {
      setElapsedStudySeconds((prev) => prev + 60);
    } else {
      setElapsedBreakSeconds((prev) => prev + 60);
    }
  };

  // Switch to Break mode
  const handleSwitchToBreak = () => {
    setTimerMode('break');
    setTotalSeconds(plannedBreakMinutes * 60);
    setRemainingSeconds(plannedBreakMinutes * 60);
    setTimerState('paused');
  };

  // Switch back to Study mode
  const handleSwitchBackToStudy = () => {
    setTimerMode('study');
    setTotalSeconds(plannedStudyMinutes * 60);
    const remainingStudy = Math.max(60, (plannedStudyMinutes * 60) - elapsedStudySeconds);
    setRemainingSeconds(remainingStudy);
    setTimerState('paused');
  };

  const handleStartNewSession = () => {
    handleResetTimer();
  };

  // Timer display calculation
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Status Strip: Visible Adaptive Feedback Tuning Offset */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-stone-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
            <Sliders className="w-3.5 h-3.5 text-[#e0564c]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-900">Current Adaptive Offset:</span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                  adaptationOffset > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : adaptationOffset < 0
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                {adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset}m
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              {lastFeedback
                ? `Most recent session rated "${lastFeedback}". Offset bounded between -15m and +15m.`
                : 'Offset fine-tunes future recommendations automatically based on your session feedback.'}
            </p>
          </div>
        </div>
        <Badge variant={adaptationOffset !== 0 ? 'coral' : 'neutral'} size="sm">
          {adaptationOffset !== 0 ? 'Feedback Tuning Active' : 'Neutral Offset (0m)'}
        </Badge>
      </div>

      {/* 1. Compact Stamina Check-In Form */}
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

      {/* 3. Focus Countdown Timer & Active Session Controls */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#c93f35]" />
            <h2 className="text-sm font-semibold text-stone-900">Study & Rest Focus Timer</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={timerMode === 'study' ? 'coral' : 'emerald'} size="sm">
              {timerMode === 'study' ? 'Study Block' : 'Rest Break'}
            </Badge>
            <Badge variant="neutral" size="sm">
              {timerState === 'running'
                ? 'Running'
                : timerState === 'paused'
                ? 'Paused'
                : timerState === 'finished'
                ? 'Finished'
                : timerState === 'feedback_submitted'
                ? 'Logged'
                : 'Not Started'}
            </Badge>
          </div>
        </div>

        {/* Backend Error Banner if recording fails */}
        {sessionSaveError && (
          <div className="my-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{sessionSaveError}</span>
            </div>
            <button
              onClick={handleFinishSession}
              disabled={isSavingSession}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
            >
              {isSavingSession ? 'Retrying...' : 'Retry Finish'}
            </button>
          </div>
        )}

        <div className="max-w-md mx-auto text-center py-4 space-y-4">
          <div className="text-xs font-medium text-stone-500">
            Target Coursework: <strong className="text-stone-800">{timerTaskName}</strong>
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

          {/* Mode description hint */}
          <p className="text-[11px] text-stone-400">
            {timerMode === 'study'
              ? `Planned study block: ${plannedStudyMinutes}m • Elapsed study: ${Math.floor(elapsedStudySeconds / 60)}m ${elapsedStudySeconds % 60}s`
              : `Planned break block: ${plannedBreakMinutes}m • Elapsed break: ${Math.floor(elapsedBreakSeconds / 60)}m ${elapsedBreakSeconds % 60}s`}
          </p>

          {/* Primary Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {/* Start / Pause / Resume Controls */}
            {timerState === 'running' ? (
              <button
                onClick={() => setTimerState('paused')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition shadow-2xs"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : timerState === 'paused' ? (
              <button
                onClick={() => setTimerState('running')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#e0564c] hover:bg-[#cf473d] text-white shadow-2xs transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={() => setTimerState('running')}
                disabled={timerState === 'finished'}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[#e0564c] hover:bg-[#cf473d] text-white shadow-xs transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{timerMode === 'study' ? 'Start Focus' : 'Start Break'}</span>
              </button>
            )}

            {/* Finish Session Button: Visible when session is running or paused */}
            {(timerState === 'running' || timerState === 'paused') && (
              <button
                onClick={handleFinishSession}
                disabled={isSavingSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                title="Finish and record this study session immediately"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSavingSession ? 'Recording...' : 'Finish Session'}</span>
              </button>
            )}

            {/* Reset Button (Does NOT mark session completed) */}
            <button
              onClick={handleResetTimer}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              title="Reset countdown without recording a completed session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* +1m Fast Forward */}
            <button
              onClick={handleAdvanceOneMinute}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              title="Advance timer countdown by 1 minute"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+1m</span>
            </button>

            {/* Mode switch: To Break / Back to Study */}
            {timerMode === 'study' ? (
              <button
                onClick={handleSwitchToBreak}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition"
                title="Switch to recovery break interval"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>To Break</span>
              </button>
            ) : (
              <button
                onClick={handleSwitchBackToStudy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#fdf2f1] text-[#c93f35] hover:bg-[#fae6e4] border border-[#f8d4d1] transition"
                title="Return to study mode"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Back to Study</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Session Summary & Adaptive Feedback Section (Appears after finishing) */}
        {(timerState === 'finished' || timerState === 'feedback_submitted') && completedSession && (
          <div className="mt-5 pt-5 border-t border-stone-200 space-y-4 text-left">
            {/* Session Summary Card */}
            <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-900">Study Session Completed & Logged</span>
                </div>
                <Badge variant="emerald" size="sm">
                  1 History Entry Saved
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 block font-medium">Task</span>
                  <strong className="text-stone-900 text-xs block truncate mt-0.5">
                    {completedSession.task_name}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 block font-medium">Actual Focus</span>
                  <strong className="text-[#c93f35] text-xs block font-mono mt-0.5">
                    {completedSession.actual_study_minutes ?? completedSession.study_minutes}m{' '}
                    <span className="text-[10px] font-normal text-stone-400">
                      (plan: {completedSession.planned_study_minutes ?? plannedStudyMinutes}m)
                    </span>
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 block font-medium">Break Recorded</span>
                  <strong className="text-emerald-700 text-xs block font-mono mt-0.5">
                    {completedSession.break_minutes}m
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 block font-medium">Completion Time</span>
                  <strong className="text-stone-700 text-xs block font-mono mt-0.5">
                    {completedSession.completion_time || completedSession.timestamp}
                  </strong>
                </div>
              </div>
            </div>

            {/* Adaptive Feedback Submission Controls */}
            <div className="bg-white border border-stone-200/90 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-[#e0564c]" />
                    <span>How did this study session duration feel?</span>
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Your assessment tunes the cumulative adaptation offset (±5m per session, bounded within ±15m).
                  </p>
                </div>
              </div>

              {/* Feedback Error Notice if submission failed */}
              {feedbackError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {feedbackError}
                </div>
              )}

              {/* Success Banner if Feedback Submitted */}
              {feedbackStatus?.submitted ? (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-950">
                        Adaptive Feedback Saved!
                      </span>
                    </div>
                    <Badge variant="emerald" size="sm">
                      Rated: {feedbackStatus.choice}
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Adaptive tuning offset is now{' '}
                    <strong className="font-mono">
                      {feedbackStatus.newOffset !== undefined && feedbackStatus.newOffset > 0
                        ? `+${feedbackStatus.newOffset}`
                        : feedbackStatus.newOffset}
                      m
                    </strong>
                    . Subsequent study recommendations will automatically incorporate this adjustment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {/* Three Clear Adaptive Feedback Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmittingFeedback}
                      onClick={() => handleSubmitFeedback('Too Short')}
                      className="p-3 text-left rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 bg-white transition group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 group-hover:text-amber-900">
                          Too Short
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          +5m
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                        I still had stamina and wanted to continue studying.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingFeedback}
                      onClick={() => handleSubmitFeedback('Just Right')}
                      className="p-3 text-left rounded-lg border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 bg-white transition group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 group-hover:text-emerald-900">
                          Just Right
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          ±0m
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                        The interval felt optimal and productive.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingFeedback}
                      onClick={() => handleSubmitFeedback('Too Long')}
                      className="p-3 text-left rounded-lg border border-stone-200 hover:border-blue-300 hover:bg-blue-50/50 bg-white transition group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 group-hover:text-blue-900">
                          Too Long
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          -5m
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                        I started losing focus or felt fatigued before the end.
                      </p>
                    </button>
                  </div>

                  {/* Post-Break Energy Assessment */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-medium text-stone-600">
                      How do you feel after the session?
                    </span>
                    <div className="flex items-center gap-1.5">
                      {['Better ⚡', 'Unchanged', 'Lower 😴'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPostBreakEnergy(opt)}
                          className={`px-2.5 py-1 rounded text-xs transition ${
                            postBreakEnergy === opt
                              ? 'bg-stone-900 text-white font-semibold'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Start Next Session / Clean Reset Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleStartNewSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-semibold shadow-2xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Focus Session</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
