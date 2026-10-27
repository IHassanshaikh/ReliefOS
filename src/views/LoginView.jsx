'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { ROLE_HOMEPAGES, getRouteAllowedRoles } from '../components/AuthGuard';
import { Mail, Lock, User, ShieldAlert, ShieldCheck, Tent, UserCheck } from 'lucide-react';

const PRESETS = [
  { role: 'admin', label: 'Admin', email: 'admin@reliefos.org', password: 'admin123', accent: 'red', icon: ShieldCheck, iconColor: 'text-red-500' },
  { role: 'camp_manager', label: 'Camp Mgr', email: 'camp@reliefos.org', password: 'camp123', accent: 'amber', icon: Tent, iconColor: 'text-amber-500' },
  { role: 'volunteer', label: 'Volunteer', email: 'volunteer@reliefos.org', password: 'vol123', accent: 'emerald', icon: UserCheck, iconColor: 'text-emerald-500' },
];

export default function LoginView({ targetRestrictedRoute = null, onDismiss = null }) {
  const { user, login, quickLogin, signup, changeThemeAccent } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('admin@reliefos.org');
  const [password, setPassword] = useState('admin123');
  const [activeRole, setActiveRole] = useState('admin');

  // Sign up fields
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
    organization: 'ReliefOS Rapid Volunteer',
    location: 'Forward Zone Alpha'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const [rawSql, setRawSql] = useState('');

  // Routing helper after successful authentication
  const navigateAfterAuth = (authenticatedUser) => {
    const userRole = authenticatedUser?.role || 'volunteer';
    if (onDismiss) {
      onDismiss();
    }

    if (targetRestrictedRoute && targetRestrictedRoute !== '/login') {
      const allowed = getRouteAllowedRoles(targetRestrictedRoute);
      if (allowed.includes(userRole)) {
        router.push(targetRestrictedRoute);
        return;
      }
    }

    const dest = ROLE_HOMEPAGES[userRole] || '/';
    router.push(dest);
  };

  // If user is already authenticated (e.g. from storage or prior session), redirect away from login
  useEffect(() => {
    if (user) {
      navigateAfterAuth(user);
    }
  }, [user]);

  // Handle Preset Click: In Login mode triggers quick login & redirects; in Signup mode selects role
  const handlePresetClick = async (preset) => {
    setActiveRole(preset.role);
    setErrorMsg('');
    changeThemeAccent(preset.accent);

    if (mode === 'signup') {
      // In signup mode, clicking a role button sets the target registration role
      setSignupData(prev => ({ ...prev, role: preset.role }));
      return;
    }

    // In login mode, fill preset credentials and execute 1-click login
    setEmail(preset.email);
    setPassword(preset.password);
    setIsLoading(true);
    try {
      const loggedUser = await quickLogin(preset.role);
      navigateAfterAuth(loggedUser);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const loggedUser = await login(email, password);
      navigateAfterAuth(loggedUser);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const createdUser = await signup({
        ...signupData,
        role: signupData.role || activeRole
      });
      navigateAfterAuth(createdUser);
    } catch (err) {
      setErrorMsg(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchTab = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    if (newMode === 'login') {
      const p = PRESETS.find(pr => pr.role === activeRole) || PRESETS[0];
      setEmail(p.email);
      setPassword(p.password);
    } else {
      setSignupData(prev => ({ ...prev, role: activeRole }));
    }
  };

  const handleLoadSql = async () => {
    if (!showSqlViewer && !rawSql) {
      try {
        const res = await fetch('/api/v1/auth/sql');
        const data = await res.json();
        setRawSql(data.content || '-- reliefos.sql loaded');
      } catch {
        setRawSql('-- Unable to fetch reliefos.sql');
      }
    }
    setShowSqlViewer(!showSqlViewer);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-sm space-y-3.5">

        {/* Minimal Header with logo.webp */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-1.5">
            <img
              src="/logo.webp"
              alt="ReliefOS"
              className="w-9 h-9 rounded-xl object-contain shadow-sm border border-slate-200 dark:border-slate-800"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              ReliefOS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Disaster Response Command
          </p>
        </div>


        {/* Restricted Route Notice if intercepted */}
        {targetRestrictedRoute && (
          <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-2 text-center text-xs text-red-700 dark:text-red-300">
            Access to <strong>{targetRestrictedRoute}</strong> requires login.
          </div>
        )}

        {/* 3 Quick Role Buttons (Using SVG icons, no emojis, changes theme color dynamically on every click) */}
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.role}
                id={`btn-preset-${p.role}`}
                type="button"
                onClick={() => handlePresetClick(p)}
                disabled={isLoading}
                className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                  activeRole === p.role
                    ? 'border-slate-800 dark:border-white bg-slate-100 dark:bg-slate-800 scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${p.iconColor}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-md space-y-3.5">
          
          {/* Tab Selector */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              type="button"
              id="tab-signin"
              onClick={() => handleSwitchTab('login')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-signup"
              onClick={() => handleSwitchTab('signup')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Simple Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={isLoading}
                className="w-full py-2 rounded-lg theme-accent-bg font-bold text-xs shadow-sm hover:opacity-95 transition-opacity"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* Simple Sign Up Form */
            <form onSubmit={handleSignupSubmit} className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  placeholder="e.g. Dr. Alex Mercer"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  placeholder="responder@reliefos.org"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  placeholder="Create password"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clearance Role</label>
                <select
                  id="signup-role"
                  value={signupData.role}
                  onChange={(e) => {
                    const r = e.target.value;
                    setSignupData({ ...signupData, role: r });
                    setActiveRole(r);
                    const p = PRESETS.find(pr => pr.role === r);
                    if (p) changeThemeAccent(p.accent);
                  }}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="admin">Admin (Rescue Commander)</option>
                  <option value="camp_manager">Camp Manager (Logistics & Relief Hubs)</option>
                  <option value="volunteer">Volunteer (Field Scout / Paramedic)</option>
                </select>
              </div>

              <button
                type="submit"
                id="btn-signup-submit"
                disabled={isLoading}
                className="w-full py-2 rounded-lg theme-accent-bg font-bold text-xs shadow-sm hover:opacity-95 transition-opacity"
              >
                {isLoading ? 'Creating Account...' : 'Sign Up & Launch Command'}
              </button>
            </form>
          )}

          {/* Minimal SQL File Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={handleLoadSql}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showSqlViewer ? 'Hide reliefos.sql' : 'View local reliefos.sql'}
            </button>
            {showSqlViewer && (
              <pre className="mt-2 text-left text-[10px] font-mono p-2 rounded bg-slate-950 text-slate-300 max-h-36 overflow-auto border border-slate-800">
                {rawSql}
              </pre>
            )}
          </div>

        </div>

        {/* Footer with logo.webp */}
        <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
          <img src="/logo.webp" alt="ReliefOS" className="w-4 h-4 rounded object-contain opacity-80" />
          <span>ReliefOS Disaster Response Command</span>
        </div>

      </div>
    </div>
  );
}
