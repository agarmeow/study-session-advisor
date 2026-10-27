import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  Coffee,
  Info,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { MetricCard } from '../common/MetricCard';
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
}

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  tasks,
  onSessionLogged,
  activeRecommendation,
  setActiveRecommendation,
}) => {
  // Input form state
  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [energy, setEnergy] = useState<'Drained' | 'Okay' | 'Energized'>('Okay');
  const [deadline, setDeadline] = useState<'Today' | 'Near' | 'Far'>('Near');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [selectedTask, setSelectedTask] = useState<string>('General Study Session');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [timerMode, setTimerMode] = useState<'study' | 'break'>('study');
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [timerTaskName, setTimerTaskName] = useState<string>('General Study Session');
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
      // Transition to break
      const breakMinutes = activeRecommendation?.adapted.final_break_minutes || 10;
      setTimerMode('break');
      setTotalSeconds(breakMinutes * 60);
      setRemainingSeconds(breakMinutes * 60);
      setTimerState('paused');
    } else {
      // Break complete -> prompt feedback
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

  // Timer controls
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)));

  return (
    <div className="space-y-6">
      {/* 10-Second Student Check-in Card */}
      <Card
        title="10-Second Student Check-in"
        subtitle="Provide your current physical stamina and academic context for Mamdani fuzzy evaluation."
        badge={<Badge variant="coral">81-Rule Fuzzy System</Badge>}
      >
        <form onSubmit={handleGenerateRecommendation} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Physical Stamina */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Sleep Last Night: <span className="text-rose-600 font-bold">{sleepHours} hours</span>
                  </label>
                  <span className="text-2xs text-slate-400">0 to 12 hrs</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Current Energy Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Drained', label: 'Drained', desc: 'Fatigued / low stamina' },
                    { id: 'Okay', label: 'Okay', desc: 'Steady / normal' },
                    { id: 'Energized', label: 'Energized', desc: 'Fresh / sharp alert' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEnergy(item.id as any)}
                      className={`p-2.5 text-center rounded-xl border transition-all ${
                        energy === item.id
                          ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-semibold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-3xs text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Academic Context */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nearest Deadline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Today', label: 'Today', desc: '< 24h urgent' },
                    { id: 'Near', label: 'In 2–3 Days', desc: 'Upcoming soon' },
                    { id: 'Far', label: 'In a Week+', desc: 'Relaxed runway' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDeadline(item.id as any)}
                      className={`p-2.5 text-center rounded-xl border transition-all ${
                        deadline === item.id
                          ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-semibold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-3xs text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Topic Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Easy', label: 'Easy', desc: 'Review / familiar' },
                    { id: 'Medium', label: 'Medium', desc: 'Core coursework' },
                    { id: 'Hard', label: 'Hard', desc: 'Abstract / complex' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDifficulty(item.id as any)}
                      className={`p-2.5 text-center rounded-xl border transition-all ${
                        difficulty === item.id
                          ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-semibold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-3xs text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Task Assignment Dropdown */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign to specific task:
              </label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="General Study Session">General Study Session</option>
                {tasks.map((t, idx) => (
                  <option key={idx} value={t.name}>
                    {t.name} ({t.subject})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 self-end sm:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Evaluating Fuzzy Rules...' : 'Generate Study Recommendation'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}
        </form>
      </Card>

      {/* Recommendation Results Card */}
      {activeRecommendation && (
        <div className="border border-rose-200 rounded-2xl bg-white p-6 shadow-xs border-l-4 border-l-rose-500 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Personalized Recommendation
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Target: {activeRecommendation.task_name}
              </h3>
            </div>
            <Badge variant="coral">Mamdani Inference Result</Badge>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              label="Study Duration"
              value={`${activeRecommendation.adapted.final_study_minutes} min`}
              subtext={
                activeRecommendation.adapted.final_study_minutes !== activeRecommendation.fuzzy.study_minutes
                  ? `Base fuzzy: ${activeRecommendation.fuzzy.study_minutes}m`
                  : 'Pure fuzzy output'
              }
            />
            <MetricCard
              label="Break Duration"
              value={`${activeRecommendation.adapted.final_break_minutes} min`}
              subtext="Scheduled recharge"
            />
            <MetricCard
              label="Recommended Approach"
              value={activeRecommendation.fuzzy.intensity}
              subtext={`Intensity: ${activeRecommendation.fuzzy.intensity_score}/10`}
            />
            <MetricCard
              label="Rest Indicator"
              value={activeRecommendation.fuzzy.rest_needed}
              subtext={`Rest score: ${activeRecommendation.fuzzy.rest_score}/10`}
              badge={
                <Badge
                  variant={
                    activeRecommendation.fuzzy.rest_needed === 'High'
                      ? 'coral'
                      : activeRecommendation.fuzzy.rest_needed === 'Medium'
                      ? 'amber'
                      : 'emerald'
                  }
                  size="sm"
                >
                  {activeRecommendation.fuzzy.rest_needed}
                </Badge>
              }
            />
          </div>

          {/* Input-Grounded Explanation Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-rose-600" />
              <span>Session Rationale & Guidance</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {activeRecommendation.explanation.guidance}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeRecommendation.explanation.stamina_note}
            </p>

            {activeRecommendation.explanation.context_notes.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                {activeRecommendation.explanation.context_notes.map((note, i) => (
                  <p key={i} className="text-2xs text-slate-600">
                    • {note}
                  </p>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/60 text-3xs text-slate-400">
              {activeRecommendation.explanation.disclaimer}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-2xs text-slate-500">
              {activeRecommendation.explanation.transparency_notes[0]}
            </div>
            <button
              onClick={loadRecommendationIntoTimer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load Into Timer & Begin</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Timer Card */}
      <Card
        title="Interactive Study & Break Timer"
        subtitle="Stay focused during your blocks and recharge during scheduled breaks."
        badge={
          <Badge variant={timerMode === 'study' ? 'coral' : 'emerald'}>
            {timerMode === 'study' ? '📚 Study Block' : '☕ Rest Break'}
          </Badge>
        }
      >
        <div className="max-w-md mx-auto text-center py-4 space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {timerTaskName} • State: <span className="font-bold text-slate-800">{timerState.toUpperCase()}</span>
          </div>

          {/* Big countdown timer */}
          <div className="tabular-nums text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight my-2">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>

          {/* Visual progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                timerMode === 'study' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            {timerState === 'running' ? (
              <button
                onClick={() => setTimerState('paused')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={() => setTimerState('running')}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start / Resume</span>
              </button>
            )}

            <button
              onClick={() => {
                setTimerState('idle');
                setRemainingSeconds(totalSeconds);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setRemainingSeconds((prev) => Math.max(0, prev - 60))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Advance timer by 1 minute"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+1 Min</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>To Break</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setTimerState('completed');
                  setShowFeedbackModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finish Session</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Post-Session Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              🎉 Session Completed!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your feedback helps fine-tune future study session durations.
            </p>

            <form onSubmit={handleSaveFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  How did the study duration feel?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Too short', 'Just right', 'Too long'].map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setFeedbackChoice(choice)}
                      className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                        feedbackChoice === choice
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  How is your energy feeling after the break?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Better ⚡', 'Unchanged 😐', 'Lower 😴'].map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setPostBreakEnergy(choice)}
                      className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                        postBreakEnergy === choice
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                >
                  {submittingFeedback ? 'Saving...' : 'Save Feedback & Update Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
