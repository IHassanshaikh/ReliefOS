'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { 
  fetchAreas, 
  fetchVolunteers, 
  fetchDuties, 
  sendFieldTeamAction, 
  verifyAreaAction
} from '../lib/api';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  ArrowRight, 
  Send, 
  Eye, 
  FileCheck
} from 'lucide-react';

export default function VerificationView() {
  const router = useRouter();
  const { showToast } = useApp();

  const [areas, setAreas] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Volunteer selection per area
  const [selectedVolsMap, setSelectedVolsMap] = useState({});

  // Reject / Clear modal state
  const [rejectArea, setRejectArea] = useState(null);
  const [rejectNote, setRejectNote] = useState('Ground inspection verified area is stable; no structural or flood entrapment.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [areasData, volsData, dutiesData] = await Promise.all([
        fetchAreas(),
        fetchVolunteers(),
        fetchDuties()
      ]);
      setAreas(areasData);
      setVolunteers(volsData);
      setDuties(dutiesData);
    } catch (err) {
      console.error('Failed to load verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter areas needing verification: Dark Zones OR team_sent, excluding verified_safe / rejected
  const pendingAreas = areas.filter(
    (a) => (a.assessment?.isDarkZone || a.verification === 'team_sent' || a.id === 'area-c') &&
           a.verification !== 'rejected' && a.verification !== 'verified_safe'
  );

  const availableVolunteers = volunteers.filter(
    (v) => v.status === 'available' || v.status === 'on_duty'
  );

  const handleToggleVolunteer = (areaId, volId) => {
    setSelectedVolsMap(prev => {
      const current = prev[areaId] || ['vol-1', 'vol-4'];
      const next = current.includes(volId)
        ? current.filter(id => id !== volId)
        : [...current, volId];
      return { ...prev, [areaId]: next.length > 0 ? next : [volId] };
    });
  };

  const handleDispatchTeam = async (areaId) => {
    const selected = selectedVolsMap[areaId] || ['vol-1', 'vol-4'];
    // 1. Instant optimistic update so badge and button change immediately
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, verification: 'team_sent' } : a));
    setIsSubmitting(true);
    try {
      await sendFieldTeamAction(areaId, selected);
      showToast(`Field Team (${selected.join(', ')}) dispatched to verify sector.`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Dispatch failed: ${err.message}`, 'error');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmArea = async (areaId) => {
    // 1. Instant optimistic update
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, verification: 'confirmed' } : a));
    setIsSubmitting(true);
    try {
      await verifyAreaAction(areaId, 'confirmed', 'Ground reconnaissance team verified critical distress.');
      showToast('Sector verified and elevated to High Priority Action Queue.', 'success');
      await loadData();
    } catch (err) {
      showToast(`Confirmation failed: ${err.message}`, 'error');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectArea = async () => {
    if (!rejectArea) return;
    setIsSubmitting(true);
    try {
      await verifyAreaAction(rejectArea.id, 'verified_safe', rejectNote);
      showToast(`Sector ${rejectArea.name} marked as safe and cleared from alert queue.`, 'success');
      setRejectArea(null);
      await loadData();
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64" />
        <div className="h-32 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
            FIELD VERIFICATION CONSOLE
          </h1>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
            HUMAN-IN-THE-LOOP
          </span>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>


      {/* Mandatory Safety Notice */}
      <div className="px-3.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>HUMAN VERIFICATION REQUIRED // NO AUTONOMOUS DISPATCH</span>
        </div>
        <span className="text-amber-700 dark:text-amber-400 text-[10px]">RADICAL TRANSPARENCY</span>
      </div>

      {/* Verification Queue */}
      {pendingAreas.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold font-mono uppercase text-slate-900 dark:text-white">
            ALL SECTORS VERIFIED OR CLEARED
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            No anomalous silent risk zones currently awaiting ground verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingAreas.map((area) => {
            const assessment = area.assessment || {};
            const isTeamSent = area.verification === 'team_sent';
            const isConfirmed = area.verification === 'confirmed';
            const selectedVols = selectedVolsMap[area.id] || ['vol-1', 'vol-4'];

            const assignedDuties = duties.filter(
              (d) => d.type === 'verification' && (d.toId === area.id || d.toName?.includes(area.name))
            );

            return (
              <div 
                key={area.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Sector Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white">
                      {area.name}
                    </span>
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                      isConfirmed
                        ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300'
                        : isTeamSent
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {isConfirmed ? 'CONFIRMED' : isTeamSent ? 'TEAM EN ROUTE' : 'FLAGGED // UNVERIFIED'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      SCORE: {assessment.score || 82}/100
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400">
                    POS: {area.lat?.toFixed(4)}, {area.lng?.toFixed(4)} // POP: {area.population}
                  </div>
                </div>

                {/* Telemetry Gate Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase block">REPORTS DEFICIT</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {area.actualReports || 1} received vs {assessment.expectedReports || 40} expected
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase block">HAZARD SEVERITY</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {Math.round((area.hazardSeverity || 0.85) * 100)}% Flood Saturation
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase block">TELEMETRY SILENCE</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      &gt; 4.0 hrs Tower Disconnect
                    </span>
                  </div>
                </div>

                {/* Volunteer Assignment Selector */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>SELECT RESPONDER TEAM:</span>
                    <span>{selectedVols.length} OPERATORS SELECTED</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVolunteers.map(v => {
                      const isSelected = selectedVols.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleToggleVolunteer(area.id, v.id)}
                          className={`px-2 py-1 rounded text-[11px] font-mono font-medium border transition-colors ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-bold'
                              : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {v.name} ({v.role || 'Volunteer'})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Duties if team sent */}
                {assignedDuties.length > 0 && (
                  <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900/40">
                    Active Mission: {assignedDuties.map(d => `${d.volunteerName} (${d.status.toUpperCase()})`).join(', ')}
                  </div>
                )}

                {/* Action Trigger Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => router.push(`/areas/${area.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Telemetry Gauge</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRejectArea(area)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                    >
                      Clear / Mark Safe
                    </button>

                    {!isTeamSent ? (
                      <button
                        type="button"
                        onClick={() => handleDispatchTeam(area.id)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch Ground Team</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConfirmArea(area.id)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Disaster Priority</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Reject / Mark Safe Modal */}
      {rejectArea && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-300 dark:border-slate-700 shadow-xl max-w-md w-full space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-900 dark:text-white">
              CLEAR SECTOR // MARK SAFE AUDIT
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Provide ground observation note to archive {rejectArea.name}:
            </p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="w-full text-xs font-mono p-2.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectArea(null)}
                className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectArea}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirm Safe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
