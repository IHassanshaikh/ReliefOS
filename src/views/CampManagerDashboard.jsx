'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { 
  fetchCamps, 
  fetchDuties, 
  fetchVolunteers,
  fetchMessages,
  updateCampInventoryAction, 
  updateCampOccupancyAction, 
  confirmDeliveryArrivalAction,
  submitCampRequisitionAction,
  fetchRequisitions,
  updateRequisitionAction,
  updateDutyStatusAction,
  createDutyAction,
  addSafeZoneAction,
  shouldSkipSync,
  skipSyncFor
} from '../lib/api';
import { 
  Tent, 
  Droplet, 
  Utensils, 
  Pill, 
  Package, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Clock, 
  Send, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Building2, 
  ArrowUpRight,
  TrendingDown,
  UserCheck,
  ChevronDown,
  HeartPulse,
  X,
  Smartphone,
  MessageSquare,
  ClipboardList,
  MapPin,
  Radio
} from 'lucide-react';

const ITEM_CONFIG = {
  water: {
    label: 'Drinking Water',
    unit: 'Liters (L)',
    icon: Droplet,
    color: 'text-sky-500 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    burnPerPerson: 1.5 // 1.5L per occupant per day
  },
  food: {
    label: 'Food Rations',
    unit: 'Meals / Packs',
    icon: Utensils,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    burnPerPerson: 1.0 // 1 meal per occupant daily ration
  },
  medicine: {
    label: 'Medical Kits',
    unit: 'First-Aid / Trauma Packs',
    icon: Pill,
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    burnPerPerson: 0.2
  },
  relief: {
    label: 'Relief & Bedding',
    unit: 'Blankets & Tarps',
    icon: Package,
    color: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    burnPerPerson: 0.15
  }
};

