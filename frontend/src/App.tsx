import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { AdvisorView } from './components/views/AdvisorView';
import { TasksView } from './components/views/TasksView';
import { PlannerView } from './components/views/PlannerView';
import { HistoryView } from './components/views/HistoryView';
import { TechnicalView } from './components/views/TechnicalView';
import { PreferencesModal } from './components/common/PreferencesModal';
import { api } from './services/api';
import type { UserData, Task, RecommendationResponse, UserPreferences } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationResponse | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [uData, tList] = await Promise.all([
        api.getUserData(),
        api.getTasks(),
      ]);
      setUserData(uData);
      setTasks(tList);
    } catch (err: any) {
      console.error('Failed to load application data', err);
      setError(err.message || 'Unable to communicate with the Fuzzy Intelligence backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Task actions
  const handleAddTask = async (taskData: {
    name: string;
    subject?: string;
    estimated_duration: number;
    deadline_days: number;
    difficulty: number;
    importance: number;
  }) => {
    await api.createTask(taskData);
    await loadData();
  };

  const handleDeleteTask = async (index: number) => {
    await api.deleteTask(index);
    await loadData();
  };

  const handleResetTasks = async () => {
    await api.resetTasks();
    await loadData();
  };

  // Preference actions
  const handleSavePreferences = async (updated: Partial<UserPreferences>) => {
    const res = await api.updatePreferences(updated);
    if (userData) {
      setUserData({
        ...userData,
        preferences: res.preferences,
      });
    }
  };

  // Quick navigation handlers
  const handleQuickAdvisor = () => {
    setCurrentTab('advisor');
  };

  const handleNewTask = () => {
    setCurrentTab('tasks');
  };

  const handleStartStudyFromPlanner = (_taskName: string, _durationMinutes: number) => {
    setCurrentTab('advisor');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        adaptationOffset={userData?.adaptation_offset ?? 0}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Sticky Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onQuickAdvisor={handleQuickAdvisor}
          onNewTask={handleNewTask}
          taskCount={tasks.length}
        />

        {/* Global Error Banner if backend fails */}
        {error && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Backend Notice:</strong> {error}. Ensure FastAPI is running on <code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">http://127.0.0.1:8000</code>.
              </span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100/50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {loading && !userData ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
              <p className="text-xs font-medium">Initializing Fuzzy Study Intelligence Engine...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  userData={
                    userData || {
                      tasks: [],
                      sessions: [],
                      preferences: { study_time: 'Morning', focus_style: 'Balanced' },
                      adaptation_offset: 0,
                    }
                  }
                  onNavigate={setCurrentTab}
                  onNewTask={handleNewTask}
                />
              )}

              {currentTab === 'advisor' && (
                <AdvisorView
                  tasks={tasks}
                  onSessionLogged={loadData}
                  activeRecommendation={activeRecommendation}
                  setActiveRecommendation={setActiveRecommendation}
                />
              )}

              {currentTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onResetTasks={handleResetTasks}
                />
              )}

              {currentTab === 'planner' && (
                <PlannerView
                  tasks={tasks}
                  onStartStudy={handleStartStudyFromPlanner}
                />
              )}

              {currentTab === 'history' && (
                <HistoryView userData={userData} />
              )}

              {currentTab === 'technical' && (
                <TechnicalView />
              )}
            </>
          )}
        </main>
      </div>

      {/* Preferences Modal */}
      {userData && (
        <PreferencesModal
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          preferences={userData.preferences}
          onSave={handleSavePreferences}
          adaptationOffset={userData.adaptation_offset}
        />
      )}
    </div>
  );
}

export default App;
