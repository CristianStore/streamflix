const bcrypt = require('bcryptjs');
const { isDbConnected } = require('../config/database');
const UserModel = require('./User');
const AppConfigModel = require('./AppConfig');

// Base de datos en memoria local de respaldo
const db = {
  users: [],
  movies: [],
  series: [],
  config: {
    featuredHeroId: 1,
    featuredHeroTitle: 'Sintel',
    featuredHeroBannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
    minAppVersion: '1.0.0',
    maintenanceMode: false
  }
};

// Semilla inicial
function seedInitialData() {
  const adminHash = bcrypt.hashSync('1234', 10);
  const demoHash = bcrypt.hashSync('demo123', 10);

  db.users = [
    {
      id: 'usr_1',
      username: 'admin',
      email: 'admin@streamflix.com',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_2',
      username: 'demo',
      email: 'demo@streamflix.com',
      passwordHash: demoHash,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  db.movies = [
    {
      id: 1,
      tmdbId: 101,
      type: 'movie',
      title: 'Sintel',
      originalTitle: 'Sintel: The Durian Open Movie Project',
      overview: 'Una solitaria guerrera busca a un bebé dragón huérfano con el que forjó un vínculo indestructible antes de que se lo arrebataran en las cumbres nevadas.',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
      backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
      releaseDate: '2010-09-27',
      year: '2010',
      rating: 8.2,
      durationMinutes: 15,
      genres: ['Animación', 'Fantasía', 'Aventura'],
      category: 'trending',
      streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
      isFeatured: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      tmdbId: 102,
      type: 'movie',
      title: 'Tears of Steel',
      originalTitle: 'Tears of Steel: Mango Open Movie',
      overview: 'En un futuro distópico en Ámsterdam, un grupo de científicos y rebeldes intentan salvar el planeta frente a un ejército cibernético descontrolado.',
      poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
      backdrop: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&q=80',
      releaseDate: '2012-09-12',
      year: '2012',
      rating: 7.5,
      durationMinutes: 12,
      genres: ['Ciencia Ficción', 'Acción', 'Cyberpunk'],
      category: 'movies',
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      isFeatured: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      tmdbId: 103,
      type: 'movie',
      title: 'Big Buck Bunny',
      originalTitle: 'Big Buck Bunny: Peach Open Movie',
      overview: 'Un gigante y apacible conejo del bosque decide vengarse de tres traviesos roedores que destruyen la paz de la naturaleza y atacan a sus amigos.',
      poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&q=80',
      backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
      releaseDate: '2008-04-10',
      year: '2008',
      rating: 7.9,
      durationMinutes: 10,
      genres: ['Animación', 'Comedia', 'Familia'],
      category: 'movies',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      isFeatured: false,
      createdAt: new Date().toISOString()
    }
  ];

  db.series = [
    {
      id: 101,
      tmdbId: 201,
      type: 'series',
      title: 'Cosmos: Aventuras del Espacio-Tiempo',
      originalTitle: 'Cosmos: A Spacetime Odyssey',
      overview: 'Un viaje fascinante por los misterios del cosmos, la evolución de la vida y el futuro de la humanidad a través de la nave de la imaginación.',
      poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
      backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&q=80',
      releaseDate: '2014-03-09',
      year: '2014',
      rating: 9.1,
      totalSeasons: 2,
      genres: ['Documental', 'Ciencia', 'Aventura'],
      category: 'series',
      isFeatured: true,
      seasons: [
        {
          seasonNumber: 1,
          name: 'Temporada 1',
          episodes: [
            {
              id: 1001,
              episodeNumber: 1,
              title: 'Hacia la Vía Láctea',
              overview: 'Explorando las escalas del universo cósmico y el calendario galáctico.',
              durationMinutes: 44,
              streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
            },
            {
              id: 1002,
              episodeNumber: 2,
              title: 'Evolución y Adaptación',
              overview: 'El origen de las especies y el árbol genético de la vida en la Tierra.',
              durationMinutes: 42,
              streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            }
          ]
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];
}

seedInitialData();

// Funciones unificadas de acceso a datos
const databaseService = {
  // USUARIOS
  async findUserByUsernameOrEmail(identifier) {
    const clean = identifier.trim().toLowerCase();
    if (isDbConnected()) {
      return await UserModel.findOne({
        $or: [{ username: clean }, { email: clean }]
      });
    }
    return db.users.find(
      u => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
  },

  async findUserById(id) {
    if (isDbConnected()) {
      return await UserModel.findById(id);
    }
    return db.users.find(u => u.id === id || u._id === id);
  },

  async createUser({ username, email, passwordHash, role = 'user' }) {
    if (isDbConnected()) {
      const user = new UserModel({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        isActive: true
      });
      await user.save();
      return user.toObject();
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    return newUser;
  },

  async getAllUsers() {
    if (isDbConnected()) {
      return await UserModel.find({}, '-passwordHash').sort({ createdAt: -1 });
    }
    return db.users.map(u => {
      const copy = { ...u };
      delete copy.passwordHash;
      return copy;
    });
  },

  async updateUserStatus(id, isActive) {
    if (isDbConnected()) {
      return await UserModel.findByIdAndUpdate(
        id,
        { isActive },
        { new: true, select: '-passwordHash' }
      );
    }
    const user = db.users.find(u => u.id === id || u._id === id);
    if (user) {
      user.isActive = isActive;
      const copy = { ...user };
      delete copy.passwordHash;
      return copy;
    }
    return null;
  },

  // CONFIGURACIÓN GLOBAL DEL SISTEMA
  async getConfig() {
    if (isDbConnected()) {
      let cfg = await AppConfigModel.findOne({ key: 'global_config' });
      if (!cfg) {
        cfg = await AppConfigModel.create({ key: 'global_config', ...db.config });
      }
      return cfg.toObject();
    }
    return db.config;
  },

  async updateConfig(newConfig) {
    if (isDbConnected()) {
      return await AppConfigModel.findOneAndUpdate(
        { key: 'global_config' },
        { ...newConfig, updatedAt: new Date() },
        { new: true, upsert: true }
      );
    }
    db.config = { ...db.config, ...newConfig, updatedAt: new Date().toISOString() };
    return db.config;
  },

  // ACCESO DIRECTO A ARRAYS
  get movies() { return db.movies; },
  set movies(val) { db.movies = val; },
  get series() { return db.series; },
  set series(val) { db.series = val; },
  get users() { return db.users; },
  set users(val) { db.users = val; },
  raw: db
};

module.exports = databaseService;
