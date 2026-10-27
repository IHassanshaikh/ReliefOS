'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useApp } from '../context/AppContext';
import { 
  Radio, 
  MapPin, 
  MessageSquare, 
  Tent, 
  Wifi, 
  WifiOff,
  Bluetooth, 
  ShieldCheck, 
  Lock, 
  Unlock,
  Send, 
  AlertTriangle, 
  HeartPulse, 
  Droplet, 
  LifeBuoy, 
  Compass, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  ArrowLeft,
  ChevronRight,
  Eye, 
  EyeOff, 
  Bell, 
  Trees, 
  CheckSquare, 
  Package, 
  Home, 
  User, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Bot, 
  Sliders, 
  LayoutDashboard, 
  UserCheck, 
  KeyRound, 
  Boxes, 
  FileSearch, 
  Truck, 
  Moon, 
  Sun, 
  Palette,
  Activity,
  ShieldAlert,
  Check,
  X,
  Share2,
  Terminal,
  Signal
} from 'lucide-react';
import { 
  submitReportAction, 
  sendMessageAction, 
  fetchMessages, 
  fetchSafeZones, 
  fetchCamps
} from '../lib/api';

// Dynamically import Leaflet map with ssr: false
const MobileOfflineMap = dynamic(() => import('../components/MobileOfflineMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-[#E5EDD8] flex flex-col items-center justify-center p-6 text-[#2D4A22] font-mono text-xs text-center space-y-2">
      <div className="w-6 h-6 rounded-full border-2 border-[#2D4A22] border-t-transparent animate-spin" />
      <span>Loading Topographic Disaster Grid...</span>
    </div>
  )
});

const DEFAULT_USER_LOCATION = {
  lat: 24.8620,
  lng: 67.0340,
  label: 'Sector Delta 9 (Flooded Lowland)'
};

// Compass Directions & Bearing Calculator (From SafeZone.java & Compass algorithms)
const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function calculateDistanceAndBearing(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // in meters

  // Azimuth Bearing
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;
  const dirIndex = Math.round(brng / 45) % 8;

  return {
    meters: Math.round(d),
    distanceText: d < 1000 ? `${Math.round(d)}m away` : `${(d / 1000).toFixed(1)}km away`,
    bearing: `${COMPASS_DIRS[dirIndex]} (${Math.round(brng)}°)`,
    walkTime: `${Math.max(2, Math.round(d / 75))} min walk`
  };
}

// CryptoBox Hybrid RSA/AES simulation (from CryptoBox.java)
function mockEncryptForAdmin(plainText) {
  const keySnippet = btoa('aes-key-' + Math.random().toString(36).substring(2, 10)).substring(0, 16);
  const ivSnippet = btoa('iv-' + Date.now()).substring(0, 12);
  const cipherSnippet = btoa(encodeURIComponent(plainText));
  return `${keySnippet}.${ivSnippet}.${cipherSnippet}`;
}

function mockDecryptAsAdmin(bundle) {
  try {
    const parts = bundle.split('.');
    if (parts.length === 3) {
      return decodeURIComponent(atob(parts[2]));
    }
    return bundle;
  } catch {
    return bundle;
  }
}

const INITIAL_NEARBY_PEERS = [
  {
    id: 'vol-3',
    name: 'Fatima Noor',
    role: 'Triage Scout & Field Responder',
    device: 'Field Radio P2P',
    lat: 24.8632,
    lng: 67.0352,
    distanceMeters: 120,
    distanceText: '120m away',
    status: 'on_duty',
    battery: '94%',
    rssi: -58,
    bleSignal: '-58 dBm (Direct Range)'
  },
  {
    id: 'vol-1',
    name: 'Sara Khan',
    role: 'Field Volunteer & EMT',
    device: 'ReliefOS Mobile',
    lat: 24.8650,
    lng: 67.0320,
    distanceMeters: 340,
    distanceText: '340m away',
    status: 'on_duty',
    battery: '85%',
    rssi: -72,
    bleSignal: '-72 dBm (Moderate)'
  },
  {
    id: 'peer-samsung',
    name: 'Citizen Peer (Samsung A54)',
    role: 'P2P Mesh Relay Node',
    device: 'Samsung Galaxy A54',
    lat: 24.8622,
    lng: 67.0342,
    distanceMeters: 14,
    distanceText: '14m away',
    status: 'relay_active',
    battery: '68%',
    rssi: -45,
    bleSignal: '-45 dBm (Strong Relay)'
  },
  {
    id: 'vol-2',
    name: 'Ahmed Raza',
    role: 'Relief Convoy Lead',
    device: 'Tactical Radio Gateway',
    lat: 24.8675,
    lng: 67.0390,
    distanceMeters: 620,
    distanceText: '620m away',
    status: 'on_duty',
    battery: '78%',
    rssi: -83,
    bleSignal: '-83 dBm (2 Hops)'
  }
];

const INITIAL_CAMPS = [
  {
    id: 'camp-3',
    name: 'Camp 3 (Khanpur Valley)',
    valley: 'Khanpur Valley',
    residents: 1240,
    lat: 24.858,
    lng: 67.042,
    capacity: 1500,
    occupancy: 1240,
    status: 'active',
    supplies: {
      water: '320 / 500 L (64%)',
      food: '480 / 800 kg (60%)',
      medical: '12 / 50 kits (24%)'
    }
  },
  {
    id: 'camp-1',
    name: 'Camp 1 (Central Stadium)',
    valley: 'North Sector',
    residents: 980,
    lat: 24.869,
    lng: 67.028,
    capacity: 1200,
    occupancy: 980,
    status: 'active',
    supplies: {
      water: '650 / 800 L (81%)',
      food: '710 / 900 kg (78%)',
      medical: '35 / 50 kits (70%)'
    }
  },
  {
    id: 'camp-7',
    name: 'Camp 7 (Coastal High School)',
    valley: 'South Ridge',
    residents: 620,
    lat: 24.845,
    lng: 67.025,
    capacity: 650,
    occupancy: 620,
    status: 'near_full',
    supplies: {
      water: '120 / 600 L (20%)',
      food: '180 / 500 kg (36%)',
      medical: '8 / 40 kits (20%)'
    }
  }
];

