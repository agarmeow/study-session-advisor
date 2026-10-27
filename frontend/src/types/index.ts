export interface Task {
  name: string;
  subject: string;
  estimated_duration: number;
  deadline_days: number;
  difficulty: number;
  importance: number;
  priority_score?: number;
  priority_level?: string;
  priority_reason?: string;
}

export interface UserPreferences {
  study_time: string;
  focus_style: string;
  break_style?: string;
}

export interface SessionRecord {
  id?: string;
  timestamp: string;
  date: string;
  completion_time?: string;
  task_name: string;
  study_minutes: number;
  planned_study_minutes?: number;
  actual_study_minutes?: number;
  break_minutes: number;
  feedback?: string | null;
  post_break_energy?: string | null;
}

export interface UserData {
  tasks: Task[];
  sessions: SessionRecord[];
  preferences: UserPreferences;
  adaptation_offset: number;
  last_feedback?: string | null;
}

export interface RecommendationRequest {
  sleep_hours: number;
  energy: number;
  energy_label: string;
  days_to_deadline: number;
  deadline_label: string;
  difficulty: number;
  difficulty_label: string;
  task_name?: string;
}

export interface RecommendationResponse {
  fuzzy: {
    study_minutes: number;
    break_minutes: number;
    intensity: string;
    intensity_score: number;
    rest_needed: string;
    rest_score: number;
    fired_rules: Array<{
      rule: any;
      strength: number;
    }>;
  };
  adapted: {
    base_study_minutes: number;
    base_break_minutes: number;
    final_study_minutes: number;
    final_break_minutes: number;
    adaptation_offset: number;
    adjustment_explanation: string;
    focus_style: string;
  };
  explanation: {
    guidance: string;
    stamina_note: string;
    context_notes: string[];
    transparency_notes: string[];
    disclaimer: string;
  };
  task_name: string;
  inputs: RecommendationRequest;
}

export interface ScheduleBlock {
  block_type: 'study' | 'break';
  task_name: string;
  duration_minutes: number;
  start_offset: number;
  end_offset: number;
  start_time: string;
  end_time: string;
  subject: string;
  priority_level: string;
}

export interface UnscheduledTask {
  task: {
    name: string;
    subject: string;
    estimated_duration: number;
    deadline_days: number;
    priority_score?: number;
    priority_level?: string;
  };
  reason: string;
}

export interface DailySchedule {
  blocks: ScheduleBlock[];
  total_planned_time: number;
  total_study_time: number;
  total_break_time: number;
  remaining_available_time: number;
  scheduled_tasks: Array<{
    name: string;
    subject: string;
    estimated_duration: number;
    priority_level: string;
  }>;
  unscheduled_tasks: UnscheduledTask[];
  algorithm_info: {
    algorithm: string;
    nodes_expanded: number;
    heuristic: string;
    initial_heuristic?: number;
    final_heuristic?: number;
  };
  available_budget_minutes: number;
  is_feasible: boolean;
}

export interface CurvePoint {
  x: number;
  [key: string]: number;
}

export interface MembershipData {
  advisor: {
    sleep: CurvePoint[];
    energy: CurvePoint[];
    urgency: CurvePoint[];
    difficulty: CurvePoint[];
  };
}

export interface SystemRules {
  advisor_rules_count: number;
  advisor_rules: Array<{
    id: number;
    sleep: string;
    energy: string;
    urgency: string;
    difficulty: string;
    study_minutes: number;
    break_minutes: number;
    intensity: string;
    rest_score: number;
  }>;
  task_rules_count: number;
  task_rules: Array<{
    id: number;
    urgency: string;
    importance: string;
    difficulty: string;
    consequent_score: number;
  }>;
}

export interface HeatmapData {
  workload: number;
  sleep_values: number[];
  energy_values: number[];
  coverage: number[][];
  durations: number[][];
}
