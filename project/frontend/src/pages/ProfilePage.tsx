import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Camera, LogOut } from 'lucide-react';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar'; // Import du Sidebar


const API_BASE_URL = 'http://localhost:3001';


interface ProfileData {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string[];
  location: string | null;
  avatar_url: string | null;
}

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: user?.id || 0,
    username: '',
    first_name: '',
    last_name: '',
    age: 18,
    gender: '',
    bio: '',
    interests: [],
    location: null,
    avatar_url: null,
  });
  const [newInterest, setNewInterest] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        age: user.age || 18,
        gender: user.gender || '',
        bio: user.bio || '',
        interests: user.interests || [],
        location: user.location || '',
        avatar_url: user.avatar_url || null,
      });
    }
    setLoading(false);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!profile.username.trim()) {
      toast.error("Le nom d'utilisateur est obligatoire");
      return;
    }
    if (!user) {
      toast.error('Session invalide - Veuillez vous reconnecter');
      return;
    }
    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/profile/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      toast.success('Profil mis à jour avec succès !');
      setUser({ ...user, ...profile });
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const response = await fetch(`${API_BASE_URL}/profile/${user?.id}/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: base64 }),
        });

        if (!response.ok) throw new Error("Erreur sauvegarde avatar");

        const data = await response.json();
        setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
        setUser(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
        toast.success('Avatar mis à jour !');
      } catch (error) {
        toast.error('Erreur lors de la mise à jour de l’avatar');
      }
    };

    reader.readAsDataURL(file);
  };

  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    setProfile(prev => ({
      ...prev,
      interests: [...prev.interests, newInterest.trim()],
    }));
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest),
    }));
  };

  const handleLogout = () => {
    setUser(null);
    toast.success('Déconnexion réussie');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      {/* Nouvelle structure pour la sidebar et le contenu principal */}
      <div className="flex min-h-[calc(100vh-64px)]"> {/* Assurez-vous que la hauteur s'adapte au contenu après la NavBar */}
        <Sidebar />
        <div className="flex-1 overflow-auto p-4"> {/* flex-1 permet de prendre l'espace restant, overflow-auto pour le défilement si nécessaire */}
          <div className="container mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Mon Profile</h1>
                <button onClick={handleLogout} className="flex items-center text-red-600 hover:text-red-800">
                  <LogOut className="h-6 w-5 mr-1" />
                  <span>Déconnexion</span>
                </button>
              </div>

              <div className="mb-6 flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl text-gray-400">{profile.first_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1 rounded-full shadow-md cursor-pointer">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" disabled={saving} />
                  </label>
                </div>
                <h2 className="text-xl font-semibold">{profile.username}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Prénom</label>
                  <input type="text" value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Nom de famille</label>
                  <input type="text" value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email</label>
                  <input type="email" value={user?.email || ''} readOnly className="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed" />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Nom d'utilisateur</label>
                  <input type="text" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Age</label>
                  <input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })} min="18" className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Genre</label>
                  <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Sélectionnez le sexe</option>
                    <option value="Mâle">Mâle</option>
                    <option value="Femelle">Femelle</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Emplacement (facultatif)</label>
                  <input type="text" value={profile.location || ''} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="Ville..." className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-gray-700 font-medium mb-2">Bio</label>
                <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} placeholder="Parler aux autres de vous-mêmes..." className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>

              <div className="mt-6">
                <label className="block text-gray-700 font-medium mb-2">Intérêts</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.interests.map((interest, index) => (
                    <div key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center">
                      {interest}
                      <button className="ml-2 text-indigo-600 hover:text-indigo-800" onClick={() => handleRemoveInterest(interest)}>
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input type="text" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="Ajouter un nouvel intérêt" className="flex-grow p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())} />
                  <button type="button" onClick={handleAddInterest} className="bg-indigo-600 text-white px-4 rounded-r hover:bg-indigo-700">
                    Ajouter
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <button onClick={handleSaveProfile} disabled={saving} className="flex items-center justify-center w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300">
                  {saving ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Enregistrer le profil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;