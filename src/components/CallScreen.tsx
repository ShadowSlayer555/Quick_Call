import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Settings } from 'lucide-react';
import { PeerInfo } from '../types';
import { WebRTCManager } from '../lib/webrtc';
import mqtt from 'mqtt';
import { signalBuffer } from '../lib/mqttStore';

interface CallScreenProps {
  myId: string;
  peers: PeerInfo[];
  mqttClient: mqtt.MqttClient | null;
  onLeave: () => void;
  sharedLocalStream?: MediaStream | null;
}

const RemoteVideo: React.FC<{ stream: MediaStream, name: string }> = ({ stream, name }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#181818] aspect-video border border-[#333]">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-[#1a1a1a]/80 backdrop-blur rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider border border-white/10 flex flex-col">
        {name}
      </div>
    </div>
  );
};

export default function CallScreen({ myId, peers, mqttClient, onLeave, sharedLocalStream }: CallScreenProps) {
  const [manager, setManager] = useState<WebRTCManager | null>(null);
  const managerRef = useRef<WebRTCManager | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(sharedLocalStream || null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Filter out myId just in case it was included in the peers list
  const otherPeers = peers.filter(p => p.id !== myId);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices);
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let rtcManager: WebRTCManager | null = null;

    const init = async () => {
      try {
        let stream = localStream;
        
        // If we don't have a stream, or user selected a specific device we need to get a new one
        if (!stream || (selectedVideo || selectedAudio)) {
            try {
              const newStream = await navigator.mediaDevices.getUserMedia({
                video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
                audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
              });
              activeStream = newStream;
              stream = newStream;
            } catch (e) {
              console.warn("Video failed, trying audio only", e);
              try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                  audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
                  video: false
                });
                activeStream = newStream;
                stream = newStream;
              } catch(e2) {
                console.error("Audio fallback failed", e2);
                alert("Could not access camera or microphone. Check permissions or open in a new tab.");
              }
            }
        }

        if (stream) {
          applyToggles(stream);
          setLocalStream(stream);
        }

        if (!mqttClient) return;

        rtcManager = new WebRTCManager(myId, mqttClient, stream || undefined, (err) => console.error('RTC Error', err));
        managerRef.current = rtcManager;
        
        rtcManager.onStreamAdd = (peerId, remoteStream) => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.set(peerId, remoteStream);
            return next;
          });
        };

        rtcManager.onStreamRemove = (peerId) => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        };

        setManager(rtcManager);
        
        // Process buffered signals safely before initiating mesh
        const signalsToProcess = [...signalBuffer];
        for (const msg of signalsToProcess) {
            if (msg.type === 'WEBRTC_SIGNAL' && otherPeers.find(p => p.id === msg.senderId)) {
                rtcManager.handleSignal(msg.senderId, msg.signal);
                const idx = signalBuffer.indexOf(msg);
                if (idx !== -1) signalBuffer.splice(idx, 1);
            }
        }

        rtcManager.initiateMesh(otherPeers);
      } catch (err) {
        console.error("Failed to init media", err);
      }
    };

    init();

    return () => {
      // Only stop tracks if we created a NEW activeStream, do NOT stop tracks of sharedLocalStream 
      // unless we want to tear down the camera when leaving the call. Actually we can stop activeStream.
      if (activeStream && activeStream !== sharedLocalStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (rtcManager) {
        rtcManager.cleanup();
      }
      managerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, peers, mqttClient, selectedVideo, selectedAudio]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Use managerRef to process signals immediately
  useEffect(() => {
    const handleSignal = (e: any) => {
      const msg = e.detail;
      const idx = signalBuffer.indexOf(msg);
      if (idx !== -1) signalBuffer.splice(idx, 1);

      if (msg.type === 'WEBRTC_SIGNAL' && managerRef.current && otherPeers.find(p => p.id === msg.senderId)) {
        managerRef.current.handleSignal(msg.senderId, msg.signal);
      }
    };
    window.addEventListener('webrtc_signal', handleSignal);
    return () => window.removeEventListener('webrtc_signal', handleSignal);
  }, [otherPeers]);

  const applyToggles = (stream: MediaStream) => {
    stream.getAudioTracks().forEach(t => t.enabled = audioEnabled);
    stream.getVideoTracks().forEach(t => t.enabled = videoEnabled);
  };

  useEffect(() => {
    if (localStream) applyToggles(localStream);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled, videoEnabled]);

  const toggleScreenShare = async () => {
    if (!manager) return;
    try {
      if (screenSharing) {
        // Revert to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
        });
        applyToggles(stream);
        setLocalStream(stream);
        manager.replaceLocalStream(stream);
        setScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Keep mic audio
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
        });
        micStream.getAudioTracks()[0].enabled = audioEnabled;
        stream.addTrack(micStream.getAudioTracks()[0]);
        
        setLocalStream(stream);
        manager.replaceLocalStream(stream);
        setScreenSharing(true);
        
        stream.getVideoTracks()[0].onended = () => {
          toggleScreenShare(); // revert when stopped via browser UI
        };
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 min-h-0 min-w-0">
      
      {/* Primary Video Center (Bento Main Box) */}
      <div className="md:col-span-8 md:row-span-6 bg-[#111] border border-[#222] rounded-3xl relative overflow-hidden group flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 overflow-y-auto content-start">
          <div className="relative rounded-2xl overflow-hidden bg-[#181818] aspect-video border border-[#333]">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!screenSharing ? 'scale-x-[-1]' : ''}`}
            />
            <div className="absolute bottom-3 left-3 bg-[#1a1a1a]/80 backdrop-blur rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-2">
              You {screenSharing && '(Sharing Screen)'}
            </div>
          </div>
          
          {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
            const name = otherPeers.find(p => p.id === peerId)?.name || 'Unknown';
            return <RemoteVideo key={peerId} stream={stream} name={name} />;
          })}
        </div>

        {/* Action Bar inside Main Video Box (Bento style) */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end pointer-events-none">
          <div className="flex items-center gap-3">
             {/* Left side spacer, could add status here */}
          </div>
          <div className="flex gap-2 pointer-events-auto items-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-[#1a1a1a]/80 backdrop-blur rounded-xl border border-white/10 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white hidden md:block"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-3 backdrop-blur rounded-xl border transition-colors ${audioEnabled ? 'bg-[#1a1a1a]/80 border-white/10 hover:bg-zinc-800 text-white' : 'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30'}`}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-3 backdrop-blur rounded-xl border transition-colors ${videoEnabled ? 'bg-[#1a1a1a]/80 border-white/10 hover:bg-zinc-800 text-white' : 'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30'}`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 backdrop-blur rounded-xl border transition-colors hidden sm:block ${screenSharing ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] text-white' : 'bg-[#1a1a1a]/80 border-white/10 hover:bg-zinc-800 text-white'}`}
            >
              <MonitorUp className="w-5 h-5" />
            </button>

            <button
               onClick={onLeave}
               className="p-3 bg-red-600 hover:bg-red-500 border border-red-500/50 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] text-white ml-2 flex items-center justify-center"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Content Bento Boxes */}
      <div className="md:col-span-4 md:row-span-6 flex flex-col gap-4 min-h-0">
        
        {/* Device Settings Bento */}
        {showSettings && (
          <div className="bg-[#111] border border-[#222] rounded-3xl p-5 flex flex-col shrink-0 fade-in hidden md:flex">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Device Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-2">Camera Input</label>
                <select
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  value={selectedVideo}
                  onChange={e => setSelectedVideo(e.target.value)}
                >
                  <option value="">Default Camera</option>
                  {devices.filter(d => d.kind === 'videoinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-2">Microphone</label>
                <select
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  value={selectedAudio}
                  onChange={e => setSelectedAudio(e.target.value)}
                >
                   <option value="">Default Microphone</option>
                  {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,5)}`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Participants Bento */}
        <div className="bg-[#111] border border-[#222] rounded-3xl p-5 flex flex-col flex-1 min-h-0 hidden md:flex">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">In Call ({otherPeers.length + 1})</h3>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#333] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg">YOU</div>
              <div>
                <p className="text-sm font-medium">You</p>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Local</p>
              </div>
            </div>
            {otherPeers.map(p => (
              <div key={p.id} className="p-3 bg-[#1a1a1a] rounded-xl border border-[#333] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center font-bold text-sm border border-[#444]">
                     {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
