
"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LogIn, KeyRound, AlertTriangle, Smartphone, Cookie, History, SendHorizonal, Loader2 } from 'lucide-react';

const DEFAULT_APP_ID = "f6263f80-2242-428d-acd4-10e1feec44ee";
const API_BASE_URL = "https://api.shapes.inc/v1";
const AUTH_BASE_URL = "https://api.shapes.inc/auth";
const SITE_BASE_URL = "https://shapes.inc";
const DEFAULT_MODEL = "shapesinc/shaperobot";

type AuthStep = 'initial' | 'awaitingCode' | 'tokenReady';

export default function ShapesAuthForm() {
  const [appId, setAppId] = useState(DEFAULT_APP_ID);
  const [oneTimeCode, setOneTimeCode] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [messageToSend, setMessageToSend] = useState('');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const envAppId = process.env.NEXT_PUBLIC_SHAPESINC_APP_ID;
    if (envAppId) {
      setAppId(envAppId);
    }
  }, []);

  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && authStep !== 'tokenReady' && !isLoading) {
      setOneTimeCode(codeFromUrl);
      setAuthStep('awaitingCode');
      toast({
        title: "Code Retrieved",
        description: "One-time code auto-filled. Please submit.",
      });
      // Clean the URL by removing the 'code' query parameter.
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('code');
      const newUrl = `${pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, authStep, isLoading, router, pathname, toast, setOneTimeCode, setAuthStep]);

  const handleLoginClick = () => {
    setError(null);
    const redirectUri = `${window.location.origin}${pathname}`;
    const authorizeUrl = `${SITE_BASE_URL}/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authorizeUrl;
    setAuthStep('awaitingCode');
    toast({
        title: "Redirecting to Shapes Inc.",
        description: "Please login and authorize. You will be redirected back to complete the process.",
    });
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, code: oneTimeCode }),
      });
      const data = await response.json();
      if (response.ok && data.auth_token) {
        setAuthToken(data.auth_token);
        setAuthStep('tokenReady');
        setOneTimeCode('');
        toast({ title: "Success!", description: "Auth token received." });
      } else {
        setError(data.message || 'Failed to exchange code for token. Ensure the code is correct and not expired.');
        toast({ variant: "destructive", title: "Error", description: data.message || 'Token exchange failed.' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during token exchange.';
      setError(errorMessage);
      toast({ variant: "destructive", title: "Network Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setError("Auth token is not available.");
      toast({ variant: "destructive", title: "Error", description: "Auth token is missing." });
      return;
    }
    setError(null);
    setApiResponse(null);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-ID': appId,
          'X-User-Auth': authToken,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [{ role: 'user', content: messageToSend }],
        }),
      });
      const data = await response.json();
      if (response.ok && data.choices && data.choices.length > 0) {
        setApiResponse(data.choices[0].message.content);
        setMessageToSend('');
        toast({ title: "Message Sent", description: "Response received." });
      } else {
        const errorMsg = data.message || (data.error?.message) || 'Failed to send message or no response content.';
        setError(errorMsg);
        toast({ variant: "destructive", title: "API Error", description: errorMsg });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while sending the message.';
      setError(errorMessage);
      toast({ variant: "destructive", title: "Network Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const storeToken = (storageType: 'localStorage' | 'cookie') => {
    if (!authToken) return;
    if (storageType === 'localStorage') {
      localStorage.setItem('shapesAuthToken', authToken);
      toast({ title: "Token Stored", description: "Auth token saved to Local Storage." });
    } else {
      document.cookie = `shapesAuthToken=${authToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`; // 7 days
      toast({ title: "Token Stored", description: "Auth token saved as a cookie." });
    }
  };

  const loadToken = () => {
    setError(null);
    let loadedToken = localStorage.getItem('shapesAuthToken');
    let source = "Local Storage";

    if (!loadedToken) {
      loadedToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('shapesAuthToken='))
        ?.split('=')[1] || null;
      source = "Cookie";
    }

    if (loadedToken) {
      setAuthToken(loadedToken);
      setAuthStep('tokenReady');
      toast({ title: "Token Loaded", description: `Auth token loaded from ${source}.` });
    } else {
      toast({ variant: "destructive", title: "Not Found", description: "No token found in Local Storage or Cookies." });
    }
  };
  
  const resetState = () => {
    setOneTimeCode('');
    setAuthToken(null);
    setMessageToSend('');
    setApiResponse(null);
    setAuthStep('initial');
    setIsLoading(false);
    setError(null);
    localStorage.removeItem('shapesAuthToken');
    document.cookie = 'shapesAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
    toast({ title: "State Reset", description: "Application state and stored tokens have been cleared."});
  };


  return (
    <Card className="w-full max-w-lg shadow-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">ShapesAuth</CardTitle>
        <CardDescription className="text-center">Authenticate with Shapes Inc. to use their API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {authStep === 'initial' && (
          <div className="space-y-4">
            <Button onClick={handleLoginClick} className="w-full transition-transform duration-150 ease-in-out hover:scale-105" disabled={isLoading} aria-label="Login with Shapes Inc.">
              <LogIn className="mr-2 h-5 w-5" /> Login with Shapes Inc.
            </Button>
            <Button onClick={loadToken} variant="outline" className="w-full" disabled={isLoading} aria-label="Load token from storage">
              <History className="mr-2 h-5 w-5" /> Load Token from Storage
            </Button>
          </div>
        )}

        {authStep === 'awaitingCode' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="oneTimeCode" className="text-sm font-medium">One-Time Code</label>
              <div className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="oneTimeCode"
                  type="text"
                  placeholder="Paste your one-time code here"
                  value={oneTimeCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setOneTimeCode(e.target.value)}
                  required
                  className="flex-grow"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                After logging in and authorizing on Shapes Inc., paste the provided code. If you were redirected, the code should be auto-filled.
              </p>
            </div>
            <Button type="submit" className="w-full transition-transform duration-150 ease-in-out hover:scale-105" disabled={isLoading || !oneTimeCode}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <KeyRound className="mr-2 h-5 w-5" />}
              Submit Code
            </Button>
            <Button onClick={() => setAuthStep('initial')} variant="outline" className="w-full" disabled={isLoading}>
              Cancel
            </Button>
          </form>
        )}

        {authStep === 'tokenReady' && authToken && (
          <div className="space-y-6">
            <Alert variant="default" className="bg-primary/10 border-primary/30">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Auth Token Acquired</AlertTitle>
              <AlertDescription className="break-all text-xs font-mono p-2 bg-muted rounded my-2 overflow-x-auto">
                {authToken}
              </AlertDescription>
              <p className="text-xs text-primary/80">
                <strong>Disclaimer:</strong> For demonstration purposes only. Do not display or store auth tokens like this in a production environment. Securely manage tokens (e.g., server-side or HttpOnly cookies).
              </p>
            </Alert>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={() => storeToken('localStorage')} variant="outline" className="w-full" aria-label="Store token in Local Storage">
                <Smartphone className="mr-2 h-5 w-5" /> Store in Local Storage
              </Button>
              <Button onClick={() => storeToken('cookie')} variant="outline" className="w-full" aria-label="Store token as Cookie">
                <Cookie className="mr-2 h-5 w-5" /> Store as Cookie
              </Button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="messageToSend" className="text-sm font-medium">Send a Message via Shapes API</label>
                <Textarea
                  id="messageToSend"
                  placeholder="Type your message here..."
                  value={messageToSend}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessageToSend(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full transition-transform duration-150 ease-in-out hover:scale-105" disabled={isLoading || !messageToSend}>
                {isLoading && !apiResponse ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <SendHorizonal className="mr-2 h-5 w-5" />}
                Send Message
              </Button>
            </form>

            {apiResponse && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">API Response:</h3>
                <Card className="bg-muted/50 p-4">
                  <CardContent className="p-0">
                    <p className="text-sm whitespace-pre-wrap">{apiResponse}</p>
                  </CardContent>
                </Card>
              </div>
            )}
             <Button onClick={resetState} variant="destructive" className="w-full mt-4" disabled={isLoading}>
                Reset and Clear Token
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
         <p className="text-xs text-muted-foreground">App ID: {appId}</p>
      </CardFooter>
    </Card>
  );
}

    