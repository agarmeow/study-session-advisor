import React from 'react';
import {
  LayoutDashboard,
  Compass,
  CheckSquare,
  CalendarDays,
  History,
  Cpu,
  Sliders,
  GraduationCap,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'advisor'
  | 'tasks'
  | 'planner'
  | 'history'
  | 'technical';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPreferences: () => void;
  adaptationOffset: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenPreferences,
  adaptationOffset,
  isOpenMobile,
  onCloseMobile,
}) => {
  const primaryNavItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'advisor', label: 'Study Advisor', icon: Compass },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'planner', label: 'Smart Planner', icon: CalendarDays },
    { id: 'history', label: 'Progress & History', icon: History },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-2xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-none">
                Study Intelligence
              </h1>
              <p className="text-2xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
                AISC Decision Engine
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-4 space-y-6">
            <div>
              <div className="px-3 mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                Workspace
              </div>
              <nav className="space-y-1">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-rose-50 text-rose-700 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div>
              <div className="px-3 mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                AISC Architecture
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavClick('technical')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    currentTab === 'technical'
                      ? 'bg-rose-50 text-rose-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Cpu
                    className={`w-4 h-4 transition-colors ${
                      currentTab === 'technical' ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <span>Technical Details</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          {adaptationOffset !== 0 && (
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between text-2xs">
              <span className="text-slate-500 font-medium">Adaptive Offset</span>
              <span className="font-bold text-rose-600">
                {adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset} min
              </span>
            </div>
          )}

          <button
            onClick={onOpenPreferences}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
          >
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>Preferences & Routine</span>
          </button>
        </div>
      </aside>
    </>
  );
};