export default function CampManagerDashboard() {
  const { showToast } = useApp();
  const searchParams = useSearchParams();
  const [camps, setCamps] = useState([]);
  const [selectedCampId, setSelectedCampId] = useState('camp-b');
  const [duties, setDuties] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isFetchingRef = useRef(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('overview'); // overview | messages | tasks | create-camp

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['overview', 'messages', 'tasks', 'create-camp'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Modals / Quick Actions State
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);

  // Forms State
  const [intakeCount, setIntakeCount] = useState(5);
  const [intakeVulnerable, setIntakeVulnerable] = useState(false);

  const [restockItem, setRestockItem] = useState('water');
  const [restockQty, setRestockQty] = useState(100);
  const [restockSource, setRestockSource] = useState('UN Humanitarian Relief Convoy');

  const [reqItem, setReqItem] = useState('water');
  const [reqQty, setReqQty] = useState(200);
  const [reqPriority, setReqPriority] = useState('critical');
  const [reqNotes, setReqNotes] = useState('Water tanks severely depleted. Resupply urgently needed for 280 occupants.');

  // Task Assignment Form
  const [taskVolunteerId, setTaskVolunteerId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskPriority, setTaskPriority] = useState('high');
  const [taskNotes, setTaskNotes] = useState('');

  // Create Camp Form
  const [newCampName, setNewCampName] = useState('');
  const [newCampLat, setNewCampLat] = useState('24.8700');
  const [newCampLng, setNewCampLng] = useState('67.0400');
  const [newCampCapacity, setNewCampCapacity] = useState(200);


  const [fieldRequisitions, setFieldRequisitions] = useState([]);

  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [campsData, dutiesData, volsData, reqsData, msgsData] = await Promise.all([
        fetchCamps(),
        fetchDuties(),
        fetchVolunteers(),
        fetchRequisitions(),
        fetchMessages()
      ]);
      setCamps(campsData);
      setDuties(dutiesData);
      setVolunteers(volsData);
      setFieldRequisitions(reqsData || []);
      setMessages(msgsData || []);
    } catch (err) {
      console.error('Failed to load camp manager data:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadData();

    const handleSync = async () => {
      if (isFetchingRef.current || !isMounted || shouldSkipSync()) return;
      isFetchingRef.current = true;
      try {
        const [campsData, reqsData, dutiesData, msgsData] = await Promise.all([
          fetchCamps(),
          fetchRequisitions(),
          fetchDuties(),
          fetchMessages()
        ]);
        if (isMounted) {
          setCamps(campsData);
          setFieldRequisitions(reqsData || []);
          setDuties(dutiesData);
          setMessages(msgsData || []);
        }
      } catch (err) {
        // Silent fail on sync
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Debounced sync handler for events
    let syncTimeout = null;
    const debouncedSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(handleSync, 800);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('reliefos_db_sync', debouncedSync);
      window.addEventListener('storage', debouncedSync);
    }
    // Reduced polling interval to 15s to prevent resource exhaustion
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

  const currentCamp = useMemo(() => {
    return camps.find(c => c.id === selectedCampId) || camps[0] || null;
  }, [camps, selectedCampId]);

  // Arriving deliveries targeting this camp
  const incomingDeliveries = useMemo(() => {
    if (!currentCamp) return [];
    return duties.filter(d => 
      (d.toId === currentCamp.id || d.toName?.toLowerCase().includes(currentCamp.name.toLowerCase().split('(')[0].trim())) &&
      d.type === 'delivery'
    );
  }, [duties, currentCamp]);

  // Active requisitions originating from this camp
  const campRequisitions = useMemo(() => {
    if (!currentCamp) return [];
    return duties.filter(d => 
      d.type === 'requisition' && 
      (d.fromCampId === currentCamp.id || d.fromCampName?.toLowerCase().includes(currentCamp.name.toLowerCase().split('(')[0].trim()))
    );
  }, [duties, currentCamp]);

  // Stationed volunteers
  const campVolunteers = useMemo(() => {
    if (!currentCamp) return [];
    return volunteers.filter(v => 
      v.location?.toLowerCase().includes(currentCamp.name.toLowerCase().split('(')[0].trim()) ||
      v.assignedCampId === currentCamp.id
    );
  }, [volunteers, currentCamp]);

  // Actions
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!currentCamp) return;
    setActionLoading(true);
    skipSyncFor(4000);
    try {
      await updateCampOccupancyAction(currentCamp.id, Number(intakeCount));
      showToast(`Registered intake of ${intakeCount} new occupants at ${currentCamp.name}.`, 'success');
      setShowIntakeModal(false);
      await loadData();
    } catch (err) {
      showToast(`Intake failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!currentCamp) return;
    setActionLoading(true);
    skipSyncFor(4000);
    try {
      await updateCampInventoryAction(currentCamp.id, restockItem, Number(restockQty), restockSource);
      showToast(`Restocked +${restockQty} ${restockItem} from ${restockSource}.`, 'success');
      setShowRestockModal(false);
      await loadData();
    } catch (err) {
      showToast(`Restock failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequisitionSubmit = async (e) => {
    e.preventDefault();
    if (!currentCamp) return;
    setActionLoading(true);
    skipSyncFor(4000);
    try {
      await submitCampRequisitionAction({
        campId: currentCamp.id,
        campName: currentCamp.name,
        item: reqItem,
        quantity: Number(reqQty),
        priority: reqPriority,
        notes: reqNotes
      });
      showToast(`Emergency requisition for ${reqQty} ${reqItem} transmitted to Central Command!`, 'success');
      setShowRequisitionModal(false);
      await loadData();
    } catch (err) {
      showToast(`Requisition failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeliveryArrival = async (delivery) => {
    setActionLoading(true);
    skipSyncFor(4000);
    try {
      await confirmDeliveryArrivalAction(
        delivery.id,
        currentCamp.id,
        delivery.item,
        delivery.quantity
      );
      showToast(`Delivery #${delivery.id.substr(-6)} confirmed! Stock updated (+${delivery.quantity} ${delivery.item}).`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Confirmation failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveFieldRequisition = async (req) => {
    // 1. Instant optimistic update so card flips to approved immediately without flickering
    skipSyncFor(4000);
    setFieldRequisitions(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', updatedAt: new Date().toISOString() } : r));
    setActionLoading(true);
    try {
      await updateRequisitionAction(req.id, { status: 'approved' });
      showToast(`Requisition #${req.id.substr(-6)} APPROVED! Camp inventory deducted and delivery convoy queued.`, 'success');
      // Wait a beat before refreshing to let the optimistic update settle
      setTimeout(async () => {
        await loadData();
        setActionLoading(false);
      }, 1200);
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'error');
      await loadData();
      setActionLoading(false);
    }
  };

  // Assign task to volunteer
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskVolunteerId || !taskTitle) return;
    setActionLoading(true);
    skipSyncFor(4000);
    try {
      const vol = volunteers.find(v => v.id === taskVolunteerId);
      const newDuty = {
        id: `duty-mgr-${Date.now()}`,
        volunteerId: taskVolunteerId,
        volunteerName: vol?.name || 'Volunteer',
        title: taskTitle,
        location: taskLocation || currentCamp?.name || 'Field Zone',
        areaId: 'area-c',
        status: 'assigned',
        priority: taskPriority,
        notes: taskNotes,
        type: 'field_task',
        instructions: taskTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await createDutyAction(newDuty);
      showToast(`Task "${taskTitle}" assigned to ${vol?.name || 'volunteer'}!`, 'success');
      setShowAssignTaskModal(false);
      setTaskTitle('');
      setTaskNotes('');
      setTaskLocation('');
      await loadData();
    } catch (err) {
      showToast(`Task assignment failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create new camp
  const handleCreateCamp = async (e) => {
    e.preventDefault();
    if (!newCampName) return;
    setActionLoading(true);
    skipSyncFor(4000);
    try {
      const created = await addSafeZoneAction({
        name: newCampName,
        lat: newCampLat,
        lng: newCampLng,
        capacity: Number(newCampCapacity),
        type: 'camp'
      });
      showToast(`New camp "${newCampName}" created successfully!`, 'success');
      setNewCampName('');
      setNewCampCapacity(200);
      setActiveTab('overview');
      if (created?.id) {
        setSelectedCampId(created.id);
      }
      await loadData();
    } catch (err) {
      showToast(`Failed to create camp: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-80" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentCamp) {
    return <div className="p-8 text-slate-500">No camp data available.</div>;
  }

  const occupancy = currentCamp.occupancy || 0;
  const capacity = currentCamp.capacity || 1;
  const occupancyPct = Math.round((occupancy / capacity) * 100);
  const isNearCapacity = occupancyPct >= 90;
  const criticalItems = (currentCamp.items || []).filter(i => i.stock < i.need);

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Top Banner: Camp Selector & Operational Control Header */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Camp Selector Dropdown */}
            <div className="relative inline-block">
              <select
                id="camp-selector"
                name="campSelector"
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(e.target.value)}
                className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm sm:text-base rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {camps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              DEPOT LOGISTICS
            </span>

            {criticalItems.length > 0 ? (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {criticalItems.length} DEFICIT{criticalItems.length > 1 ? 'S' : ''}
              </span>
            ) : (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                STOCK STABLE
              </span>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-2">
            <span>POS: {currentCamp.lat}°N, {currentCamp.lng}°E</span>
            <span>//</span>
            <span>TYPE: EMERGENCY REFUGE</span>
            <span>//</span>
            <span>STATUS: ACTIVE HUB</span>
          </div>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowIntakeModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-xs"
          >
            <Users className="w-3 h-3" />
            <span>Intake</span>
          </button>

          <button
            onClick={() => setShowRestockModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shadow-xs"
          >
            <Plus className="w-3 h-3" />
            <span>Restock</span>
          </button>

          <button
            onClick={() => setShowRequisitionModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition shadow-xs"
          >
            <Send className="w-3 h-3" />
            <span>Requisition</span>
          </button>

          <button
            onClick={() => setShowAssignTaskModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs"
          >
            <ClipboardList className="w-3 h-3" />
            <span>Assign Task</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create-camp')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-xs ${
              activeTab === 'create-camp'
                ? 'bg-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-800'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Camp</span>
          </button>

          <Link
            href="/mobile"
            title="Open Citizen User Portal to view resident distress feed and camp ration requests"
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-[#2D4A22] hover:bg-[#385F2C] text-white transition shadow-xs"
          >
            <Smartphone className="w-3 h-3 text-emerald-300" />
            <span>Citizen Portal</span>
          </Link>

          <button
            onClick={loadData}
            title="Refresh camp data"
            className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-xs">
        {[
          { key: 'overview', label: 'Overview & Stock', icon: Building2 },
          { key: 'messages', label: `Messages (${messages.length})`, icon: MessageSquare },
          { key: 'tasks', label: `Tasks & Duties (${duties.length})`, icon: ClipboardList },
          { key: 'create-camp', label: '+ Create Camp', icon: Plus },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === tab.key 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>


      {/* ====================== OVERVIEW TAB ====================== */}
      {activeTab === 'overview' && (
        <>
          {/* Critical Shortage Warning Banner */}
          {criticalItems.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-red-900 dark:text-red-200 uppercase font-mono">
                    STOCK DEFICIT ALERT // {currentCamp.name}
                  </span>
                  <p className="text-[11px] text-red-700 dark:text-red-300">
                    {criticalItems.map(i => `${ITEM_CONFIG[i.item]?.label || i.item}: ${i.stock} (deficit -${i.need - i.stock})`).join(' • ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReqItem(criticalItems[0].item);
                  setReqQty(criticalItems[0].need - criticalItems[0].stock + 100);
                  setShowRequisitionModal(true);
                }}
                className="self-start sm:self-center px-3 py-1 rounded-md text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1 flex-shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Requisition</span>
              </button>
            </div>
          )}

          {/* Occupancy and Shelter Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Occupants Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Occupancy / Capacity</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-950" style={{ color: '#0f172a' }}>
                  {occupancy}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  / {capacity} persons
                </span>
                <span className={`ml-auto text-xs font-bold ${
                  isNearCapacity ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {occupancyPct}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNearCapacity ? 'bg-red-500' : occupancyPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {capacity - occupancy > 0 ? `${capacity - occupancy} beds remaining open` : 'Camp at maximum capacity'}
              </p>
            </div>

            {/* Medical Bay Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Medical Triage Bay</span>
                <HeartPulse className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-950" style={{ color: '#0f172a' }}>
                  {Math.min(18, Math.round(occupancy * 0.08))}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ 20 beds filled</span>
                <span className="ml-auto text-xs font-bold text-amber-500">90%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '90%' }} />
              </div>
              <p className="text-[11px] text-slate-500">
                Stationed: Fatima Noor (Triage Scout)
              </p>
            </div>

            {/* Incoming Deliveries Count */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Arriving Deliveries</span>
                <Truck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-950" style={{ color: '#0f172a' }}>
                  {incomingDeliveries.filter(d => d.status !== 'done').length}
                </span>
                <span className="text-xs font-semibold text-slate-500">en route</span>
                <span className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400">
                  {incomingDeliveries.length} total
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                {incomingDeliveries.filter(d => d.status !== 'done').length > 0 
                  ? 'Click "Confirm Arrival" below when driver arrives' 
                  : 'No pending in-transit transfers'}
              </div>
            </div>

            {/* Active Volunteers Stationed */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Stationed Field Personnel</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-950" style={{ color: '#0f172a' }}>
                  {campVolunteers.length || 2}
                </span>
                <span className="text-xs font-semibold text-slate-500">responders on-site</span>
                <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Mesh and VHF radio channels active
              </p>
            </div>
          </div>

          {/* 4 Inventory Stock & Burn-Rate Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-950" style={{ color: '#0f172a' }}>
                  Real-Time Stock Inventory &amp; Days-of-Supply
                </h3>
                <p className="text-xs text-slate-700 font-semibold mt-0.5" style={{ color: '#334155' }}>
                  Automated burn-rate calculations based on {occupancy} current camp occupants.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(currentCamp.items || []).map((itemObj) => {
                const cfg = ITEM_CONFIG[itemObj.item] || {
                  label: itemObj.item,
                  unit: 'units',
                  icon: Package,
                  color: 'text-slate-700',
                  bg: 'bg-slate-100',
                  border: 'border-slate-300',
                  burnPerPerson: 1
                };
                const Icon = cfg.icon;
                const dailyBurn = Math.max(1, Math.round(occupancy * cfg.burnPerPerson));
                const daysRemaining = (itemObj.stock / dailyBurn).toFixed(1);
                const isCritical = itemObj.stock < itemObj.need || Number(daysRemaining) < 1.0;
                const pct = Math.min(100, Math.round((itemObj.stock / Math.max(1, itemObj.need)) * 100));

                return (
                  <div
                    key={itemObj.item}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col justify-between shadow-sm transition hover:shadow-md ${
                      isCritical ? 'border-red-300 dark:border-red-900/60 bg-red-50/20' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-950" style={{ color: '#0f172a' }}>
                              {cfg.label}
                            </h4>
                            <span className="text-[10px] text-slate-600 font-bold uppercase font-mono" style={{ color: '#475569' }}>
                              {cfg.unit}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCritical
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {daysRemaining} Days Left
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-slate-950" style={{ color: '#0f172a' }}>
                            {itemObj.stock}
                          </span>
                          <span className="text-xs text-slate-600 font-medium" style={{ color: '#475569' }}>
                            Target Reserve: <strong className="text-slate-950" style={{ color: '#0f172a' }}>{itemObj.need}</strong>
                          </span>
                        </div>

                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct < 30 ? 'bg-red-500' : pct < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2" style={{ color: '#475569' }}>
                        <span>Daily burn rate:</span>
                        <strong className="text-slate-900 font-bold" style={{ color: '#0f172a' }}>~{dailyBurn} {cfg.unit.split(' ')[0]}/day</strong>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRestockItem(itemObj.item);
                          setShowRestockModal(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition text-center"
                      >
                        + Log Intake
                      </button>
                      {isCritical && (() => {
                        const hasPendingReq = campRequisitions.some(
                          r => (r.item || '').toLowerCase() === itemObj.item.toLowerCase()
                        );
                        return hasPendingReq ? (
                          <span className="py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Requested
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setReqItem(itemObj.item);
                              setReqQty(Math.max(100, itemObj.need - itemObj.stock));
                              setShowRequisitionModal(true);
                            }}
                            className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
                          >
                            Request
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INCOMING FIELD REQUISITIONS FROM VOLUNTEERS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-500/30 dark:border-amber-500/40 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase font-mono">
                    INCOMING VOLUNTEER FIELD REQUISITIONS ({fieldRequisitions.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review and approve supply requests submitted by field responders. Approval automatically deducts camp stock and dispatches a delivery convoy.
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE SYNC
              </span>
            </div>

            {fieldRequisitions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-mono">
                No incoming volunteer requisitions at this time. When responders request camp resources from the field, they appear here instantly.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {fieldRequisitions.map((req) => {
                  const isApproved = req.status === 'approved' || req.status === 'fulfilled';
                  return (
                    <div key={req.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            #{req.id.substr(-6)}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isApproved
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : req.priority === 'critical'
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 animate-pulse'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}>
                            {isApproved ? 'Approved // Convoy Dispatched' : `${req.priority?.toUpperCase()} PRIORITY`}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Responder: <strong>{req.volunteerName}</strong>
                          </span>
                          <span className="text-xs text-slate-400">
                            • Target: <strong>{req.campName}</strong>
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Requested: {req.items?.map(i => `${i.quantity} ${i.unit || ''} ${i.item}`).join(', ')}
                        </h4>

                        {req.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            &quot;{req.notes}&quot;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
                        {!isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleApproveFieldRequisition(req)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-white transition flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Dispatch Convoy</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-emerald-500" /> Convoy Active &amp; Dispatched
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grid: Arriving Deliveries & Emergency Requisitions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Arriving Inter-Camp Deliveries Intake Desk */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-500" />
                    Arriving Deliveries &amp; Inter-Camp Transfers
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify incoming supply trucks and intake supplies directly into camp storage.
                  </p>
                </div>
              </div>

              {incomingDeliveries.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No incoming deliveries currently scheduled for {currentCamp.name}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {incomingDeliveries.map((delivery) => {
                    const isDone = delivery.status === 'done';
                    return (
                      <div key={delivery.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                              #{delivery.id.substr(-6)}
                            </span>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isDone
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 animate-pulse'
                            }`}>
                              {isDone ? 'Delivered & Stocked' : 'In-Transit'}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {delivery.instructions || `Transfer ${delivery.quantity} ${delivery.item} to ${currentCamp.name}`}
                          </h4>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Courier: <strong>{delivery.volunteerName || 'Dispatch Driver'}</strong></span>
                            <span>•</span>
                            <span>Item: <strong>+{delivery.quantity} {delivery.item}</strong></span>
                          </div>
                        </div>

                        {!isDone ? (
                          <button
                            onClick={() => handleConfirmDeliveryArrival(delivery)}
                            disabled={actionLoading}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 flex-shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Arrival &amp; Stock In</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Received
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Outgoing Supply Requisitions to Command */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-red-500" />
                    Emergency Requisitions to Central Command
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Supply requests transmitted to the Rescue Coordinator for dispatch approval.
                  </p>
                </div>
                <button
                  onClick={() => setShowRequisitionModal(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 transition"
                >
                  + New Request
                </button>
              </div>

              {campRequisitions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No open supply requisitions for {currentCamp.name}. Click &quot;+ New Request&quot; if reserves drop.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {campRequisitions.map((req) => (
                    <div key={req.id} className="py-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                            #{req.id.substr(-6)}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                            {req.priority || 'High'} Priority
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(req.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {req.instructions}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Status: <strong className="text-amber-500">Awaiting Command Allocation Dispatch</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ====================== MESSAGES TAB ====================== */}
      {activeTab === 'messages' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase font-mono">
                CITIZEN &amp; VOLUNTEER MESSAGES ({messages.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-mono space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p>No messages received yet.</p>
              <p className="text-[11px]">When citizens send SOS via the mobile app, messages arrive here via mesh relay.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/30 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white uppercase">
                      {msg.category || 'CITIZEN SOS'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200">
                      From: {msg.senderName || 'Affected Citizen'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      • {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      → To: {msg.recipientName || 'Volunteer'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{msg.text}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-red-200/50 dark:border-red-800/40">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">Route:</span>
                      <span>{msg.hopRoute || 'Bluetooth Mesh P2P'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        {msg.status === 'relayed_hq' ? 'Relayed to HQ' : 'Delivered'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTaskTitle(`Rescue/Assist: ${msg.senderName || 'Citizen'} (${(msg.text || '').substring(0, 45)})`);
                        setTaskNotes(`Citizen SOS: "${msg.text}". Category: ${msg.category || 'SOS'}. Routed via ${msg.hopRoute || 'BLE Mesh'}.`);
                        setTaskLocation(currentCamp?.name || 'Delta Sector 9');
                        setTaskPriority(msg.category === 'SOS Emergency' ? 'critical' : 'high');
                        setShowAssignTaskModal(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1 shadow-xs"
                    >
                      <ClipboardList className="w-3 h-3" />
                      <span>Dispatch Volunteer for this SOS</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================== TASKS TAB ====================== */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase font-mono">
                ALL DUTIES &amp; TASKS ({duties.length})
              </h3>
            </div>
            <button
              onClick={() => setShowAssignTaskModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign New Task</span>
            </button>
          </div>

          {duties.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-mono">
              No tasks or duties assigned yet. Use &quot;Assign New Task&quot; to dispatch volunteers.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {duties.map((duty) => {
                const isAssigned = duty.status === 'assigned';
                const isInProgress = duty.status === 'in_progress';
                const isDone = duty.status === 'done';
                return (
                  <div key={duty.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">#{duty.id.substr(-6)}</span>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isAssigned ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          : isInProgress ? 'bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {duty.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {(duty.type || 'duty').toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {duty.title || duty.instructions || duty.notes}
                      </h4>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span>Volunteer: <strong>{duty.volunteerName || 'Unassigned'}</strong></span>
                        <span>•</span>
                        <span>Location: <strong>{duty.toName || duty.location || 'Field'}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        isAssigned ? 'bg-amber-100 text-amber-800' : isInProgress ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isDone ? '✓ Complete' : isInProgress ? '⏳ In Progress' : '📋 Assigned'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================== CREATE CAMP TAB ====================== */}
      {activeTab === 'create-camp' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-lg">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <Tent className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase font-mono">
              CREATE NEW CAMP / SAFE ZONE
            </h3>
          </div>
          <form onSubmit={handleCreateCamp} className="space-y-4">
            <div>
              <label htmlFor="new-camp-name" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Camp Name</label>
              <input
                type="text"
                id="new-camp-name"
                name="newCampName"
                value={newCampName}
                onChange={(e) => setNewCampName(e.target.value)}
                placeholder="e.g., Camp D (River Bridge)"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-camp-lat" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Latitude</label>
                <input
                  type="text"
                  id="new-camp-lat"
                  name="newCampLat"
                  value={newCampLat}
                  onChange={(e) => setNewCampLat(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="new-camp-lng" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Longitude</label>
                <input
                  type="text"
                  id="new-camp-lng"
                  name="newCampLng"
                  value={newCampLng}
                  onChange={(e) => setNewCampLng(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="new-camp-capacity" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Capacity (persons)</label>
              <input
                type="number"
                id="new-camp-capacity"
                name="newCampCapacity"
                min="10"
                value={newCampCapacity}
                onChange={(e) => setNewCampCapacity(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-bold"
                required
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading || !newCampName}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Create Camp</span>
            </button>
          </form>
        </div>
      )}

      {/* ====================== MODALS ====================== */}

      {/* Shelter Intake Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-900 dark:text-white" />
                Register Shelter Intake
              </h3>
              <button onClick={() => setShowIntakeModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="space-y-4">
              <div>
                <label htmlFor="intake-count" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Number of Evacuees Arriving
                </label>
                <input
                  type="number"
                  id="intake-count"
                  name="intakeCount"
                  min="1"
                  max="100"
                  value={intakeCount}
                  onChange={(e) => setIntakeCount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vulnerable-check"
                  name="vulnerableCheck"
                  checked={intakeVulnerable}
                  onChange={(e) => setIntakeVulnerable(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="vulnerable-check" className="text-xs text-slate-600 dark:text-slate-400">
                  Includes vulnerable persons (Infants, pregnant, elderly, injured)
                </label>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                This will increment current camp occupancy to <strong>{occupancy + Number(intakeCount)}</strong> / {capacity} and adjust ration burn rates.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                >
                  Confirm Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                Log Stock Intake / Restock
              </h3>
              <button onClick={() => setShowRestockModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label htmlFor="restock-item" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Resource Item
                </label>
                <select
                  id="restock-item"
                  name="restockItem"
                  value={restockItem}
                  onChange={(e) => setRestockItem(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="water">Drinking Water (Liters)</option>
                  <option value="food">Food Rations (Meals)</option>
                  <option value="medicine">Medical Kits (Packs)</option>
                  <option value="relief">Relief &amp; Blankets (Units)</option>
                </select>
              </div>

              <div>
                <label htmlFor="restock-qty" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Quantity Received
                </label>
                <input
                  type="number"
                  id="restock-qty"
                  name="restockQty"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div>
                <label htmlFor="restock-source" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Donation / Supply Source
                </label>
                <input
                  type="text"
                  id="restock-source"
                  name="restockSource"
                  value={restockSource}
                  onChange={(e) => setRestockSource(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                >
                  Record Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Requisition Modal */}
      {showRequisitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-red-500" />
                Emergency Requisition to Central Command
              </h3>
              <button onClick={() => setShowRequisitionModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequisitionSubmit} className="space-y-4">
              <div>
                <label htmlFor="req-item" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Requested Resource
                </label>
                <select
                  id="req-item"
                  name="reqItem"
                  value={reqItem}
                  onChange={(e) => setReqItem(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="water">Drinking Water</option>
                  <option value="food">Food Rations</option>
                  <option value="medicine">Medical / Trauma Supplies</option>
                  <option value="relief">Relief Kits / Blankets</option>
                </select>
              </div>

              <div>
                <label htmlFor="req-qty" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Quantity Required
                </label>
                <input
                  type="number"
                  id="req-qty"
                  name="reqQty"
                  min="1"
                  value={reqQty}
                  onChange={(e) => setReqQty(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div>
                <label htmlFor="req-priority" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Urgency Priority
                </label>
                <select
                  id="req-priority"
                  name="reqPriority"
                  value={reqPriority}
                  onChange={(e) => setReqPriority(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="critical">CRITICAL (Imminent stockout / Life hazard)</option>
                  <option value="high">HIGH (Stockout anticipated in &lt;24 hours)</option>
                  <option value="standard">STANDARD (Routine replenishment)</option>
                </select>
              </div>

              <div>
                <label htmlFor="req-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Operational Justification
                </label>
                <textarea
                  id="req-notes"
                  name="reqNotes"
                  rows="3"
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                  placeholder="Explain why this resupply is required..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequisitionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit to Command</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Assign Task to Volunteer
              </h3>
              <button onClick={() => setShowAssignTaskModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label htmlFor="task-volunteer" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Volunteer
                </label>
                <select
                  id="task-volunteer"
                  name="taskVolunteer"
                  value={taskVolunteerId}
                  onChange={(e) => setTaskVolunteerId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold"
                  required
                >
                  <option value="">-- Select Volunteer --</option>
                  {volunteers.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.status || 'available'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-title" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Task Title / Instructions
                </label>
                <input
                  type="text"
                  id="task-title"
                  name="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Deliver water rations to Sector 9"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="task-location" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="task-location"
                  name="taskLocation"
                  value={taskLocation}
                  onChange={(e) => setTaskLocation(e.target.value)}
                  placeholder="e.g., Delta Sector 9 or Camp B"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="task-priority-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                <select
                  id="task-priority-select"
                  name="taskPriority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="critical">CRITICAL</option>
                  <option value="high">HIGH</option>
                  <option value="normal">NORMAL</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes
                </label>
                <textarea
                  id="task-notes"
                  name="taskNotes"
                  rows="2"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !taskVolunteerId || !taskTitle}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Assign Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
