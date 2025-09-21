import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VideoIcon, PhoneIcon, ClockIcon, UserIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import VideoConsultation from '@/components/video-consultation/VideoConsultation';

interface PatientJoinData {
  consultationId: string;
  patientId: string;
  patientName: string;
  doctorName?: string;
  appointmentTime?: string;
  status: 'waiting' | 'active' | 'ended';
}

export default function PatientJoin() {
  const { t } = useTranslation();
  const [match, params] = useRoute('/join/:token');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<PatientJoinData | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [wsToken, setWsToken] = useState<string | null>(null);

  useEffect(() => {
    if (match && params?.token) {
      console.log('PatientJoin: Starting validation for token:', params.token.substring(0, 20) + '...');
      validateJoinToken(params.token);
    } else {
      console.log('PatientJoin: No valid token found', { match, params });
      setError(t('patient_join.invalid_link'));
      setIsLoading(false);
    }
  }, [match, params?.token]); // Fixed dependency

  const validateJoinToken = async (token: string) => {
    try {
      console.log('PatientJoin: validateJoinToken starting...');
      setIsLoading(true);
      setError(null);

      console.log('PatientJoin: Making API call to validate token...');
      // Use secure server-side token validation
      const response = await fetch('/api/auth/validate-patient-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      console.log('PatientJoin: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('PatientJoin: API error response:', errorData);
        throw new Error(errorData.message || t('patient_join.invalid_token'));
      }

      const validationResult = await response.json();
      console.log('PatientJoin: API success response:', validationResult);
      
      const joinData = {
        consultationId: validationResult.consultationId,
        patientId: validationResult.patientId,
        patientName: validationResult.patientName,
        doctorName: validationResult.doctorName,
        appointmentTime: validationResult.appointmentTime,
        status: validationResult.status
      };

      console.log('PatientJoin: Setting join data:', joinData);
      setJoinData(joinData);
      console.log('PatientJoin: Join data set successfully');

    } catch (err) {
      console.error('PatientJoin: Error validating join token:', err);
      setError(err instanceof Error ? err.message : t('patient_join.validation_error'));
    } finally {
      console.log('PatientJoin: Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleJoinConsultation = async () => {
    if (!joinData) return;

    try {
      setIsJoining(true);
      setError(null);

      // Generate patient WebSocket token
      const tokenResponse = await fetch('/api/auth/patient-join-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId: joinData.consultationId,
          patientId: joinData.patientId,
          patientName: joinData.patientName,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || t('patient_join.access_token_error'));
      }

      const { token } = await tokenResponse.json();
      setWsToken(token);
      setIsInCall(true);

      toast({
        title: t('patient_join.joining_consultation'),
        description: t('patient_join.connecting_call'),
      });

    } catch (err) {
      console.error('Error joining consultation:', err);
      setError(err instanceof Error ? err.message : t('patient_join.join_error'));
      toast({
        title: t('common.error'),
        description: t('patient_join.join_error_desc'),
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCallEnd = () => {
    setIsInCall(false);
    setWsToken(null);
    toast({
      title: "Consulta encerrada",
      description: "A videochamada foi encerrada. Obrigado!",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Validando link de consulta...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Erro de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              className="mt-4"
              data-testid="button-go-home"
            >
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInCall && wsToken && joinData) {
    return (
      <div className="min-h-screen bg-black">
        <VideoConsultation
          appointmentId={joinData.consultationId}
          patientId={joinData.patientId}
          doctorId="DEFAULT_DOCTOR" // Will be handled by signaling
          patientName={joinData.patientName}
          onCallEnd={handleCallEnd}
          // Pass the patient WebSocket token for authentication
          patientToken={wsToken}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-0 bg-white/80 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <VideoIcon className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Consulta Médica Online</CardTitle>
          <p className="text-muted-foreground mt-2">
            Você foi convidado para uma videochamada médica
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {joinData && (
            <>
              {/* Patient Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">{joinData.patientName}</p>
                    <p className="text-sm text-gray-600">Paciente</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <PhoneIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-800">{joinData.doctorName || 'Dr. Silva'}</p>
                    <p className="text-sm text-gray-600">Médico responsável</p>
                  </div>
                </div>

                {joinData.appointmentTime && (
                  <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-gray-800">
                        {new Date(joinData.appointmentTime).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-600">Horário da consulta</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="text-center">
                <Badge 
                  variant={joinData.status === 'active' ? 'default' : 'secondary'}
                  className="px-4 py-2 text-sm"
                >
                  {joinData.status === 'waiting' && 'Aguardando médico'}
                  {joinData.status === 'active' && 'Consulta ativa'}
                  {joinData.status === 'ended' && 'Consulta encerrada'}
                </Badge>
              </div>

              {/* Important Notes */}
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Antes de entrar:</strong> Certifique-se de que sua câmera e microfone estão funcionando. 
                  Encontre um local silencioso e bem iluminado para a consulta.
                </AlertDescription>
              </Alert>

              {/* Join Button */}
              <div className="text-center pt-4">
                <Button
                  onClick={handleJoinConsultation}
                  disabled={isJoining || joinData.status === 'ended'}
                  size="lg"
                  className="btn-medical-primary w-full text-lg py-6"
                  data-testid="button-join-consultation"
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Entrando...
                    </>
                  ) : (
                    <>
                      <VideoIcon className="h-5 w-5 mr-2" />
                      Entrar na Consulta
                    </>
                  )}
                </Button>
              </div>

              {joinData.status === 'ended' && (
                <p className="text-center text-muted-foreground text-sm mt-4">
                  Esta consulta já foi encerrada.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}