export default function AffectedUserMobileApp() {
  const appContext = useApp() || {};
  const { 
    user, 
    role, 
    setIsAuthModalOpen, 
    theme, 
    toggleTheme, 
    themeAccent, 
    cycleThemeAccent, 
    isOnline, 
    setIsOnline, 
    logout
  } = appContext;
  const router = useRouter();

  // Active Bottom Tab: 'home' | 'requests' | 'mesh' | 'map' | 'portals'
  const [activeTab, setActiveTab] = useState('home');
  const [hasWifi, setHasWifi] = useState(false); // Default: No Wi-Fi (Disaster scenario)
  const [mobileToMobileEnabled, setMobileToMobileEnabled] = useState(true); // P2P BLE mesh relay
  const [isFramedView, setIsFramedView] = useState(true);
  
  // Dynamic Camps & Safe Zones (Loaded from DB & API)
  const [campsList, setCampsList] = useState(INITIAL_CAMPS);
  const [selectedVolunteer, setSelectedVolunteer] = useState(INITIAL_NEARBY_PEERS[0]);
  const [selectedCamp, setSelectedCamp] = useState(INITIAL_CAMPS[0]);
  
  // UI & Interaction States
  const [showEncryptedPayload, setShowEncryptedPayload] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState(null);

  // BLE Mesh Activity Terminal & Peer Radar State (Merged from ReliefOS Java App)
  const [meshLogs, setMeshLogs] = useState([
    'ReliefOS MeshManager.java v2.4 initialized as anon-7492',
    'RX BEACON from Fatima Noor (-58 dBm, direct BLE, battery 94%)',
    'RX BEACON from Sara Khan (-72 dBm, direct BLE, battery 85%)',
    'P2P_CLUSTER online: 3 relay peers active within 30m corridor',
    'CryptoBox: ECDH P-256 + AES-GCM-256 session established',
    'Database: Connected to /api/v1/messages and reliefos.db sync'
  ]);
  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const [nearbyPeers, setNearbyPeers] = useState(INITIAL_NEARBY_PEERS);

  // CryptoBox Admin / Doctor Private Box (PIN 1234)
  const [isDoctorUnlocked, setIsDoctorUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [privateTriagePackets, setPrivateTriagePackets] = useState([
    {
      id: 'pkt-priv-1',
      sender: 'Dr. Tariq (Clinic Camp 3)',
      rawCipher: mockEncryptForAdmin('URGENT: 4 units of O-negative blood needed at triage unit. Patient bleeding post-evacuation.'),
      hops: 2,
      timestamp: '18:10',
      category: 'Doctor Triage',
      urgency: 'critical'
    },
    {
      id: 'pkt-priv-2',
      sender: 'Field Scout Fatima Noor',
      rawCipher: mockEncryptForAdmin('Confidential: Insulin cold-box temperature rising. 6 diabetic patients require immediate re-icing.'),
      hops: 1,
      timestamp: '18:14',
      category: 'Medical Supply',
      urgency: 'high'
    }
  ]);


  // Persistent Message thread state
  const [messages, setMessages] = useState([
    {
      id: 'msg-seed-1',
      sender: 'user',
      text: 'Water entered ground floor near Sector Delta 9, emergency boat requested for 4 citizens.',
      category: 'Rescue Needed',
      timestamp: '18:02',
      status: 'relayed_hq',
      hopRoute: 'Your Phone → Peer Mobile (14m) → Fatima Noor → HQ',
      encryptedHash: '0x4f82a9...d4c1 (AES-GCM-256)',
      recipient: 'Fatima Noor'
    },
    {
      id: 'msg-seed-2',
      sender: 'volunteer',
      volunteerName: 'Fatima Noor (Volunteer)',
      text: 'Copy that! Received your packet via 2-hop mobile relay. Rescue boat en route from Camp 3.',
      timestamp: '18:05',
      status: 'delivered'
    }
  ]);

  const showToast = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3500);
  };

  const addMeshLog = (logText) => {
    setMeshLogs(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${logText}`]);
  };

  // Compute live compass bearings & distance for each camp relative to user location
  const enrichedCamps = useMemo(() => {
    return campsList.map(camp => {
      const geo = calculateDistanceAndBearing(
        DEFAULT_USER_LOCATION.lat, 
        DEFAULT_USER_LOCATION.lng, 
        camp.lat, 
        camp.lng
      );
      return {
        ...camp,
        meters: geo.meters,
        distanceText: geo.distanceText,
        bearing: geo.bearing,
        walkTime: geo.walkTime
      };
    }).sort((a, b) => a.meters - b.meters);
  }, [campsList]);

  // Load camps & safe zones dynamically from backend database
  useEffect(() => {
    async function loadCampsFromDB() {
      try {
        const fetched = await fetchSafeZones();
        if (Array.isArray(fetched) && fetched.length > 0) {
          const merged = fetched.map(fc => {
            const existing = INITIAL_CAMPS.find(ic => ic.id === fc.id || ic.name === fc.name);
            return {
              id: fc.id,
              name: fc.name,
              valley: existing?.valley || 'Regional Sector',
              residents: fc.occupancy || existing?.residents || 450,
              lat: fc.lat || 24.8600,
              lng: fc.lng || 67.0350,
              capacity: fc.capacity || 1000,
              occupancy: fc.occupancy || 450,
              status: (fc.occupancy >= fc.capacity) ? 'near_full' : 'active',
              supplies: existing?.supplies || {
                water: '400 / 600 L (66%)',
                food: '500 / 800 kg (62%)',
                medical: '25 / 50 kits (50%)'
              }
            };
          });
          setCampsList(merged);
        }
      } catch (err) {
        console.warn('Failed to load live safe-zones from backend:', err);
      }
    }
    loadCampsFromDB();
  }, []);

  // Sync Messages from REST API / Local SQLite Store & keep cross-portal reactive
  useEffect(() => {
    const syncThread = async () => {
      try {
        const msgs = await fetchMessages();
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
          return;
        }
      } catch {}

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('reliefos_db_messages');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
          } catch {}
        }
      }
    };

    syncThread();

    const handleSync = () => syncThread();
    if (typeof window !== 'undefined') {
      window.addEventListener('reliefos_db_sync', handleSync);
      window.addEventListener('storage', handleSync);
    }
    const poller = setInterval(syncThread, 3000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('reliefos_db_sync', handleSync);
        window.removeEventListener('storage', handleSync);
      }
      clearInterval(poller);
    };
  }, []);
  // Emergency SOS & Custom Distress Dispatch with 100% DB and Portal Connectivity
  const handleQuickSOS = async (title, emergencyText, urgencyLevel = 'critical') => {
    setIsSending(true);
    const isMesh = !hasWifi && mobileToMobileEnabled;
    const cipherHash = `0x${Math.random().toString(16).substring(2, 10)}... (AES-GCM-256 / ECDH P-256)`;

    const newMsg = {
      id: `sos-${Date.now()}`,
      sender: 'user',
      text: `[EMERGENCY SOS: ${title}] ${emergencyText}`,
      category: title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isMesh ? 'ble_sent' : 'relayed_hq',
      hopRoute: isMesh 
        ? `Your Phone → Peer Mobile (14m) → ${selectedVolunteer?.name || 'Fatima Noor'} → HQ` 
        : 'Direct Cloud Upload to ReliefOS HQ',
      encryptedHash: cipherHash,
      recipient: selectedVolunteer?.name || 'Fatima Noor'
    };

    // Optimistically update local message thread
    setMessages(prev => {
      const updated = [newMsg, ...prev.filter(m => m.id !== newMsg.id)];
      if (typeof window !== 'undefined') {
        try { 
          localStorage.setItem('reliefos_db_messages', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('reliefos_db_sync', { detail: { key: 'reliefos_db_messages' } }));
        } catch {}
      }
      return updated;
    });

    // Mesh log telemetry entry
    addMeshLog(`TX EMERGENCY PACKET [${title}]: Cipher ${cipherHash.slice(0, 16)} via ${isMesh ? 'BLE P2P Mesh' : 'Cellular / Wi-Fi'}`);
    // 1. TRANSMIT TO RELIEFOS BACKEND DATABASE: /api/v1/messages
    // This immediately routes to the Volunteer Portal (/volunteer) and triggers audio/visual popups
    try {
      await sendMessageAction({
        text: `[EMERGENCY SOS: ${title}] ${emergencyText}`,
        category: title,
        sender: 'citizen',
        senderName: 'Citizen Mobile (Sector Delta 9)',
        recipientId: selectedVolunteer?.id || 'vol-3',
        recipientName: selectedVolunteer?.name || 'Fatima Noor',
        hopRoute: isMesh ? 'Your Phone → Peer Mobile (14m) → Volunteer Mobile → HQ' : 'Direct Cloud Upload',
        urgency: urgencyLevel
      });
      addMeshLog(`DB SYNC: /api/v1/messages registered packet for ${selectedVolunteer?.name || 'Volunteer'}`);
    } catch (apiErr) {
      console.warn('API error sending message:', apiErr);
    }

    // 2. TRANSMIT TO INCIDENT COMMAND DATABASE: /api/v1/reports
    // This updates the area actualReports, triggers Dark Zone priority inference, and flags Command HQ
    try {
      await submitReportAction({
        areaId: 'area-c',
        text: `[CITIZEN SOS ${isMesh ? 'BLE MESH' : 'DIRECT'}] ${title}: ${emergencyText}`,
        source: isMesh ? 'citizen_mobile_ble' : 'citizen_mobile_cellular',
        extracted: {
          urgency: urgencyLevel,
          assistanceNeeded: title
        }
      });
      addMeshLog('DB SYNC: /api/v1/reports distress report dispatched to Incident Command HQ.');
    } catch (reportErr) {
      console.warn('API error submitting report:', reportErr);
    }

    if (isMesh) {
      showToast('No Wi-Fi: Traveling mobile-to-mobile via Bluetooth P2P...');

      // Hop 1: Sent to nearby peer mobile
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'ble_sent' } : m));
        showToast('Hop 1: Delivered to peer phone (Samsung A54, 14m)');
        addMeshLog('HOP 1: Delivered to Peer Phone (Samsung Galaxy A54, RSSI -45 dBm)');
      }, 1200);

      // Hop 2: Delivered to responder phone
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'volunteer_delivered' } : m));
        showToast(`Hop 2: Received by Volunteer Mobile (${selectedVolunteer.name})`);
        addMeshLog(`HOP 2: Received by Volunteer Mobile (${selectedVolunteer.name}, RSSI -58 dBm)`);
      }, 2400);

      // Hop 3: Volunteer device syncs to central HQ
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'relayed_hq' } : m));
        showToast('Hop 3: Relayed via Mesh Gateway to ReliefOS Central HQ!');
        addMeshLog('HOP 3: Uplink to ReliefOS Central HQ Gateway completed.');
      }, 4000);
    } else {
      showToast('Wi-Fi Connected: Dispatching direct to ReliefOS HQ & Database...');
    }

    setIsSending(false);
  };

  const handleSendCustomChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    const text = chatInput.trim();
    setChatInput('');
    handleQuickSOS('Citizen Message', text, 'high');
  };

  // Doctor PIN Verification (PIN: 1234 from ReliefOS Android Java App)
  const handleVerifyDoctorPin = (e) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      setIsDoctorUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      showToast('Doctor / Admin Clearance Unlocked (PIN: 1234)');
      addMeshLog('SECURITY: Doctor / Admin Clearance verified. CryptoBox private box decrypted.');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#162711] via-[#223A1A] to-[#2D4A22] text-[#1A251B] flex flex-col items-center justify-start p-2 sm:p-4 select-none">
      
      {/* Top Cross-Portal Navigation Bar */}
      <header className="w-full max-w-5xl flex flex-wrap items-center justify-between px-3 py-2 bg-[#233A1A]/95 border border-[#3B602D] rounded-xl text-xs font-mono text-[#D1DEC9] mb-3 shadow-md backdrop-blur-xs gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link 
            href="/" 
            title="Return to Incident Command Center Dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#182C13] hover:bg-[#2D4A22] text-white border border-[#436D34]/50 transition-colors font-bold"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Command HQ</span>
            <span className="sm:hidden">HQ</span>
          </Link>

          <Link 
            href="/volunteer" 
            title="Open Volunteer Field Responder Portal"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#182C13] hover:bg-[#2D4A22] text-white border border-[#436D34]/50 transition-colors font-bold"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Volunteer Portal</span>
          </Link>

          <Link 
            href="/camp-manager" 
            title="Open Camp Operations & Logistics Portal"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#182C13] hover:bg-[#2D4A22] text-white border border-[#436D34]/50 transition-colors font-bold"
          >
            <Tent className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Camp Ops</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen && setIsAuthModalOpen(true)}
            title="Open Clearance Settings & Role Authentication Modal"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#182C13] hover:bg-[#2D4A22] text-white border border-[#436D34]/50 transition-colors font-bold"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>Clearance</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Framed View Toggle */}
          <button
            onClick={() => setIsFramedView(!isFramedView)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-[#233F1B] via-[#2D4A22] to-[#385F2C] text-white border border-[#436D34]/60 hover:brightness-110 transition-all shadow-xs font-bold"
          >
            {isFramedView ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            <span className="hidden sm:inline">{isFramedView ? 'Full Screen' : 'Device Frame'}</span>
          </button>

          {/* Toggle Online / Offline Mesh Simulation */}
          <button
            onClick={() => {
              const nextState = !hasWifi;
              setHasWifi(nextState);
              addMeshLog(nextState ? 'Network switched to Wi-Fi / Cellular Cloud' : 'Network switched to BLE Offline P2P Mesh');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold transition-all shadow-xs ${
              !hasWifi
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
            }`}
            title="Click to toggle Network simulation (Wi-Fi vs No Wi-Fi Mobile-to-Mobile)"
          >
            {!hasWifi ? (
              <>
                <Smartphone className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>NO WI-FI (BLE MESH)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>WI-FI CONNECTED</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Unified Mobile Application Chassis */}
      <div className={`w-full citizen-mobile-app ${isFramedView ? 'max-w-[410px] h-[870px] rounded-[48px] border-[10px] border-[#1E2E1A] shadow-2xl shadow-black/60 ring-1 ring-[#3D6130]' : 'h-screen max-w-full rounded-none border-none'} bg-[#F8FAFC] flex flex-col overflow-hidden relative transition-all`}>
        
        {/* Mobile Phone Status Bar */}
        <div className="w-full flex items-center justify-between px-7 pt-3 pb-1 bg-slate-900 text-white text-[11px] font-sans font-bold select-none flex-shrink-0" style={{ color: '#ffffff' }}>
          <span style={{ color: '#ffffff' }}>9:41</span>
          <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5" style={{ color: '#ffffff' }}>
            <Bluetooth className={`w-3 h-3 ${!hasWifi ? 'text-amber-300' : 'text-slate-400'}`} />
            <Radio className="w-3 h-3 text-white" />
            <span style={{ color: '#ffffff' }}>98%</span>
          </div>
        </div>

        {/* Forest Green Gradient Mobile Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#1C3315] via-[#2D4A22] to-[#3E6630] flex items-center justify-between flex-shrink-0 border-b border-[#436D34]/40 shadow-xs relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
              <Trees className="w-4 h-4 text-[#2D4A22]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-black text-white leading-tight flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                <span>ReliefOS</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                  P2P MESH
                </span>
              </div>
              <div className="text-[10px] font-semibold text-[#D1DEC9] leading-tight" style={{ color: '#D1DEC9' }}>
                Disaster Response & Shelter Network
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Doctor PIN / CryptoBox Button */}
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              title="CryptoBox Doctor & Triage Mode (PIN 1234)"
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ${
                isDoctorUnlocked
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-[#D1DEC9] border border-white/20'
              }`}
            >
              {isDoctorUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3 text-amber-300" />}
              <span>{isDoctorUnlocked ? 'Medic Dr.' : 'PIN 1234'}</span>
            </button>

            {/* Bell with Notification Badge */}
            <div className="relative cursor-pointer" onClick={() => setActiveTab('requests')}>
              <Bell className="w-4 h-4 text-white" />
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8.5px] font-bold text-white flex items-center justify-center shadow-xs" style={{ color: '#ffffff' }}>
                {messages.length}
              </span>
            </div>
          </div>
        </div>

        {/* NETWORK STATUS BANNER (WI-FI VS MOBILE-TO-MOBILE) */}
        <div className={`px-3.5 py-1.5 border-b flex items-center justify-between text-[11px] flex-shrink-0 ${
          !hasWifi ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-[#DCFCE7] border-[#BBF7D0]'
        }`}>
          <div className="flex items-center gap-1.5 font-semibold">
            {!hasWifi ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#92400E]" />
                <span className="text-[#92400E] font-bold">No Wi-Fi — BLE Mesh Relay Active</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#15803D]" />
                <span className="text-[#15803D] font-bold">Wi-Fi Connected — Direct DB Sync</span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              const nextState = !hasWifi;
              setHasWifi(nextState);
              addMeshLog(nextState ? 'Network simulation: Switched to Wi-Fi' : 'Network simulation: Switched to No Wi-Fi (BLE)');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-[10px] font-bold transition-all shadow-xs ${
              !hasWifi ? 'bg-gradient-to-r from-[#203918] via-[#2D4A22] to-[#385F2C] hover:brightness-110' : 'bg-gradient-to-r from-[#14532D] to-[#15803D] hover:brightness-110'
            }`}
            style={{ color: '#ffffff' }}
          >
            {!hasWifi ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
            <span style={{ color: '#ffffff' }}>{!hasWifi ? 'Enable Wi-Fi' : 'Simulate No Wi-Fi'}</span>
          </button>
        </div>

        {/* Toast Alert Pop-up */}
        {notification && (
          <div 
            className="mobile-toast absolute top-28 left-4 right-4 z-50 p-3 rounded-xl bg-[#14260F] text-white text-xs font-bold shadow-2xl border-2 border-emerald-400 flex items-center gap-2.5 animate-bounce"
            style={{ backgroundColor: '#14260F', color: '#ffffff', borderColor: '#34d399' }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="flex-1 text-white font-bold tracking-wide" style={{ color: '#ffffff' }}>{notification}</span>
          </div>
        )}

        {/* Doctor PIN Modal (PIN 1234) */}
        {showPinModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900">CryptoBox Doctor / Admin PIN</h3>
              <p className="text-[11px] text-slate-500">
                Enter medical clearance PIN (<strong className="text-slate-800">1234</strong>) to unlock encrypted triage reports and blood supply dispatches.
              </p>
              <form onSubmit={handleVerifyDoctorPin} className="space-y-3">
                <label htmlFor="doctor-pin-input" className="sr-only">
                  Doctor Clearance PIN
                </label>
                <input
                  type="password"
                  id="doctor-pin-input"
                  name="doctorPin"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="••••"
                  className="w-32 mx-auto text-center tracking-[0.5em] text-lg font-mono font-bold py-2 rounded-xl bg-slate-100 border border-slate-300 focus:outline-none focus:border-emerald-600"
                  autoFocus
                />
                {pinError && (
                  <p className="text-[10px] text-red-600 font-bold">Invalid PIN. Demo doctor PIN is 1234.</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinError(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-sm"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Main Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto bg-[#F4F5EB] p-3 space-y-3">

          {/* ======================================================== */}
          {/* TAB 1: HOME (CAMP RESIDENT OVERVIEW) */}
          {/* ======================================================== */}
          {activeTab === 'home' && (
            <div className="space-y-3">
              
              {/* MOBILE-TO-MOBILE OPTION & HOP VISUALIZER */}
              <div className={`p-3 rounded-2xl border shadow-xs transition-colors ${
                !hasWifi ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-white border-[#E4E7D7]'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!hasWifi ? (
                      <Smartphone className="w-4 h-4 text-[#92400E]" strokeWidth={2.5} />
                    ) : (
                      <Wifi className="w-4 h-4 text-[#15803D]" strokeWidth={2.5} />
                    )}
                    <div>
                      <div className={`text-xs font-black ${!hasWifi ? 'text-[#92400E]' : 'text-[#1A251B]'}`}>
                        {!hasWifi ? 'Mobile-to-Mobile Relay Mode (No Wi-Fi)' : 'Wi-Fi Cloud Mode'}
                      </div>
                      <div className="text-[10px] text-[#576356]">
                        {!hasWifi 
                          ? 'Active: Messages hop phone-to-phone via BLE radio (3 nearby phones in range)' 
                          : 'Standby: Direct Wi-Fi connection active'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileToMobileEnabled(!mobileToMobileEnabled)}
                    className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                      mobileToMobileEnabled ? 'bg-gradient-to-r from-[#203918] to-[#385F2C] justify-end shadow-xs' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* Live Hop Route Visual Diagram */}
                {!hasWifi && mobileToMobileEnabled && (
                  <div className="mt-2.5 pt-2 border-t border-[#FDE68A] space-y-1.5">
                    <div className="text-[9px] font-extrabold text-[#92400E] tracking-wider uppercase">
                      Offline Message Hop Route:
                    </div>
                    <div className="flex items-center justify-between text-[8.5px] font-bold text-[#1A251B] bg-white/70 p-2 rounded-xl border border-[#FDE68A]">
                      <div className="flex flex-col items-center gap-0.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#2D4A22]" />
                        <span>Your Mobile</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#8F9B8C]" />
                      <div className="flex flex-col items-center gap-0.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#92400E]" />
                        <span>Peer (14m)</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#8F9B8C]" />
                      <div className="flex flex-col items-center gap-0.5">
                        <User className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>{selectedVolunteer.name.split(' ')[0]}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#8F9B8C]" />
                      <div className="flex flex-col items-center gap-0.5">
                        <Radio className="w-3.5 h-3.5 text-[#2D4A22]" />
                        <span>HQ Gateway</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Camp Hero Card */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#E8EFE5] border border-[#D1DEC9] flex items-center justify-center">
                    <Tent className="w-6 h-6 text-[#2D4A22]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#1A251B]">{enrichedCamps[0]?.name || 'Camp 3'}</span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[9.5px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-[#576356] font-medium mt-0.5">
                      {enrichedCamps[0]?.valley || 'Khanpur Valley'} · <span className="font-mono text-emerald-700 font-bold">{enrichedCamps[0]?.distanceText} ({enrichedCamps[0]?.bearing})</span>
                    </div>
                    <div className="text-[10.5px] text-[#8F9B8C]">
                      {enrichedCamps[0]?.occupancy || 1240} / {enrichedCamps[0]?.capacity || 1500} residents accommodated
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('map')}>
                    <ChevronRight className="w-5 h-5 text-[#8F9B8C] hover:text-[#2D4A22]" />
                  </button>
                </div>
              </div>


              {/* Camp Status Overview Progress Section */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F2E9]">
                  <span className="text-xs font-black text-[#1A251B]">Camp 3 Resource Overview</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#15803D]">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                    <span>Live DB Status</span>
                  </div>
                </div>

                {/* Water Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Droplet className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-[#1A251B]">Drinking Water</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[11px] text-[#576356]">320 / 500 L</span>
                      <span className="font-bold text-[#1A251B]">64%</span>
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Critical Shortage
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#E9EBE0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#2E7D32] rounded-full" style={{ width: '64%' }} />
                  </div>
                </div>

                {/* Food Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Package className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-[#1A251B]">Food Rations</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[11px] text-[#576356]">480 / 800 kg</span>
                      <span className="font-bold text-[#1A251B]">60%</span>
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Moderate
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#E9EBE0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#2E7D32] rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>

                {/* Medical Goods Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <HeartPulse className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-[#1A251B]">Medical Goods</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[11px] text-[#576356]">12 / 50 kits</span>
                      <span className="font-bold text-[#1A251B]">24%</span>
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Low Stock
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#E9EBE0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#DC2626] rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>
              </div>

              {/* Service Status Tracker */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F2E9]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2D4A22]" strokeWidth={2.5} />
                    <span className="text-xs font-black text-[#1A251B]">Service Status Tracker</span>
                  </div>
                  <span className="text-[10px] text-[#576356]">Allocated Resources</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#F5F6F0]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Droplet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A251B]">Water Supply</div>
                      <div className="text-[10px] text-[#576356]">500 L convoy dispatched</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Received
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#E8EFE5] flex items-center justify-center text-[#2D4A22]">
                      <Home className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A251B]">Shelter Tents</div>
                      <div className="text-[10px] text-[#576356]">12 tents pitched & verified</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>
              </div>

              {/* STICKY CRIMSON RED SOS BANNER */}
              <button
                onClick={() => setActiveTab('requests')}
                disabled={isSending}
                className="w-full py-3 px-4 rounded-2xl bg-[#DC2626] text-white flex flex-col items-center justify-center shadow-md hover:bg-red-700 transition-colors active:scale-98"
                style={{ backgroundColor: '#DC2626', color: '#ffffff' }}
              >
                <div className="flex items-center gap-2 text-sm font-black tracking-wide" style={{ color: '#ffffff' }}>
                  <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span style={{ color: '#ffffff' }}>SOS / Emergency Request</span>
                </div>
                <div className="text-[10px] text-red-100 font-medium" style={{ color: '#FEE2E2' }}>
                  Tap to transmit distress packet to Volunteer Unit & Central HQ
                </div>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REQUESTS (EMERGENCY SOS & LIVE DB CHAT) */}
          {/* ======================================================== */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              
              {/* Target Responder Selection Card */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Target Field Volunteer Unit:</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {selectedVolunteer?.bleSignal}
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {nearbyPeers.filter(p => p.role.includes('Scout') || p.role.includes('Volunteer') || p.role.includes('EMT')).map(peer => (
                    <button
                      key={peer.id}
                      onClick={() => setSelectedVolunteer(peer)}
                      className={`px-2.5 py-1.5 rounded-xl border text-left flex-shrink-0 transition-all ${
                        selectedVolunteer?.id === peer.id
                          ? 'bg-[#1C3315] text-white border-[#2D4A22] shadow-xs'
                          : 'bg-[#F4F5EB] text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold">{peer.name}</div>
                      <div className="text-[9.5px] opacity-80">{peer.distanceText} · {peer.battery} bat</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick One-Tap Emergency Grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickSOS('Medical Aid', 'Trauma treatment or insulin cold-storage urgently needed.')}
                  className="p-3 rounded-2xl bg-white border border-[#E4E7D7] text-left hover:border-red-500 transition-colors shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <HeartPulse className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[8.5px] font-bold text-red-600 bg-red-50 px-1 rounded">CRITICAL</span>
                  </div>
                  <div className="text-xs font-bold text-[#1A251B]">Medical Help</div>
                  <div className="text-[10px] text-[#576356]">Trauma / Insulin</div>
                </button>

                <button
                  onClick={() => handleQuickSOS('Rescue Needed', 'Trapped on ground floor due to rising floodwaters.')}
                  className="p-3 rounded-2xl bg-white border border-[#E4E7D7] text-left hover:border-purple-500 transition-colors shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <LifeBuoy className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[8.5px] font-bold text-purple-600 bg-purple-50 px-1 rounded">URGENT</span>
                  </div>
                  <div className="text-xs font-bold text-[#1A251B]">Rescue Needed</div>
                  <div className="text-[10px] text-[#576356]">Trapped / Debris</div>
                </button>

                <button
                  onClick={() => handleQuickSOS('Clean Water', 'Drinking water exhausted for 12 individuals including infants.')}
                  className="p-3 rounded-2xl bg-white border border-[#E4E7D7] text-left hover:border-blue-500 transition-colors shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Droplet className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[8.5px] font-bold text-blue-600 bg-blue-50 px-1 rounded">SUPPLY</span>
                  </div>
                  <div className="text-xs font-bold text-[#1A251B]">Clean Water</div>
                  <div className="text-[10px] text-[#576356]">Rations Depleted</div>
                </button>

                <button
                  onClick={() => handleQuickSOS('Evacuation Boat', 'Submerged road access, boat required for evacuation.')}
                  className="p-3 rounded-2xl bg-white border border-[#E4E7D7] text-left hover:border-emerald-500 transition-colors shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Navigation className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[8.5px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">BOAT</span>
                  </div>
                  <div className="text-xs font-bold text-[#1A251B]">Evacuation Boat</div>
                  <div className="text-[10px] text-[#576356]">Rising Flash Flood</div>
                </button>
              </div>

              {/* CryptoBox Doctor & Triage Mode Unlocked Banner */}
              {isDoctorUnlocked && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-300 p-3 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>CryptoBox Doctor Triage Inbox (Unlocked)</span>
                    </div>
                    <button
                      onClick={() => setIsDoctorUnlocked(false)}
                      className="text-[9.5px] font-bold text-emerald-700 underline"
                    >
                      Lock Box
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {privateTriagePackets.map(pkt => (
                      <div key={pkt.id} className="p-2 bg-white rounded-xl border border-emerald-200 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span className="font-bold text-emerald-800">{pkt.sender}</span>
                          <span className="font-mono">{pkt.timestamp} · {pkt.hops} hops</span>
                        </div>
                        <div className="text-slate-800 font-medium">{mockDecryptAsAdmin(pkt.rawCipher)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Thread with Database Sync */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F2E9]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A251B]">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Live Database & Mesh Dispatch Thread</span>
                  </div>
                  <button 
                    onClick={() => setShowEncryptedPayload(!showEncryptedPayload)}
                    className="text-[10px] text-[#576356] hover:text-[#2D4A22] flex items-center gap-1 font-mono"
                  >
                    {showEncryptedPayload ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showEncryptedPayload ? 'Hide' : 'Inspect'} Cipher</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {messages.map((m) => {
                    const isUser = m.sender === 'user' || m.sender === 'citizen';

                    return (
                      <div 
                        key={m.id} 
                        className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                          isUser 
                            ? 'bg-[#FAFBF8] border-[#D1DEC9] ml-6' 
                            : 'bg-white border-[#E4E7D7] mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9.5px] text-[#576356] mb-1 font-mono">
                          <span className="font-bold text-[#2D4A22]">{isUser ? `You → ${m.recipient || m.recipientName || 'Responder'}` : (m.volunteerName || m.senderName || 'Volunteer')}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <div className="text-[#1A251B] font-medium">{m.text}</div>
                        
                        {/* Hop Route Display */}
                        {m.hopRoute && (
                          <div className="mt-1 text-[9px] font-semibold text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A]">
                            Route: {m.hopRoute}
                          </div>
                        )}

                        {showEncryptedPayload && (
                          <div className="mt-1 text-[8.5px] text-emerald-700 bg-[#E8EFE5] p-1 rounded font-mono truncate">
                            Cipher: {m.encryptedHash || '0x4f82a9... (AES-GCM-256)'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendCustomChat} className="flex items-center gap-2 pt-2 border-t border-[#F0F2E9]">
                  <label htmlFor="mobile-chat-input" className="sr-only">
                    Encrypted Message to Volunteer
                  </label>
                  <input
                    type="text"
                    id="mobile-chat-input"
                    name="mobileChatInput"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Encrypted message to ${selectedVolunteer.name.split(' ')[0]}...`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#F4F5EB] border border-[#E4E7D7] text-xs text-[#1A251B] placeholder-[#8F9B8C] focus:outline-none focus:border-[#2D4A22]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSending}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#203918] via-[#2D4A22] to-[#385F2C] text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-xs disabled:opacity-50 transition-all flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MESH RADAR (MERGED FROM RELIEFOS JAVA APP) */}
          {/* ======================================================== */}
          {activeTab === 'mesh' && (
            <div className="space-y-3">
              
              {/* Radar Status Header */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#E8EFE5] flex items-center justify-center text-[#2D4A22]">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#1A251B]">BLE Mesh Cluster Radar</div>
                      <div className="text-[10px] text-[#576356]">MeshManager.java engine active</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                    P2P Cluster: 4 Nodes
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">Max Hop</div>
                    <div className="font-bold text-slate-800 font-mono">3 Hops</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">BLE Signal</div>
                    <div className="font-bold text-emerald-700 font-mono">-45 dBm</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">DB Gateway</div>
                    <div className="font-bold text-blue-700 font-mono">Uplink Ready</div>
                  </div>
                </div>
              </div>

              {/* Discovered Nearby Mesh Peers (From MainActivity.java & MeshManager.java) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-[#576356]">DISCOVERED BLUETOOTH PEERS</span>
                  <button 
                    onClick={() => {
                      showToast('Pinging all BLE mesh nodes...');
                      addMeshLog('TX BEACON: Broadcast ping sent to all 4 cluster nodes.');
                    }}
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Ping Cluster</span>
                  </button>
                </div>

                {nearbyPeers.map(peer => (
                  <div 
                    key={peer.id}
                    onClick={() => setSelectedVolunteer(peer)}
                    className={`p-3 rounded-2xl border shadow-xs transition-all cursor-pointer ${
                      selectedVolunteer?.id === peer.id
                        ? 'bg-white border-[#2D4A22] ring-2 ring-[#2D4A22]/20'
                        : 'bg-white border-[#E4E7D7] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                          {peer.role.includes('EMT') || peer.role.includes('Scout') ? (
                            <UserCheck className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-blue-700" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{peer.name}</span>
                            {selectedVolunteer?.id === peer.id && (
                              <span className="text-[9px] font-mono px-1 rounded bg-emerald-100 text-emerald-800 font-bold">SELECTED</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{peer.role} · {peer.device}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-mono font-bold text-emerald-700">{peer.distanceText}</div>
                        <div className="text-[9.5px] font-mono text-slate-500">{peer.bleSignal}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* LIVE BLE MESH TERMINAL (PACKET TRAFFIC TELEMETRY) */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-md space-y-2 text-white">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>BLE Mesh Packet Log (Live)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMeshLogs([`[${new Date().toLocaleTimeString()}] Telemetry reset.`])}
                      className="text-[9.5px] font-mono text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                <div className="font-mono text-[10px] space-y-1 max-h-40 overflow-y-auto pr-1 text-slate-300">
                  {meshLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      <span className="text-emerald-500 mr-1.5">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SAFE ZONES & MAP (DYNAMIC COMPASS & SHELTERS) */}
          {/* ======================================================== */}
          {activeTab === 'map' && (
            <div className="space-y-3">
              
              {/* COMPASS HEADING & RADAR ACCURACY HUD (FROM SAFEZONE.JAVA) */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-[#1A251B]">
                    <Compass className="w-4 h-4 text-[#2D4A22]" />
                    <span>SafeZone Compass & Azimuth Radar</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">GPS Accuracy: ±3m</span>
                </div>

                {/* Nearest Shelter Quick Bearing Pill */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-[#1C3315] via-[#2D4A22] to-[#385F2C] text-white">
                  <div>
                    <div className="text-[10px] text-emerald-200 uppercase font-mono font-bold">Nearest Safe Zone</div>
                    <div className="text-xs font-black">{enrichedCamps[0]?.name || 'Camp 3'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-amber-300">{enrichedCamps[0]?.distanceText}</div>
                    <div className="text-[10px] text-emerald-200">{enrichedCamps[0]?.bearing} · {enrichedCamps[0]?.walkTime}</div>
                  </div>
                </div>
              </div>

              {/* Interactive Topographic Disaster Grid Map */}
              <div className="h-80 w-full rounded-2xl border border-[#E4E7D7] overflow-hidden relative shadow-xs">
                <MobileOfflineMap 
                  userLocation={DEFAULT_USER_LOCATION} 
                  volunteers={nearbyPeers}
                  camps={enrichedCamps}
                />
              </div>

              {/* VERIFIED RELIEF SHELTERS LIST WITH DYNAMIC BEARINGS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-[#576356]">VERIFIED RELIEF SHELTERS (DB SYNCED)</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">{enrichedCamps.length} Shelters</span>
                </div>

                {enrichedCamps.map(camp => (
                  <div key={camp.id} className="bg-white p-3 rounded-2xl border border-[#E4E7D7] shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-[#1A251B]">{camp.name}</div>
                        <div className="text-[10.5px] text-emerald-800 font-bold font-mono">
                          {camp.distanceText} · {camp.bearing} · {camp.walkTime}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        camp.occupancy >= camp.capacity
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {camp.occupancy} / {camp.capacity} residents
                      </span>
                    </div>

                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          (camp.occupancy / camp.capacity) > 0.85 ? 'bg-red-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((camp.occupancy / camp.capacity) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: PORTALS & SETTINGS HUB */}
          {/* ======================================================== */}
          {activeTab === 'portals' && (
            <div className="space-y-3 pb-2">
              
              {/* CURRENT ACTIVE IDENTITY & CLEARANCE CARD */}
              <div className="bg-white rounded-2xl border border-[#D5DCB8] p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#576356]">
                    Active Session Mode
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0DC] text-[#2D4A22] border border-[#CBD8BA]">
                    {user ? `${user.role.toUpperCase()}` : 'CIVILIAN / RESIDENT'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C3315] via-[#2D4A22] to-[#3E6630] flex items-center justify-center text-white font-black text-sm shadow-sm">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'CZ'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {user?.name || 'Affected Resident / Citizen'}
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate font-mono">
                      {user?.email || 'Sector Delta 9 (Lowland Floods)'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen && setIsAuthModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#1C3315] via-[#2D4A22] to-[#385F2C] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  <span>Switch Clearance Profile / Login</span>
                </button>
              </div>

              {/* OPERATIONAL PORTALS DIRECT JUMP SECTION */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#2D4A22]" />
                    <span>ReliefOS Dashboards & Portals</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">1-Click Jump</span>
                </div>

                <div className="space-y-1.5">
                  {/* 1. Volunteer Portal */}
                  <Link
                    href="/volunteer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 hover:bg-emerald-100/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Volunteer Responder Portal</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-emerald-200 text-emerald-800 font-bold">FIELD</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Assigned duties, citizen SOS feed, offline mesh triage
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {/* 2. Command HQ Dashboard */}
                  <Link
                    href="/"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-red-200/60 bg-red-50/50 hover:bg-red-100/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>HQ Incident Command Center</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-red-200 text-red-800 font-bold">ADMIN</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Dark Zone disparity map, tactical overview & resource dispatch
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-red-700 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {/* 3. Camp Manager Operations */}
                  <Link
                    href="/camp-manager"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200/60 bg-amber-50/50 hover:bg-amber-100/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                        <Tent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Camp Operations & Logistics</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-amber-200 text-amber-800 font-bold">CAMP MGR</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Refugee intake registry, water deficit alerts & ration burn rate
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {/* 4. Resources & Relief Hubs */}
                  <Link
                    href="/resources"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200/60 bg-blue-50/50 hover:bg-blue-100/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Regional Stock Inventory
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Capacity bars across 4 regional disaster relief depots
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-700 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* SYSTEM PREFERENCES & CONTROLS */}
              <div className="bg-white rounded-2xl border border-[#E4E7D7] p-3 shadow-xs space-y-2.5 text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#2D4A22]" />
                  <span>Display & Network Controls</span>
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTheme && toggleTheme()}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left font-bold text-slate-800 transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    <div className="text-[11px] leading-tight">
                      <div>Theme Mode</div>
                      <span className="text-[10px] font-normal text-slate-500 capitalize">{theme || 'light'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => cycleThemeAccent && cycleThemeAccent()}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left font-bold text-slate-800 transition-colors"
                  >
                    <Palette className="w-4 h-4 text-emerald-600" />
                    <div className="text-[11px] leading-tight">
                      <div>Color Accent</div>
                      <span className="text-[10px] font-normal text-slate-500 uppercase">{themeAccent || 'red'}</span>
                    </div>
                  </button>
                </div>

                {/* Local Database persistence badge */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Local SQLite Backend:</span>
                  <span className="font-mono text-emerald-700 font-bold">reliefos.db (Ready)</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* 5-Tab Bottom Navigation Bar (Home | Requests | Mesh Radar | Safe Zones | Portals) */}
        <div className="h-14 bg-[#F5F6ED] border-t border-[#E2E6D5] flex items-center justify-around px-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'home' ? 'text-[#2D4A22]' : 'text-[#7B8776]'
            }`}
          >
            <Home className="w-4 h-4" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[9px] font-bold">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'requests' ? 'text-[#DC2626]' : 'text-[#7B8776]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" strokeWidth={activeTab === 'requests' ? 2.5 : 2} />
            <span className="text-[9px] font-bold">Requests</span>
          </button>

          <button
            onClick={() => setActiveTab('mesh')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'mesh' ? 'text-[#2D4A22]' : 'text-[#7B8776]'
            }`}
          >
            <Radio className="w-4 h-4" strokeWidth={activeTab === 'mesh' ? 2.5 : 2} />
            <span className="text-[9px] font-bold">Mesh Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'map' ? 'text-[#2D4A22]' : 'text-[#7B8776]'
            }`}
          >
            <Compass className="w-4 h-4" strokeWidth={activeTab === 'map' ? 2.5 : 2} />
            <span className="text-[9px] font-bold">Safe Zones</span>
          </button>

          <button
            id="tab-portals-settings"
            onClick={() => setActiveTab('portals')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'portals' ? 'text-[#2D4A22]' : 'text-[#7B8776]'
            }`}
          >
            <Sliders className="w-4 h-4" strokeWidth={activeTab === 'portals' ? 2.5 : 2} />
            <span className="text-[9px] font-bold">Portals</span>
          </button>
        </div>

      </div>

    </div>
  );
}
