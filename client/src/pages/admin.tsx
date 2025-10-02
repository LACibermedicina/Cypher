import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Key, Activity, AlertTriangle, Plus, Eye, EyeOff, Copy, Trash2, UserCheck, UserX, Edit3, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useWebSocket } from '@/hooks/use-websocket';
import { formatErrorForToast } from '@/lib/error-handler';

interface Collaborator {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  cnpj: string;
  cnes: string;
  specialization: string[];
  isActive: boolean;
  createdAt: string;
}

interface ApiKey {
  id: string;
  collaboratorId: string;
  keyName: string;
  hashedKey: string;
  permissions: string[];
  isActive: boolean;
  lastUsed: string | null;
  expiresAt: string | null;
  ipWhitelist: string[];
  rateLimit: number;
  createdAt: string;
}

interface CollaboratorIntegration {
  id: string;
  collaboratorId: string;
  collaboratorName?: string;
  integrationType: string;
  entityId: string;
  action: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  requestData?: any;
  createdAt: string;
}

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isBlocked: boolean;
  blockedBy?: string;
  lastLogin?: string;
  hierarchyLevel?: number;
  superiorDoctorId?: string;
  medicalLicense?: string;
  specialization?: string;
  tmcCredits?: number;
  createdAt: string;
}

interface ErrorLog {
  id: string;
  errorCode: string;
  userId?: string;
  errorType: string;
  endpoint?: string;
  method?: string;
  technicalMessage: string;
  userMessage: string;
  stackTrace?: string;
  context?: any;
  ipAddress?: string;
  userAgent?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [showCreateCollaborator, setShowCreateCollaborator] = useState(false);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [realtimeActivities, setRealtimeActivities] = useState<any[]>([]);
  
  // PDF Reference upload states
  const [uploadedPdfData, setUploadedPdfData] = useState<any>(null);
  const [refTitle, setRefTitle] = useState('');
  const [refContent, setRefContent] = useState('');
  const [refCategory, setRefCategory] = useState('');
  
  // Error Logs filters
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');
  const [selectedErrorLog, setSelectedErrorLog] = useState<ErrorLog | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  // WebSocket for real-time activity monitoring
  const { isConnected, messages } = useWebSocket();

  // Process WebSocket messages for admin activities
  useEffect(() => {
    const adminMessages = messages.filter(msg => msg.type === 'admin-activity');
    if (adminMessages.length > 0) {
      const latestMessage = adminMessages[adminMessages.length - 1];
      const activity = (latestMessage as any).activity; // Type assertion for admin activity messages
      setRealtimeActivities(prev => [activity, ...prev.slice(0, 49)]); // Keep last 50 activities
      
      // Show toast notification for new activities
      if (activity.action === 'user_blocked') {
        toast({
          title: "User Blocked",
          description: `${activity.details.blockedUsername} was blocked by ${activity.details.blockedBy}`,
          variant: "destructive",
        });
      } else if (activity.action === 'user_unblocked') {
        toast({
          title: "User Unblocked",
          description: `${activity.details.unblockedUsername} was unblocked by ${activity.details.unblockedBy}`,
        });
      }
    }
  }, [messages, toast]);

