/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthCallbackProps {
  onAuthComplete: () => void;
}

export default function AuthCallback({ onAuthComplete }: AuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('E-Mail wird bestätigt...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'signup' && accessToken) {
          // Handle email confirmation
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            throw error;
          }

          if (data.session) {
            setStatus('success');
            setMessage('E-Mail erfolgreich bestätigt! Sie können sich jetzt einloggen.');
            
            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname);
            
            setTimeout(() => {
              onAuthComplete();
            }, 2000);
          }
        } else if (type === 'recovery') {
          setStatus('success');
          setMessage('Passwort-Reset-Link ist gültig. Sie können Ihr Passwort jetzt zurücksetzen.');
        } else {
          // Check if there's already a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus('success');
            setMessage('Bereits eingeloggt!');
            setTimeout(() => {
              onAuthComplete();
            }, 1500);
          } else {
            setStatus('error');
            setMessage('Ungültiger oder abgelaufener Bestätigungslink.');
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Ein Fehler ist bei der Bestätigung aufgetreten.');
      }
    };

    handleAuthCallback();
  }, [onAuthComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl text-center"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
            <h3 className="text-lg font-black text-gray-900">E-Mail Bestätigung</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-black text-gray-900">Erfolgreich!</h3>
            <p className="text-sm text-gray-600">{message}</p>
            <button
              onClick={onAuthComplete}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-black text-white hover:bg-orange-600 transition-all cursor-pointer"
            >
              Zum Shop
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-black text-gray-900">Fehler</h3>
            <p className="text-sm text-gray-600">{message}</p>
            <button
              onClick={onAuthComplete}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-black text-white hover:bg-gray-800 transition-all cursor-pointer"
            >
              Zum Shop
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
