import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path, { dirname } from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'koneelabass1@gmail.com',
    pass: 'gska fuqu amht ypvz',
  },
  tls: {
    rejectUnauthorized: false
  }
});


const JWT_RESET_SECRET = process.env.JWT_SECRET || 'reset_secret';

// Configuration de base
const API_BASE_URL = 'https://chatroom-backend-e1n0.onrender.com';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const app = express();


const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://chatroom-6uv8.onrender.com'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  maxAge: 86400,
  exposedHeaders: ['Authorization'] // Important pour les tokens
};

app.use(cors(corsOptions));




// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 📁 Gestion du dossier uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));


const authenticate = async (req, res, next) => {
  try {
    // 1. Récupérer le token depuis les headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: "Authorization header manquant ou invalide" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Vérifier que l'utilisateur existe en base
    const [users] = await pool.query(
      'SELECT id, username, email FROM users WHERE id = ?', 
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: "Utilisateur non trouvé" });
    }

    // 4. Attacher l'utilisateur à la requête
    req.user = users[0];
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Session expirée" });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Token invalide" });
    }
    
    res.status(500).json({ error: "Erreur d'authentification" });
  }
};



// Connexion MySQL (pool)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Votre route existante pour l'envoi de l'e-mail de réinitialisation (POST)
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    const [users] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const userId = users[0].id;

    // Générer un token JWT valable 15 minutes
    const token = jwt.sign({ userId }, JWT_RESET_SECRET, { expiresIn: '15m' });
    const resetLink = `https://chatroom-6uv8.onrender.com/reset-password/${token}`; // Ce lien est correct

    await transporter.sendMail({
      from: process.env.RESET_EMAIL_FROM,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h3>Réinitialisation de mot de passe</h3>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p><a href="${resetLink}">Cliquez ici pour réinitialiser</a> (lien valable 15 minutes)</p>
      `,
    });

    res.status(200).json({ message: 'Email de réinitialisation envoyé.' });
  } catch (error) {
    console.error('Erreur forgot-password :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    if (conn) conn.release();
  }
});

// NOUVELLE ROUTE : Pour afficher le formulaire de réinitialisation (GET)





// VOTRE ROUTE EXISTANTE : Pour traiter la soumission du formulaire (POST)
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_RESET_SECRET);
    const userId = decoded.userId;

    const hashedPassword = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
    conn.release();

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur reset-password (POST) :', error);
    res.status(400).json({ error: 'Lien invalide ou expiré.' });
  }
});

// TRÈS IMPORTANT pour les applications Single Page (SPA) comme React/Vue/Angular:
// Ajoutez une route "catch-all" après toutes vos routes d'API
// pour servir le fichier index.html de votre application client.
// Cela garantit que toutes les routes non API (comme /reset-password/xyz)
// sont gérées par votre application client côté navigateur.
// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
// });
// Assurez-vous d'importer 'path' si vous utilisez path.resolve
// const path = require('path');

// AUTHENTIFICATION

// Connexion utilisateur
app.post("/login", async (req, res) => {
  const { email, secret } = req.body;

  if (!email || !secret) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [users] = await conn.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(400).json({ error: "Utilisateur introuvable" });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(secret, user.password_hash);

    if (!isValidPassword) {
      return res.status(400).json({ error: "Mot de passe incorrect" });
    }

    const [profiles] = await conn.query("SELECT * FROM profiles WHERE user_id = ?", [user.id]);
    const profile = profiles[0] || {};
    const userData = {
      id: user.id,
      email: user.email,
      username: profile.username,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url || '', // retourne une chaîne vide si null
    };


    // 🔐 GÉNÉRATION DU TOKEN
const token = jwt.sign(userData, process.env.JWT_SECRET, {
  expiresIn: '2h'
});

// ✅ Met à jour le statut en ligne avec logs
try {
  const [result] = await conn.query(
    `INSERT INTO online_status (user_id, online, last_active)
     VALUES (?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE online = TRUE, last_active = NOW()`,
    [user.id]
  );
  console.log(`✅ Statut en ligne mis à jour pour l'utilisateur ID ${user.id}`);
  console.log('Résultat de la requête INSERT/UPDATE online_status:', result);
} catch (err) {
  console.error(`❌ Échec de la mise à jour du statut en ligne pour l'utilisateur ID ${user.id}`, err);
}

// ✅ RENVOIE token + infos utilisateur
res.status(200).json({
  token,
  user: userData
});



  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    if (conn) conn.release();
  }
});


