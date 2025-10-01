import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon, PhoneOffIcon, ScreenShareIcon, CircleIcon, Settings, Maximize2, Minimize2, Camera, CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface VideoConsultationProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  onCallEnd?: () => void;
  patientToken?: string; // Optional patient authentication token for patient-side joins
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
  onCallEnd,
  patientToken
}: VideoConsultationProps) {
  // State management
  const [callStatus, setCallStatus] = useState<'pre-call' | 'initializing' | 'connecting' | 'connected' | 'ended'>('pre-call');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [callDuration, setCallDuration] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocalVideoVisible, setIsLocalVideoVisible] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  // Waiting room state - track if doctor is present in the consultation
  const [doctorPresent, setDoctorPresent] = useState(patientToken ? false : true); // Patients start in waiting room, doctors are always "present"
  const [waitingRoomMessage, setWaitingRoomMessage] = useState("Aguardando o médico entrar na consulta...");

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
    if (callStatus === 'pre-call') {
      initializeMedia();
    }
    setupDurationTimer();
    
    return () => {
      cleanup();
    };
  }, []);

  // Initialize media for pre-call testing
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsMediaReady(true);
      
      toast({
        title: "Câmera e microfone prontos",
        description: "Você pode testar sua configuração antes de iniciar a consulta.",
      });
    } catch (error) {
      console.error('Error accessing media:', error);
      setErrors(prev => [...prev, 'Erro ao acessar câmera/microfone']);
      toast({
        title: "Erro de mídia",
        description: "Verifique as permissões de câmera e microfone.",
        variant: "destructive",
      });
    }
  };

  // Start the actual video call
  const startVideoCall = async () => {
    if (!isMediaReady) {
      await initializeMedia();
    }
    await initializeWebRTC();
  };

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
      
      // Use existing stream if available, otherwise get new one
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
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
      await setupSignaling();

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

  const setupSignaling = async () => {
    try {
      // Fetch JWT token for WebSocket authentication (like WhatsApp integration does)
      const tokenResponse = await fetch('/api/auth/websocket-token', {
        credentials: 'include'
      });
      
      if (!tokenResponse.ok) {
        console.error('Failed to get WebSocket token:', tokenResponse.status);
        setErrors(prev => [...prev, 'Erro de autenticação WebSocket']);
        return;
      }
      
      const { token } = await tokenResponse.json();
      console.log('WebSocket token obtained successfully');
      
      // Connect to WebSocket with authentication token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      
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
    } catch (error) {
      console.error('Error setting up WebSocket signaling:', error);
      setErrors(prev => [...prev, 'Erro ao configurar WebSocket']);
    }
  };

  const handleSignalingMessage = async (data: any) => {
    const { type, offer, answer, candidate } = data;
    
    // Handle waiting room - user-joined notification
    if (type === 'user-joined') {
      console.log('User joined:', data);
      if (data.userType === 'doctor') {
        setDoctorPresent(true);
        setWaitingRoomMessage("Médico entrou! Iniciando videochamada...");
        
        toast({
          title: "Médico presente",
          description: "O médico entrou na consulta. Iniciando videochamada...",
        });
        
        // Auto-start video call when doctor joins
        if (patientToken && callStatus === 'pre-call') {
          setTimeout(() => startVideoCall(), 1000);
        }
      }
      return;
    }
    
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

  // Pre-call interface for media testing
  if (callStatus === 'pre-call') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8 max-w-lg w-full mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Consulta com {patientName}
            </h1>
            <p className="text-white/80">
              Teste sua câmera e microfone antes de iniciar
            </p>
          </div>

          {/* Pre-call video preview */}
          <div className="relative mb-8 rounded-2xl overflow-hidden bg-gray-900/50 aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-preview"
            />
            {!isMediaReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                  <p>Carregando câmera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Pre-call controls */}
          <div className="flex justify-center space-x-4 mb-8">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full w-14 h-14 p-0"
              data-testid="button-preview-video"
            >
              {isVideoEnabled ? <VideoIcon className="h-6 w-6" /> : <VideoOffIcon className="h-6 w-6" />}
            </Button>

            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full w-14 h-14 p-0"
              data-testid="button-preview-audio"
            >
              {isAudioEnabled ? <MicIcon className="h-6 w-6" /> : <MicOffIcon className="h-6 w-6" />}
            </Button>
          </div>

          {/* Start call button */}
          <Button
            onClick={startVideoCall}
            disabled={!isMediaReady}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform hover:scale-105"
            size="lg"
            data-testid="button-start-call"
          >
            <VideoIcon className="mr-2 h-5 w-5" />
            Iniciar Videoconsulta
          </Button>

          {errors.length > 0 && (
            <div className="mt-4 space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="bg-red-500/20 text-red-100 p-3 rounded-xl border border-red-500/30">
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Waiting room - show when patient is waiting for doctor
  if (patientToken && !doctorPresent && callStatus === 'pre-call') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <VideoIcon className="h-10 w-10 text-blue-300" />
            </div>
            <CardTitle className="text-2xl text-white">Sala de Espera</CardTitle>
            <p className="text-blue-200 mt-2">
              {waitingRoomMessage}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Patient info */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
                <p className="text-white font-medium">Aguardando médico...</p>
              </div>
              
              {/* Local video preview */}
              {isMediaReady && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900/50 border border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    data-testid="video-waiting-room-preview"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {patientName}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-blue-200">
                Sua câmera e microfone estão prontos. 
                A consulta iniciará automaticamente quando o médico entrar.
              </p>
            </div>
            
            {/* Animated waiting indicator */}
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main video consultation interface
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              callStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            )} />
            <h1 className="text-white text-lg sm:text-xl font-semibold">
              {patientName}
            </h1>
          </div>
          <Badge variant="outline" className={cn(
            "border-white/30 text-xs",
            callStatus === 'connected' ? 'bg-green-500/20 text-green-300' : 
            callStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-300' : 
            'bg-blue-500/20 text-blue-300'
          )}>
            {callStatus === 'connected' ? 'Conectado' : 
             callStatus === 'connecting' ? 'Conectando...' : 
             callStatus === 'ended' ? 'Encerrado' : 'Inicializando'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge className={cn(
            "text-xs border-0",
            connectionQuality === 'good' ? 'bg-green-500/20 text-green-300' :
            connectionQuality === 'fair' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-red-500/20 text-red-300'
          )}>
            {connectionQuality === 'good' ? '● Boa' : 
             connectionQuality === 'fair' ? '● Regular' : '● Ruim'}
          </Badge>
          <div className="text-white text-sm font-mono">
            {formatDuration(callDuration)}
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative p-4">
        {/* Remote Video (Patient) - Main view */}
        <div className="relative w-full h-[calc(100vh-200px)] rounded-2xl overflow-hidden bg-gray-900">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            data-testid="video-remote"
          />
          
          {/* Patient name overlay */}
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-xl">
            <p className="text-sm font-medium">{patientName}</p>
          </div>

          {/* Local Video (Doctor) - Picture-in-picture */}
          {isLocalVideoVisible && (
            <div className="absolute top-4 right-4 w-32 sm:w-40 h-24 sm:h-32 rounded-xl overflow-hidden bg-gray-900 border-2 border-white/20 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="video-local"
              />
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Você
              </div>
              
              {/* Toggle local video visibility */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLocalVideoVisible(false)}
                className="absolute top-1 right-1 w-6 h-6 p-0 text-white/70 hover:text-white hover:bg-black/30"
                data-testid="button-hide-local"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Show local video button when hidden */}
          {!isLocalVideoVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLocalVideoVisible(true)}
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 rounded-xl"
              data-testid="button-show-local"
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Mostrar
            </Button>
          )}
        </div>
      </div>

      {/* Controls - Floating bottom bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/40 backdrop-blur-xl rounded-full p-2 flex items-center space-x-2">
          
          {/* Video toggle */}
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className={cn(
              "rounded-full w-14 h-14 p-0 transition-all duration-300",
              isVideoEnabled 
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
            data-testid="button-toggle-video"
          >
            {isVideoEnabled ? <VideoIcon className="h-6 w-6" /> : <VideoOffIcon className="h-6 w-6" />}
          </Button>

          {/* Audio toggle */}
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className={cn(
              "rounded-full w-14 h-14 p-0 transition-all duration-300",
              isAudioEnabled 
                ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
            data-testid="button-toggle-audio"
          >
            {isAudioEnabled ? <MicIcon className="h-6 w-6" /> : <MicOffIcon className="h-6 w-6" />}
          </Button>

          {/* Recording toggle */}
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "rounded-full w-14 h-14 p-0 transition-all duration-300",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                : "bg-white/20 hover:bg-white/30 text-white border-white/30"
            )}
            data-testid="button-toggle-recording"
          >
            <CircleIcon className="h-6 w-6" />
          </Button>

          {/* End call */}
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600 text-white transition-all duration-300"
            data-testid="button-end-call"
          >
            <PhoneOffIcon className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="absolute top-20 right-4 space-y-2 max-w-sm">
          {errors.map((error, index) => (
            <div key={index} className="bg-red-500/20 text-red-100 p-3 rounded-xl border border-red-500/30 backdrop-blur-sm">
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}