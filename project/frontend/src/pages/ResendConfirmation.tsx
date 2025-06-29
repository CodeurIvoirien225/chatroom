import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResendConfirmation = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Ajout important
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Validation plus robuste de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Veuillez entrer une adresse email valide');
      }

      // Utilisation de signInWithOtp comme alternative plus fiable
      const { error: supabaseError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm`,
          shouldCreateUser: false // Important pour ne pas créer de nouvel utilisateur
        }
      });

      if (supabaseError) throw supabaseError;

      setMessage('Email envoyé! Vérifiez votre boîte de réception et vos spams');
      setTimeout(() => navigate('/chat'), 5000);
    } catch (err) {
      console.error("Erreur d'envoi:", err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-500 via-indigo-600 to-blue-700">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Renvoyer l'email de confirmation</h2>
        
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
            <p className="mt-2 text-sm">Si vous ne voyez pas l'email, vérifiez votre dossier spam.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleResend} noValidate> {/* noValidate désactive la validation native */}
          <div className="mb-4">
            <label htmlFor="confirmation-email" className="block text-gray-700 text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="confirmation-email"
              type="email"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Votre email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            disabled={loading}
            aria-label="Renvoyer l'email de confirmation"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              </span>
            ) : (
              "Renvoyer l'email"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/chat')}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium focus:outline-none"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResendConfirmation;