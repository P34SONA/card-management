import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

export function Auth({ onSessionChange }: { onSessionChange: (user: User | null) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        toast.success('Registration successful! Please check your email or log in.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-zinc-800/50 bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="space-y-1 pt-12 pb-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-xl font-bold tracking-tight text-white uppercase whitespace-nowrap">
              Financial <span className="text-indigo-400">Monitoring</span> System
            </span>
          </div>
          <CardTitle className="text-3xl font-black flex items-center justify-center gap-3 text-white tracking-tight">
            {isLogin ? 'Sign In' : 'Join Us'}
          </CardTitle>
          <CardDescription className="text-center text-zinc-400 font-medium">
            {isLogin ? 'Welcome back to your financial control center' : 'Complete control over your registry starts here'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 px-8">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-950/50 border-zinc-800 text-white rounded-2xl h-12 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest ml-1">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-950/50 border-zinc-800 text-white rounded-2xl h-12 focus:ring-indigo-500/20"
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-12 font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-[#18181b] px-3 text-zinc-500">Or integrate with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            type="button" 
            className="w-full bg-[#1c1c1f] hover:bg-zinc-800 border border-zinc-800 text-white rounded-2xl h-12 font-bold text-sm transition-all active:scale-[0.98] shadow-sm" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="bg-zinc-950/50 border-t border-zinc-800 py-6">
          <p className="text-xs text-center text-zinc-500 w-full font-medium">
            {isLogin ? "New to the system?" : "Already an operator?"}{' '}
            <button
              type="button"
              className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold transition-colors ml-1"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Register now' : 'Sign in here'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
