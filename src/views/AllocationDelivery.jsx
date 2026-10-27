'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  fetchAllocationSuggestions, 
  approveAllocationAction, 
  fetchDuties,
  updateDutyStatusAction,
  skipSyncFor
} from '../lib/api';
import { 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Package, 
  Droplet, 
  AlertCircle, 
  Send,
  Navigation,
  Check,
  Boxes,
  RefreshCw
} from 'lucide-react';

export default function AllocationDelivery() {
  const { showToast } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [approvedIds, setApprovedIds] = useState(new Set());


  const loadData = async () => {
    setLoading(true);
    try {
      const [suggs, dutyList] = await Promise.all([
        fetchAllocationSuggestions(),
        fetchDuties()
      ]);
      setSuggestions(suggs);
      setDuties(dutyList.filter(d => d.type === 'delivery'));
    } catch (err) {
      console.error('Failed to load allocations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (suggestionId) => {
    skipSyncFor(4000);
    setApprovingId(suggestionId);
    setApprovedIds(prev => new Set([...prev, suggestionId]));
    try {
      const res = await approveAllocationAction(suggestionId);
      showToast('Transfer APPROVED! Delivery duty created with status: Pending.', 'success');
      if (res?.duty) {
        setDuties(prev => [res.duty, ...prev.filter(d => d.id !== res.duty.id)]);
      }
      setTimeout(async () => {
        await loadData();
      }, 1200);
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleUpdateDeliveryStatus = async (dutyId, nextStatus) => {
    // 1. Instant optimistic update
    skipSyncFor(4000);
    setDuties(prev => prev.map(d => d.id === dutyId ? { ...d, status: nextStatus, updatedAt: new Date().toISOString() } : d));
    try {
      await updateDutyStatusAction(dutyId, nextStatus);
      showToast(`Delivery status updated to: ${nextStatus.replace('_', ' ')}.`, 'success');
      setTimeout(async () => {
        const freshDuties = await fetchDuties();
        if (Array.isArray(freshDuties)) {
          setDuties(freshDuties.filter(d => d.type === 'delivery'));
        }
      }, 1200);
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`, 'error');
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-72" />
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
            LOGISTICS ALLOCATION &amp; DISPATCH
          </h1>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            SURPLUS ROUTING
          </span>
        </div>
      </div>


      {/* Suggested Transfers Queue */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              SUGGESTED INTER-CAMP TRANSFERS
            </h2>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {suggestions.length} SUGGESTIONS
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            All camp inventories are balanced within safe reserve thresholds.
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sugg, i) => {
              const suggKey = sugg.suggestionId || sugg.id;
              const isApproved = approvedIds.has(suggKey) || duties.some(d => 
                (d.fromCampId === sugg.fromCampId || d.fromCampName === sugg.fromCampName) &&
                (d.toId === sugg.toCampId || d.toName === sugg.toCampName) &&
                (d.item || '').toLowerCase() === (sugg.item || '').toLowerCase() &&
                d.status !== 'done'
              );

              return (
                <div
                  key={suggKey || i}
                  className={`p-5 rounded-lg bg-white dark:bg-slate-900 border transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isApproved ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        Suggestion #{i + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Droplet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        {sugg.quantity} {sugg.unit} of {sugg.item.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {isApproved ? '✓ Transfer Approved' : 'Suggested'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-blue-700 dark:text-blue-400">{sugg.fromCampName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-red-700 dark:text-red-400">{sugg.toCampName}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        ({sugg.distanceKm} km transit distance)
                      </span>
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {sugg.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-center">
                    {isApproved ? (
                      <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Transfer Approved &amp; En Route</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApprove(suggKey)}
                        disabled={approvingId === suggKey}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{approvingId === suggKey ? 'Approving...' : 'Approve Transfer'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery Tracking Board */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              LIVE CONVOY FULFILLMENT TRACKER
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {duties.length} Delivery Duties
          </span>
        </div>

        {duties.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No delivery duties created yet. Approve a suggested transfer above to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {duties.map((duty) => {
              const isPending = duty.status === 'assigned';
              const isInTransit = duty.status === 'in_progress';
              const isDelivered = duty.status === 'done';

              return (
                <div key={duty.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-purple-700 dark:text-purple-400 font-bold">
                        #{duty.id.substr(-8)}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isPending 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-600/40' 
                          : isInTransit 
                          ? 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-500/40 animate-pulse' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40'
                      }`}>
                        {isPending ? 'Pending' : isInTransit ? 'In Transit' : 'Delivered'}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Assigned to: <strong className="text-slate-900 dark:text-white">{duty.volunteerName || 'Volunteer'}</strong>
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {duty.instructions || `Relief supply transit to ${duty.toName || duty.toId}`}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Created: {new Date(duty.createdAt).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>Item: {duty.item || 'Relief Goods'} ({duty.quantity || 'Standard Batch'})</span>
                    </div>

                    {/* 3-Step Connected Stepper */}
                    <div className="relative flex items-center justify-between px-4 sm:px-10 py-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 my-2">
                      <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
                      <div
                        className="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0"
                        style={{
                          width: isDelivered ? 'calc(100% - 4rem)' : isInTransit ? 'calc(50% - 2rem)' : '0%',
                        }}
                      />

                      {['Pending', 'In transit', 'Delivered'].map((label, idx) => {
                        const stepIdx = isDelivered ? 2 : isInTransit ? 1 : 0;
                        const isCompleted = stepIdx > idx;
                        const isCurrent = stepIdx === idx;

                        return (
                          <div key={label} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                                  : isCurrent
                                  ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950 shadow-xs'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                            </div>
                            <span
                              className={`mt-1.5 text-[11px] font-mono font-semibold ${
                                isCurrent
                                  ? 'text-blue-700 dark:text-blue-400 font-bold'
                                  : isCompleted
                                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Advance Delivery Pipeline Buttons */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleUpdateDeliveryStatus(duty.id, 'in_progress')}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Dispatch (In Transit)</span>
                      </button>
                    )}
                    {isInTransit && (
                      <button
                        type="button"
                        onClick={() => handleUpdateDeliveryStatus(duty.id, 'done')}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Receipt (Delivered)</span>
                      </button>
                    )}
                    {isDelivered && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Delivered &amp; Logged
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
