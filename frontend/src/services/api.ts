import type {
  UserData,
  Task,
  RecommendationRequest,
  RecommendationResponse,
  DailySchedule,
  UserPreferences,
  MembershipData,
  SystemRules,
  HeatmapData,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchJson<{ status: string; app: string; version: string }>('/api/health'),

  getUserData: () => fetchJson<UserData>('/api/data'),

  getRecommendation: (req: RecommendationRequest) =>
    fetchJson<RecommendationResponse>('/api/recommendation', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getTasks: () => fetchJson<Task[]>('/api/tasks'),

  createTask: (task: {
    name: string;
    subject?: string;
    estimated_duration: number;
    deadline_days: number;
    difficulty: number;
    importance: number;
  }) =>
    fetchJson<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  deleteTask: (index: number) =>
    fetchJson<{ message: string }>(`/api/tasks/${index}`, {
      method: 'DELETE',
    }),

  resetTasks: () =>
    fetchJson<Task[]>('/api/tasks/reset', {
      method: 'POST',
    }),

  generateSchedule: (availableTimeMinutes: number, defaultBreakMinutes: number = 10) =>
    fetchJson<DailySchedule>('/api/schedule', {
      method: 'POST',
      body: JSON.stringify({
        available_time_minutes: availableTimeMinutes,
        default_break_minutes: defaultBreakMinutes,
      }),
    }),

  recordSession: (session: {
    task_name: string;
    study_minutes: number;
    break_minutes: number;
    feedback?: string;
    post_break_energy?: string;
    planned_study_minutes?: number;
    actual_study_minutes?: number;
    completion_time?: string;
  }) =>
    fetchJson<{ session: any; new_adaptation_offset: number; last_feedback?: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    }),

  submitFeedback: (payload: {
    session_id?: string;
    feedback: string;
    post_break_energy?: string;
  }) =>
    fetchJson<{
      message: string;
      session: any;
      new_adaptation_offset: number;
      last_feedback?: string;
      already_submitted: boolean;
    }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePreferences: (prefs: Partial<UserPreferences>) =>
    fetchJson<{ preferences: UserPreferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),

  getMembershipData: () => fetchJson<MembershipData>('/api/technical/membership-data'),

  getSystemRules: () => fetchJson<SystemRules>('/api/technical/rules'),

  getHeatmapData: (workload: number = 5.0) =>
    fetchJson<HeatmapData>(`/api/technical/heatmaps?workload=${workload}`),

  getExportJsonUrl: () => `${API_BASE}/api/export/json`,
  getExportCsvUrl: () => `${API_BASE}/api/export/csv`,
};
