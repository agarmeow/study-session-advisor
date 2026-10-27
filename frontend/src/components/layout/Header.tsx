import React from 'react';
import { Menu, Plus, Sparkles } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  onQuickAdvisor: () => void;
  onNewTask: () => void;
  taskCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onQuickAdvisor,
  onNewTask,
  taskCount = 0,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Study Dashboard',
      subtitle: 'Real-time overview of current stamina, priorities, and study metrics.',
    },
    advisor: {
      title: 'Study Session Advisor',
      subtitle: 'Mamdani fuzzy inference for stamina-aware study & break recommendations.',
    },
    tasks: {
      title: 'Coursework Tasks',
      subtitle: 'Prioritized dynamically using 27 Mamdani fuzzy rules.',
    },
    planner: {
      title: 'Smart Daily Planner',
      subtitle: 'Greedy Best-First Search schedule optimization with break insertion.',
    },
    history: {
      title: 'Progress & Session History',
      subtitle: 'Historical analytics, feedback adaptations, and data export.',
    },
    technical: {
      title: 'AISC Technical Details',
      subtitle: 'Formal verification of Computational Intelligence and AI Search methods.',
    },
  };

  const current = titles[currentTab] || titles.dashboard;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
            {current.title}
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {currentTab !== 'advisor' && (
          <button
            onClick={onQuickAdvisor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/80 transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Get Advice</span>
          </button>
        )}

        {currentTab !== 'tasks' && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Task</span>
            {taskCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] font-mono text-slate-200">
                {taskCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
