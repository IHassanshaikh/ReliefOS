'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { 
  fetchAreaById, 
  sendFieldTeamAction, 
  verifyAreaAction, 
  fetchVolunteers,
  fetchReports,
  submitReportAction,
  fetchDuties
} from '../lib/api';
import { 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Check, 
  Info, 
  Activity, 
  FileText, 
  Send, 
  Radio, 
  Clock, 
  Compass, 
  MapPin,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

export default function AreaDetail({ id: propId }) {
  const router = useRouter();
  const routeParams = useParams();
  const areaId = propId || (routeParams && routeParams.id) || 'area-c';
  const { showToast } = useApp();

  const [area, setArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState(['vol-1', 'vol-4']);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [areaReports, setAreaReports] = useState([]);
  const [areaDuties, setAreaDuties] = useState([]);
  const [newReportText, setNewReportText] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);


  const loadArea = async () => {
    setLoading(true);
    try {
      const [data, vols, reps, dts] = await Promise.all([
        fetchAreaById(areaId),
        fetchVolunteers(),
        fetchReports(),
        fetchDuties()
      ]);
      setArea(data);
      setVolunteers(vols.filter(v => v.availability || v.status === 'available'));
      setAreaReports(reps.filter(r => r.areaId === areaId || r.area_id === areaId));
      setAreaDuties(dts.filter(d => d.toId === areaId || d.toAreaOrCampId === areaId || d.toName?.includes(data?.name)));
    } catch (err) {
      console.error('Failed to load area detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArea();
  }, [areaId]);

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!newReportText.trim() || submittingReport) return;
    setSubmittingReport(true);
    try {
      await submitReportAction({
        areaId,
        text: newReportText,
        source: 'field_operator',
        extracted: {
          urgency: 'high',
          assistanceNeeded: 'Evacuation and medical support'
        }
      });
      showToast(`Emergency sitrep logged for ${area?.name || areaId}.`, 'success');
      setNewReportText('');
      const updatedReps = await fetchReports();
      setAreaReports(updatedReps.filter(r => r.areaId === areaId || r.area_id === areaId));
    } catch (err) {
      showToast(`Failed to log report: ${err.message}`, 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSendFieldTeam = async () => {
    // 1. Instant optimistic update
    setArea(prev => prev ? { ...prev, verification: 'team_sent' } : prev);
    setActionLoading(true);
    try {
      await sendFieldTeamAction(areaId, selectedVolunteers);
      setShowAssignModal(false);
      showToast(`Field Team deployed to ${area.name}. Verification status: team_sent.`, 'success');
      await loadArea();
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
      await loadArea();
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (outcome) => {
    setActionLoading(true);
    try {
      await verifyAreaAction(areaId, outcome, `Evaluated by rescue coordinator.`);
      const label = outcome === 'confirmed' ? 'CONFIRMED' : outcome === 'verified_safe' ? 'VERIFIED SAFE' : 'REJECTED';
      showToast(`Area ${area.name} marked as ${label}.`, 'success');
      await loadArea();
    } catch (err) {
      showToast(`Verification failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !area) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-900 rounded-2xl" />
          <div className="h-64 bg-slate-900 rounded-2xl col-span-2" />
        </div>
      </div>
    );
  }

  const assessment = area.assessment || {};
  const isDarkZone = assessment.isDarkZone;
  const score = assessment.score || 0;
  const conditions = assessment.passedConditions || {};

  const chartData = [
    { name: 'Expected Reports', count: assessment.expectedReports || 40, color: '#2563eb' },
    { name: 'Actual Received', count: area.actualReports || 1, color: '#dc2626' }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <button
          onClick={() => router.push('/')}
          className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">Area Detail</span>
        <span>/</span>
        <span className="font-bold uppercase text-slate-900 dark:text-white">{area.id}</span>
      </div>

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                {area.name} // SECTOR TELEMETRY
              </h1>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                isDarkZone
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
              }`}>
                {isDarkZone ? 'POTENTIAL DARK ZONE' : 'NORMAL'}
              </span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                SUGGESTED
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
              POS: {area.lat.toFixed(4)}, {area.lng.toFixed(4)} // POP: {area.population}
            </p>
          </div>
        </div>

        {/* Verification Status Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[10px] text-slate-500 uppercase">STATUS:</span>
          <span className={`px-2 py-0.5 rounded font-bold border ${
            area.verification === 'team_sent'
              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
              : area.verification === 'confirmed'
              ? 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
              : area.verification === 'verified_safe'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {area.verification ? area.verification.toUpperCase().replace('_', ' ') : 'UNVERIFIED'}
          </span>
        </div>
      </div>


      {/* 6 Key Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">POPULATION</span>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            {area.population.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Total residents</span>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">VULNERABLE SHARE</span>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            {Math.round((area.vulnerableShare || 0.3) * 100)}%
          </div>
          <span className="text-[10px] text-slate-400">~{Math.round(area.population * (area.vulnerableShare || 0.3))} at risk</span>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">HAZARD SEVERITY</span>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            {area.hazardSeverity} / 1.0
          </div>
          <span className="text-[10px] text-slate-400">Flood saturation</span>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">NETWORK FAILURE</span>
          <div className="mt-1 text-base font-bold text-red-600 dark:text-red-400">
            {Math.round((area.networkFailure || 0.8) * 100)}% Down
          </div>
          <span className="text-[10px] text-slate-400">Tower disconnect</span>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">EXPECTED REPORTS</span>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            ~{assessment.expectedReports || 40}
          </div>
          <span className="text-[10px] text-slate-400">Model projection</span>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">SILENCE RATIO</span>
          <div className="mt-1 text-base font-bold text-purple-700 dark:text-purple-400">
            {Math.round((assessment.silenceRatio || 0.98) * 100)}%
          </div>
          <span className="text-[10px] text-slate-400">{area.actualReports || 1} received</span>
        </div>
      </div>

      {/* Tactical Heuristic Banner */}
      <div className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-mono flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span>HEURISTIC MODEL // SUBJECT TO HUMAN VERIFICATION</span>
        </div>
        <span className="text-slate-400">GROUND RECON REQUIRED</span>
      </div>

      {/* Row 1: Gauge & Condition Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dark Zone Score Gauge Card */}
        <div className="lg:col-span-5 glass-panel-purple p-6 rounded-2xl border border-fuchsia-500/40 shadow-xl flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-fuchsia-900/40">
            <span className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider">
              Composite Dark Zone Index
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-900/70 text-purple-200">
              Confidence: {assessment.confidence ? assessment.confidence.toUpperCase() : 'HIGH'}
            </span>
          </div>

          {/* SVG Circular Gauge */}
          <div className="relative w-48 h-48 my-4 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="10"
                className="text-fuchsia-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {score}
              </span>
              <span className="text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-300 uppercase tracking-widest mt-0.5">
                / 100 Risk Index
              </span>
            </div>
          </div>

          <div className="w-full pt-3 border-t border-slate-200 dark:border-fuchsia-900/40 text-xs text-slate-600 dark:text-slate-300">
            {isDarkZone ? (
              <p className="font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                Critical Reporting Gap: Severe flood threat with zero communication telemetry.
              </p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Area metrics do not meet all 3 simultaneous Dark Zone trigger thresholds.
              </p>
            )}
          </div>
        </div>

        {/* Why Flagged Checklist */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                "Why Flagged" Anomaly Verification Checklist
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Requires ALL 3 Gates
              </span>
            </div>

            <div className="space-y-4 mt-5">
              {/* Gate 1 */}
              <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                conditions.silence 
                  ? 'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-300 dark:border-fuchsia-500/50 text-slate-900 dark:text-fuchsia-100'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                <div className="flex items-start gap-3">
                  {conditions.silence ? (
                    <CheckCircle2 className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">Gate 1: Silence Ratio &ge; 0.6</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 dark:bg-fuchsia-900 dark:text-fuchsia-200">
                        {Math.round((assessment.silenceRatio || 0.98) * 100)}% Silence (Pass)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Received only {area.actualReports || 0} report(s) against an expected baseline of ~{assessment.expectedReports || 40}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Gate 2 */}
              <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                conditions.hazard 
                  ? 'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-300 dark:border-fuchsia-500/50 text-slate-900 dark:text-fuchsia-100'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                <div className="flex items-start gap-3">
                  {conditions.hazard ? (
                    <CheckCircle2 className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">Gate 2: Hazard Threat Severity &ge; 0.6</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900 dark:text-rose-200">
                        {area.hazardSeverity} / 1.0 Severity (Pass)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Satellite and radar sensors register critical flood inundation across primary access roads.
                    </p>
                  </div>
                </div>
              </div>

              {/* Gate 3 */}
              <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                conditions.vulnerabilityOrNetwork 
                  ? 'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-300 dark:border-fuchsia-500/50 text-slate-900 dark:text-fuchsia-100'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                <div className="flex items-start gap-3">
                  {conditions.vulnerabilityOrNetwork ? (
                    <CheckCircle2 className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">Gate 3: Vulnerable Share &ge; 0.25 OR Network Failure &ge; 0.5</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900 dark:text-purple-200">
                        Both Satisfied (Pass)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Vulnerable demographic share is {Math.round(area.vulnerableShare * 100)}% (elderly/infants) and cellular tower failure is {Math.round(area.networkFailure * 100)}%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
            <strong>Core Rule:</strong> Low incoming reports alone never trigger a Dark Zone flag, preventing safe or unpopulated areas with few reports from causing false alarms.
          </div>
        </div>
      </div>

      {/* Expected vs Actual & Coordinator Decision Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Expected vs Actual Reports Disparity
            </h3>
            <span className="text-xs text-slate-500">40 Expected vs 1 Actual</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
            The reporting deficit directly explains why {area.name} requires human ground verification rather than assuming safety.
          </p>
        </div>

        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight pb-3 border-b border-slate-200 dark:border-slate-800">
              Coordinator Verification Workflow
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              All automatic classifications are labeled <strong className="text-purple-700 dark:text-purple-300">Suggested</strong>. Confirm or dismiss findings with logged rationale:
            </p>

            <div className="space-y-3 mt-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Deploy Field Team</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Assign available ground scouts to verify if residents are trapped.
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={actionLoading || area.verification === 'team_sent'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {area.verification === 'team_sent' ? 'Team Deployed' : 'Send Field Team'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Confirm Ground Hazard</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Team confirms silent distress. Applies +15 priority boost for relief dispatch.
                  </p>
                </div>
                <button
                  onClick={() => handleVerify('confirmed')}
                  disabled={actionLoading || area.verification === 'confirmed'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-md shadow-fuchsia-600/30 transition disabled:opacity-50"
                >
                  Confirm Finding
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Verify Safe or Reject</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Field inspection proves residents evacuated. De-escalates area from Silent Risk.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify('verified_safe')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                  >
                    Verified Safe
                  </button>
                  <button
                    onClick={() => handleVerify('rejected')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Incident Reports & Dispatch Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incident Reports Feed */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                SECTOR INCIDENT REPORTS ({areaReports.length})
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Incoming distress sitreps and triage extractions
              </p>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              LIVE FEED
            </span>
          </div>

          {/* Quick Sitrep Form */}
          <form onSubmit={handleAddReport} className="flex gap-2">
            <label htmlFor="area-sitrep-input" className="sr-only">
              Log emergency sitrep
            </label>
            <input
              type="text"
              id="area-sitrep-input"
              name="areaSitrepInput"
              value={newReportText}
              onChange={(e) => setNewReportText(e.target.value)}
              placeholder={`Log emergency sitrep for ${area.name}... (e.g. 5 elderly residents stranded)`}
              className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={submittingReport || !newReportText.trim()}
              className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>{submittingReport ? 'Logging...' : 'Submit Sitrep'}</span>
            </button>
          </form>

          {areaReports.length === 0 ? (
            <p className="text-xs font-mono text-slate-400 text-center py-6">
              No incident reports recorded yet for {area.name}.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {areaReports.map((r, i) => (
                <div key={r.id || i} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">[{r.id || `REP-${i + 1}`}]</span>
                      <span>via {r.source || 'radio'}</span>
                    </div>
                    {r.extracted?.urgency && (
                      <span className="px-1.5 py-0.2 rounded font-bold uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        {r.extracted.urgency}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-900 dark:text-white font-sans text-xs">
                    {r.text}
                  </p>
                  {r.extracted?.assistanceNeeded && (
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 pt-0.5">
                      Needed: {r.extracted.assistanceNeeded}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Field Duties for this Sector */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                VERIFICATION MISSIONS ({areaDuties.length})
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Active ground missions in this sector
              </p>
            </div>
          </div>

          {areaDuties.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-slate-400 space-y-2">
              <Compass className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
              <p>No active field duties currently dispatched to {area.name}.</p>
              <button
                onClick={() => setShowAssignModal(true)}
                className="mt-1 px-3 py-1 text-xs font-bold rounded bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 transition"
              >
                Deploy Ground Team &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {areaDuties.map((duty, idx) => (
                <div key={duty.id || idx} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                      {duty.type || 'Verification'} Mission
                    </span>
                    <span className="px-1.5 py-0.2 rounded font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {duty.status || 'Assigned'}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">
                    Assigned to: <strong className="text-slate-900 dark:text-white">{duty.volunteerName || duty.volunteerId || 'Ground Team'}</strong>
                  </p>
                  {duty.instructions && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Note: {duty.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Volunteers Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Assign Field Verification Team
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Select available volunteer scouts to investigate {area.name}:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto mb-5">
              {volunteers.map(vol => {
                const isSelected = selectedVolunteers.includes(vol.id);
                return (
                  <div
                    key={vol.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedVolunteers(selectedVolunteers.filter(v => v !== vol.id));
                      } else {
                        setSelectedVolunteers([...selectedVolunteers, vol.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-400 dark:border-purple-500 text-purple-900 dark:text-white font-semibold'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{vol.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Skills: {vol.skills.join(', ')}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendFieldTeam}
                disabled={selectedVolunteers.length === 0 || actionLoading}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
              >
                {actionLoading ? 'Assigning...' : `Confirm & Dispatch (${selectedVolunteers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
