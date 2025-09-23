import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ConsultationNote {
  timestamp: string;
  note: string;
  type: 'observation' | 'prescription' | 'lab_request' | 'soap';
}

export default function VideoConsultation() {
  const [, params] = useRoute("/consultation/video/:patientId");
  const patientId = params?.patientId;
  const { toast } = useToast();

  // State management
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [consultationNotes, setConsultationNotes] = useState<ConsultationNote[]>([]);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [soapNotes, setSoapNotes] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Get patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: !!patientId,
  });

  // Get patient medical history
  const { data: medicalHistory = [] } = useQuery({
    queryKey: ['/api/patients', patientId, 'medical-history'],
    enabled: !!patientId,
  });

  // Initialize video call
  useEffect(() => {
    initializeVideoCall();
    return () => {
      // Cleanup
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const initializeVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // TODO: Implement real WebRTC peer-to-peer connection
      // This implementation only shows local video but doesn't establish
      // a real connection with the remote patient. For production, this needs:
      // 1. RTCPeerConnection setup
      // 2. ICE candidate handling
      // 3. SDP offer/answer exchange via WebSocket signaling
      // 4. Connection to existing consultation rooms in server/routes.ts

      // Initialize speech recognition for transcription
      if ('webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setAudioTranscript(prev => prev + ' ' + transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        // Start transcription when recording starts
        if (isRecording) {
          recognition.start();
        }
      }
      
    } catch (error) {
      toast({
        title: "Erro na Videochamada",
        description: "Não foi possível acessar câmera/microfone. Verifique as permissões.",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    if (localVideoRef.current?.srcObject) {
      const tracks = (localVideoRef.current.srcObject as MediaStream).getVideoTracks();
      tracks.forEach(track => track.enabled = !isVideoOn);
    }
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    if (localVideoRef.current?.srcObject) {
      const tracks = (localVideoRef.current.srcObject as MediaStream).getAudioTracks();
      tracks.forEach(track => track.enabled = !isAudioOn);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (event) => {
          // TODO: Send audio chunks to server for transcription
          console.log('Audio chunk available:', event.data.size);
        };
        
        recorder.onstop = () => {
          console.log('Recording stopped');
          stream.getTracks().forEach(track => track.stop());
        };
        
        recorder.start(1000); // Capture 1-second chunks
        mediaRecorderRef.current = recorder;
        
        // Start speech recognition
        if ('webkitSpeechRecognition' in window) {
          const recognition = new (window as any).webkitSpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'pt-BR';
          
          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript + ' ';
              }
            }
            if (transcript) {
              setAudioTranscript(prev => prev + transcript);
            }
          };
          
          recognition.start();
        }
        
        setIsRecording(true);
        toast({
          title: "Gravação Iniciada",
          description: "Áudio sendo transcrito automaticamente",
        });
      } catch (error) {
        toast({
          title: "Erro na Gravação",
          description: "Não foi possível iniciar a gravação de áudio",
          variant: "destructive",
        });
      }
    } else {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      setIsRecording(false);
      toast({
        title: "Gravação Parada",
        description: "Áudio não está mais sendo transcrito",
      });
    }
  };

  const addNote = (type: ConsultationNote['type']) => {
    if (!currentNote.trim()) return;
    
    const note: ConsultationNote = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      note: currentNote,
      type
    };
    
    setConsultationNotes(prev => [...prev, note]);
    setCurrentNote("");
  };

  const generateAIAnalysis = async () => {
    try {
      const analysisData = {
        transcript: audioTranscript,
        notes: consultationNotes,
        patientHistory: medicalHistory,
        patientInfo: patient
      };

      const response = await apiRequest('POST', '/api/ai/clinical-analysis', analysisData);
      const analysis = await response.json();
      
      // Update SOAP notes with AI analysis
      setSoapNotes({
        subjective: analysis.subjective || "",
        objective: analysis.objective || "",
        assessment: analysis.assessment || "",
        plan: analysis.plan || ""
      });

      toast({
        title: "Análise IA Concluída",
        description: "Relatório clínico gerado com base na consulta",
      });
    } catch (error) {
      toast({
        title: "Erro na Análise IA",
        description: "Não foi possível gerar a análise automática",
        variant: "destructive",
      });
    }
  };

  const endConsultation = async () => {
    try {
      // Save consultation data
      const consultationData = {
        patientId,
        notes: consultationNotes,
        audioTranscript,
        soapNotes,
        duration: Date.now(), // Calculate actual duration
        timestamp: new Date().toISOString()
      };

      await apiRequest('POST', '/api/consultations', consultationData);
      
      toast({
        title: "Consulta Finalizada",
        description: "Dados salvos no prontuário do paciente",
      });

      // Redirect back to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Erro ao Finalizar",
        description: "Não foi possível salvar os dados da consulta",
        variant: "destructive",
      });
    }
  };

  if (patientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="video-consultation-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teleconsulta</h1>
          <p className="text-muted-foreground">
            Paciente: {patient?.name} • Iniciada às {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isRecording ? "destructive" : "secondary"}>
            {isRecording ? "🔴 Gravando" : "⏹️ Parado"}
          </Badge>
          <Button 
            variant="destructive"
            onClick={endConsultation}
            data-testid="button-end-consultation"
          >
            Finalizar Consulta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Video Area */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Remote Patient Video */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video 
                    ref={remoteVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {patient?.name || 'Paciente'}
                  </div>
                </div>

                {/* Local Doctor Video */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video 
                    ref={localVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    Você (Médico)
                  </div>
                </div>
              </div>

              {/* Video Controls */}
              <div className="flex items-center justify-center space-x-4 mt-4">
                <Button
                  variant={isVideoOn ? "default" : "secondary"}
                  size="sm"
                  onClick={toggleVideo}
                  data-testid="button-toggle-video"
                >
                  <i className={`fas ${isVideoOn ? 'fa-video' : 'fa-video-slash'} mr-2`}></i>
                  {isVideoOn ? 'Desligar Câmera' : 'Ligar Câmera'}
                </Button>
                <Button
                  variant={isAudioOn ? "default" : "secondary"}
                  size="sm"
                  onClick={toggleAudio}
                  data-testid="button-toggle-audio"
                >
                  <i className={`fas ${isAudioOn ? 'fa-microphone' : 'fa-microphone-slash'} mr-2`}></i>
                  {isAudioOn ? 'Mutar' : 'Desmutar'}
                </Button>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  data-testid="button-toggle-recording"
                >
                  <i className="fas fa-circle mr-2"></i>
                  {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audio Transcript */}
          {audioTranscript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transcrição da Conversa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-sm">{audioTranscript}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Medical Dashboard */}
        <div className="space-y-4">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nome:</span>
                <span className="text-sm font-medium">{patient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Idade:</span>
                <span className="text-sm font-medium">{patient?.age || 'N/A'} anos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Telefone:</span>
                <span className="text-sm font-medium">{patient?.phone || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Medical Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anotações da Consulta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Digite suas observações..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                data-testid="textarea-consultation-notes"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => addNote('observation')} data-testid="button-add-observation">
                  Observação
                </Button>
                <Button size="sm" onClick={() => addNote('prescription')} data-testid="button-add-prescription">
                  Prescrição
                </Button>
                <Button size="sm" onClick={() => addNote('lab_request')} data-testid="button-add-lab">
                  Exame
                </Button>
                <Button size="sm" onClick={() => addNote('soap')} data-testid="button-add-soap">
                  SOAP
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {consultationNotes.map((note, index) => (
                  <div key={index} className="bg-muted p-2 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{note.type}</Badge>
                      <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                    </div>
                    <p>{note.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise IA</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full mb-4" 
                onClick={generateAIAnalysis}
                data-testid="button-generate-ai-analysis"
              >
                <i className="fas fa-brain mr-2"></i>
                Gerar Relatório IA
              </Button>

              {/* SOAP Notes */}
              <Tabs defaultValue="subjective" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="subjective" className="text-xs">S</TabsTrigger>
                  <TabsTrigger value="objective" className="text-xs">O</TabsTrigger>
                  <TabsTrigger value="assessment" className="text-xs">A</TabsTrigger>
                  <TabsTrigger value="plan" className="text-xs">P</TabsTrigger>
                </TabsList>
                
                <TabsContent value="subjective">
                  <Textarea
                    placeholder="Subjetivo (sintomas relatados)"
                    value={soapNotes.subjective}
                    onChange={(e) => setSoapNotes(prev => ({...prev, subjective: e.target.value}))}
                    className="min-h-20 text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="objective">
                  <Textarea
                    placeholder="Objetivo (exame físico)"
                    value={soapNotes.objective}
                    onChange={(e) => setSoapNotes(prev => ({...prev, objective: e.target.value}))}
                    className="min-h-20 text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="assessment">
                  <Textarea
                    placeholder="Avaliação (diagnóstico)"
                    value={soapNotes.assessment}
                    onChange={(e) => setSoapNotes(prev => ({...prev, assessment: e.target.value}))}
                    className="min-h-20 text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="plan">
                  <Textarea
                    placeholder="Plano (tratamento)"
                    value={soapNotes.plan}
                    onChange={(e) => setSoapNotes(prev => ({...prev, plan: e.target.value}))}
                    className="min-h-20 text-sm"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}