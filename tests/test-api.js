const http = require('http');
const app = require('../src/server');

// Iniciar servidor temporal para pruebas
const server = http.createServer(app);
const PORT = 3998;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando pruebas automatizadas del Backend (Cloud, Auth, IPTV, TMDb & Admin)...');
  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  try {
    await new Promise(res => server.listen(PORT, res));
    console.log(`Servidor de pruebas listo en puerto ${PORT}\n`);

    // 1. Health check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'online', 'Health check responde 200 OK');

    // 1.1. Cuevana fallback route
    const cuevanaRes = await request('GET', '/api/stream/cuevana/search?title=The%20Batman');
    assert(cuevanaRes.status === 200 && Array.isArray(cuevanaRes.body.data), 'Endpoint Cuevana responde 200 y devuelve un arreglo de resultados o vacío');

    // 2. Login con credenciales admin/1234
    const loginRes = await request('POST', '/api/auth/login', { username: 'admin', password: '1234' });
    assert(loginRes.status === 200 && loginRes.body.user.role === 'admin', 'Login admin exitoso y retorna rol "admin"');
    const adminToken = loginRes.body.token;

    // 3. Registro de nuevo usuario (Email, Usuario, Password)
    const testUsername = `user_${Date.now().toString().slice(-4)}`;
    const testEmail = `${testUsername}@streamflix.com`;
    const regRes = await request('POST', '/api/auth/register', {
      username: testUsername,
      email: testEmail,
      password: 'password123'
    });
    assert(regRes.status === 201 && regRes.body.user.role === 'user', 'Registro crea usuario con rol "user" y retorna JWT');
    const userToken = regRes.body.token;
    const userId = regRes.body.user.id;

    // 4. Catálogo y feed
    const homeFeed = await request('GET', '/api/home');
    assert(homeFeed.status === 200 && homeFeed.body.categories.length >= 3, 'Feed de Home incluye carruseles por categoría');

    // 5. TMDb Masivo (Populares, Series, Tendencias, Buscador)
    const popRes = await request('GET', '/api/tmdb/popular');
    assert(popRes.status === 200 && Array.isArray(popRes.body.data), 'Endpoint TMDb /popular entrega catálogo de películas');

    // 5.1 Endpoints directos de compatibilidad solicitados
    const directMoviesPop = await request('GET', '/api/movies/popular');
    assert(directMoviesPop.status === 200 && Array.isArray(directMoviesPop.body), 'Endpoint directo /api/movies/popular responde array de películas');

    const directSeriesPop = await request('GET', '/api/series/popular');
    assert(directSeriesPop.status === 200 && Array.isArray(directSeriesPop.body), 'Endpoint directo /api/series/popular responde array de series');

    const directSearch = await request('GET', '/api/search?query=sintel');
    assert(directSearch.status === 200 && Array.isArray(directSearch.body), 'Endpoint directo /api/search?query=... responde array de resultados');

    const seriesRes = await request('GET', '/api/tmdb/series');
    assert(seriesRes.status === 200 && Array.isArray(seriesRes.body.data), 'Endpoint TMDb /series entrega series de televisión');

    const searchRes = await request('GET', '/api/tmdb/search?q=sintel');
    assert(searchRes.status === 200 && Array.isArray(searchRes.body.data), 'Endpoint TMDb /search busca por nombre');

    // 6. Canales en Vivo (IPTV)
    const iptvRes = await request('GET', '/api/iptv/channels');
    assert(iptvRes.status === 200 && iptvRes.body.data.length > 0 && iptvRes.body.data[0].streamUrl.includes('.m3u8'), 'Endpoint IPTV entrega canales con flujos .m3u8');

    const catsRes = await request('GET', '/api/iptv/categories');
    assert(catsRes.status === 200 && Array.isArray(catsRes.body.data), 'Endpoint IPTV entrega categorías de canales');

    // 7. Seguridad y Tickets HLS (.m3u8)
    const ticketAuth = await request('POST', '/api/stream/ticket', { mediaId: 1 }, userToken);
    assert(ticketAuth.status === 200 && !!ticketAuth.body.ticket, 'Genera ticket temporal cifrado para streaming');

    const manifestRes = await request('GET', `/api/stream/manifest?id=1&ticket=${encodeURIComponent(ticketAuth.body.ticket)}`);
    assert(manifestRes.status === 200 && manifestRes.body.url.includes('.m3u8'), 'Entrega URL del manifiesto .m3u8 con ticket válido');

    const serversRes = await request('GET', '/api/stream/servers?tmdbId=550&type=movie');
    assert(serversRes.status === 200 && Array.isArray(serversRes.body.servers) && serversRes.body.servers.length > 0, 'Endpoint de servidores devuelve lista cifrada con al menos un servidor');
    assert(serversRes.body.servers[0].streamData && serversRes.body.servers[0].streamData.token, 'Cada servidor incluye token cifrado en streamData');

    // 8. Módulo de Administración (/api/admin)
    // 8.1 Usuario normal intenta acceder a /api/admin/users -> 403 Forbidden
    const unauthAdmin = await request('GET', '/api/admin/users', null, userToken);
    assert(unauthAdmin.status === 403, 'Bloquea acceso a rutas /api/admin para usuarios no administradores (403)');

    // 8.2 Admin consulta lista de usuarios
    const adminUsers = await request('GET', '/api/admin/users', null, adminToken);
    assert(adminUsers.status === 200 && adminUsers.body.total >= 2, 'Admin puede consultar lista completa de usuarios registrados');

    // 8.3 Admin bloquea cuenta de usuario
    const blockRes = await request('PATCH', `/api/admin/users/${userId}/status`, { isActive: false }, adminToken);
    assert(blockRes.status === 200 && blockRes.body.data.isActive === false, 'Admin puede suspender/bloquear cuenta de usuario');

    // 8.4 Usuario bloqueado intenta iniciar sesión -> 403 Denegado
    const blockedLogin = await request('POST', '/api/auth/login', { username: testUsername, password: 'password123' });
    assert(blockedLogin.status === 403, 'Rechaza inicio de sesión de cuenta suspendida/bloqueada (403)');

    // 8.5 Admin reactiva cuenta
    await request('PATCH', `/api/admin/users/${userId}/status`, { isActive: true }, adminToken);

    // 8.6 Admin gestiona configuración global (Hero Banner y versión mínima)
    const configRes = await request('POST', '/api/admin/config', {
      featuredHeroTitle: 'Sintel Edición 4K',
      minAppVersion: '2.0.0'
    }, adminToken);
    assert(configRes.status === 200 && configRes.body.data.minAppVersion === '2.0.0', 'Admin puede modificar banner destacado y versión mínima');

    // 8.7 Admin agrega nuevo título manualmente vía /api/admin/movies
    const newMedia = {
      title: 'Canal Noticias en Vivo HD',
      streamUrl: 'https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main.m3u8',
      category: 'Noticias',
      type: 'iptv'
    };
    const addMediaRes = await request('POST', '/api/admin/movies', newMedia, adminToken);
    assert(addMediaRes.status === 201 && addMediaRes.body.data.title === newMedia.title, 'Admin puede agregar títulos/canales al catálogo');

    console.log(`\n🎉 Resumen de Pruebas: ${testsPassed} de ${totalTests} superadas con éxito.\n`);
  } catch (err) {
    console.error('Error fatal durante la prueba:', err);
  } finally {
    server.close();
  }
}

runTests();
