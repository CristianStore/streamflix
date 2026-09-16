const db = require('../models/database');

/**
 * Listar todos los usuarios registrados
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  try {
    const users = await db.getAllUsers();
    return res.json({
      success: true,
      total: users.length,
      data: users
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener listado de usuarios: ' + err.message
    });
  }
}

/**
 * Bloquear o reactivar una cuenta de usuario
 * PATCH /api/admin/users/:id/status
 */
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'El campo "isActive" debe ser un booleano (true o false)'
      });
    }

    const updated = await db.updateUserStatus(id, isActive);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'bloqueado'} exitosamente`,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al modificar estado del usuario: ' + err.message
    });
  }
}

/**
 * Agregar o editar película o canal manualmente
 * POST /api/admin/movies
 */
async function upsertMovie(req, res) {
  try {
    const { id, title, overview, poster, backdrop, streamUrl, genres, rating, category, type, isFeatured } = req.body;

    if (!title || !streamUrl) {
      return res.status(400).json({
        success: false,
        error: 'El título y la URL del stream (.m3u8) son campos obligatorios'
      });
    }

    const mediaList = db.raw.movies;
    const numId = id ? parseInt(id, 10) : null;
    const existingIndex = numId ? mediaList.findIndex(m => m.id === numId) : -1;

    if (existingIndex >= 0) {
      // Editar
      const existing = mediaList[existingIndex];
      const updated = {
        ...existing,
        title: title.trim(),
        overview: overview !== undefined ? overview : existing.overview,
        poster: poster || existing.poster,
        backdrop: backdrop || existing.backdrop,
        streamUrl: streamUrl.trim(),
        genres: Array.isArray(genres) ? genres : existing.genres,
        rating: rating !== undefined ? Number(rating) : existing.rating,
        category: category || existing.category,
        type: type || existing.type,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existing.isFeatured,
        updatedAt: new Date().toISOString()
      };
      mediaList[existingIndex] = updated;

      return res.json({
        success: true,
        message: 'Título actualizado correctamente',
        data: updated
      });
    } else {
      // Crear nuevo
      const nextId = mediaList.length > 0 ? Math.max(...mediaList.map(m => m.id)) + 1 : 1;
      const newMovie = {
        id: nextId,
        title: title.trim(),
        overview: overview || '',
        poster: poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
        backdrop: backdrop || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280',
        streamUrl: streamUrl.trim(),
        genres: Array.isArray(genres) ? genres : ['General'],
        rating: rating !== undefined ? Number(rating) : 7.0,
        category: category || 'movies',
        type: type || 'movie',
        isFeatured: Boolean(isFeatured),
        year: new Date().getFullYear().toString(),
        createdAt: new Date().toISOString()
      };
      mediaList.push(newMovie);

      return res.status(201).json({
        success: true,
        message: 'Título creado exitosamente',
        data: newMovie
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al procesar el título: ' + err.message
    });
  }
}

/**
 * Eliminar título del catálogo
 * DELETE /api/admin/movies/:id
 */
async function deleteMovie(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const mediaList = db.raw.movies;
    const index = mediaList.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada en el catálogo'
      });
    }

    const [deleted] = mediaList.splice(index, 1);
    return res.json({
      success: true,
      message: `Título "${deleted.title}" eliminado correctamente`,
      data: { id: deleted.id, title: deleted.title }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar el título: ' + err.message
    });
  }
}

/**
 * Obtener configuración global del sistema
 * GET /api/admin/config
 */
async function getConfig(req, res) {
  try {
    const config = await db.getConfig();
    return res.json({
      success: true,
      data: config
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener la configuración: ' + err.message
    });
  }
}

/**
 * Actualizar banner destacado y versión mínima de la app
 * POST /api/admin/config
 */
async function updateConfig(req, res) {
  try {
    const { featuredHeroId, featuredHeroTitle, featuredHeroBannerUrl, minAppVersion, maintenanceMode } = req.body;
    
    const updateData = {};
    if (featuredHeroId !== undefined) updateData.featuredHeroId = Number(featuredHeroId);
    if (featuredHeroTitle !== undefined) updateData.featuredHeroTitle = featuredHeroTitle;
    if (featuredHeroBannerUrl !== undefined) updateData.featuredHeroBannerUrl = featuredHeroBannerUrl;
    if (minAppVersion !== undefined) updateData.minAppVersion = minAppVersion;
    if (maintenanceMode !== undefined) updateData.maintenanceMode = Boolean(maintenanceMode);

    const updated = await db.updateConfig(updateData);

    return res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración: ' + err.message
    });
  }
}

module.exports = {
  getUsers,
  toggleUserStatus,
  upsertMovie,
  deleteMovie,
  getConfig,
  updateConfig
};
