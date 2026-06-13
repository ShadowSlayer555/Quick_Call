import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import mqtt, { MqttClient } from 'mqtt';
import { MqttMessage, getPrivateTopic, getCallAllTopic, getDiscoverTopic, getHostsTopic, MQTT_BROKER_URL } from './lib/mqttStore';
import { AppView, PeerInfo } from './types';
import { Phone, PhoneCall, Users } from 'lucide-react';

import SetupScreen from './components/SetupScreen';
import HostRoom from './components/HostRoom';
import JoinList from './components/JoinList';
import RingingScreen from './components/RingingScreen';
import CallScreen from './components/CallScreen';

export default function App() {
  const [myId] = useState(() => uuidv4());
  const [myName, setMyName] = useState('');
  const [view, setView] = useState<AppView>('home');
  const [client, setClient] = useState<MqttClient | null>(null);
  
  // Host state
  const [pendingGuests, setPendingGuests] = useState<PeerInfo[]>([]);
  const [acceptedGuests, setAcceptedGuests] = useState<PeerInfo[]>([]);
  
  // Join state
  const [availableHosts, setAvailableHosts] = useState<PeerInfo[]>([]);
  const [joinStatus, setJoinStatus] = useState<string>('');
  const [targetHost, setTargetHost] = useState<PeerInfo | null>(null);

  // Call All State
  const [callerInfo, setCallerInfo] = useState<PeerInfo | null>(null);
  
  // In Call state
  const [callPeers, setCallPeers] = useState<PeerInfo[]>([]);

  useEffect(() => {
    const mqttClient = mqtt.connect(MQTT_BROKER_URL);
    setClient(mqttClient);

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT');
      mqttClient.subscribe([getPrivateTopic(myId), getCallAllTopic()]);
    });

    mqttClient.on('message', (topic, payload) => {
        try {
          const msg = JSON.parse(payload.toString()) as MqttMessage;
          handleMessage(msg, topic);
        } catch (e) {
          // ignore parsing error
        }
    });

    return () => {
      mqttClient.end();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  const stateRef = useRef({ view, myName, acceptedGuests, pendingGuests });
  useEffect(() => {
    stateRef.current = { view, myName, acceptedGuests, pendingGuests };
  }, [view, myName, acceptedGuests, pendingGuests]);

  const handleMessage = (msg: MqttMessage, topic: string) => {
    const s = stateRef.current;
    
    if (msg.type === 'CALL_ALL' && msg.callerId !== myId) {
      if (s.view !== 'in_call' && s.view !== 'host_room' && s.view !== 'ringing') {
        setCallerInfo({ id: msg.callerId, name: msg.callerName });
        setView('ringing');
      }
    }

    if (s.view === 'host_room') {
      if (msg.type === 'DISCOVER') {
        const pong: MqttMessage = { type: 'HOST_PONG', hostId: myId, hostName: s.myName };
        client?.publish(getHostsTopic(), JSON.stringify(pong));
      } else if (msg.type === 'JOIN_REQUEST') {
        setPendingGuests(prev => {
          if (prev.find(p => p.id === msg.guestId) || s.acceptedGuests.find(p => p.id === msg.guestId)) return prev;
          return [...prev, { id: msg.guestId, name: msg.guestName }];
        });
      } else if (msg.type === 'ACCEPT_CALL_ALL') {
        setAcceptedGuests(prev => {
          if (prev.find(p => p.id === msg.guestId)) return prev;
          return [...prev, { id: msg.guestId, name: msg.guestName }];
        });
      }
    }

    if (msg.type === 'HOST_PONG') {
      setAvailableHosts(prev => {
        if (prev.find(h => h.id === msg.hostId)) return prev;
        return [...prev, { id: msg.hostId, name: msg.hostName }];
      });
    }

    if (s.view === 'join_wait') {
      if (msg.type === 'JOIN_ACCEPT') {
        setJoinStatus('Accepted! Waiting for host to start call...');
      } else if (msg.type === 'JOIN_REJECT') {
        setJoinStatus('Rejected: ' + msg.reason);
        setTimeout(() => setView('join_list'), 2000);
      }
    }

    if (msg.type === 'START_CALL') {
      if (s.view === 'join_wait') {
        setCallPeers(msg.peers);
        setView('in_call');
      }
    }

    if (msg.type === 'WEBRTC_SIGNAL') {
      const event = new CustomEvent('webrtc_signal', { detail: msg });
      window.dispatchEvent(event);
    }
  };

  const startCallAll = (name: string) => {
    setMyName(name);
    const msg: MqttMessage = { type: 'CALL_ALL', callerId: myId, callerName: name };
    client?.publish(getCallAllTopic(), JSON.stringify(msg));
    
    // Auto add self, and act as Host Room
    setPendingGuests([]);
    setAcceptedGuests([{ id: myId, name }]);
    setView('host_room');
    client?.subscribe([getDiscoverTopic()]);
  };

  const becomeHost = (name: string) => {
    setMyName(name);
    setView('host_room');
    setAcceptedGuests([{ id: myId, name }]);
    client?.subscribe([getDiscoverTopic()]);
  };

  const findHosts = (name: string) => {
    setMyName(name);
    setView('join_list');
    client?.subscribe([getHostsTopic()]);
    refreshHosts();
  };

  const refreshHosts = () => {
    setAvailableHosts([]);
    const msg: MqttMessage = { type: 'DISCOVER' };
    client?.publish(getDiscoverTopic(), JSON.stringify(msg));
  };

  const requestJoin = (hostId: string) => {
    setTargetHost(availableHosts.find(h => h.id === hostId) || { id: hostId, name: 'Host' });
    setView('join_wait');
    setJoinStatus('Requesting to join...');
    const msg: MqttMessage = { type: 'JOIN_REQUEST', guestId: myId, guestName: myName };
    client?.publish(getPrivateTopic(hostId), JSON.stringify(msg));
  };

  const hostAcceptJoin = (guestId: string) => {
    const guest = pendingGuests.find(g => g.id === guestId);
    if (!guest) return;
    setPendingGuests(prev => prev.filter(g => g.id !== guestId));
    setAcceptedGuests(prev => [...prev, guest]);
    const msg: MqttMessage = { type: 'JOIN_ACCEPT', hostId: myId, hostName: myName };
    client?.publish(getPrivateTopic(guestId), JSON.stringify(msg));
  };

  const hostRejectJoin = (guestId: string) => {
    setPendingGuests(prev => prev.filter(g => g.id !== guestId));
    const msg: MqttMessage = { type: 'JOIN_REJECT', reason: 'Host declined' };
    client?.publish(getPrivateTopic(guestId), JSON.stringify(msg));
  };

  const hostStartCall = () => {
    // Send START_CALL to all accepted guests
    const msg: MqttMessage = { type: 'START_CALL', peers: acceptedGuests };
    for (const guest of acceptedGuests) {
      if (guest.id === myId) continue;
      client?.publish(getPrivateTopic(guest.id), JSON.stringify(msg));
    }
    setCallPeers(acceptedGuests);
    setView('in_call');
  };

  const acceptCallAll = (name: string) => {
    setMyName(name);
    setView('join_wait');
    setJoinStatus('Accepted! Waiting for them to start call...');
    if (callerInfo) {
      const msg: MqttMessage = { type: 'ACCEPT_CALL_ALL', guestId: myId, guestName: name };
      client?.publish(getPrivateTopic(callerInfo.id), JSON.stringify(msg));
    }
  };

  const handleLeaveCall = () => {
      setView('home');
      setPendingGuests([]);
      setAcceptedGuests([]);
      setCallPeers([]);
      if (client) {
          client.unsubscribe(getDiscoverTopic());
          client.unsubscribe(getHostsTopic());
      }
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-[#e0e0e0] font-sans flex flex-col p-4 md:p-6 overflow-hidden selection:bg-indigo-500/30">
      <header className="flex items-center justify-between mb-4 md:mb-6 bg-[#111] border border-[#222] rounded-2xl px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">QC</div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight uppercase">Quick_Call</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">shadowslayer555.github.io</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {view === 'home' && (
             <button
               onClick={() => setView('call_all_setup')}
               className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all text-sm font-bold uppercase tracking-wider flex items-center gap-2"
             >
               <PhoneCall className="w-4 h-4 hidden sm:block" />
               Call All
             </button>
           )}
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {view === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-4">
              <button
                onClick={() => setView('host_setup')}
                className="w-full py-5 bg-[#111] border border-[#222] rounded-3xl hover:border-indigo-500/50 transition-all font-medium text-lg flex flex-col items-center justify-center gap-3 group"
              >
                <div className="p-4 rounded-full bg-[#1a1a1a] border border-[#333] group-hover:bg-indigo-500/20 transition-colors">
                  <Users className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300" />
                </div>
                Host a Room
              </button>
              <button
                onClick={() => setView('join_setup')}
                className="w-full py-5 bg-[#111] border border-[#222] rounded-3xl hover:border-indigo-500/50 transition-all font-medium text-lg flex flex-col items-center justify-center gap-3 group"
              >
                 <div className="p-4 rounded-full bg-[#1a1a1a] border border-[#333] group-hover:bg-indigo-500/20 transition-colors">
                  <Phone className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300" />
                </div>
                Join a Room
              </button>
            </div>
          </div>
        )}

        {view !== 'home' && view !== 'in_call' && (
          <div className="flex-1 bg-[#111] border border-[#222] rounded-3xl p-6 shadow-2xl relative w-full h-full flex flex-col max-w-5xl mx-auto overflow-hidden">
             {view === 'host_setup' && <SetupScreen title="Host a Call" actionObj={{ label: 'Start Hosting', action: becomeHost }} onSecondary={() => setView('home')} />}
             {view === 'join_setup' && <SetupScreen title="Join a Call" actionObj={{ label: 'Find Hosts', action: findHosts }} onSecondary={() => setView('home')} />}
             {view === 'call_all_setup' && <SetupScreen title="Call Everyone" actionObj={{ label: 'Send Call Request', action: startCallAll }} onSecondary={() => setView('home')} />}
             
             {view === 'host_room' && (
               <HostRoom 
                 pendingGuests={pendingGuests} 
                 acceptedGuests={acceptedGuests} 
                 onAccept={hostAcceptJoin} 
                 onReject={hostRejectJoin} 
                 onStartCall={hostStartCall} 
                 onCancel={handleLeaveCall} 
               />
             )}

             {view === 'join_list' && (
               <JoinList 
                 hosts={availableHosts} 
                 onRefresh={refreshHosts} 
                 onJoin={requestJoin} 
                 onCancel={handleLeaveCall} 
               />
             )}

             {view === 'join_wait' && (
               <JoinList 
                 hosts={[]} 
                 onRefresh={() => {}} 
                 onJoin={() => {}} 
                 onCancel={handleLeaveCall} 
                 statusMsg={joinStatus} 
               />
             )}

             {view === 'ringing' && (
               <RingingScreen 
                 caller={callerInfo} 
                 onAccept={() => {
                   // Ask for name first
                   const name = prompt("Enter your name to join:");
                   if (name && name.trim()) {
                     acceptCallAll(name.trim());
                   } else {
                     setView('home'); // canceled
                   }
                 }} 
                 onDecline={() => setView('home')} 
               />
             )}
          </div>
        )}

        {view === 'in_call' && (
           <CallScreen 
             myId={myId} 
             peers={callPeers} 
             mqttClient={client} 
             onLeave={handleLeaveCall} 
           />
        )}
      </main>
    </div>
  );
}
