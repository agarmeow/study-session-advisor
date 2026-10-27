import React from 'react';
import { Menu, Plus, Compass } from 'lucide-react';
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
      title: 'Today & Overview',
      subtitle: 'Current priorities, stamina status, and upcoming coursework.',
    },
    advisor: {
      title: 'Study Advisor & Timer',
      subtitle: 'Mamdani fuzzy inference for stamina-adapted study and break intervals.',
    },
    tasks: {
      title: 'Coursework Priority Manager',
      subtitle: 'Dynamic priority ranking using 27 Mamdani fuzzy rules.',
    },
    planner: {
      title: 'Smart Daily Planner',
      subtitle: 'Greedy Best-First Search schedule optimization fitting your exact time budget.',
    },
    history: {
      title: 'Progress & Session History',
      subtitle: 'Completed study logs, feedback adaptations, and data exports.',
    },
    technical: {
      title: 'AISC System Architecture',
      subtitle: 'Formal verification of Computational Intelligence and AI Search methods.',
    },
  };

  const current = titles[currentTab] || titles.dashboard;

  return (
    <header className="sticky top-0 z-10 bg-[#fbfbf9]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 lg:hidden transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-stone-900 tracking-tight leading-snug">
            {current.title}
          </h1>
          <p className="hidden sm:block text-xs text-stone-500 mt-0.5">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {currentTab !== 'advisor' && (
          <button
            onClick={onQuickAdvisor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#fdf2f1] text-[#c93f35] hover:bg-[#fae6e4] border border-[#f8d4d1] transition shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Get Study Advice</span>
            <span className="sm:hidden">Advice</span>
          </button>
        )}

        {currentTab !== 'tasks' && (
          <button
            onClick={onNewTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-900 hover:bg-stone-800 text-white transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
            {taskCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-stone-700 text-[10px] font-mono text-stone-200">
                {taskCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
