// 📁 pages/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      return setError('Les mots de passe ne correspondent pas.');
    }

    try {
      const response = await fetch(`http://localhost:3001/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Erreur de réinitialisation.');

      setSuccess('Mot de passe réinitialisé. Redirection...');
      setTimeout(() => navigate('/auth'), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Réinitialiser le mot de passe</h2>

        {success && <p className="text-green-600 mb-2">{success}</p>}
        {error && <p className="text-red-600 mb-2">{error}</p>}

        <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />

        <label className="block text-sm font-medium mb-1">Confirmer le mot de passe</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Réinitialiser
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
