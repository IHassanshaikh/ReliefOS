'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { 
  fetchDuties, 
  updateDutyStatusAction, 
  createDutyAction,
  fetchMessages,
  submitRequisitionAction,
  fetchCamps,
  shouldSkipSync,
  skipSyncFor
} from '../lib/api';
import { enqueueAction } from '../lib/offlineQueue';
import { 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  FileCheck, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  Map, 
  Tent,
  Radio,
  Package,
  Plus,
  X,
  Send,
  MessageSquare,
  Droplet,
  Utensils,
  Pill,
  HeartPulse,
  Smartphone
} from 'lucide-react';

const VOLUNTEER_PROFILES = [
  { id: 'vol-1', name: 'Sara Khan', initials: 'SK', role: 'SEARCH & RESCUE SCOUT', hub: 'DELTA SECTOR 9' },
  { id: 'vol-3', name: 'Fatima Noor', initials: 'FN', role: 'PARAMEDIC // SCOUT', hub: 'COASTAL CAMP B' },
  { id: 'vol-4', name: 'Alex Rivera', initials: 'AR', role: 'RECON SCOUT', hub: 'NORTH SECTOR' }
];

export default function VolunteerDashboard() {
  const { isOnline, pendingSyncCount, syncNow, isSyncing, showToast } = useApp();
  const [selectedVolId, setSelectedVolId] = useState('vol-1'); // Default to Sara Khan
  const currentVolunteer = VOLUNTEER_PROFILES.find(v => v.id === selectedVolId) || VOLUNTEER_PROFILES[0];
  const currentVolunteerId = currentVolunteer.id;
  const currentVolunteerName = currentVolunteer.name;

  const [duties, setDuties] = useState([]);
  const [citizenMessages, setCitizenMessages] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  // Volunteer Camp Resource Requisition Modal State
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqCampId, setReqCampId] = useState('camp-3');
  const [reqItem, setReqItem] = useState('water');
  const [reqQty, setReqQty] = useState(150);
  const [reqPriority, setReqPriority] = useState('critical');
  const [reqNotes, setReqNotes] = useState('Urgent drinking water replenishment required for displaced families in Sector Delta 9.');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [allDuties, allMsgs, allCamps] = await Promise.all([
        fetchDuties(),
        fetchMessages(),
        fetchCamps()
      ]);
      setDuties(allDuties);
      setCitizenMessages(allMsgs);
      if (allCamps && allCamps.length > 0) {
        setCamps(allCamps);
        if (!reqCampId) setReqCampId(allCamps[0].id);
      }
    } catch (err) {
      console.error('Failed to load volunteer data:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [reqCampId]);

  useEffect(() => {
    let isMounted = true;
    loadData();

    const handleSync = () => {
      if (isFetchingRef.current || !isMounted || shouldSkipSync()) return;
      isFetchingRef.current = true;
      Promise.all([
        fetchMessages(),
        fetchDuties()
      ]).then(([msgs, dts]) => {
        if (isMounted) {
          setCitizenMessages(msgs);
          setDuties(dts);
        }
      }).catch(() => {}).finally(() => {
        isFetchingRef.current = false;
      });
    };

    // Debounced sync handler
    let syncTimeout = null;
    const debouncedSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(handleSync, 800);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('reliefos_db_sync', debouncedSync);
      window.addEventListener('storage', debouncedSync);
    }
    // Reduced interval from 3s to 15s
    const interval = setInterval(handleSync, 15000);

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('reliefos_db_sync', debouncedSync);
        window.removeEventListener('storage', debouncedSync);
      }
      clearInterval(interval);
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [loadData]);

  const handleStatusChange = async (dutyId, nextStatus) => {
    // 1. Instant optimistic update so badge and button change immediately
    skipSyncFor(3000);
    setDuties(prev => prev.map(d => d.id === dutyId ? { ...d, status: nextStatus, updatedAt: new Date().toISOString() } : d));

    if (!isOnline) {
      await enqueueAction({
        type: 'duty_status',
        payload: { dutyId, status: nextStatus },
        timestamp: new Date().toISOString()
      });
      showToast(`Offline action saved! Pending sync badge incremented.`, 'warning');
    } else {
      try {
        await updateDutyStatusAction(dutyId, nextStatus);
        showToast(`Duty status updated to ${nextStatus.replace('_', ' ')}.`, 'success');
        // Delay fresh fetch to avoid overwriting optimistic update
        setTimeout(async () => {
          const fresh = await fetchDuties();
          if (Array.isArray(fresh) && fresh.length > 0) {
            setDuties(fresh);
          }
        }, 1500);
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
        await loadData();
      }
    }
  };

  // Submit Resource Requisition to Camp Manager & Admin
  const handleRequisitionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingReq(true);
    try {
      const selectedCamp = camps.find(c => c.id === reqCampId) || { name: 'Camp 3 (Khanpur Valley)', id: reqCampId };
      await submitRequisitionAction({
        volunteerId: currentVolunteerId,
        volunteerName: currentVolunteerName,
        campId: selectedCamp.id,
        campName: selectedCamp.name,
        items: [{ item: reqItem, quantity: Number(reqQty), unit: reqItem === 'water' ? 'Liters' : 'Packs' }],
        priority: reqPriority,
        notes: reqNotes
      });
      showToast(`Requisition for ${reqQty} ${reqItem} broadcast to Camp Manager & Admin Command!`, 'success');
      setShowReqModal(false);
    } catch (err) {
      showToast(`Requisition failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // Convert SOS into an assigned field duty for this volunteer
  const handleAcceptSosAsDuty = async (msg) => {
    skipSyncFor(4000);
    const newDuty = {
      id: `duty-sos-${Date.now()}`,
      volunteerId: currentVolunteerId,
      volunteerName: currentVolunteerName,
      title: `DISPATCH: Respond to SOS from ${msg.senderName || 'Citizen'}`,
      location: msg.location || 'Area C (Delta Sector)',
      areaId: 'area-c',
      status: 'in_progress',
      priority: 'critical',
      notes: `Citizen distress: "${msg.text}". Mesh route: ${msg.hopRoute || 'BLE Mesh'}.`,
      type: 'rescue',
      instructions: `Immediate Field Action: ${msg.text}`,
      toName: msg.location || 'Sector Delta 9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await createDutyAction(newDuty);
      setDuties(prev => [newDuty, ...prev]);
      showToast(`Duty accepted! Added to your active assignments.`, 'success');
    } catch (err) {
      showToast(`Failed to accept duty: ${err.message}`, 'error');
    }
  };

  // Pre-fill requisition modal for this citizen SOS
  const handleOpenReqForSos = (msg) => {
    let detectedItem = 'water';
    const textLower = (msg.text || '').toLowerCase();
    if (textLower.includes('water') || textLower.includes('drink')) detectedItem = 'water';
    else if (textLower.includes('food') || textLower.includes('ration') || textLower.includes('feed')) detectedItem = 'food';
    else if (textLower.includes('medic') || textLower.includes('doctor') || textLower.includes('injury') || textLower.includes('bleed')) detectedItem = 'medicine';
    else if (textLower.includes('blanket') || textLower.includes('tarp') || textLower.includes('shelter')) detectedItem = 'relief';

    setReqItem(detectedItem);
    setReqNotes(`Emergency supplies requested to support field responder for citizen SOS: "${msg.text}" (From: ${msg.senderName || 'Citizen'})`);
    setReqPriority('critical');
    setShowReqModal(true);
  };

  // Escalate SOS directly to Camp Manager with Critical Priority
  const handleEscalateSos = async (msg) => {
    skipSyncFor(4000);
    try {
      await submitRequisitionAction({
        volunteerId: currentVolunteerId,
        volunteerName: currentVolunteerName,
        campId: camps[0]?.id || 'camp-b',
        campName: camps[0]?.name || 'Camp B (Coastal School)',
        items: [{ item: 'water', quantity: 100, unit: 'Liters' }, { item: 'medicine', quantity: 20, unit: 'Packs' }],
        priority: 'critical',
        notes: `ESCALATED CITIZEN SOS: "${msg.text}" from ${msg.senderName || 'Citizen'}. Field scout ${currentVolunteerName} requesting priority Camp Manager intervention.`
      });
      showToast(`SOS escalated to Camp Manager with CRITICAL priority!`, 'success');
    } catch (err) {
      showToast(`Escalation failed: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-64" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Volunteer Profile Banner */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
            {currentVolunteer.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {currentVolunteerName}
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700">
                {currentVolunteer.role}
              </span>
              <select
                id="volunteer-selector"
                name="volunteerSelector"
                value={selectedVolId}
                onChange={(e) => setSelectedVolId(e.target.value)}
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer ml-1"
                title="Switch active field volunteer profile"
              >
                {VOLUNTEER_PROFILES.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              HUB: {currentVolunteer.hub} • ACTIVE RESPONDER ID: {currentVolunteerId}
            </p>
          </div>
        </div>

        {/* Connectivity, Actions & Sync Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Request Camp Supplies */}
          <button
            onClick={() => setShowReqModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 shadow-xs transition"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Request Camp Supplies</span>
          </button>

          <Link
            href="/mobile"
            title="Open Citizen User Portal to inspect affected resident view or send test mesh packets"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#2D4A22] hover:bg-[#3E6630] text-white shadow-xs transition"
          >
            <Smartphone className="w-3 h-3 text-emerald-300" />
            <span>Citizen User Portal</span>
          </Link>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${
            isOnline ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700' : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-rose-600" />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
          </div>

          {pendingSyncCount > 0 && (
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>SYNC QUEUE ({pendingSyncCount})</span>
            </button>
          )}
        </div>
      </div>


      {/* REAL-TIME INBOUND CITIZEN DISTRESS SOS FEED */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 sm:p-4 border border-red-500/30 dark:border-red-500/40 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 font-mono">
              INBOUND CITIZEN DISTRESS SOS // LIVE P2P MESH ({citizenMessages.length})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/mobile"
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Smartphone className="w-3 h-3" />
              <span>Open User Portal (/mobile)</span>
            </Link>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE
            </span>
          </div>
        </div>

        {citizenMessages.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-mono space-y-1">
            <p>No active citizen distress messages currently routed to your unit.</p>
            <p className="text-[11px] text-slate-500">Listening on Bluetooth mesh beacon for inbound emergency packets...</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {citizenMessages.map((msg) => (
              <div 
                key={msg.id} 
                className="p-3.5 rounded-lg border border-red-300 dark:border-red-800/80 bg-red-50/80 dark:bg-red-950/40 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-red-400 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white uppercase tracking-wider">
                      {msg.category || 'CITIZEN SOS'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-slate-200">
                      From: {msg.senderName || 'Affected Citizen'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                      • {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-sm font-black text-slate-950 dark:text-slate-50 leading-snug">
                    {msg.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-800 dark:text-emerald-400 font-bold">Mesh Route:</span>
                    <span>{msg.hopRoute || 'Bluetooth Low Energy P2P Peer Mesh'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => handleAcceptSosAsDuty(msg)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs transition flex items-center gap-1"
                    title="Accept this citizen SOS as an active duty for yourself"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Accept Duty</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReqForSos(msg)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs transition flex items-center gap-1"
                    title="Request supplies from Camp Manager to fulfill this SOS"
                  >
                    <Package className="w-3 h-3" />
                    <span>Request Camp Help</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEscalateSos(msg)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-xs transition flex items-center gap-1"
                    title="Escalate directly to Camp Manager"
                  >
                    <Send className="w-3 h-3" />
                    <span>Escalate to Manager</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Field Access Links: Map and Camps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/field-map"
          className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 shadow-xs transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Map className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">
                Field Operations Map
              </div>
              <p className="text-[11px] text-slate-400">
                Sectors, hazard polygons &amp; camp GPS
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
        </Link>

        <Link
          href="/camps"
          className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 shadow-xs transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Tent className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">
                Camps &amp; Inventory
              </div>
              <p className="text-[11px] text-slate-400">
                Shelter occupancy &amp; supply reserves
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>

      {/* Offline Status Mini-Bar */}
      <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>OFFLINE LOCAL BUFFER ACTIVE (INDEXED_DB)</span>
        </div>
        <span className="text-slate-400">AUTO-FLUSH ON RECONNECT</span>
      </div>

      {/* Assigned Duties List */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              ASSIGNED DUTIES &amp; CONVOYS ({duties.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {duties.map((duty) => {
            const isAssigned = duty.status === 'assigned';
            const isInProgress = duty.status === 'in_progress';
            const isDone = duty.status === 'done';

            return (
              <div key={duty.id} className="py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500">
                      #{duty.id.substr(-6)}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      isAssigned
                        ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-600/40'
                        : isInProgress
                        ? 'bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-500/40'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40'
                    }`}>
                      {duty.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Type: {(duty.type || 'duty').toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {duty.instructions || duty.title || duty.notes}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Target: <strong className="text-slate-800 dark:text-slate-300">{duty.toName || duty.toId || duty.location || 'Field Zone'}</strong></span>
                    <span>•</span>
                    <span>Assigned to: <strong className="text-slate-800 dark:text-slate-300">{duty.volunteerName}</strong></span>
                    <span>•</span>
                    <span>Updated: {new Date(duty.updatedAt || duty.createdAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-2 self-start md:self-center">
                  {isAssigned && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(duty.id, 'in_progress')}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 shadow-md shadow-sky-600/30"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Start Task</span>
                    </button>
                  )}
                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(duty.id, 'done')}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Complete</span>
                    </button>
                  )}
                  {isDone && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Completed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(duty.id, 'in_progress')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition"
                        title="Reopen task"
                      >
                        Re-open
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REQUEST CAMP RESOURCES MODAL */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono">
                  REQUEST CAMP SUPPLIES // FIELD REQUISITION
                </h3>
              </div>
              <button 
                onClick={() => setShowReqModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequisitionSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="vol-req-camp" className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Camp
                </label>
                <select
                  id="vol-req-camp"
                  name="reqCampId"
                  value={reqCampId}
                  onChange={(e) => setReqCampId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {camps.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.valley || 'Sector'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vol-req-item" className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resource Category
                  </label>
                  <select
                    id="vol-req-item"
                    name="reqItem"
                    value={reqItem}
                    onChange={(e) => setReqItem(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="water">Drinking Water (Liters)</option>
                    <option value="food">Food Rations (Meals)</option>
                    <option value="medicine">Trauma Kits (Packs)</option>
                    <option value="relief">Blankets &amp; Bedding</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vol-req-qty" className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity Needed
                  </label>
                  <input
                    type="number"
                    id="vol-req-qty"
                    name="reqQty"
                    min="1"
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['critical', 'high', 'normal'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setReqPriority(lvl)}
                      className={`py-1.5 text-xs font-mono font-bold uppercase rounded border transition ${
                        reqPriority === lvl
                          ? lvl === 'critical' ? 'bg-red-500 text-white border-red-600' : lvl === 'high' ? 'bg-amber-500 text-white border-amber-600' : 'bg-blue-500 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="vol-req-notes" className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Operational Reason / Notes
                </label>
                <textarea
                  id="vol-req-notes"
                  name="reqNotes"
                  rows={2}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReq ? 'Transmitting...' : 'Transmit Requisition'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
