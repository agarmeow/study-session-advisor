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
  PanelLeftClose,
  PanelLeftOpen,
  X,
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenPreferences,
  adaptationOffset,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const primaryNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & today' },
    { id: 'advisor', label: 'Study Advisor', icon: Compass, description: 'Check-in & focus timer' },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare, description: 'Prioritized coursework' },
    { id: 'planner', label: 'Smart Planner', icon: CalendarDays, description: 'GBFS daily schedule' },
    { id: 'history', label: 'Progress & History', icon: History, description: 'Session logs & trends' },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-2xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-stone-200 flex flex-col justify-between transition-transform duration-200 ease-out lg:hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div>
          {/* Mobile Header */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#e0564c] text-white flex items-center justify-center font-bold shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-xs tracking-tight text-stone-900 block leading-tight">
                  Study Intelligence
                </span>
                <span className="text-[10px] text-stone-400 font-mono">AISC Companion</span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              aria-label="Close navigation drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-4">
            <div>
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                Workspace
              </span>
              <nav className="space-y-1">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                        isActive
                          ? 'bg-[#fdf2f1] text-[#c93f35] font-semibold border border-[#f8d4d1]'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#c93f35]' : 'text-stone-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div>
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                AISC Academic
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavClick('technical')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                    currentTab === 'technical'
                      ? 'bg-[#fdf2f1] text-[#c93f35] font-semibold border border-[#f8d4d1]'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
                  }`}
                >
                  <Cpu className={`w-4 h-4 flex-shrink-0 ${currentTab === 'technical' ? 'text-[#c93f35]' : 'text-stone-400'}`} />
                  <span>Technical Details</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-stone-100 space-y-2">
          {adaptationOffset !== 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px] flex items-center justify-between">
              <span className="text-stone-500 font-medium">Adaptive offset:</span>
              <span className="font-mono font-semibold text-[#c93f35]">
                {adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset}m
              </span>
            </div>
          )}
          <button
            onClick={() => {
              onOpenPreferences();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition font-medium"
          >
            <Sliders className="w-4 h-4 text-stone-400" />
            <span>Preferences & Routine</span>
          </button>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar (In Normal Flex Layout Flow) */}
      <aside
        className={`hidden lg:flex flex-col justify-between sticky top-0 h-screen bg-white border-r border-stone-200/90 z-20 transition-all duration-200 select-none flex-shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div>
          {/* Desktop Brand & Collapse Toggle */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between min-h-[61px]">
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e0564c] text-white flex items-center justify-center font-bold shadow-2xs flex-shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs tracking-tight text-stone-900 block leading-tight">
                    Study Intelligence
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">AISC Companion</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-8 h-8 rounded-lg bg-[#e0564c] text-white flex items-center justify-center font-bold shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </div>
            )}

            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition ${
                isCollapsed ? 'hidden' : 'block'
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Uncollapsed Toggle in Rail mode */}
          {isCollapsed && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nav Items */}
          <div className="p-2 space-y-4">
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
                  Workspace
                </span>
              )}
              <nav className="space-y-1">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center rounded-lg text-xs font-medium transition text-left group ${
                        isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-[#fdf2f1] text-[#c93f35] font-semibold border border-[#f8d4d1]'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive ? 'text-[#c93f35]' : 'text-stone-400 group-hover:text-stone-600'
                        }`}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
                  AISC Academic
                </span>
              )}
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavClick('technical')}
                  title={isCollapsed ? 'AISC Technical Details' : undefined}
                  className={`w-full flex items-center rounded-lg text-xs font-medium transition text-left group ${
                    isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                  } ${
                    currentTab === 'technical'
                      ? 'bg-[#fdf2f1] text-[#c93f35] font-semibold border border-[#f8d4d1]'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
                  }`}
                >
                  <Cpu
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      currentTab === 'technical' ? 'text-[#c93f35]' : 'text-stone-400 group-hover:text-stone-600'
                    }`}
                  />
                  {!isCollapsed && <span>Technical Details</span>}
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="p-2 border-t border-stone-100 space-y-2">
          {!isCollapsed && adaptationOffset !== 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px] flex items-center justify-between">
              <span className="text-stone-500 font-medium">Feedback offset:</span>
              <span className="font-mono font-semibold text-[#c93f35]">
                {adaptationOffset > 0 ? `+${adaptationOffset}` : adaptationOffset}m
              </span>
            </div>
          )}

          <button
            onClick={onOpenPreferences}
            title={isCollapsed ? 'Preferences & Routine' : undefined}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
            }`}
          >
            <Sliders className="w-4 h-4 text-stone-400 flex-shrink-0" />
            {!isCollapsed && <span>Preferences</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