// Inscription utilisateur
app.post("/signup", async (req, res) => {
  const { username, secret, email, first_name, last_name } = req.body;
  try {
    const conn = await pool.getConnection();
    const hashedPassword = await bcrypt.hash(secret, 10);

    const [result] = await conn.query(
      "INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [email, hashedPassword]
    );

    const userId = result.insertId;

    await conn.query(
      "INSERT INTO profiles (user_id, username, first_name, last_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [userId, username, first_name, last_name, email]
    );

    conn.release();
    res.status(200).json({ id: userId, email, username, secret });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ROOMS


// Récupération des salles
app.get("/rooms", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rooms] = await conn.query("SELECT * FROM rooms ORDER BY created_at DESC");
    conn.release();
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Erreur lors de la récupération des salles :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Création d'une salle
app.post("/rooms", async (req, res) => {
  const { name, description, type } = req.body;
  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      "INSERT INTO rooms (name, description, type, created_at) VALUES (?, ?, ?, NOW())",
      [name, description, type]
    );
    conn.release();
    res.status(201).json({ id: result.insertId, name, description, type });
  } catch (error) {
    console.error("Erreur lors de la création de la salle :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer les messages d'une salle
app.get("/rooms/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  try {
    const conn = await pool.getConnection();
    const [messages] = await conn.query(
      "SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC",
      [roomId]
    );
    conn.release();
    res.status(200).json(messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Envoyer un message
app.post("/rooms/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  const { sender_id, sender_username, content } = req.body;
  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      "INSERT INTO messages (room_id, sender_id, sender_username, content, created_at) VALUES (?, ?, ?, ?, NOW())",
      [roomId, sender_id, sender_username, content]
    );
    conn.release();
    res.status(201).json({
      id: result.insertId,
      room_id: roomId,
      sender_id,
      sender_username,
      content,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



app.post('/rooms/:roomId/upload-image', upload.single('image'), async (req, res) => {
  const { roomId } = req.params;
  const { sender_id, sender_username } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Aucun fichier envoyé.' });
  }

  // URL publique de l’image
  const imageUrl = `${API_BASE_URL}/uploads/${file.filename}`;

  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'INSERT INTO messages (room_id, sender_id, sender_username, content, created_at) VALUES (?, ?, ?, ?, NOW())',
      [roomId, sender_id, sender_username, imageUrl]
    );
    conn.release();

    res.status(201).json({
      id: result.insertId,
      room_id: roomId,
      sender_id,
      sender_username,
      content: imageUrl,
    });
  } catch (error) {
    console.error('Erreur lors de l’enregistrement du message image :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});





// Lister les participants d’une salle
app.get("/rooms/:roomId/participants", async (req, res) => {
  const { roomId } = req.params;
  try {
    const conn = await pool.getConnection();
    const [participants] = await conn.query(
      `SELECT p.user_id AS id, p.username, p.avatar_url
       FROM room_participants rp
       JOIN profiles p ON rp.user_id = p.user_id
       WHERE rp.room_id = ?`,
      [roomId]
    );
    conn.release();
    res.status(200).json(participants);
  } catch (error) {
    console.error("Erreur lors de la récupération des participants :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mise à jour de la présence + insertion automatique dans room_participants
app.post("/rooms/:roomId/presence", async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  if (!roomId || !userId) {
    return res.status(400).json({ error: "roomId et userId sont requis" });
  }
  try {
    const conn = await pool.getConnection();

    // Ajouter dans room_participants s’il n’y est pas déjà
    await conn.query(
      `INSERT IGNORE INTO room_participants (room_id, user_id) VALUES (?, ?)`,
      [roomId, userId]
    );

    // Mettre à jour ou insérer la présence
    await conn.query(
      `INSERT INTO room_presence (room_id, user_id, last_seen)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE last_seen = NOW()`,
      [roomId, userId]
    );

    conn.release();
    res.status(200).json({ message: "Présence mise à jour" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la présence :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// GET /rooms/:roomId/online-participants
app.get("/rooms/:roomId/online-participants", async (req, res) => {
  const { roomId } = req.params;
  // Définis ici le seuil d'inactivité en secondes
  const THRESHOLD_SECONDS = 30;

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `
      SELECT u.id, u.username, u.avatar_url
      FROM profiles u
      JOIN room_presence rp
        ON u.id = rp.user_id
      WHERE rp.room_id = ?
        AND TIMESTAMPDIFF(SECOND, rp.last_seen, NOW()) <= ?
      `,
      [roomId, THRESHOLD_SECONDS]
    );
    conn.release();
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erreur fetching online participants:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



// Suppression de la présence (lorsqu'on quitte la salle)
app.delete("/rooms/:roomId/presence", async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  if (!roomId || !userId) {
    return res.status(400).json({ error: "roomId et userId sont requis" });
  }
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "DELETE FROM room_presence WHERE room_id = ? AND user_id = ?",
      [roomId, userId]
    );
    conn.release();
    res.status(200).json({ message: "Présence supprimée" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la présence :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// Détails d'une salle
app.get("/rooms/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const conn = await pool.getConnection();
    const [room] = await conn.query("SELECT * FROM rooms WHERE id = ?", [roomId]);
    conn.release();

    if (room.length === 0) {
      return res.status(404).json({ error: "Salle non trouvée" });
    }

    res.status(200).json(room[0]);
  } catch (error) {
    console.error("Erreur lors de la récupération de la salle :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



// REPORTS
// Route pour signaler un utilisateur (POST /reports)
app.post("/reports", async (req, res) => {
  const { message_id, reported_user_id, reported_by, reason } = req.body;

  try {
    const conn = await pool.getConnection();
    
    // Vérifier qu'au moins un ID est fourni (message OU utilisateur)
    if (!message_id && !reported_user_id) {
      conn.release();
      return res.status(400).json({ error: "ID de message ou d'utilisateur requis" });
    }

    // Vérifier que l'utilisateur qui signale existe
    const [userCheck] = await conn.query(
      "SELECT id FROM users WHERE id = ?", 
      [reported_by]
    );
    
    if (userCheck.length === 0) {
      conn.release();
      return res.status(404).json({ error: "Utilisateur signalant non trouvé" });
    }

    // Insérer le signalement
    const [result] = await conn.query(
      "INSERT INTO reports (message_id, reported_user_id, reported_by, reason) VALUES (?, ?, ?, ?)",
      [message_id, reported_user_id, reported_by, reason]
    );
    
    conn.release();
    
    res.status(201).json({ 
      id: result.insertId,
      message_id,
      reported_user_id,
      reported_by,
      reason
    });
    
  } catch (error) {
    console.error("Erreur lors de la création du signalement:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// BLOQUER UN UTILISATEUR

app.post("/blocks", async (req, res) => {
  const { user_id, blocked_user_id } = req.body;
  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      "INSERT INTO user_blocks (user_id, blocked_user_id, created_at) VALUES (?, ?, NOW())",
      [user_id, blocked_user_id]
    );
    conn.release();
    res.status(201).json({ id: result.insertId, user_id, blocked_user_id });
  } catch (error) {
    console.error("Erreur lors du blocage de l'utilisateur :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.get('/online-users', async (req, res) => {
  const excludeUserId = req.query.exclude;
  if (!excludeUserId) {
      return res.status(400).json({ error: 'Paramètre exclude requis' });
  }

  let conn; // Déclarez conn ici pour qu'il soit accessible dans le bloc finally
  try {
      conn = await pool.getConnection();

      const query = `
          SELECT p.user_id AS id, p.username, p.first_name, p.last_name, p.avatar_url
          FROM online_status o
          JOIN profiles p ON o.user_id = p.user_id
          WHERE o.online = TRUE AND o.user_id != ?
          ORDER BY o.last_active DESC
          LIMIT 10
      `;

      const [rows] = await conn.query(query, [excludeUserId]);

      // On renvoie simplement les lignes telles quelles.
      res.json(rows); // <-- Changez 'rowsWithFullAvatarUrl' en 'rows'

  } catch (error) {
      console.error('Erreur /online-users:', error);
      res.status(500).json({ error: 'Erreur serveur' });
  } finally {
      if (conn) conn.release(); // Libère la connexion même en cas d'erreur
  }
});

// Assurez-vous aussi que le point de terminaison d'upload d'avatar (/profile/:id/avatar)
// enregistre bien la chaîne complète (y compris le préfixe) dans la BDD.
// C'est ce que votre code fait déjà, donc c'est bon de ce côté.


app.put('/profile/:id/avatar', async (req, res) => {
      try {
        const userId = req.params.id;
        console.log(`Requête PUT /profile/${userId}/avatar reçue.`);
        console.log("Contenu de req.body :", req.body);
        console.log("Type de req.body :", typeof req.body);
    
        const { avatar_url } = req.body;
    
        if (avatar_url) {
            console.log("Longueur de avatar_url reçue :", avatar_url.length);
            console.log("Début de avatar_url :", avatar_url.substring(0, 100));
        }
    
        if (!avatar_url) {
          console.error('Erreur: avatar_url manquant dans le corps de la requête.');
          return res.status(400).json({ error: 'avatar_url manquant' });
        }
    
        // Sauvegarde de l'avatar dans la base de données
        const [result] = await pool.query(
            'UPDATE profiles SET avatar_url = ? WHERE user_id = ?',
            [avatar_url, userId]
        );
    
        // --- AJOUTEZ CE BLOC DE RÉPONSE ---
        if (result.affectedRows === 0) {
          console.warn(`Aucun profil mis à jour pour l'utilisateur ID ${userId}. L'utilisateur existe-t-il dans la table 'profiles'?`);
          return res.status(404).json({ error: 'Profil utilisateur introuvable.' });
        }
  
        // Renvoie l'URL de l'avatar qui vient d'être sauvegardée
        res.status(200).json({ message: 'Avatar mis à jour avec succès', avatar_url: avatar_url });
        // ----------------------------------
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l’avatar (catch block):', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
  });

// PROFILES

// Récupération d'un profil utilisateur par ID
// Récupération d'un profil utilisateur par ID
app.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const currentUser_id_from_auth = req.query.current_user_id ? parseInt(req.query.current_user_id) : null;

  let conn;
  try {
      conn = await pool.getConnection();

      const [profiles] = await conn.query(
          "SELECT user_id AS id, username, first_name, last_name, age, gender, bio, location, interests, avatar_url FROM profiles WHERE user_id = ?",
          [userId]
      );

      if (profiles.length === 0) {
          conn.release();
          return res.status(404).json({ error: "Profil utilisateur non trouvé." });
      }

      const profile = profiles[0];

      // --- CORRECTION ICI ---
      if (profile.interests && typeof profile.interests === 'string' && profile.interests.trim() !== '') {
          try {
              profile.interests = JSON.parse(profile.interests);
              if (!Array.isArray(profile.interests)) {
                  profile.interests = []; // S'assurer que c'est un tableau même si le JSON est valide mais non-array
              }
          } catch (e) {
              console.error("Erreur lors du parsing des intérêts :", e);
              profile.interests = [];
          }
      } else {
          profile.interests = []; // Si null, undefined, non-string, ou chaîne vide
      }
      // --- FIN DE LA CORRECTION ---

      profile.avatar_url = profile.avatar_url || '';

      let isBlockedByCurrentUser = false;
      let hasBlockedCurrentUser = false;

      if (currentUser_id_from_auth) {
          const [blockedByMeRows] = await conn.execute(
              'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
              [currentUser_id_from_auth, userId]
          );
          isBlockedByCurrentUser = blockedByMeRows.length > 0;

          const [iAmBlockedByThemRows] = await conn.execute(
              'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
              [userId, currentUser_id_from_auth]
          );
          hasBlockedCurrentUser = iAmBlockedByThemRows.length > 0;
      }

      conn.release();
      res.status(200).json({
          ...profile,
          isBlockedByCurrentUser,
          hasBlockedCurrentUser
      });
  } catch (error) {
      console.error("Erreur lors de la récupération du profil :", error);
      if (conn) conn.release();
      res.status(500).json({ error: "Erreur serveur" });
  }
});



// Rejoindre une salle : INSERT IGNORE dans room_participants
app.post('/rooms/:roomId/join', async (req, res) => {
  const { roomId }    = req.params;
  const { userId }    = req.body;
  if (!roomId || !userId) {
    return res.status(400).json({ error: 'roomId et userId sont requis' });
  }
  try {
    const conn = await pool.getConnection();
    await conn.query(
      'INSERT IGNORE INTO room_participants (room_id, user_id) VALUES (?, ?)',
      [roomId, userId]
    );
    conn.release();
    res.status(200).json({ message: 'Vous avez rejoint la salle.' });
  } catch (err) {
    console.error('Erreur join room:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



  app.put("/profile/:userId", async (req, res) => {
    const { userId } = req.params; // L'ID de l'utilisateur à mettre à jour
    const { 
        username, 
        first_name, 
        last_name, 
        age, 
        gender, 
        bio, 
        location, 
        interests, // Ceci est un tableau de chaînes de caractères de votre frontend
        avatar_url 
    } = req.body; // Les données à mettre à jour envoyées par le frontend

    let conn;
    try {
        conn = await pool.getConnection();

        const updateFields = [];
        const updateValues = [];

        // Construit dynamiquement la requête SQL basée sur les champs fournis dans le body
        if (username !== undefined) { updateFields.push("username = ?"); updateValues.push(username); }
        if (first_name !== undefined) { updateFields.push("first_name = ?"); updateValues.push(first_name); }
        if (last_name !== undefined) { updateFields.push("last_name = ?"); updateValues.push(last_name); }
        if (age !== undefined) { updateFields.push("age = ?"); updateValues.push(age); }
        if (gender !== undefined) { updateFields.push("gender = ?"); updateValues.push(gender); }
        if (bio !== undefined) { updateFields.push("bio = ?"); updateValues.push(bio); }
        if (location !== undefined) { updateFields.push("location = ?"); updateValues.push(location); }
        
        // Convertit le tableau d'intérêts en chaîne JSON pour le stockage en base de données
        if (interests !== undefined) { 
            updateFields.push("interests = ?"); 
            updateValues.push(JSON.stringify(interests)); 
        }
        if (avatar_url !== undefined) { updateFields.push("avatar_url = ?"); updateValues.push(avatar_url); }
        
        // Ajoute la date de mise à jour
        updateFields.push("updated_at = NOW()");

        if (updateFields.length === 0) {
            return res.status(400).json({ error: "Aucune donnée à mettre à jour n'a été fournie." });
        }

        const query = `UPDATE profiles SET ${updateFields.join(", ")} WHERE user_id = ?`;
        updateValues.push(userId); // Ajoute l'ID de l'utilisateur pour la clause WHERE

        const [result] = await conn.query(query, updateValues);

        if (result.affectedRows === 0) {
            // Cela signifie que l'utilisateur n'a pas été trouvé ou qu'aucune modification n'a été nécessaire
            return res.status(404).json({ error: "Profil utilisateur introuvable ou aucune modification effectuée." });
        }

        // Récupère le profil mis à jour depuis la base de données pour le renvoyer
        // C'est une bonne pratique de renvoyer l'état actuel et complet du profil après une modification
        const [updatedProfiles] = await conn.query(
            "SELECT user_id AS id, username, first_name, last_name, age, gender, bio, location, interests, avatar_url FROM profiles WHERE user_id = ?",
            [userId]
        );

        if (updatedProfiles.length === 0) {
            // Cas improbable si affectedRows > 0, mais bonne pratique de vérifier
            return res.status(404).json({ error: "Profil mis à jour introuvable après l'opération." });
        }

        const updatedProfile = updatedProfiles[0];

        if (updatedProfile.interests) {
          try {
            // ✅ Si la valeur est déjà un tableau (parfois selon mysql2 ou config), on la garde telle quelle
            if (Array.isArray(updatedProfile.interests)) {
              // Rien à faire, elle est déjà bien formatée
            } else if (typeof updatedProfile.interests === "string") {
              // ✅ Si la chaîne ressemble à "lecture,sport", on la convertit manuellement
              if (updatedProfile.interests.includes(",") && !updatedProfile.interests.trim().startsWith("[")) {
                updatedProfile.interests = updatedProfile.interests.split(",").map((s) => s.trim());
              } else {
                updatedProfile.interests = JSON.parse(updatedProfile.interests);
              }
            } else {
              updatedProfile.interests = [];
            }
          } catch (e) {
            console.error("Erreur lors du parsing des intérêts après mise à jour :", e);
            updatedProfile.interests = [];
          }
        } else {
          updatedProfile.interests = [];
        }
        
        updatedProfile.avatar_url = updatedProfile.avatar_url || ''; // S'assure que c'est une chaîne vide si null

        // Envoie le profil mis à jour au frontend
        res.status(200).json({ message: "Profil mis à jour avec succès.", profile: updatedProfile });

    } catch (error) {
        console.error("Erreur backend lors de la mise à jour du profil :", error);
        res.status(500).json({ error: "Erreur serveur interne lors de la mise à jour du profil." });
    } finally {
        if (conn) conn.release(); // S'assure que la connexion à la base de données est toujours relâchée
    }
});



// Récupérer les messages privés entre deux utilisateurs (conversation)
app.get('/private-messages/:userId/:otherUserId', async (req, res) => {
  const { userId, otherUserId } = req.params;
  let conn;
  try {
    conn = await pool.getConnection();
    const [messages] = await conn.query(
      `SELECT * FROM private_messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, otherUserId, otherUserId, userId]
    );
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (conn) conn.release();
  }
});


// Envoyer un message privé (AVEC VÉRIFICATION DE BLOCAGE)
app.post('/private-messages', async (req, res) => {
  // IMPORTANT: sender_id DOIT venir de l'utilisateur authentifié (via JWT)
  const sender_id = parseInt(req.body.sender_id); // Assurez-vous que c'est un nombre
  const receiver_id = parseInt(req.body.receiver_id); // Assurez-vous que c'est un nombre
  const content = req.body.content;

  if (isNaN(sender_id) || isNaN(receiver_id) || !content) {
      return res.status(400).json({ message: 'Expéditeur, destinataire et contenu sont requis, et les IDs doivent être des nombres valides.' });
  }

  let conn;
  try {
      conn = await pool.getConnection();

      // --- DÉBUT DE LA VÉRIFICATION DU BLOCAGE ---
      // 1. Vérifier si l'expéditeur (sender_id) a bloqué le destinataire (receiver_id)
      const [blockerToBlockedRows] = await conn.execute(
          'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
          [sender_id, receiver_id]
      );
      if (blockerToBlockedRows.length > 0) {
          conn.release();
          return res.status(403).json({ message: 'Vous avez bloqué cet utilisateur et ne pouvez pas lui envoyer de messages.' });
      }

      // 2. Vérifier si le destinataire (receiver_id) a bloqué l'expéditeur (sender_id)
      const [blockedToBlockerRows] = await conn.execute(
          'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
          [receiver_id, sender_id]
      );
      if (blockedToBlockerRows.length > 0) {
          conn.release();
          return res.status(403).json({ message: 'Cet utilisateur vous a bloqué et ne peut pas recevoir vos messages.' });
      }
      // --- FIN DE LA VÉRIFICATION DU BLOCAGE ---


      // Si aucune condition de blocage n'est remplie, procéder à l'insertion du message
      const [result] = await conn.query(
          "INSERT INTO private_messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, NOW())",
          [sender_id, receiver_id, content]
      );

      conn.release();
      res.status(201).json({ id: result.insertId, sender_id, receiver_id, content });

  } catch (error) {
      console.error("Erreur lors de l'envoi du message privé :", error);
      if (conn) conn.release();
      res.status(500).json({ error: "Erreur serveur" });
  }
});




app.post(
  '/private-messages/upload-image',
  upload.single('image'),
  async (req, res) => {
    try {
      // Récupération des IDs envoyés dans le body
      const sender_id   = parseInt(req.body.sender_id, 10);
      const receiver_id = parseInt(req.body.receiver_id, 10);
      const file        = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Aucun fichier reçu.' });
      }
      if (isNaN(sender_id) || isNaN(receiver_id)) {
        return res.status(400).json({ error: 'IDs invalides.' });
      }

      // Construction de l’URL publique de l’image
      const imageUrl = `https://chatroom-backend-e1n0.onrender.com/uploads/${file.filename}`;

      // Connexion à la base
      const conn = await pool.getConnection();

      // (Optionnel) vérification de blocage
      const [blocked] = await conn.query(
        `SELECT 1 
           FROM blocked_users 
          WHERE (blocker_id = ? AND blocked_id = ?) 
             OR (blocker_id = ? AND blocked_id = ?)`,
        [sender_id, receiver_id, receiver_id, sender_id]
      );
      if (blocked.length) {
        conn.release();
        return res.status(403).json({ error: 'Dialogue impossible (blocage).' });
      }

      // Insertion du message image
      const [result] = await conn.query(
        `INSERT INTO private_messages 
           (sender_id, receiver_id, content, created_at) 
         VALUES (?, ?, ?, NOW())`,
        [sender_id, receiver_id, imageUrl]
      );
      conn.release();

      // Réponse au front
      return res.status(201).json({
        id:         result.insertId,
        sender_id,
        receiver_id,
        content:    imageUrl,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erreur upload-image privé :', err);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }
);




// ... (Toutes tes importations et configurations Express existantes)
// Exemple : const express = require('express'); const app = express(); etc.
// Assure-toi que 'pool' est bien défini et configuré pour ta connexion MySQL.

// --- Route pour récupérer la liste des conversations privées ---
app.get('/private-conversations/:userId', async (req, res) => {
  const { userId } = req.params;
  let conn;

  try {
      conn = await pool.getConnection();

      // Cette requête est conçue pour récupérer toutes les conversations d'un utilisateur,
      // avec le dernier message et les infos de l'autre participant.
      const query = `
          SELECT
              t.other_user_id,
              MAX(t.created_at) AS last_message_at,
              (SELECT content FROM private_messages WHERE (sender_id = ? AND receiver_id = t.other_user_id) OR (sender_id = t.other_user_id AND receiver_id = ?) ORDER BY created_at DESC LIMIT 1) AS last_message_content,
              (SELECT COUNT(*) FROM private_messages WHERE receiver_id = ? AND is_read = 0 AND sender_id = t.other_user_id) AS unread_count,
              p.username,
              p.first_name,
              p.last_name,
              p.avatar_url
          FROM (
              SELECT
                  CASE
                      WHEN sender_id = ? THEN receiver_id
                      ELSE sender_id
                  END AS other_user_id,
                  created_at
              FROM
                  private_messages
              WHERE
                  sender_id = ? OR receiver_id = ?
          ) AS t
          JOIN
              profiles p ON p.user_id = t.other_user_id
          GROUP BY
              t.other_user_id, p.username, p.first_name, p.last_name, p.avatar_url
          ORDER BY
              last_message_at DESC;
      `;
      // Les '?' doivent être remplacés par l'ID de l'utilisateur connecté.
      // Assurez-vous que userId est un NUMBER si votre DB l'attend comme tel.
      const [rows] = await conn.query(query, [
          userId, userId, userId, // Pour les sous-requêtes de last_message_content et unread_count
          userId, userId, userId // Pour la table dérivée 't'
      ]);

      // Mapper les résultats pour correspondre à l'interface Conversation du frontend
      const conversations = rows.map(row => ({
          id: String(row.other_user_id), // L'ID de l'autre utilisateur sert d'ID de conversation
          user_id: String(row.other_user_id), // L'ID de l'autre utilisateur
          last_message: row.last_message_content || "", // Assure-toi d'avoir une chaîne vide si null
          last_message_at: row.last_message_at,
          unread_count: row.unread_count || 0, // 0 si null
          profile: {
              id: String(row.other_user_id),
              username: row.username,
              first_name: row.first_name,
              last_name: row.last_name,
              avatar_url: row.avatar_url
          }
      }));

      res.json(conversations);

  } catch (error) {
      console.error('Erreur lors de la récupération des conversations privées :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des conversations' });
  } finally {
      if (conn) conn.release();
  }
});

// --- Nouvelle Route pour marquer les messages comme lus ---
app.put('/private-messages/mark-as-read', async (req, res) => {
  const { senderId, receiverId } = req.body; // senderId: ID de l'expéditeur (l'autre user), receiverId: ID du récepteur (l'utilisateur courant)
  let conn;

  if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'senderId et receiverId sont requis.' });
  }

  try {
      conn = await pool.getConnection();
      // Met à jour tous les messages envoyés par 'senderId' et reçus par 'receiverId' qui ne sont pas lus.
      const [result] = await conn.query(
          "UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
          [senderId, receiverId]
      );
      res.json({ message: `${result.affectedRows} messages marqués comme lus.` });
  } catch (error) {
      console.error('Erreur lors du marquage des messages comme lus :', error);
      res.status(500).json({ error: 'Erreur serveur lors du marquage des messages.' });
  } finally {
      if (conn) conn.release();
  }
});


// --- Nouvelle Route pour rechercher des utilisateurs ---
// Cette route permettra de rechercher des utilisateurs par username, first_name ou last_name
app.get('/users/search', async (req, res) => {
  const { term, excludeUserId } = req.query; // 'term' est le critère de recherche, 'excludeUserId' est l'ID de l'utilisateur courant
  let conn;

  if (!term) {
      return res.status(400).json({ error: 'Un terme de recherche est requis.' });
  }

  try {
      conn = await pool.getConnection();
      const searchTerm = `%${term}%`; // Pour une recherche LIKE partielle

      let query = `
          SELECT
              p.user_id AS id,
              p.username,
              p.first_name,
              p.last_name,
              p.avatar_url
          FROM
              profiles p
          WHERE
              (p.username LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)
      `;
      const params = [searchTerm, searchTerm, searchTerm];

      // Optionnel: Exclure l'utilisateur courant des résultats de recherche
      if (excludeUserId) {
          query += ` AND p.user_id != ?`;
          params.push(excludeUserId);
      }

      query += ` ORDER BY p.username ASC LIMIT 20;`; // Limitez le nombre de résultats pour la performance

      const [users] = await conn.query(query, params);

      res.json(users.map(user => ({
          id: String(user.id), // S'assurer que l'ID est une chaîne pour la cohérence frontend
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url
      })));

  } catch (error) {
      console.error('Erreur lors de la recherche des utilisateurs :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la recherche des utilisateurs' });
  } finally {
      if (conn) conn.release();
  }
});


// Route pour bloquer un utilisateur
app.post('/block-user', async (req, res) => {
  // IMPORTANT: Le blocker_id DOIT venir de l'utilisateur authentifié (via JWT)
  const blocker_id = parseInt(req.body.blocker_id);
  const blocked_id = parseInt(req.body.blocked_id); 

  if (isNaN(blocker_id) || isNaN(blocked_id)) {
      return res.status(400).json({ message: 'Les IDs doivent être des nombres valides.' });
  }

  if (blocker_id === blocked_id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous bloquer vous-même.' });
  }

  let connection;
  try {
      connection = await pool.getConnection();

      const [existingBlockRows] = await connection.execute(
          'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
          [blocker_id, blocked_id]
      );

      if (existingBlockRows.length > 0) {
          return res.status(409).json({ message: 'Cet utilisateur est déjà bloqué.' });
      }

      // Insérer le nouveau blocage
      await connection.execute(
          'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
          [blocker_id, blocked_id]
      );

      res.status(200).json({ message: 'Utilisateur bloqué avec succès.' });

  } catch (error) {
      console.error('Erreur lors du blocage de l\'utilisateur:', error);
      res.status(500).json({ message: 'Erreur interne du serveur lors du blocage.' });
  } finally {
      if (connection) connection.release();
  }
});



// NOUVELLE ROUTE : Débloquer un utilisateur
app.post('/unblock-user', async (req, res) => {
  // IMPORTANT: Le blocker_id DOIT venir de l'utilisateur authentifié (via JWT)
  const blocker_id = parseInt(req.body.blocker_id); // Assurez-vous que c'est un nombre
  const blocked_id = parseInt(req.body.blocked_id); // Assurez-vous que c'est un nombre

  if (isNaN(blocker_id) || isNaN(blocked_id)) {
      return res.status(400).json({ message: 'Les IDs doivent être des nombres valides.' });
  }

  if (blocker_id === blocked_id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous débloquer vous-même.' });
  }

  let connection;
  try {
      connection = await pool.getConnection();

      const [result] = await connection.execute(
          'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
          [blocker_id, blocked_id]
      );

      if (result.affectedRows === 0) {
          // Aucun blocage trouvé pour supprimer
          connection.release();
          return res.status(404).json({ message: 'Aucun blocage trouvé entre ces utilisateurs pour le déblocage.' });
      }

      res.status(200).json({ message: 'Utilisateur débloqué avec succès.' });

  } catch (error) {
      console.error('Erreur lors du déblocage de l\'utilisateur:', error);
      res.status(500).json({ message: 'Erreur interne du serveur lors du déblocage.' });
  } finally {
      if (connection) connection.release();
  }
});



// Vérifier l'appartenance à une salle
app.get("/rooms/:roomId/membership/:userId", async (req, res) => {
  const { roomId, userId } = req.params;
  
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT 1 FROM room_participants WHERE user_id = ? AND room_id = ?",
      [userId, roomId]
    );
    conn.release();
    res.status(200).json({ isMember: rows.length > 0 });
  } catch (error) {
    console.error("Error checking membership:", error);
    if (conn) conn.release();
    res.status(500).json({ error: "Server error" });
  }
});



// Rejoindre une salle
app.post('/rooms/:roomId/join', authenticate, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    // Vérification que la salle existe
    const [room] = await pool.query('SELECT id FROM rooms WHERE id = ?', [roomId]);
    if (room.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Insertion dans room_participant
    const [result] = await pool.query(
      `INSERT INTO room_participants (room_id, user_id, joined_at) 
       VALUES (?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE joined_at = NOW()`,
      [roomId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(200).json({ message: "Already a participant" });
    }

    res.status(201).json({
      success: true,
      message: "Successfully joined room",
      data: {
        roomId,
        userId,
        joinedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: "Database operation failed",
      details: error.sqlMessage || error.message 
    });
  }
});




app.get('/users/:userId/rooms', authenticate, async (req, res) => {
  const { userId } = req.params;

  try {
    const [rooms] = await pool.query(`
      SELECT r.*, rp.joined_at 
      FROM rooms r
      JOIN room_participant rp ON r.id = rp.room_id
      WHERE rp.user_id = ?
      ORDER BY rp.joined_at DESC
    `, [userId]);

    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});




// DÉMARRAGE DU SERVEUR
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Serveur en cours d'exécution sur le port ${PORT}`);
});
