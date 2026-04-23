import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      // If the provider is not enabled, show a more helpful message
      if (error.message.includes('provider is not enabled')) {
        toast.error('Google Sign-in is not enabled in Supabase yet. Please enable it in your dashboard.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505] px-4 relative overflow-hidden">
      {/* Liquid Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, -30, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, -40, 0],
          y: [0, 60, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[10%] -right-[10%] w-[450px] h-[450px] bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" 
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-white/10 bg-white/[0.03] backdrop-blur-[32px] rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <CardHeader className="space-y-2 pt-12 pb-6 px-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <span className="text-sm font-bold tracking-[0.2em] text-white/40 uppercase">
                Financial <span className="text-white/80">Monitoring</span> System
              </span>
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'signin' : 'signup'}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-4xl font-bold text-center text-white tracking-tight">
                  {isLogin ? 'Sign In' : 'Join Us'}
                </CardTitle>
                <CardDescription className="text-center text-white/40 font-medium mt-2">
                  {isLogin ? 'Access your financial control center' : 'Start your journey with us today'}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <CardContent className="space-y-8 pb-10 px-10">
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase font-bold text-white/30 tracking-[0.15em] ml-1">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/5 text-white rounded-2xl h-14 px-5 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" title="password" className="text-[10px] uppercase font-bold text-white/30 tracking-[0.15em] ml-1">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/5 text-white rounded-2xl h-14 px-5 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-white/90 rounded-2xl h-14 font-bold text-sm transition-all active:scale-[0.97] shadow-xl"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'CONTINUE' : 'REGISTER')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-[0.2em]">
                <span className="bg-[#0c0c0c] px-4 text-white/20">Secure OAuth</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              type="button" 
              className="w-full bg-white/[0.05] hover:bg-white/[0.08] border-white/5 text-white rounded-2xl h-14 font-bold text-sm transition-all active:scale-[0.97]" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Google
            </Button>
          </CardContent>

          <CardFooter className="bg-white/[0.02] border-t border-white/5 py-8 justify-center">
            <p className="text-[11px] text-white/30 font-medium tracking-wide">
              {isLogin ? "New user?" : "Existing operator?"}{' '}
              <button
                type="button"
                className="text-white hover:text-white/80 transition-colors ml-1 font-bold underline underline-offset-4 decoration-white/20"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Register account' : 'Sign in here'}
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
