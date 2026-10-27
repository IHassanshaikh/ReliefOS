import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { 
  Home, 
  MapPin, 
  AlertTriangle, 
  Tent, 
  CheckSquare, 
  Package, 
  Droplet, 
  HeartPulse, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Navigation,
  Globe,
  Smartphone,
  Wifi,
  WifiOff,
  Sparkles,
  Zap
} from 'lucide-react-native';
import { COLORS } from './src/theme/colors';
import HeaderStatusBar from './src/components/HeaderStatusBar';
import MapScreen from './src/screens/MapScreen';
import SOSChatScreen from './src/screens/SOSChatScreen';
import CampsScreen from './src/screens/CampsScreen';
import SOSButton from './src/components/SOSButton';
import { MOCK_VOLUNTEERS } from './src/data/mockVolunteers';
import { MOCK_CAMPS } from './src/data/mockCamps';
import { cryptoService } from './src/services/CryptoService';
import { storageService } from './src/services/StorageService';

export default function App() {
  // Pure Citizen / Camp Resident application
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'requests' | 'services' | 'map'
  const [hasWifi, setHasWifi] = useState(false); // Default: No Wi-Fi (Disaster scenario)
  const [mobileToMobileEnabled, setMobileToMobileEnabled] = useState(true); // Option: Travel Mobile-to-Mobile
  const [selectedVolunteer, setSelectedVolunteer] = useState(MOCK_VOLUNTEERS[0]);
  const [selectedCamp, setSelectedCamp] = useState(MOCK_CAMPS[0]);
  const [messages, setMessages] = useState([
    {
      id: 'msg-seed-1',
      text: 'Water entered ground floor, emergency boat requested for 4 citizens.',
      category: 'Rescue Needed',
      recipient: 'Sara Khan',
      timestamp: '18:02',
      status: 'relayed_hq',
      hopRoute: 'Your Phone -> Peer Mobile (14m) -> Sara Khan -> HQ',
      cipher: 'AES-GCM-256 [0x4f82a9... Tag: 0xd892a01f]'
    },
    {
      id: 'msg-seed-2',
      text: 'Family safe at high point. Medical kit requested for elderly resident.',
      category: 'Medical Assistance',
      recipient: 'Sara Khan',
      timestamp: '18:14',
      status: 'volunteer_delivered',
      hopRoute: 'Your Phone -> Peer Mobile (18m) -> Sara Khan',
      cipher: 'AES-GCM-256 [0x7b11ef... Tag: 0x90ca3471]'
    }
  ]);
  const [isSending, setIsSending] = useState(false);

  // Load saved offline messages
  useEffect(() => {
    async function loadData() {
      const saved = await storageService.getMessages();
      if (saved && saved.length > 0) {
        setMessages(saved);
      }
    }
    loadData();
  }, []);

  // Emergency SOS dispatch with Mobile-to-Mobile relay
  const handleSendSOS = useCallback(async (category, payload) => {
    setIsSending(true);
    const messageId = `sos-${Date.now()}`;
    const encryptedPacket = await cryptoService.encryptPayload(payload.text, selectedVolunteer.id);

    const isMesh = !hasWifi && mobileToMobileEnabled;

    const newMsg = {
      id: messageId,
      text: payload.text,
      category: category,
      recipient: selectedVolunteer.name,
      timestamp: 'Just now',
      status: 'queued',
      hopRoute: isMesh ? 'Your Phone -> Peer Mobile (14m) -> Sara Khan -> HQ' : 'Direct Wi-Fi Cloud Upload',
      cipher: encryptedPacket.rawHash
    };

    setMessages(prev => [newMsg, ...prev]);
    await storageService.saveMessage(newMsg);

    if (isMesh) {
      // Step 1: Hop from Your Mobile to Nearby Peer Mobile
      setTimeout(async () => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'ble_sent' } : m));
        await storageService.updateMessageStatus(messageId, 'ble_sent');
      }, 1000);

      // Step 2: Hop from Peer Mobile to Responder Mobile (Sara Khan)
      setTimeout(async () => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'volunteer_delivered' } : m));
        await storageService.updateMessageStatus(messageId, 'volunteer_delivered');
      }, 2200);

      // Step 3: Responder device connects to ReliefOS Central HQ
      setTimeout(async () => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'relayed_hq' } : m));
        await storageService.updateMessageStatus(messageId, 'relayed_hq');
        await storageService.syncToCentralHQ();
      }, 4000);
    } else {
      // Direct Wi-Fi Cloud upload
      setTimeout(async () => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'relayed_hq' } : m));
        await storageService.updateMessageStatus(messageId, 'relayed_hq');
        await storageService.syncToCentralHQ();
      }, 1200);
    }

    setIsSending(false);
  }, [hasWifi, mobileToMobileEnabled, selectedVolunteer]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2D4A22" />

      {/* Deep Forest Green Header (Pure Citizen / Camp Resident) */}
      <HeaderStatusBar
        hasWifi={hasWifi}
        onToggleWifi={() => setHasWifi(prev => !prev)}
        userRole="Camp Resident"
        badgeCount={1}
        avatarText="CR"
        nearbyPhonesCount={3}
        onSyncPress={() => Alert.alert('Offline Mesh Sync', 'Synchronizing offline queued citizen requests to ReliefOS Command Center...')}
      />

      {/* SCREEN CONTENT BODY */}
      <View style={styles.contentBody}>

        {/* TAB 1: HOME (CAMP RESIDENT OVERVIEW - SCREEN 3 FROM DESIGN) */}
        {activeTab === 'home' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollInner}>
            
            {/* MOBILE-TO-MOBILE OPTION CARD AT TOP OF HOME */}
            <View style={[styles.meshOptionCard, !hasWifi && styles.meshOptionCardActive]}>
              <View style={styles.meshOptionHeader}>
                <View style={styles.meshOptionLeft}>
                  {!hasWifi ? (
                    <Smartphone color="#92400E" size={16} strokeWidth={2.5} />
                  ) : (
                    <Wifi color="#15803D" size={16} strokeWidth={2.5} />
                  )}
                  <View>
                    <Text style={[styles.meshOptionTitle, { color: !hasWifi ? '#92400E' : '#15803D' }]}>
                      {!hasWifi ? 'Mobile-to-Mobile Mesh Active' : 'Wi-Fi Cloud Mode'}
                    </Text>
                    <Text style={styles.meshOptionSubtitle}>
                      {!hasWifi 
                        ? 'No Wi-Fi: Messages travel phone-to-phone via Bluetooth (3 nearby phones in range)' 
                        : 'Wi-Fi detected: Direct cloud connection to ReliefOS HQ'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.switchModeBtn, { backgroundColor: !hasWifi ? '#2D4A22' : '#15803D' }]}
                  onPress={() => setHasWifi(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchModeBtnText}>
                    {!hasWifi ? 'Test Wi-Fi' : 'Test No Wi-Fi'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Camp 3 Hero Card */}
            <View style={styles.heroCampCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconBox}>
                  <Tent color="#2D4A22" size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.heroInfo}>
                  <View style={styles.heroTitleRow}>
                    <Text style={styles.heroTitle}>Camp 3</Text>
                    <View style={styles.activePill}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.heroSubtitle}>Khanpur Valley</Text>
                  <Text style={styles.heroResidents}>1,240 residents</Text>
                </View>
                <ChevronRight color="#8F9B8C" size={20} />
              </View>
            </View>


            {/* Camp Status Overview (● Live Updates) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Camp Status Overview</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.greenPulseDot} />
                  <Text style={styles.liveText}>Live Updates</Text>
                </View>
              </View>

              {/* Water Stock Bar */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelRow}>
                  <View style={styles.iconAndName}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                      <Droplet color="#0284C7" size={13} />
                    </View>
                    <Text style={styles.metricName}>Water</Text>
                  </View>
                  <View style={styles.metricRight}>
                    <Text style={styles.metricNumbers}>320 / 500 L</Text>
                    <Text style={styles.metricPct}>64%</Text>
                    <View style={styles.lowStockPill}>
                      <Text style={styles.lowStockText}>Low Stock</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '64%', backgroundColor: '#2E7D32' }]} />
                </View>
              </View>

              {/* Food Stock Bar */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelRow}>
                  <View style={styles.iconAndName}>
                    <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Package color="#15803D" size={13} />
                    </View>
                    <Text style={styles.metricName}>Food</Text>
                  </View>
                  <View style={styles.metricRight}>
                    <Text style={styles.metricNumbers}>480 / 800 kg</Text>
                    <Text style={styles.metricPct}>60%</Text>
                    <View style={styles.lowStockPill}>
                      <Text style={styles.lowStockText}>Low Stock</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '60%', backgroundColor: '#2E7D32' }]} />
                </View>
              </View>

              {/* Medical Goods Bar */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelRow}>
                  <View style={styles.iconAndName}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <HeartPulse color="#DC2626" size={13} />
                    </View>
                    <Text style={styles.metricName}>Medical Goods</Text>
                  </View>
                  <View style={styles.metricRight}>
                    <Text style={styles.metricNumbers}>12 / 50 kits</Text>
                    <Text style={styles.metricPct}>24%</Text>
                    <View style={styles.lowStockPill}>
                      <Text style={styles.lowStockText}>Low Stock</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '24%', backgroundColor: '#EF4444' }]} />
                </View>
              </View>
            </View>

            {/* Service Status Tracker (Allocated Resources) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <CheckCircle2 color="#2D4A22" size={15} strokeWidth={2.5} />
                  <Text style={styles.sectionTitle}>Service Status Tracker</Text>
                </View>
                <Text style={styles.sectionHint}>Allocated Resources</Text>
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Droplet color="#0284C7" size={14} />
                  </View>
                  <View>
                    <Text style={styles.serviceName}>Water</Text>
                    <Text style={styles.serviceSub}>500 L allocated</Text>
                  </View>
                </View>
                <View style={styles.receivedBadge}>
                  <CheckCircle2 color="#16A34A" size={12} strokeWidth={2.5} />
                  <Text style={styles.receivedText}>Received</Text>
                </View>
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Package color="#15803D" size={14} />
                  </View>
                  <View>
                    <Text style={styles.serviceName}>Food</Text>
                    <Text style={styles.serviceSub}>800 kg allocated</Text>
                  </View>
                </View>
                <View style={styles.receivedBadge}>
                  <CheckCircle2 color="#16A34A" size={12} strokeWidth={2.5} />
                  <Text style={styles.receivedText}>Received</Text>
                </View>
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <HeartPulse color="#DC2626" size={14} />
                  </View>
                  <View>
                    <Text style={styles.serviceName}>Medical Kits</Text>
                    <Text style={styles.serviceSub}>50 kits allocated</Text>
                  </View>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              </View>

              <View style={[styles.serviceRow, { borderBottomWidth: 0 }]}>
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: '#E8EFE5' }]}>
                    <Tent color="#2D4A22" size={14} />
                  </View>
                  <View>
                    <Text style={styles.serviceName}>Shelter</Text>
                    <Text style={styles.serviceSub}>12 tents allocated</Text>
                  </View>
                </View>
                <View style={styles.receivedBadge}>
                  <CheckCircle2 color="#16A34A" size={12} strokeWidth={2.5} />
                  <Text style={styles.receivedText}>Verified</Text>
                </View>
              </View>
            </View>

            {/* STICKY CRIMSON RED SOS BANNER FROM SCREENSHOT */}
            <View style={styles.bannerWrapper}>
              <SOSButton
                isBanner={true}
                onPress={() => setActiveTab('requests')}
              />
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>
        )}

        {/* TAB 2: REQUESTS (EMERGENCY SOS & MOBILE-TO-MOBILE CHAT) */}
        {activeTab === 'requests' && (
          <SOSChatScreen
            hasWifi={hasWifi}
            onToggleWifi={() => setHasWifi(prev => !prev)}
            mobileToMobileEnabled={mobileToMobileEnabled}
            onToggleMobileToMobile={() => setMobileToMobileEnabled(prev => !prev)}
            selectedVolunteer={selectedVolunteer}
            onSelectVolunteer={setSelectedVolunteer}
            messages={messages}
            onSendSOS={handleSendSOS}
            onSendChat={(text) => handleSendSOS('Custom SOS', { text })}
            isSending={isSending}
          />
        )}

        {/* TAB 3: SERVICES (CAMP RESIDENT SUPPLIES & DIRECTORY) */}
        {activeTab === 'services' && (
          <CampsScreen
            onShowOnMap={(camp) => {
              setSelectedCamp(camp);
              setActiveTab('map');
            }}
            onTriggerSOS={() => setActiveTab('requests')}
          />
        )}

        {/* TAB 4: MAP (LIVE RADAR BEACON & SHELTERS) */}
        {activeTab === 'map' && (
          <MapScreen
            onSelectVolunteer={(vol) => {
              setSelectedVolunteer(vol);
              setActiveTab('requests');
            }}
            onSelectCamp={(camp) => {
              setSelectedCamp(camp);
              setActiveTab('services');
            }}
            onSendFieldTeam={() => Alert.alert('Help En Route', 'Volunteer team acknowledged your beacon position.')}
          />
        )}

      </View>

      {/* 4-TAB CITIZEN BOTTOM NAVIGATION BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          onPress={() => setActiveTab('home')}
        >
          <Home color={activeTab === 'home' ? '#2D4A22' : '#7B8776'} size={20} strokeWidth={2.3} />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
          onPress={() => setActiveTab('requests')}
        >
          <AlertTriangle color={activeTab === 'requests' ? '#DC2626' : '#7B8776'} size={20} strokeWidth={2.3} />
          <Text style={[styles.tabLabel, activeTab === 'requests' && { color: '#DC2626' }]}>
            Requests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'services' && styles.tabButtonActive]}
          onPress={() => setActiveTab('services')}
        >
          <CheckSquare color={activeTab === 'services' ? '#2D4A22' : '#7B8776'} size={20} strokeWidth={2.3} />
          <Text style={[styles.tabLabel, activeTab === 'services' && styles.tabLabelActive]}>
            Services
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'map' && styles.tabButtonActive]}
          onPress={() => setActiveTab('map')}
        >
          <MapPin color={activeTab === 'map' ? '#2D4A22' : '#7B8776'} size={20} strokeWidth={2.3} />
          <Text style={[styles.tabLabel, activeTab === 'map' && styles.tabLabelActive]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2D4A22',
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#F4F5EB',
  },
  scrollPage: {
    flex: 1,
  },
  scrollInner: {
    padding: 12,
  },
  meshOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7D7',
    padding: 10,
    marginBottom: 10,
  },
  meshOptionCardActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  meshOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  meshOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  meshOptionTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  meshOptionSubtitle: {
    color: '#78350F',
    fontSize: 9.5,
    marginTop: 1,
  },
  switchModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  switchModeBtnText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  heroCampCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7D7',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2D4A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8EFE5',
    borderWidth: 1,
    borderColor: '#D1DEC9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    color: '#1A251B',
    fontSize: 15,
    fontWeight: '800',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  activePillText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#576356',
    fontSize: 11.5,
    marginTop: 2,
  },
  heroResidents: {
    color: '#8F9B8C',
    fontSize: 10.5,
    marginTop: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7D7',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2D4A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2E9',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#1A251B',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#576356',
    fontSize: 10,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '600',
  },
  metricRow: {
    marginBottom: 8,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricName: {
    color: '#1A251B',
    fontSize: 11,
    fontWeight: '600',
  },
  metricRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricNumbers: {
    color: '#576356',
    fontSize: 10,
    fontWeight: '600',
  },
  metricPct: {
    color: '#1A251B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  lowStockPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  lowStockText: {
    color: '#DC2626',
    fontSize: 8.5,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E9EBE0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6F0',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    color: '#1A251B',
    fontSize: 12,
    fontWeight: '700',
  },
  serviceSub: {
    color: '#576356',
    fontSize: 10,
  },
  receivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receivedText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
  },
  bannerWrapper: {
    marginTop: 2,
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#F5F6ED',
    borderTopWidth: 1,
    borderTopColor: '#E2E6D5',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabButtonActive: {},
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7B8776',
  },
  tabLabelActive: {
    color: '#2D4A22',
  },
});
