import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon, PhoneOffIcon, ScreenShareIcon, CircleIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VideoConsultationProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  onCallEnd?: () => void;
}

interface RTCConfiguration {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
}

export default function VideoConsultation({
  appointmentId,
  patientId,
  doctorId,
  patientName,
  onCallEnd
}: VideoConsultationProps) {
  // State management
  const [callStatus, setCallStatus] = useState<'initializing' | 'connecting' | 'connected' | 'ended'>('initializing');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [callDuration, setCallDuration] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // WebSocket ref for signaling
  const socketRef = useRef<WebSocket | null>(null);
  const callStartTimeRef = useRef<number>(0);

  const { toast } = useToast();

  // WebRTC configuration with STUN servers
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  useEffect(() => {
    initializeWebRTC();
    setupDurationTimer();
    
    return () => {
      cleanup();
    };
  }, []);

  const setupDurationTimer = () => {
    const interval = setInterval(() => {
      if (callStartTimeRef.current > 0) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const initializeWebRTC = async () => {
    try {
      setCallStatus('connecting');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log('Connection state:', state);
        
        if (state === 'connected') {
          setCallStatus('connected');
          callStartTimeRef.current = Date.now();
          toast({
            title: "Conexão estabelecida",
            description: "Videochamada conectada com sucesso.",
          });
        } else if (state === 'failed' || state === 'disconnected') {
          handleConnectionFailure();
        }
      };

      // Monitor connection quality periodically
      setInterval(() => {
        if (peerConnection.connectionState === 'connected') {
          monitorConnectionQuality();
        }
      }, 5000); // Check every 5 seconds

      // Setup WebSocket for signaling
      setupSignaling();

      // Create video consultation session
      await createConsultationSession();

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setErrors(prev => [...prev, 'Erro ao inicializar videochamada']);
      toast({
        title: "Erro na videochamada",
        description: "Não foi possível inicializar a videochamada.",
        variant: "destructive",
      });
    }
  };

  const setupSignaling = () => {
    // Connect to existing WebSocket or create new one
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    socketRef.current = new WebSocket(wsUrl);
    
    socketRef.current.onopen = () => {
      console.log('WebSocket connected for video consultation');
      // Join video consultation room
      socketRef.current?.send(JSON.stringify({
        type: 'join-consultation',
        appointmentId,
        userId: doctorId,
        role: 'doctor'
      }));
    };

    socketRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      await handleSignalingMessage(data);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setErrors(prev => [...prev, 'Erro de conexão']);
    };
  };

  const handleSignalingMessage = async (data: any) => {
    const { type, offer, answer, candidate } = data;
    const peerConnection = peerConnectionRef.current;
    
    if (!peerConnection) return;

    try {
      switch (type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer_desc = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer_desc);
          socketRef.current?.send(JSON.stringify({
            type: 'answer',
            answer: answer_desc,
            appointmentId
          }));
          break;
          
        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          break;
          
        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const createConsultationSession = async () => {
    try {
      const sessionData = {
        appointmentId,
        patientId,
        doctorId,
        sessionId: `session_${Date.now()}`,
        status: 'waiting',
        isRecorded: false,
        encryptionEnabled: true
      };

      await apiRequest('POST', '/api/video-consultations', sessionData);
    } catch (error) {
      console.error('Error creating consultation session:', error);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const startRecording = async () => {
    if (!localStreamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(localStreamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        saveRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Gravação iniciada",
        description: "A consulta está sendo gravada.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro na gravação",
        description: "Não foi possível iniciar a gravação.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = async () => {
    if (recordedChunksRef.current.length === 0) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    
    // In a production environment, you'd upload this to a secure storage service
    const url = URL.createObjectURL(blob);
    
    try {
      // Update the consultation session with recording URL
      await apiRequest('PATCH', `/api/video-consultations/${appointmentId}`, {
        recordingUrl: url,
        isRecorded: true
      });
      
      toast({
        title: "Gravação salva",
        description: "A gravação da consulta foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const monitorConnectionQuality = () => {
    if (!peerConnectionRef.current) return;

    peerConnectionRef.current.getStats().then(stats => {
      let qualityScore = 0;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          const packetsLost = report.packetsLost || 0;
          const packetsReceived = report.packetsReceived || 1;
          const lossRate = packetsLost / (packetsLost + packetsReceived);
          
          if (lossRate < 0.02) qualityScore += 2;
          else if (lossRate < 0.05) qualityScore += 1;
        }
      });

      if (qualityScore >= 2) setConnectionQuality('good');
      else if (qualityScore >= 1) setConnectionQuality('fair');
      else setConnectionQuality('poor');
    });
  };

  const handleConnectionFailure = () => {
    setErrors(prev => [...prev, 'Falha na conexão']);
    toast({
      title: "Conexão perdida",
      description: "A conexão com o paciente foi perdida.",
      variant: "destructive",
    });
  };

  const endCall = async () => {
    try {
      if (isRecording) {
        stopRecording();
      }

      // Update consultation session as ended
      await apiRequest('PATCH', `/api/video-consultations/${appointmentId}`, {
        status: 'ended',
        endedAt: new Date().toISOString(),
        duration: callDuration
      });

      setCallStatus('ended');
      onCallEnd?.();
      
      toast({
        title: "Chamada encerrada",
        description: "A videochamada foi encerrada.",
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const cleanup = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Stop recording
    if (isRecording) {
      stopRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="w-full h-full max-w-6xl mx-auto p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-white text-xl font-semibold">
              Consulta: {patientName}
            </h1>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {callStatus === 'connected' ? 'Conectado' : 
               callStatus === 'connecting' ? 'Conectando...' : 
               callStatus === 'ended' ? 'Encerrado' : 'Inicializando'}
            </Badge>
            <Badge className={getConnectionQualityColor()}>
              Qualidade: {connectionQuality === 'good' ? 'Boa' : 
                         connectionQuality === 'fair' ? 'Regular' : 'Ruim'}
            </Badge>
          </div>
          <div className="text-white text-lg">
            {formatDuration(callDuration)}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex gap-4">
          {/* Remote Video (Patient) */}
          <div className="flex-1 relative">
            <Card className="h-full bg-gray-900">
              <CardContent className="p-0 h-full">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                  data-testid="video-remote"
                />
                <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  {patientName}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Local Video (Doctor) */}
          <div className="w-80">
            <Card className="h-full bg-gray-900">
              <CardContent className="p-0 h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg"
                  data-testid="video-local"
                />
                <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  Você (Dr.)
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            data-testid="button-toggle-video"
          >
            {isVideoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOffIcon className="h-5 w-5" />}
          </Button>

          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            data-testid="button-toggle-audio"
          >
            {isAudioEnabled ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
          </Button>

          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            data-testid="button-toggle-recording"
          >
            <CircleIcon className="h-5 w-5" />
            {isRecording ? "Parar Gravação" : "Gravar"}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            data-testid="button-end-call"
          >
            <PhoneOffIcon className="h-5 w-5" />
            Encerrar
          </Button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-4">
            {errors.map((error, index) => (
              <div key={index} className="bg-red-100 text-red-800 p-2 rounded mb-2">
                {error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}