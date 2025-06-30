import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const navigate = useNavigate();
  const [success, setSuccess] = useState('');



  const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      const response = await fetch(`${API_BASE_URL}/login` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          secret: loginPassword
        })
      });
  
      const result = await response.json();
      console.log('Statut HTTP:', response.status);
      console.log('Réponse du backend :', result);
  
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la connexion.');
      }
  
      if (!result.token || !result.user) {
        throw new Error('Réponse invalide : token ou utilisateur manquant.');
      }
  
      // --- AJOUT CLÉ ICI ---
      // Vérifie que result.user contient bien l'ID de l'utilisateur.
      // D'après ta console log "Réponse du backend :", tu devrais voir la structure de 'result'.
      // Si result.user est un objet comme { id: 123, username: "..." }, alors 'result.user.id' est correct.
      const loggedInUserId = result.user.id; // Assure-toi que 'id' est bien la clé pour l'ID de l'utilisateur
  
      if (loggedInUserId) {
        localStorage.setItem('userId', String(loggedInUserId)); // Stocke l'ID utilisateur
        console.log("ID utilisateur stocké dans localStorage:", loggedInUserId);
      } else {
        console.warn("L'ID utilisateur n'a pas été trouvé dans la réponse 'result.user'.");
      }
      // --- FIN DE L'AJOUT CLÉ ---
  
      localStorage.setItem('token', result.token);
      setUser(result.user);
      navigate('/chat');
  
    } catch (error) {
      console.error('Erreur de connexion :', error);
      setError(error instanceof Error ? error.message : 'Connexion échouée');
    } finally {
      setLoading(false);
      setLoginEmail('');
      setLoginPassword('');
    }
  };
  

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          secret: password,
          email,
          first_name: firstName,
          last_name: lastName,
          age,
          gender
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Échec de l'inscription.");
      }

      setSuccess('Inscription réussie. Connectez-vous maintenant.');
      setError(''); // Pour effacer d’éventuelles erreurs précédentes

      setActiveTab('login');
    } catch (error) {
      setError(error instanceof Error ? error.message : "Échec de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-500 via-indigo-600 to-blue-700">
   <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
  <button
    onClick={() => navigate('/')}
    className="absolute top-4 left-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
  >
    ← Accueil
  </button>

  <div className="flex justify-center mb-6">
    <div className="bg-indigo-600 p-3 rounded-full">
      <MessageSquare className="text-white h-8 w-8" />
    </div>
  </div>

  <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Chat Room</h1>
        <p className="text-center text-gray-600 mb-6">Connectez-vous avec des personnes qui partagent vos intérêts</p>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 text-center font-medium ${activeTab === 'login'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500'}`}
            onClick={() => setActiveTab('login')}
          >
            Se connecter
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium ${activeTab === 'signup'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500'}`}
            onClick={() => setActiveTab('signup')}
          >
            S'inscrire
          </button>
        </div>

        {success && (
  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
    {success}
  </div>
)}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Votre email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-1">Mot de passe</label>
              <input
                type="password"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Votre mot de passe"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <div className="mt-4 text-center">
  <button 
    type="button"
    onClick={() => navigate('/forgot-password')}
    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
  >
    Mot de passe oublié ?
  </button>
</div>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="grid grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">Prénom</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">Nom de famille</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nom de famille"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Choisissez un nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">Age</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Votre age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min="18"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">Genre</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">Sélectionnez le sexe</option>
                  <option value="male">Mâle</option>
                  <option value="female">Femelle</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-1">Mot de passe</label>
              <input
                type="password"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Choisissez un mot de passe fort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              {loading ? "Création d'un compte..." : "S'inscrire"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
