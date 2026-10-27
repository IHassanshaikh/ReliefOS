'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchAreas, fetchCamps } from '../lib/api';
import { MapPin, Tent, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Dynamically load Leaflet map (no SSR)
const CommandMap = dynamic(() => import('../components/CommandMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        Loading field map...
      </div>
    </div>
  ),
});

export default function FieldMap() {
  const { isOnline } = useApp();
  const [areas, setAreas] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamp, setSelectedCamp] = useState(null);


  const loadData = async () => {
    setLoading(true);
    try {
      const [areasData, campsData] = await Promise.all([fetchAreas(), fetchCamps()]);
      setAreas(areasData);
      setCamps(campsData);
    } catch (err) {
      console.error('FieldMap load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const darkZones = areas.filter(a => a.assessment?.isDarkZone || a.id === 'area-c');
  const highRiskAreas = areas.filter(a => !a.assessment?.isDarkZone && (a.assessment?.score >= 50 || a.hazardSeverity >= 0.5));

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
            FIELD OPERATIONS GRID
          </h1>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
            isOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-700 animate-pulse'
          }`}>
            {isOnline ? '● LIVE' : '● OFFLINE'}
          </span>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded bg-indigo-50 border border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white">{darkZones.length}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Dark Zones</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white">{highRiskAreas.length}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">High Risk</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded bg-sky-50 border border-sky-200 dark:bg-sky-950 dark:border-sky-800 flex items-center justify-center flex-shrink-0">
            <Tent className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white">{camps.length}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Active Camps</div>
          </div>
        </div>
      </div>


      {/* Map */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Interactive Field Map — Click a camp or zone for details
          </span>
          {!isOnline && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Offline — cached data shown
            </span>
          )}
        </div>
        <div className="p-3">
          {loading ? (
            <div className="w-full h-[500px] rounded-xl bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CommandMap areas={areas} camps={camps} />
          )}
        </div>
      </div>

      {/* Camp Quick Reference */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Tent className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Camp Quick Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {camps.map(camp => {
            const hasShortage = (camp.items || []).some(i => i.need > i.stock);
            const occupancyPct = camp.capacity ? Math.round((camp.occupancy / camp.capacity) * 100) : 0;
            return (
              <div
                key={camp.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  hasShortage
                    ? 'bg-red-50/60 border-red-200 dark:bg-red-950/30 dark:border-red-500/30'
                    : 'bg-white border-slate-200 dark:bg-slate-900/60 dark:border-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{camp.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Occupancy: <span className="text-slate-800 dark:text-slate-200 font-semibold">{camp.occupancy}/{camp.capacity}</span>
                      <span className={`ml-2 font-bold ${occupancyPct >= 90 ? 'text-red-600 dark:text-red-400' : occupancyPct >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ({occupancyPct}%)
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    hasShortage
                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-500/40'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40'
                  }`}>
                    {hasShortage ? 'Shortage' : 'Stable'}
                  </span>
                </div>
                {/* Occupancy bar */}
                <div className="mt-2.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      occupancyPct >= 90 ? 'bg-red-500' : occupancyPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
