'use client';

import React, { useState, useEffect } from 'react';
import { extractKeywordsFromText, fetchReports, submitReportAction } from '../lib/api';
import { useApp } from '../context/AppContext';
import { 
  FileSearch, 
  AlertCircle, 
  Send, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  HelpCircle,
  Radio,
  FileText,
  BadgeAlert,
  RefreshCw
} from 'lucide-react';

export default function ReportTriage() {
  const { showToast } = useApp();
  const [inputText, setInputText] = useState(
    'Grandmother (age 78) is bedridden and trapped on ground floor. Flood water rising fast over 3 feet. Urgent evacuation boat needed!'
  );
  const [extractedData, setExtractedData] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sampleMessages = [
    {
      title: 'Sample 1: Flood & Mobility Trap (Area C)',
      text: 'Grandmother (age 78) is bedridden and trapped on ground floor. Flood water rising fast over 3 feet. Urgent evacuation boat needed!'
    },
    {
      title: 'Sample 2: Medical Cold Chain Failure',
      text: 'Basement clinic generator died. 25 vials of insulin warming up quickly. Need ice packs or cold box battery replacement soon.'
    },
    {
      title: 'Sample 3: Downed Power Line Hazard',
      text: 'High voltage electrical cable snapped across roadway near school. Sparking in standing water, stay clear!'
    },
    {
      title: 'Sample 4: Vague / Incomplete Report',
      text: 'Things are bad over here. Water is everywhere.'
    }
  ];


  // Perform extraction whenever text changes or on demand
  const handleExtract = () => {
    if (!inputText.trim()) return;
    const result = extractKeywordsFromText(inputText);
    setExtractedData(result);
  };

  useEffect(() => {
    handleExtract();
    fetchReports().then(setReportsList);
  }, []);

  const handleCommitReport = async () => {
    if (!extractedData || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const rep = await submitReportAction({
        text: inputText,
        areaId: 'area-c', // Delta sector
        source: 'triage_extractor',
        extracted: extractedData
      });
      showToast('Report ingested into Dark Zone engine with "Suggested" label', 'success');
      const updated = await fetchReports();
      setReportsList(updated);
    } catch (err) {
      showToast(`Submission failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 lg:p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
            EMERGENCY REPORT TRIAGE
          </h1>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            NLP PARSER
          </span>
        </div>
      </div>

      {/* Main Parser Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Raw Text Input Box & Presets */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <label htmlFor="distress-transcript-input" className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              DISTRESS MESSAGE TRANSCRIPT / SMS / MESH
            </label>
            <textarea
              id="distress-transcript-input"
              name="distressTranscript"
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw emergency message text here..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="text-xs text-slate-500">
                {inputText.length} characters
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExtract}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Parse Text</span>
                </button>
                <button
                  type="button"
                  onClick={handleCommitReport}
                  disabled={isSubmitting || !inputText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Ingesting...' : 'Ingest Report'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
              Standard Incident Message Templates
            </span>
            <div className="space-y-2">
              {sampleMessages.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(sample.text);
                    const res = extractKeywordsFromText(sample.text);
                    setExtractedData(res);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                >
                  <div className="font-semibold text-slate-900 dark:text-white">{sample.title}</div>
                  <div className="text-slate-500 dark:text-slate-400 truncate mt-0.5">{sample.text}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Extracted Structured Entities */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Structured Entity Extractions
                  </h3>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/40">
                  Suggested Tag Applied
                </span>
              </div>


              {extractedData ? (
                <div className="space-y-4 mt-5">
                  {/* Field: Age */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Age Demographic</span>
                      <p className={`text-sm font-bold mt-0.5 ${extractedData.age === 'Not found' ? 'text-slate-500 italic font-normal' : 'text-slate-900 dark:text-white'}`}>
                        {extractedData.age}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/40">
                      Suggested
                    </span>
                  </div>

                  {/* Field: Mobility Issue */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Mobility Impairment</span>
                      <p className={`text-sm font-bold mt-0.5 ${extractedData.mobilityIssue === 'Not found' ? 'text-slate-500 italic font-normal' : 'text-amber-700 dark:text-amber-300'}`}>
                        {extractedData.mobilityIssue}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/40">
                      Suggested
                    </span>
                  </div>

                  {/* Field: Hazard */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Identified Hazard</span>
                      <p className={`text-sm font-bold mt-0.5 ${extractedData.hazard === 'Not found' ? 'text-slate-500 italic font-normal' : 'text-rose-700 dark:text-rose-300'}`}>
                        {extractedData.hazard}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/40">
                      Suggested
                    </span>
                  </div>

                  {/* Field: Urgency */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Urgency Score Level</span>
                      <p className="text-sm font-extrabold mt-0.5 text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          extractedData.urgency === 'Critical' ? 'bg-rose-500 animate-ping' : extractedData.urgency === 'High' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`} />
                        {extractedData.urgency}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/40">
                      Suggested
                    </span>
                  </div>

                  {/* Field: Assistance Needed */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Assistance / Supplies Needed</span>
                      <p className={`text-sm font-bold mt-0.5 ${extractedData.assistanceNeeded === 'Not found' ? 'text-slate-500 italic font-normal' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {extractedData.assistanceNeeded}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/40">
                      Suggested
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Click "Parse Text" to extract structured attributes.
                </div>
              )}
            </div>

            {/* Honesty & Hallucination Guard Alert */}
            <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Hallucination Policy:</strong> If a distress text does not state an entity explicitly, it is safely cataloged as <code className="text-purple-700 dark:text-purple-300">"Not found"</code>. All automatic evaluations remain suggestions until confirmed by rescue coordinators.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed of Ingested Crowdsourced & Mesh Reports */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Recent Triaged Distress Reports ({reportsList.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Web &amp; Simulated Mesh Feeds
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 overflow-x-auto">
          {reportsList.map((rep) => (
            <div key={rep.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
                    rep.source === 'mesh' ? 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800' : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {rep.source}
                  </span>
                  <span className="text-purple-700 dark:text-purple-400 font-mono font-medium">{rep.id}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-500 dark:text-slate-400">{new Date(rep.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-sm">{rep.text}</p>
                {rep.extracted && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    {rep.extracted.hazard && rep.extracted.hazard !== 'Not found' && (
                      <span className="text-rose-700 dark:text-rose-300 font-medium">Hazard: {rep.extracted.hazard}</span>
                    )}
                    {rep.extracted.assistanceNeeded && rep.extracted.assistanceNeeded !== 'Not found' && (
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">• Need: {rep.extracted.assistanceNeeded}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/40">
                  {rep.label || 'Suggested'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
