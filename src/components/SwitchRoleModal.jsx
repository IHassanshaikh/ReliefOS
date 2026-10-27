'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { X, Mail, Lock, ShieldAlert, LogOut, ShieldCheck, Tent, UserCheck } from 'lucide-react';

const ROLE_PRESETS = {
  admin: { role: 'admin', label: 'Admin', name: 'Sarah Chen', email: 'admin@reliefos.org', password: 'admin123', accent: 'red', icon: ShieldCheck, iconColor: 'text-red-500' },
  camp_manager: { role: 'camp_manager', label: 'Camp Mgr', name: 'Marcus Vance', email: 'camp@reliefos.org', password: 'camp123', accent: 'amber', icon: Tent, iconColor: 'text-amber-500' },
  volunteer: { role: 'volunteer', label: 'Volunteer', name: 'Alex Rivera', email: 'volunteer@reliefos.org', password: 'vol123', accent: 'emerald', icon: UserCheck, iconColor: 'text-emerald-500' },
};

export default function SwitchRoleModal() {
  const { 
    role, 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    pendingTargetRole, 
    login, 
    signup, 
    logout,
    changeThemeAccent 
  } = useApp();

  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState('volunteer');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('volunteer@reliefos.org');
  const [password, setPassword] = useState('vol123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Signup fields
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'volunteer',
    phone: '',
    organization: 'ReliefOS Field Response'
  });

  // Whenever modal opens or target role changes, set pre-fills and update theme color
  useEffect(() => {
    if (isAuthModalOpen) {
      const target = pendingTargetRole || (role === 'admin' ? 'volunteer' : 'admin');
      setSelectedRole(target);
      const preset = ROLE_PRESETS[target] || ROLE_PRESETS.volunteer;
      setEmail(preset.email);
      setPassword(preset.password);
      setErrorMsg('');
      setMode('login');
      // Change theme color dynamically on every click!
      changeThemeAccent(preset.accent);
    }
  }, [isAuthModalOpen, pendingTargetRole, role, changeThemeAccent]);

  if (!isAuthModalOpen) return null;

  const handleSelectRole = (rKey) => {
    setSelectedRole(rKey);
    const preset = ROLE_PRESETS[rKey];
    setEmail(preset.email);
    setPassword(preset.password);
    setErrorMsg('');
    // Dynamic theme color update on every click!
    changeThemeAccent(preset.accent);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const loggedUser = await login(email, password);
      setIsAuthModalOpen(false);

      // Route to user's authorized home if current page is restricted
      const homeRoutes = {
        admin: '/',
        camp_manager: '/camp-manager',
        volunteer: '/volunteer'
      };
      const dest = homeRoutes[loggedUser.role] || '/volunteer';
      router.push(dest);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const createdUser = await signup({ ...signupData, role: selectedRole });
      setIsAuthModalOpen(false);
      const homeRoutes = {
        admin: '/',
        camp_manager: '/camp-manager',
        volunteer: '/volunteer'
      };
      router.push(homeRoutes[createdUser.role] || '/volunteer');
    } catch (err) {
      setErrorMsg(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transition-all">
        
        {/* Header with logo.webp */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="ReliefOS" className="w-5 h-5 rounded object-contain" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Switch Role & Sign In
            </h3>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>


        {/* 3 Role Selection Pills (Using SVGs, no emojis, changes theme color dynamically on every click) */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.values(ROLE_PRESETS).map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.role}
                  type="button"
                  id={`modal-role-${p.role}`}
                  onClick={() => handleSelectRole(p.role)}
                  className={`py-1.5 px-1 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedRole === p.role
                      ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs scale-[1.02]'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${p.iconColor}`} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Selector: Sign In | Sign Up */}
        <div className="px-3 pt-2.5">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-1 rounded font-bold transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              className={`flex-1 py-1 rounded font-bold transition-colors ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-3.5 space-y-3">
          {errorMsg && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-modal-login-submit"
                disabled={isLoading}
                className="w-full py-2 rounded-lg theme-accent-bg font-bold text-xs shadow-sm hover:opacity-95 transition-opacity mt-1"
              >
                {isLoading ? 'Signing In...' : `Sign In as ${ROLE_PRESETS[selectedRole]?.label}`}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Name</label>
                <input
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Email</label>
                <input
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Password</label>
                <input
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  placeholder="Password"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-1.5 rounded theme-accent-bg font-bold text-xs shadow-sm hover:opacity-95 transition-opacity mt-1"
              >
                {isLoading ? 'Creating...' : `Sign Up as ${ROLE_PRESETS[selectedRole]?.label}`}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              logout();
              setIsAuthModalOpen(false);
            }}
            className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium hover:underline text-[11px]"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
