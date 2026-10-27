'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchAdminStats, addSafeZoneAction } from '../lib/api';
import { 
  ShieldAlert, 
  MapPin, 
  AlertTriangle, 
  Flame, 
  Tent, 
  Users, 
  FileText, 
  CheckCircle, 
  Lock, 
  PlusCircle, 
  Clock, 
  BarChart3, 
  Activity, 
  Database, 
  ArrowUpRight, 
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function AdminPanel() {
  const { role, isMock } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSafeZone, setShowAddSafeZone] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Camp E (North Delta Shelter)',
    lat: '24.8700',
    lng: '67.0200',
    capacity: '200',
    type: 'safe_zone'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);


  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleAddSafeZone = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await addSafeZoneAction(formData);
      setShowAddSafeZone(false);
      await loadStats();
    } catch (err) {
      alert(`Error creating Safe Zone: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Role Gate: only Rescue Coordinator (admin) can view Admin Panel
  if (role !== 'admin') {
    const roleLabel = role === 'camp_manager' ? 'Camp Manager' : 'Field Volunteer';
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400 shadow-xl shadow-rose-900/30">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Admin access only</h2>
        <p className="text-slate-400 max-w-md mt-2 text-sm leading-relaxed">
          The Admin Panel is reserved for <span className="text-purple-400 font-semibold">Rescue Coordinators</span> to monitor macro statistics, manage strategic resources, and inspect activity audit trails.
        </p>
        <div className="mt-3 text-xs text-slate-500">
          Currently logged in as: <span className="font-bold text-amber-400">{roleLabel}</span>
        </div>
        <div className="mt-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          Switch role to <span className="font-bold text-purple-400">Rescue Coord.</span> in the header to view this panel.
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Chart Data Transformations
  const volunteersData = [
    { name: 'Available', count: stats.volunteersByStatus.available || 0, color: '#22c55e' },
    { name: 'On Duty', count: stats.volunteersByStatus.on_duty || 0, color: '#a855f7' },
    { name: 'Offline', count: stats.volunteersByStatus.offline || 0, color: '#64748b' }
  ];

  const dutiesData = [
    { name: 'Assigned', count: stats.dutiesByStatus.assigned || 0, color: '#38bdf8' },
    { name: 'In Progress', count: stats.dutiesByStatus.in_progress || 0, color: '#eab308' },
    { name: 'Done', count: stats.dutiesByStatus.done || 0, color: '#22c55e' }
  ];

  const stockNeedData = [
    { item: 'Water', Stock: stats.stockVsNeed.water.stock, Need: stats.stockVsNeed.water.need },
    { item: 'Food', Stock: stats.stockVsNeed.food.stock, Need: stats.stockVsNeed.food.need },
    { item: 'Medicine', Stock: stats.stockVsNeed.medicine.stock, Need: stats.stockVsNeed.medicine.need },
    { item: 'Relief', Stock: stats.stockVsNeed.relief.stock, Need: stats.stockVsNeed.relief.need }
  ];

  const areasRiskData = [
    { name: 'Normal', value: Math.max(0, stats.totalAreas - stats.activeDarkZones - stats.highRiskAreas), color: '#22c55e' },
    { name: 'High Risk', value: stats.highRiskAreas, color: '#ef4444' },
    { name: 'Dark Zone', value: stats.activeDarkZones, color: '#d946ef' }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
              ADMIN CONTROL // SYSTEM AUDIT
            </h1>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
              CLEARANCE: LEVEL-1
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
            <span>SYNC: {stats.dataAsOf}</span>
            <span>//</span>
            <span className="text-emerald-500">FEEDS NOMINAL</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddSafeZone(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Safe Zone</span>
          </button>
        </div>
      </div>


      {/* 8 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Total Areas */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Areas</span>
            <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.totalAreas}</div>
          <p className="text-[11px] text-slate-500 mt-1">Sectors surveyed</p>
        </div>

        {/* 2. Active Dark Zones */}
        <div className="glass-panel-purple p-5 rounded-2xl border border-fuchsia-300 dark:border-fuchsia-500/40 relative overflow-hidden shadow-lg shadow-purple-950/10 dark:shadow-purple-950/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-fuchsia-700 dark:text-fuchsia-300 uppercase tracking-wider">Active Dark Zones</span>
            <AlertTriangle className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2 flex items-baseline gap-2">
            <span>{stats.activeDarkZones}</span>
            <span className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">(Area C)</span>
          </div>
          <p className="text-[11px] text-fuchsia-800 dark:text-fuchsia-300/80 mt-1">High risk, low report anomaly</p>
        </div>

        {/* 3. High-risk Areas */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">High-Risk Areas</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.highRiskAreas}</div>
          <p className="text-[11px] text-slate-500 mt-1">Monitored hazard sectors</p>
        </div>

        {/* 4. Critical Shortages */}
        <div className="glass-panel-danger p-5 rounded-2xl border border-rose-300 dark:border-rose-500/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Critical Shortages</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2 flex items-baseline gap-2">
            <span>{stats.criticalShortages}</span>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">(Camp B Water)</span>
          </div>
          <p className="text-[11px] text-rose-800 dark:text-rose-300/80 mt-1">&ge;50% deficit threshold</p>
        </div>

        {/* 5. Camps */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Camps & Shelters</span>
            <Tent className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.camps}</div>
          <p className="text-[11px] text-slate-500 mt-1">Active relief hubs</p>
        </div>

        {/* 6. Camp Occupancy */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Camp Occupancy</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.occupancy.occupied} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ {stats.occupancy.capacity}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${stats.occupancy.percentage}%` }}
            />
          </div>
        </div>

        {/* 7. Reports Received */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reports Received</span>
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.reports}</div>
          <p className="text-[11px] text-slate-500 mt-1">Mesh + Web crowdsourced</p>
        </div>

        {/* 8. Pending Verifications */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Checks</span>
            <CheckCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.pendingVerifications}</div>
          <p className="text-[11px] text-slate-500 mt-1">Ground teams in transit</p>
        </div>
      </div>

      {/* 4 Recharts Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Volunteers by Status */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Volunteers By Operational Status
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total: 8 Volunteers</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volunteersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#64748b" textAnchor="middle" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {volunteersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Duties by Status */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              Field Duties By Execution Status
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total: 6 Active</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dutiesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {dutiesData.map((entry, index) => (
                    <Cell key={`cell-d-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Total Stock vs Need per Item */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Total Stock vs Aggregate Need
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">All Camps Combined</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockNeedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="item" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                />
                <Legend />
                <Bar dataKey="Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Need" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Areas by Risk Level */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
              Areas By Risk Level Classification
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total: {stats.totalAreas} Areas</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={areasRiskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {areasRiskData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Feed (last 10 items) */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Recent Activity Audit Trail
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing last {stats.recentActivity.length} events
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 italic">No activity yet.</p>
          ) : (
            stats.recentActivity.map((act) => (
              <div key={act.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                      {act.message}
                    </p>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {new Date(act.timestamp).toLocaleTimeString()} • {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {act.label && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/40 flex-shrink-0">
                    {act.label}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Safe Zone Modal (For Mobile App Backend Integration) */}
      {showAddSafeZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl relative bg-white dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Add Designated Safe Zone / Camp
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Safe Zones are synchronized with the mobile app via <code className="text-purple-700 dark:text-purple-300">GET /api/v1/safe-zones</code> for offline mapping.
            </p>

            <form onSubmit={handleAddSafeZone} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.lat}
                    onChange={e => setFormData({ ...formData, lat: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.lng}
                    onChange={e => setFormData({ ...formData, lng: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Capacity</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-purple-500"
                  >
                    <option value="camp">Relief Camp</option>
                    <option value="safe_zone">Designated Safe Zone</option>
                    <option value="medical">Medical Facility</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSafeZone(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                >
                  {formSubmitting ? 'Adding...' : 'Save & Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
