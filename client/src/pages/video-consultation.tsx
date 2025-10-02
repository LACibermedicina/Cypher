import { useState, useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Maximize,
  Minimize,
  MessageSquare,
  Brain,
  FileText,
  CircleDot,
  Play,
  Pause,
  Send,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ConsultationNote = {
  id: string;
  consultationId: string;
  userId: string;
  type: 'chat' | 'ai_query' | 'ai_response' | 'doctor_note' | 'annotation';
  content: string;
  metadata?: any;
  timestamp: string;
};

export default function VideoConsultation() {
  const [, params] = useRoute('/consultation/video/:patientId');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const patientId = params?.patientId || '';
  const [consultationId, setConsultationId] = useState<string>('');

  // Agora states
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  // UI states
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [doctorNote, setDoctorNote] = useState('');
  const [activeTab, setActiveTab] = useState('chat');

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Start or get consultation for this patient
  const { data: consultationData } = useQuery<{ id: string }>({
    queryKey: ['start-consultation', patientId],
    queryFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/video-consultations/start-with-patient/${patientId}`
      );
      return response.json();
    },
    enabled: !!patientId,
  });

  // Update consultationId when consultation is created/fetched
  useEffect(() => {
    if (consultationData?.id) {
      setConsultationId(consultationData.id);
    }
  }, [consultationData]);

  // Fetch consultation details
  const { data: consultation } = useQuery({
    queryKey: ['/api/video-consultations', consultationId],
    enabled: !!consultationId,
  });

  // Fetch consultation notes
  const { data: notes = [] } = useQuery<ConsultationNote[]>({
    queryKey: ['/api/video-consultations', consultationId, 'notes'],
    enabled: !!consultationId,
  });

  // Generate Agora token
  const { data: agoraConfig, isLoading: tokenLoading } = useQuery<{
    token: string;
    appId: string;
    channelName: string;
    uid: number;
  }>({
    queryKey: ['agora-token', consultationId],
    queryFn: async () => {
      const response = await apiRequest(
        'POST',
        '/api/video-consultations/agora-token',
        {
          channelName: consultationId,
          role: 'publisher',
        }
      );
      return response.json();
    },
    enabled: !!consultationId,
  });

  // Create consultation note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: { type: string; content: string; metadata?: any }) => {
      return apiRequest(
        'POST',
        '/api/video-consultations/' + consultationId + '/notes',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-consultations', consultationId, 'notes'] });
    },
  });

  // Start consultation mutation
  const startConsultationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        'POST',
        '/api/video-consultations/' + consultationId + '/start'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-consultations', consultationId] });
    },
  });

  // End consultation mutation
  const endConsultationMutation = useMutation({
    mutationFn: async (data: { duration: number; meetingNotes: string }) => {
      return apiRequest(
        'POST',
        '/api/video-consultations/' + consultationId + '/end',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-consultations', consultationId] });
      toast({
        title: 'Consulta Finalizada',
        description: 'Todas as notas e gravações foram salvas com sucesso.',
      });
      setLocation('/dashboard');
    },
  });

  // Initialize Agora client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);

    agoraClient.on('user-published', async (user, mediaType) => {
      await agoraClient.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        setRemoteUsers((prev) => {
          const exists = prev.find((u) => u.uid === user.uid);
          if (exists) return prev;
          return [...prev, user];
        });
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    agoraClient.on('user-unpublished', (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    return () => {
      agoraClient.removeAllListeners();
      leaveChannel();
    };
  }, []);

  // Join channel when token is available
  useEffect(() => {
    if (agoraConfig && client && !joined) {
      joinChannel();
    }
  }, [agoraConfig, client, joined]);

  // Play remote video
  useEffect(() => {
    if (remoteUsers.length > 0 && remoteVideoRef.current) {
      const remoteUser = remoteUsers[0];
      remoteUser.videoTrack?.play(remoteVideoRef.current);
    }
  }, [remoteUsers]);

  const joinChannel = async () => {
    if (!client || !agoraConfig || joined) return;

    try {
      await client.join(
        agoraConfig.appId,
        agoraConfig.channelName,
        agoraConfig.token,
        agoraConfig.uid
      );

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await client.publish([audioTrack, videoTrack]);
      setJoined(true);

      // Start consultation
      startConsultationMutation.mutate();

      toast({
        title: 'Conectado',
        description: 'Você entrou na vídeo consulta com sucesso.',
      });
    } catch (error) {
      console.error('Error joining channel:', error);
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível entrar na vídeo consulta.',
        variant: 'destructive',
      });
    }
  };

  const leaveChannel = async () => {
    if (!client) return;

    localAudioTrack?.close();
    localVideoTrack?.close();
    await client.leave();
    setJoined(false);
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    setRemoteUsers([]);
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        // Get the local stream for recording
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus'
        });
        
        recordedChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const endTime = new Date();
          const duration = recordingStartTime 
            ? Math.floor((endTime.getTime() - recordingStartTime.getTime()) / 1000)
            : 0;
          
          // Create a data URL (in production, this should be uploaded to a server)
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            
            try {
              // Save recording to database
              await fetch(`/api/video-consultations/${consultationId}/recordings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  segmentUrl: dataUrl.substring(0, 500) + '...', // Truncate for demo
                  startTime: recordingStartTime?.toISOString(),
                  endTime: endTime.toISOString(),
                  duration,
                  segmentType: 'video',
                  fileSize: blob.size
                })
              });
              
              toast({
                title: 'Gravação Salva',
                description: `Gravação de ${duration}s salva no histórico.`,
              });
            } catch (error) {
              console.error('Failed to save recording:', error);
              toast({
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar a gravação.',
                variant: 'destructive'
              });
            }
          };
          reader.readAsDataURL(blob);
          
          // Cleanup
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start(1000); // Collect data every second
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        setRecordingStartTime(new Date());
        
        toast({
          title: 'Gravação Iniciada',
          description: 'A consulta está sendo gravada.',
        });
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast({
          title: 'Erro na Gravação',
          description: 'Não foi possível iniciar a gravação.',
          variant: 'destructive'
        });
      }
    } else {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setRecordingStartTime(null);
      
      toast({
        title: 'Gravação Parada',
        description: 'A gravação foi finalizada e está sendo processada.',
      });
    }
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;

    createNoteMutation.mutate({
      type: 'chat',
      content: chatMessage,
    });
    setChatMessage('');
  };

  const sendAiQuery = async () => {
    if (!aiQuery.trim()) return;

    createNoteMutation.mutate({
      type: 'ai_query',
      content: aiQuery,
    });

    setAiQuery('');
    
    toast({
      title: 'Consulta IA Enviada',
      description: 'A IA está processando sua solicitação.',
    });
  };

  const saveDoctorNote = () => {
    if (!doctorNote.trim()) return;

    createNoteMutation.mutate({
      type: 'doctor_note',
      content: doctorNote,
    });
    setDoctorNote('');
    
    toast({
      title: 'Anotação Salva',
      description: 'Sua anotação foi salva com sucesso.',
    });
  };

  const endCall = async () => {
    const duration = (consultation as any)?.startedAt
      ? Math.floor((Date.now() - new Date((consultation as any).startedAt).getTime()) / 1000)
      : 0;

    const allNotes = notes
      .filter((n) => n.type === 'doctor_note')
      .map((n) => n.content)
      .join('\n\n');

    await leaveChannel();
    endConsultationMutation.mutate({ duration, meetingNotes: allNotes });
  };

  const chatNotes = notes.filter((n) => n.type === 'chat');
  const aiNotes = notes.filter((n) => n.type === 'ai_query' || n.type === 'ai_response');
  const doctorNotes = notes.filter((n) => n.type === 'doctor_note');

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-lg text-muted-foreground">Carregando consulta...</p>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'container mx-auto p-4'} bg-black flex flex-col`} data-testid="video-consultation-page">
      {/* Video Area - 70% minimum */}
      <div className="flex-1 relative" style={{ minHeight: '70vh' }}>
        {/* Remote Video (Doctor/Patient) */}
        <div
          ref={remoteVideoRef}
          className="absolute inset-0 bg-gray-900"
          data-testid="video-remote"
        >
          {remoteUsers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Aguardando participante...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <div
            ref={localVideoRef}
            className="w-full h-full"
            data-testid="video-local"
          />
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff className="h-12 w-12 text-white opacity-50" />
            </div>
          )}
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full" data-testid="status-recording">
            <CircleDot className="h-4 w-4 animate-pulse" />
            <span className="font-semibold">Gravando</span>
          </div>
        )}

        {/* Control Bar */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-gray-900/90 px-6 py-3 rounded-full">
          <Button
            variant={isVideoOn ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleVideo}
            className="rounded-full"
            data-testid="button-toggle-video"
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isAudioOn ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleAudio}
            className="rounded-full"
            data-testid="button-toggle-audio"
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isRecording ? 'destructive' : 'secondary'}
            size="icon"
            onClick={toggleRecording}
            className="rounded-full"
            data-testid="button-toggle-recording"
          >
            {isRecording ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-full"
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            onClick={endCall}
            className="rounded-full ml-2"
            data-testid="button-end-call"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Side Panel - Chat, AI, Notes */}
      <div className="w-full bg-background border-t" style={{ height: '30vh' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2" data-testid="tab-chat">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2" data-testid="tab-ai">
              <Brain className="h-4 w-4" />
              IA Diagnóstica
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2" data-testid="tab-notes">
              <FileText className="h-4 w-4" />
              Anotações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" data-testid="scroll-chat">
              <div className="space-y-3">
                {chatNotes.map((note) => (
                  <Card key={note.id} className="p-3" data-testid={`message-chat-${note.id}`}>
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                data-testid="input-chat-message"
              />
              <Button onClick={sendChatMessage} size="icon" data-testid="button-send-chat">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" data-testid="scroll-ai">
              <div className="space-y-3">
                {aiNotes.map((note) => (
                  <Card
                    key={note.id}
                    className={`p-3 ${note.type === 'ai_query' ? 'bg-blue-50 dark:bg-blue-950' : 'bg-green-50 dark:bg-green-950'}`}
                    data-testid={`message-ai-${note.id}`}
                  >
                    <p className="text-sm font-semibold">
                      {note.type === 'ai_query' ? '🤔 Pergunta:' : '🤖 IA:'}
                    </p>
                    <p className="text-sm mt-1">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Textarea
                placeholder="Faça uma pergunta para a IA diagnóstica..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                rows={2}
                data-testid="input-ai-query"
              />
              <Button onClick={sendAiQuery} size="icon" data-testid="button-send-ai">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" data-testid="scroll-notes">
              <div className="space-y-3">
                {doctorNotes.map((note) => (
                  <Card key={note.id} className="p-3" data-testid={`note-doctor-${note.id}`}>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Textarea
                placeholder="Escreva suas anotações médicas..."
                value={doctorNote}
                onChange={(e) => setDoctorNote(e.target.value)}
                rows={2}
                data-testid="input-doctor-note"
              />
              <Button onClick={saveDoctorNote} size="icon" data-testid="button-save-note">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