  // Queries
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['/api/collaborators'],
  });

  const { data: apiKeys = [], isLoading: loadingApiKeys } = useQuery({
    queryKey: ['/api/admin/api-keys'],
  });

  const { data: integrations = [], isLoading: loadingIntegrations } = useQuery({
    queryKey: ['/api/admin/integrations'],
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/admin/analytics'],
  });

  const { data: adminUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['/api/admin/users/activity/recent'],
  });

  // Error Logs query with filters
  const errorLogsQueryKey = [
    '/api/admin/error-logs',
    { 
      errorType: errorTypeFilter !== 'all' ? errorTypeFilter : undefined,
      resolved: resolvedFilter !== 'all' ? resolvedFilter : undefined,
      limit: 100
    }
  ];
  
  const { data: errorLogs = [], isLoading: loadingErrorLogs } = useQuery({
    queryKey: errorLogsQueryKey,
  });

  // Mutations
  const createCollaboratorMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/collaborators', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      setShowCreateCollaborator(false);
      toast({ title: 'Success', description: 'Collaborator created successfully' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/api-keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      setShowCreateApiKey(false);
      toast({ title: 'Success', description: 'API key created successfully' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const toggleApiKeyMutation = useMutation({
    mutationFn: ({ keyId, isActive }: { keyId: string; isActive: boolean }) => 
      apiRequest('PATCH', `/api/admin/api-keys/${keyId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      toast({ title: 'Success', description: 'API key updated successfully' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) => 
      apiRequest('POST', `/api/admin/users/${userId}/block`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User blocked successfully' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest('POST', `/api/admin/users/${userId}/unblock`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User unblocked successfully' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => 
      apiRequest('PATCH', `/api/admin/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User updated successfully' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const resolveErrorMutation = useMutation({
    mutationFn: ({ errorId, adminNotes }: { errorId: string; adminNotes?: string }) =>
      apiRequest('PATCH', `/api/admin/error-logs/${errorId}/resolve`, { adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: errorLogsQueryKey });
      setShowErrorDetails(false);
      setSelectedErrorLog(null);
      setResolveNotes('');
      toast({ title: 'Sucesso', description: 'Erro marcado como resolvido com sucesso' });
    },
    onError: (error: any) => {
      const errorInfo = formatErrorForToast(error);
      toast({ title: errorInfo.title, description: errorInfo.description, variant: 'destructive' });
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  const toggleShowApiKey = (keyId: string) => {
    setShowApiKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const formatJsonData = (data: any) => {
    if (!data) return 'N/A';
    return JSON.stringify(data, null, 2);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getIntegrationTypeColor = (type: string) => {
    switch (type) {
      case 'api_access': return 'bg-blue-100 text-blue-800';
      case 'prescription_share': return 'bg-green-100 text-green-800';
      case 'authorization_violation': return 'bg-red-100 text-red-800';
      case 'rate_limit': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8" data-testid="admin-page">
      <div className="flex items-center space-x-2">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">System Administration</h1>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collaborators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-collaborators">
              {(collaborators as Collaborator[]).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active: {(collaborators as Collaborator[]).filter((c: Collaborator) => c.isActive).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-api-keys">
              {(apiKeys as ApiKey[]).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active: {(apiKeys as ApiKey[]).filter((k: ApiKey) => k.isActive).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="today-requests">
              {(analytics as any)?.todayRequests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Success: {(analytics as any)?.todaySuccess || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="security-alerts">
              {(analytics as any)?.securityAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="collaborators" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Live Activity</span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </TabsTrigger>
          <TabsTrigger value="error-logs" data-testid="tab-error-logs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Error Logs</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="collaborators" data-testid="tab-collaborators">Collaborators</TabsTrigger>
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="ai-references" data-testid="tab-ai-references">AI References</TabsTrigger>
          <TabsTrigger value="layout-theme" data-testid="tab-layout-theme">Layout & Tema</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="total-users">
                  {(adminUsers as AdminUser[]).length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Active: {(adminUsers as AdminUser[]).filter((u: AdminUser) => !u.isBlocked).length}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Blocked Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="blocked-users">
                  {(adminUsers as AdminUser[]).filter((u: AdminUser) => u.isBlocked).length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="recent-activity">
                  {(recentActivity as AdminUser[]).length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Users active today
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage system users, roles, and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>TMC Credits</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(adminUsers as AdminUser[]).map((user: AdminUser) => (
                      <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'patient' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isBlocked ? 'destructive' : 'default'}>
                            {user.isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never'}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{user.tmcCredits || 0} TMC</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.isBlocked ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unblockUserMutation.mutate(user.id)}
                                data-testid={`button-unblock-${user.id}`}
                                disabled={unblockUserMutation.isPending}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => blockUserMutation.mutate({ 
                                  userId: user.id, 
                                  reason: 'Administrative action' 
                                })}
                                data-testid={`button-block-${user.id}`}
                                disabled={blockUserMutation.isPending}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>WebSocket</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Real-time connection status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="live-activities-count">
                  {realtimeActivities.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recent admin actions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="websocket-messages-count">
                  {messages.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total WebSocket messages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-green-600">
                  Online
                </div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Live Activity Feed</span>
                  <Badge variant="outline" className="ml-2">
                    {realtimeActivities.length} activities
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time administrative actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {realtimeActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No recent activity</p>
                      <p className="text-sm">Administrative actions will appear here in real-time</p>
                    </div>
                  ) : (
                    realtimeActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg"
                        data-testid={`activity-item-${index}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.action === 'user_blocked' ? 'bg-red-500' :
                          activity.action === 'user_unblocked' ? 'bg-green-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>
                          <p className="text-sm font-medium mt-1">
                            {activity.action === 'user_blocked' && 
                              `User ${activity.details.blockedUsername} was blocked`}
                            {activity.action === 'user_unblocked' && 
                              `User ${activity.details.unblockedUsername} was unblocked`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.action === 'user_blocked' && 
                              `By ${activity.details.blockedBy} - ${activity.details.reason}`}
                            {activity.action === 'user_unblocked' && 
                              `By ${activity.details.unblockedBy}`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* WebSocket Messages Debug */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>WebSocket Messages</span>
                  <Badge variant="outline" className="ml-2">
                    {messages.length} messages
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Debug information for WebSocket communication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>No WebSocket messages</p>
                      <p className="text-sm">Messages will appear here when received</p>
                    </div>
                  ) : (
                    messages.slice(-20).reverse().map((message, index) => (
                      <div
                        key={index}
                        className="p-2 bg-muted/30 rounded text-xs font-mono"
                        data-testid={`websocket-message-${index}`}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {message.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(), 'HH:mm:ss')}
                          </span>
                        </div>
                        <pre className="mt-1 text-xs overflow-x-auto">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Collaborators Tab */}
        <TabsContent value="collaborators" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>External Collaborators</CardTitle>
                  <CardDescription>
                    Manage pharmacies, laboratories, and hospitals integrated with the system
                  </CardDescription>
                </div>
                <Dialog open={showCreateCollaborator} onOpenChange={setShowCreateCollaborator}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-collaborator">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Collaborator
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Collaborator</DialogTitle>
                      <DialogDescription>
                        Add a new pharmacy, laboratory, or hospital to the system
                      </DialogDescription>
                    </DialogHeader>
                    <CreateCollaboratorForm 
                      onSubmit={(data) => createCollaboratorMutation.mutate(data)}
                      isLoading={createCollaboratorMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCollaborators ? (
                <div className="text-center py-8">Loading collaborators...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>CNES</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(collaborators as Collaborator[]).map((collaborator: Collaborator) => (
                      <TableRow key={collaborator.id} data-testid={`collaborator-row-${collaborator.id}`}>
                        <TableCell className="font-medium">{collaborator.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{collaborator.type}</Badge>
                        </TableCell>
                        <TableCell>{collaborator.cnpj}</TableCell>
                        <TableCell>{collaborator.cnes}</TableCell>
                        <TableCell>
                          <Badge variant={collaborator.isActive ? 'default' : 'secondary'}>
                            {collaborator.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(collaborator.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Key Management</CardTitle>
                  <CardDescription>
                    Generate and manage API keys for collaborator access
                  </CardDescription>
                </div>
                <Dialog open={showCreateApiKey} onOpenChange={setShowCreateApiKey}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-api-key">
                      <Plus className="h-4 w-4 mr-2" />
                      Generate API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate New API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for collaborator access
                      </DialogDescription>
                    </DialogHeader>
                    <CreateApiKeyForm 
                      collaborators={collaborators as Collaborator[]}
                      onSubmit={(data) => createApiKeyMutation.mutate(data)}
                      isLoading={createApiKeyMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingApiKeys ? (
                <div className="text-center py-8">Loading API keys...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key Name</TableHead>
                      <TableHead>Collaborator</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(apiKeys as ApiKey[]).map((apiKey: ApiKey) => {
                      const collaborator = (collaborators as Collaborator[]).find((c: Collaborator) => c.id === apiKey.collaboratorId);
                      return (
                        <TableRow key={apiKey.id} data-testid={`api-key-row-${apiKey.id}`}>
                          <TableCell className="font-medium">{apiKey.keyName}</TableCell>
                          <TableCell>{collaborator?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="px-2 py-1 bg-muted rounded text-sm">
                                {showApiKey[apiKey.id] ? apiKey.hashedKey : '••••••••••••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleShowApiKey(apiKey.id)}
                                data-testid={`button-toggle-key-${apiKey.id}`}
                              >
                                {showApiKey[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(apiKey.hashedKey)}
                                data-testid={`button-copy-key-${apiKey.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                              {apiKey.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {apiKey.lastUsed ? format(new Date(apiKey.lastUsed), 'MMM dd, yyyy HH:mm') : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleApiKeyMutation.mutate({ 
                                keyId: apiKey.id, 
                                isActive: !apiKey.isActive 
                              })}
                              data-testid={`button-toggle-status-${apiKey.id}`}
                            >
                              {apiKey.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Activity</CardTitle>
              <CardDescription>
                Monitor all integration events and API usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIntegrations ? (
                <div className="text-center py-8">Loading integration logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Collaborator</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(integrations as CollaboratorIntegration[]).slice(0, 50).map((integration: CollaboratorIntegration) => (
                      <TableRow key={integration.id} data-testid={`integration-row-${integration.id}`}>
                        <TableCell>{format(new Date(integration.createdAt), 'MMM dd HH:mm:ss')}</TableCell>
                        <TableCell>{integration.collaboratorName || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge className={getIntegrationTypeColor(integration.integrationType)}>
                            {integration.integrationType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{integration.action}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(integration.status)}>
                            {integration.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {integration.errorMessage && (
                            <span className="text-red-600 text-sm">{integration.errorMessage}</span>
                          )}
                          {integration.requestData && (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-muted-foreground">View data</summary>
                              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-w-xs">
                                {formatJsonData(integration.requestData)}
                              </pre>
                            </details>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Monitor authentication failures, rate limit violations, and security alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(integrations as CollaboratorIntegration[])
                    .filter((i: CollaboratorIntegration) => 
                      i.status === 'failed' || 
                      i.integrationType === 'authorization_violation' ||
                      i.action.includes('failed')
                    )
                    .slice(0, 20)
                    .map((event: CollaboratorIntegration) => (
                      <TableRow key={event.id} data-testid={`security-event-row-${event.id}`}>
                        <TableCell>{format(new Date(event.createdAt), 'MMM dd HH:mm:ss')}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {event.integrationType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.requestData?.clientIp || 'Unknown'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {event.errorMessage || event.action}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            event.integrationType === 'authorization_violation' ? 'destructive' : 'secondary'
                          }>
                            {event.integrationType === 'authorization_violation' ? 'High' : 'Medium'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI References Tab */}
        <TabsContent value="ai-references" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Reference Documents</CardTitle>
              <CardDescription>
                Upload and manage PDF reference documents for AI diagnostic assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload PDF Section */}
              <div className="border-2 border-dashed rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Upload New PDF Reference</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pdf-upload">PDF File (max 20MB)</Label>
                    <Input 
                      id="pdf-upload" 
                      type="file" 
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const formData = new FormData();
                        formData.append('pdfFile', file);
                        
                        try {
                          const response = await fetch('/api/chatbot-references/upload-pdf', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include'
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(`${response.status}: ${JSON.stringify(errorData)}`);
                          }
                          
                          const data = await response.json();
                          setUploadedPdfData(data);
                          // Auto-fill content with extracted text preview (first 500 chars)
                          if (data.extractedText) {
                            const preview = data.extractedText.substring(0, 500);
                            setRefContent(preview + (data.extractedText.length > 500 ? '...' : ''));
                          }
                          toast({
                            title: "PDF Carregado",
                            description: `Arquivo ${data.filename} carregado com sucesso. Texto extraído automaticamente.`,
                          });
                        } catch (error) {
                          const errorInfo = formatErrorForToast(error);
                          toast({
                            title: errorInfo.title,
                            description: errorInfo.description,
                            variant: "destructive"
                          });
                        }
                      }}
                      data-testid="input-pdf-upload"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ref-title">Reference Title</Label>
                    <Input 
                      id="ref-title" 
                      placeholder="e.g., Diabetes Clinical Guidelines 2024"
                      value={refTitle}
                      onChange={(e) => setRefTitle(e.target.value)}
                      data-testid="input-ref-title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ref-content">Content/Summary</Label>
                    <textarea 
                      id="ref-content" 
                      className="w-full min-h-[100px] p-2 border rounded-md"
                      placeholder="Provide a summary or key points from the PDF..."
                      value={refContent}
                      onChange={(e) => setRefContent(e.target.value)}
                      data-testid="input-ref-content"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ref-category">Category</Label>
                    <Select value={refCategory} onValueChange={setRefCategory}>
                      <SelectTrigger id="ref-category" data-testid="select-ref-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="procedural">Procedural</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="diagnostic">Diagnostic</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      if (!uploadedPdfData) {
                        toast({
                          title: "Nenhum PDF",
                          description: "Por favor, faça upload de um PDF primeiro",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      if (!refTitle || !refContent) {
                        toast({
                          title: "Campos obrigatórios",
                          description: "Por favor, preencha título e conteúdo",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      try {
                        const response = await fetch('/api/chatbot-references', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            title: refTitle,
                            content: refContent,
                            category: refCategory || 'general',
                            sourceType: 'pdf',
                            fileUrl: uploadedPdfData.fileUrl,
                            fileName: uploadedPdfData.filename,
                            fileSize: uploadedPdfData.fileSize,
                            pdfExtractedText: uploadedPdfData.extractedText,
                            language: 'pt-BR',
                            allowedRoles: ['admin', 'doctor', 'patient'],
                            useForDiagnostics: true,
                            priority: 1,
                            isActive: true
                          })
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(`${response.status}: ${JSON.stringify(errorData)}`);
                        }
                        
                        toast({
                          title: "Referência Criada",
                          description: "Documento de referência AI criado com sucesso"
                        });
                        
                        // Clear form
                        setRefTitle('');
                        setRefContent('');
                        setRefCategory('');
                        setUploadedPdfData(null);
                        (document.getElementById('pdf-upload') as HTMLInputElement).value = '';
                        
                        queryClient.invalidateQueries({ queryKey: ['/api/chatbot-references'] });
                      } catch (error) {
                        const errorInfo = formatErrorForToast(error);
                        toast({
                          title: errorInfo.title,
                          description: errorInfo.description,
                          variant: "destructive"
                        });
                      }
                    }}
                    data-testid="button-create-reference"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Reference
                  </Button>
                </div>
              </div>

              {/* References List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Existing References</h3>
                <AIReferencesTable />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Logs Tab */}
        <TabsContent value="error-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Erro do Sistema</CardTitle>
              <CardDescription>Visualize e gerencie logs de erro da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Erro</Label>
                  <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                    <SelectTrigger data-testid="select-error-type-filter">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="authentication">Autenticação</SelectItem>
                      <SelectItem value="validation">Validação</SelectItem>
                      <SelectItem value="database">Banco de Dados</SelectItem>
                      <SelectItem value="external_api">API Externa</SelectItem>
                      <SelectItem value="permission">Permissão</SelectItem>
                      <SelectItem value="not_found">Não Encontrado</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                    <SelectTrigger data-testid="select-resolved-filter">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="false">Não Resolvidos</SelectItem>
                      <SelectItem value="true">Resolvidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estatísticas</Label>
                  <div className="p-2 border rounded-md">
                    <div className="text-sm">
                      <span className="font-medium">Total: </span>
                      {(errorLogs as ErrorLog[]).length}
                    </div>
                    <div className="text-sm text-red-600">
                      <span className="font-medium">Não Resolvidos: </span>
                      {(errorLogs as ErrorLog[]).filter((log: ErrorLog) => !log.resolved).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Logs Table */}
              {loadingErrorLogs ? (
                <div className="text-center py-8">Carregando logs de erro...</div>
              ) : (errorLogs as ErrorLog[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log de erro encontrado
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(errorLogs as ErrorLog[]).map((log: ErrorLog) => (
                        <TableRow key={log.id} data-testid={`error-log-${log.id}`}>
                          <TableCell className="font-mono text-xs">{log.errorCode}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {log.errorType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">
                            {log.endpoint || 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {log.userMessage}
                          </TableCell>
                          <TableCell>
                            {log.resolved ? (
                              <Badge variant="default">Resolvido</Badge>
                            ) : (
                              <Badge variant="destructive">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedErrorLog(log);
                                setShowErrorDetails(true);
                              }}
                              data-testid={`button-view-error-${log.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Details Dialog */}
          <Dialog open={showErrorDetails} onOpenChange={setShowErrorDetails}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes do Erro</DialogTitle>
                <DialogDescription>
                  Código: {selectedErrorLog?.errorCode}
                </DialogDescription>
              </DialogHeader>

              {selectedErrorLog && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Tipo de Erro</Label>
                      <p className="text-sm capitalize">{selectedErrorLog.errorType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Status</Label>
                      <p className="text-sm">
                        {selectedErrorLog.resolved ? (
                          <Badge variant="default">Resolvido</Badge>
                        ) : (
                          <Badge variant="destructive">Pendente</Badge>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Endpoint</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      {selectedErrorLog.method} {selectedErrorLog.endpoint || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Mensagem para Usuário</Label>
                    <p className="text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded">
                      {selectedErrorLog.userMessage}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Mensagem Técnica</Label>
                    <p className="text-sm font-mono bg-red-50 dark:bg-red-950 p-3 rounded text-red-900 dark:text-red-100">
                      {selectedErrorLog.technicalMessage}
                    </p>
                  </div>

                  {selectedErrorLog.stackTrace && (
                    <div>
                      <Label className="text-sm font-semibold">Stack Trace</Label>
                      <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-[200px]">
                        {selectedErrorLog.stackTrace}
                      </pre>
                    </div>
                  )}

                  {selectedErrorLog.context && (
                    <div>
                      <Label className="text-sm font-semibold">Contexto</Label>
                      <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedErrorLog.context, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">IP Address</Label>
                      <p className="text-sm font-mono">{selectedErrorLog.ipAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">User Agent</Label>
                      <p className="text-xs truncate">{selectedErrorLog.userAgent || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Data</Label>
                    <p className="text-sm">
                      {format(new Date(selectedErrorLog.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss")}
                    </p>
                  </div>

                  {selectedErrorLog.resolved && (
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded">
                      <Label className="text-sm font-semibold">Resolução</Label>
                      <p className="text-sm mt-2">
                        Resolvido em: {selectedErrorLog.resolvedAt ? format(new Date(selectedErrorLog.resolvedAt), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}
                      </p>
                      {selectedErrorLog.adminNotes && (
                        <div className="mt-2">
                          <Label className="text-xs font-semibold">Observações do Admin</Label>
                          <p className="text-sm mt-1">{selectedErrorLog.adminNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedErrorLog.resolved && (
                    <div className="space-y-2">
                      <Label htmlFor="resolve-notes">Observações da Resolução (opcional)</Label>
                      <Input
                        id="resolve-notes"
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        placeholder="Adicione observações sobre como o erro foi resolvido"
                        data-testid="input-resolve-notes"
                      />
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                {selectedErrorLog && !selectedErrorLog.resolved && (
                  <Button
                    onClick={() => {
                      if (selectedErrorLog) {
                        resolveErrorMutation.mutate({
                          errorId: selectedErrorLog.id,
                          adminNotes: resolveNotes || undefined
                        });
                      }
                    }}
                    disabled={resolveErrorMutation.isPending}
                    data-testid="button-resolve-error"
                  >
                    {resolveErrorMutation.isPending ? 'Resolvendo...' : 'Marcar como Resolvido'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowErrorDetails(false)}
                  data-testid="button-close-error-details"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// AI References Table Component
function AIReferencesTable() {
  const { toast } = useToast();
  const { data: references = [], isLoading } = useQuery({
    queryKey: ['/api/chatbot-references'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/chatbot-references/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete reference');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reference Deleted",
        description: "AI reference document deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot-references'] });
    },
    onError: (error) => {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return <div>Loading references...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(references as any[]).map((ref) => (
          <TableRow key={ref.id} data-testid={`ref-row-${ref.id}`}>
            <TableCell className="font-medium">{ref.title}</TableCell>
            <TableCell>
              <Badge>{ref.category}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{ref.sourceType}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={ref.isActive ? "default" : "secondary"}>
                {ref.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {ref.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(ref.fileUrl, '_blank')}
                    data-testid={`button-view-${ref.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(ref.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${ref.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Create Collaborator Form Component
function CreateCollaboratorForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    email: '',
    phone: '',
    address: '',
    cnpj: '',
    cnes: '',
    specialization: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-collaborator-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger data-testid="select-collaborator-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
              <SelectItem value="laboratory">Laboratory</SelectItem>
              <SelectItem value="hospital">Hospital</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            data-testid="input-collaborator-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            data-testid="input-collaborator-phone"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          data-testid="input-collaborator-address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            placeholder="XX.XXX.XXX/XXXX-XX"
            required
            data-testid="input-collaborator-cnpj"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnes">CNES</Label>
          <Input
            id="cnes"
            value={formData.cnes}
            onChange={(e) => setFormData({ ...formData, cnes: e.target.value })}
            placeholder="XXXXXXX"
            required
            data-testid="input-collaborator-cnes"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading} data-testid="button-submit-collaborator">
          {isLoading ? 'Creating...' : 'Create Collaborator'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Create API Key Form Component
function CreateApiKeyForm({ 
  collaborators, 
  onSubmit, 
  isLoading 
}: { 
  collaborators: Collaborator[]; 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
    collaboratorId: '',
    keyName: '',
    permissions: [] as string[],
    ipWhitelist: [] as string[],
    rateLimit: 1000,
    expiresAt: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="collaborator">Collaborator</Label>
        <Select 
          value={formData.collaboratorId} 
          onValueChange={(value) => setFormData({ ...formData, collaboratorId: value })}
        >
          <SelectTrigger data-testid="select-api-key-collaborator">
            <SelectValue placeholder="Select collaborator" />
          </SelectTrigger>
          <SelectContent>
            {collaborators.map((collaborator: Collaborator) => (
              <SelectItem key={collaborator.id} value={collaborator.id}>
                {collaborator.name} ({collaborator.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keyName">Key Name</Label>
        <Input
          id="keyName"
          value={formData.keyName}
          onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
          placeholder="Production API Key"
          required
          data-testid="input-api-key-name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rateLimit">Rate Limit (per hour)</Label>
          <Input
            id="rateLimit"
            type="number"
            value={formData.rateLimit}
            onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
            min="1"
            data-testid="input-api-key-rate-limit"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            data-testid="input-api-key-expiration"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading} data-testid="button-submit-api-key">
          {isLoading ? 'Generating...' : 'Generate API Key'}
        </Button>
      </DialogFooter>
    </form>
  );
}