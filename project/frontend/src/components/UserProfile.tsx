import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

import {
  MapPin, Calendar, Heart, Users, Coffee, Mail, Shield, Music, Dumbbell, Book, Film, Plane, Palette, Gamepad, Utensils
} from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  location: string | null;
  interests: string[];
  avatar_url: string | null;
  isBlockedByCurrentUser: boolean; // Ajouté
  hasBlockedCurrentUser: boolean; // Ajouté
}

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth(); // Utilisateur actuellement connecté
  const navigate = useNavigate();
  const [reportReason, setReportReason] = useState('');
const [showReportModal, setShowReportModal] = useState(false);
const [reportSuccess, setReportSuccess] = useState(false);

  const API_BASE_URL = 'http://localhost:3001';


  // Fonction pour récupérer le profil (mise à jour pour inclure currentUser.id)
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      // Envoyer l'ID de l'utilisateur connecté dans les paramètres de la requête
      // REMPLACEZ 'currentUser.id' par la façon dont vous récupérez l'ID de l'utilisateur authentifié
      // Si vous utilisez JWT et un middleware, cet ID est récupéré côté serveur et n'est pas nécessaire ici en query param.
      // Pour la démonstration, je l'envoie en query param :
      const response = await fetch(`${API_BASE_URL}/profile/${userId}?current_user_id=${currentUser?.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setProfile(null);
          console.warn(`Profil utilisateur ${userId} non trouvé.`);
          return;
        }
        throw new Error(`Erreur HTTP! Statut: ${response.status}`);
      }

      const data: Profile = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Erreur lors de la récupération du profil :', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id]); // Dépendance à currentUser.id pour recharger si l'utilisateur change

  useEffect(() => {
    if (userId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [userId, fetchProfile]); // fetchProfile est maintenant une dépendance stable grâce à useCallback

  // Nouvelle fonction pour gérer le blocage/déblocage
  const handleBlockToggle = async () => {
    if (!profile?.id) {
      console.error("Impossible de bloquer/débloquer l'utilisateur : ID du profil manquant.");
      return;
    }
    if (!currentUser) {
      alert("Vous devez être connecté pour effectuer cette action.");
      navigate('/login');
      return;
    }
    if (currentUser.id.toString() === profile.id) {
      alert("Vous ne pouvez pas bloquer/débloquer votre propre profil !");
      return;
    }

    const action = profile.isBlockedByCurrentUser ? "débloquer" : "bloquer";
    const endpoint = profile.isBlockedByCurrentUser ? 'unblock-user' : 'block-user';
    const confirmMessage = `Êtes-vous sûr de vouloir ${action} ${profile.first_name || profile.username} ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${yourAuthToken}`, // IMPORTANT: Incluez votre token ici
        },
        body: JSON.stringify({
          blocker_id: currentUser.id,
          blocked_id: profile.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Échec de l'action de ${action}.`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
        } catch (e) {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      alert(`${profile.first_name || profile.username} a été ${action === 'bloquer' ? 'bloqué' : 'débloqué'} avec succès.`);
      // Après l'action, rafraîchir le profil pour mettre à jour l'état du bouton
      fetchProfile();

    } catch (error: any) {
      console.error(`Erreur lors du ${action} de l'utilisateur :`, error);
      alert(`Erreur: Impossible de ${action} l'utilisateur. ${error.message || 'Veuillez réessayer.'}`);
    }
  };


  const handleReportUser = async () => {
    if (!currentUser || !profile) return;
  
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Pour un signalement de profil plutôt que de message, on peut mettre null pour message_id
          message_id: null,
          reported_by: currentUser.id,
          reason: reportReason,
          // Ajoutez l'ID de l'utilisateur signalé si votre backend le supporte
          reported_user_id: profile.id
        }),
      });
  
      if (!response.ok) {
        throw new Error('Échec du signalement');
      }
  
      setReportSuccess(true);
      setReportReason('');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      alert('Une erreur est survenue lors du signalement');
    }
  };


  const handleMessageClick = () => {
    if (profile?.id) {
      navigate(`/private-messages/${profile.id}`);
    } else {
      console.error("Erreur de navigation: profile.id est manquant ou invalide.");
    }
  };

  // Icônes des centres d'intérêt (pas de changement ici)
  const getInterestIcon = (interest: string) => {
    switch (interest.toLowerCase()) {
      case 'lecture': return <Book className="w-4 h-4" />;
      case 'musique': return <Music className="w-4 h-4" />;
      case 'sport': return <Dumbbell className="w-4 h-4" />;
      case 'films': return <Film className="w-4 h-4" />;
      case 'voyage': return <Plane className="w-4 h-4" />;
      case 'art': return <Palette className="w-4 h-4" />;
      case 'jeux vidéo': return <Gamepad className="w-4 h-4" />;
      case 'cuisine': return <Utensils className="w-4 h-4" />;
      case 'café': return <Coffee className="w-4 h-4" />;
      case 'rencontres': return <Heart className="w-4 h-4" />;
      // Ajoutez d'autres icônes selon vos intérêts
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100 items-center justify-center">
        <p className="text-xl text-gray-700">Chargement du profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen bg-gray-100 items-center justify-center flex-col">
        <p className="text-xl text-gray-700 mb-4">Profil non trouvé.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-500 text-white rounded">Retour à l'accueil</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 sm:p-8 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
                  <p className="text-blue-100">@{profile.username}</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white bg-opacity-20 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-300 mr-2"></span>
                    En ligne
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 sm:p-8">
              <div className="md:col-span-1">
                <div className="flex flex-col items-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden shadow-lg mb-4">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username || 'Avatar Utilisateur'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-white">
                        {profile.first_name?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>

                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">{profile.first_name} {profile.last_name}</h2>
                    <p className="text-gray-500">@{profile.username}</p>
                  </div>

                  <div className="w-full space-y-4 mb-6">
                    {profile.age !== null && profile.age !== undefined && (
                      <div className="flex items-center text-gray-700">
                        <Calendar className="w-5 h-5 text-blue-500 mr-3" />
                        <span>{profile.age} ans</span>
                      </div>
                    )}

                    {profile.gender && (
                      <div className="flex items-center text-gray-700">
                        <Users className="w-5 h-5 text-blue-500 mr-3" />
                        <span>{profile.gender}</span>
                      </div>
                    )}

                    {profile.location && (
                      <div className="flex items-center text-gray-700">
                        <MapPin className="w-5 h-5 text-blue-500 mr-3" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-3">
                    <button
                      onClick={handleMessageClick}
                      className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                      // Désactiver si l'utilisateur actuel est bloqué par le profil visualisé
                      disabled={profile.hasBlockedCurrentUser}
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      {profile.hasBlockedCurrentUser ? "Impossible d'envoyer de message (Vous avez été bloqué)" : "Envoyer un message"}
                    </button>

              
{currentUser && currentUser.id.toString() !== profile.id && (
  <>
    <button
      onClick={handleBlockToggle}
      className={`w-full flex items-center justify-center border py-2 px-4 rounded-lg transition-colors
                  ${profile.isBlockedByCurrentUser
                      ? 'border-red-400 text-red-600 hover:bg-red-50'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
    >
      <Shield className="w-5 h-5 mr-2" />
      {profile.isBlockedByCurrentUser ? "Débloquer l'utilisateur" : "Bloquer l'utilisateur"}
    </button>
    
    <button
      onClick={() => setShowReportModal(true)}
      className="w-full flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Signaler ce profil
    </button>
  </>
)}


                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-8">
                {profile.bio && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">À propos</h3>
                    <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Centres d'intérêt</h3>
                    <div className="flex flex-wrap gap-3">
                      {profile.interests.map((interest, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-white border border-gray-200 hover:border-blue-300 px-4 py-2 rounded-full text-sm shadow-sm transition-all"
                        >
                          {getInterestIcon(interest)}
                          <span className="ml-2 text-gray-700">{interest}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReportModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-4">Signaler ce profil</h3>
      
      {reportSuccess ? (
        <div className="text-green-600 mb-4">Merci pour votre signalement.</div>
      ) : (
        <>
          <p className="text-gray-600 mb-4">Veuillez indiquer la raison de votre signalement :</p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full border border-gray-300 rounded p-3 mb-4"
            rows={4}
            placeholder="Pourquoi signalez-vous ce profil ?"
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleReportUser}
              disabled={!reportReason.trim()}
              className={`px-4 py-2 rounded text-white ${!reportReason.trim() ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}
            >
              Envoyer le signalement
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}

    </div>
  );
};

export default UserProfile;