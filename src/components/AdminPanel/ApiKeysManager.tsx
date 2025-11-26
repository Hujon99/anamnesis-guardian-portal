/**
 * API Keys Manager Component
 * 
 * This component allows organization admins to manage API keys for external
 * system integration (e.g., ServeIT). Admins can create, view, and deactivate
 * API keys for their organization.
 * 
 * Features:
 * - Create new API keys (production or sandbox)
 * - View existing keys (masked secret)
 * - Deactivate keys
 * - View last usage timestamp
 * 
 * Uses Clerk for organization context and authenticated Supabase client for RLS.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Copy, Trash2, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  environment: 'production' | 'sandbox';
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface NewApiKeyResponse {
  apiKey: string;
  secret: string;
}

export function ApiKeysManager() {
  const queryClient = useQueryClient();
  const { organization } = useSafeOrganization();
  const { supabase, isLoading: isSupabaseLoading, isReady } = useSupabaseClient();
  
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('production');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewApiKeyResponse | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Fetch API keys - only when supabase client is ready
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys', organization?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: isReady && !!organization?.id
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async ({ name, env }: { name: string; env: 'production' | 'sandbox' }) => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!organization?.id) throw new Error('Organization ID not found');

      // Generate random API key and secret
      const prefix = env === 'production' ? 'anp_live_' : 'anp_test_';
      const randomKey = prefix + crypto.randomUUID().replace(/-/g, '');
      const secret = 'sec_' + crypto.randomUUID().replace(/-/g, '');
      
      // Hash the secret (in production, use bcrypt on backend)
      // For now, we'll store a simple hash - THIS SHOULD BE DONE IN AN EDGE FUNCTION
      const encoder = new TextEncoder();
      const data = encoder.encode(secret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: result, error } = await supabase
        .from('api_keys')
        .insert({
          organization_id: organization.id,
          key_name: name,
          api_key: randomKey,
          api_secret_hash: hashHex,
          environment: env,
          permissions: ['read', 'write']
        })
        .select()
        .single();

      if (error) throw error;

      return { apiKey: randomKey, secret, data: result };
    },
    onSuccess: ({ apiKey, secret }) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewlyCreatedKey({ apiKey, secret });
      setKeyName("");
      toast.success("API-nyckel skapad!");
    },
    onError: (error) => {
      toast.error("Kunde inte skapa API-nyckel: " + error.message);
    }
  });

  // Deactivate key mutation
  const deactivateKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (!supabase) throw new Error('Supabase client not ready');
      
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success("API-nyckel inaktiverad");
    },
    onError: (error) => {
      toast.error("Kunde inte inaktivera nyckel: " + error.message);
    }
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopierad!`);
  };

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast.error("Ange ett namn för API-nyckeln");
      return;
    }
    createKeyMutation.mutate({ name: keyName, env: environment });
  };

  // Show loading state while Supabase client or organization is loading
  if (isSupabaseLoading || !organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Laddar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new API key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Skapa ny API-nyckel
          </CardTitle>
          <CardDescription>
            Skapa API-nycklar för att integrera externa system som ServeIT med Anamnesportalen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Nyckelnamn</Label>
              <Input
                id="key-name"
                placeholder="t.ex. ServeIT Production"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Endast för din egen identifiering. Hjälper dig hålla koll på vilken integration nyckeln används för.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="environment">Miljö</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as 'production' | 'sandbox')}>
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sandbox-nycklar kan användas för tester utan att påverka produktionsdata.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleCreateKey}
            disabled={createKeyMutation.isPending || !isReady}
          >
            {createKeyMutation.isPending ? "Skapar..." : "Skapa API-nyckel"}
          </Button>
        </CardContent>
      </Card>

      {/* Show newly created key */}
      {newlyCreatedKey && (
        <Alert className="border-accent-1">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p className="font-semibold">API-nyckel skapad! Spara dessa uppgifter säkert - secret visas bara en gång:</p>
            <div className="space-y-4 font-mono text-sm bg-muted p-3 rounded">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans font-medium">API Key:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newlyCreatedKey.apiKey, "API Key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all">{newlyCreatedKey.apiKey}</p>
                <p className="text-xs text-muted-foreground font-sans mt-1">
                  Skickas i headern <code className="bg-background px-1 py-0.5 rounded">X-API-Key</code> vid varje API-anrop.
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans font-medium">Secret:</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(newlyCreatedKey.secret, "Secret")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="break-all">
                  {showSecret ? newlyCreatedKey.secret : '•'.repeat(40)}
                </p>
                <p className="text-xs text-muted-foreground font-sans mt-1">
                  Skickas i headern <code className="bg-background px-1 py-0.5 rounded">X-API-Secret</code> tillsammans med API Key för autentisering.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewlyCreatedKey(null)}
            >
              Jag har sparat uppgifterna
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* List existing keys */}
      <Card>
        <CardHeader>
          <CardTitle>Befintliga API-nycklar</CardTitle>
          <CardDescription>
            Hantera dina aktiva API-nycklar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Laddar...</p>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <p className="text-muted-foreground">Inga API-nycklar ännu</p>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{key.key_name}</p>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                      <Badge variant={key.environment === 'production' ? "default" : "outline"}>
                        {key.environment}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {key.api_key.substring(0, 20)}...
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Skapad: {format(new Date(key.created_at), "PP", { locale: sv })}
                      </span>
                      {key.last_used_at && (
                        <span>
                          Senast använd: {format(new Date(key.last_used_at), "PP 'kl' HH:mm", { locale: sv })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key.api_key, "API Key")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {key.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivateKeyMutation.mutate(key.id)}
                        disabled={deactivateKeyMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation hint */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Så använder du API-nycklarna</p>
          <div className="text-sm space-y-2">
            <p>Vid varje API-anrop behöver du skicka båda headers:</p>
            <div className="bg-muted p-2 rounded font-mono text-xs space-y-1">
              <p><span className="text-muted-foreground">X-API-Key:</span> din_api_nyckel</p>
              <p><span className="text-muted-foreground">X-API-Secret:</span> din_secret</p>
            </div>
            <p className="text-muted-foreground">
              <strong>API Key</strong> identifierar din organisation. <strong>Secret</strong> verifierar att anropet verkligen kommer från dig. 
              Båda krävs för att autentisera ett API-anrop.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
