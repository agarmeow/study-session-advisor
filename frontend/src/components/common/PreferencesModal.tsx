import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import type { UserPreferences } from '../../types';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSave: (updated: Partial<UserPreferences>) => Promise<void>;
  adaptationOffset: number;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSave,
  adaptationOffset,
}) => {
  const [studyTime, setStudyTime] = useState(preferences.study_time || 'Morning');
  const [focusStyle, setFocusStyle] = useState(preferences.focus_style || 'Balanced');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ study_time: studyTime, focus_style: focusStyle });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Study Preferences</h3>
              <p className="text-xs text-slate-500">Fine-tune recommendations to match your routine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Preferred Study Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Morning', 'Afternoon', 'Night', 'Flexible'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setStudyTime(time)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                    studyTime === time
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Focus Style
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'Balanced',
                  title: 'Balanced Sessions',
                  desc: 'Standard Mamdani fuzzy durations (typically 35–50 min).',
                },
                {
                  id: 'Short bursts',
                  title: 'Short Bursts (Pomodoro)',
                  desc: 'Caps blocks closer to 25 min for higher cognitive fatigue.',
                },
                {
                  id: 'Longer sessions',
                  title: 'Longer Sessions',
                  desc: 'Extends focused blocks up to 60–75 min when stamina is high.',
                },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setFocusStyle(style.id)}
                  className={`w-full p-3 text-left rounded-xl border transition-all ${
                    focusStyle === style.id
                      ? 'border-rose-500 bg-rose-50/40 text-slate-900 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{style.title}</span>
                    {focusStyle === style.id && <Check className="w-3.5 h-3.5 text-rose-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {adaptationOffset !== 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Current Adaptive Feedback Offset:</span>{' '}
              <span className="text-rose-600 font-bold">
                {adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset} min
              </span>
              <p className="text-2xs text-slate-500 mt-0.5">
                Automatically adjusted from past session evaluations (bounded within ±15 min).
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
