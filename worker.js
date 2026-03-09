// NINTH LIFE — Leaderboard Worker (Cloudflare Workers + KV)
// Deploy: wrangler deploy
// KV namespace binding: SCORES

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(36);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Root — health check
    if (path === '/' || path === '') {
      return json({
        status: 'ok',
        game: 'Ninth Life Leaderboard',
        endpoints: ['/api/score (POST)', '/api/daily (GET)', '/api/alltime (GET)', '/api/stats (GET)'],
        kv: !!env.SCORES ? 'connected' : 'NOT CONNECTED — run: wrangler kv namespace create SCORES',
      });
    }

    // Check KV is available
    if (!env.SCORES) {
      return json({ error: 'KV namespace SCORES not bound. Run: wrangler kv namespace create SCORES, then update wrangler.toml with the ID and redeploy.' }, 500);
    }

    // POST /api/score
    if (path === '/api/score' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { score, night, won, handle, pid } = body;

        if (!score || !night || typeof score !== 'number') {
          return json({ error: 'Invalid score data' }, 400);
        }

        const date = today();
        const playerId = pid ? hashId(pid) : hashId(request.headers.get('cf-connecting-ip') || 'anon');
        const playerName = (handle || 'Anonymous').slice(0, 16);

        // Rate limit: 1 per player per day (higher overwrites)
        const rateLimitKey = `rate:${date}:${playerId}`;
        const existing = await env.SCORES.get(rateLimitKey);
        if (existing) {
          const prev = JSON.parse(existing);
          if (score <= prev.score) {
            return json({ ok: true, message: 'Higher score exists', rank: prev.rank || null });
          }
        }

        const entry = {
          score: Math.round(score),
          night: Math.min(9, Math.max(1, night)),
          won: !!won,
          handle: playerName,
          pid: playerId,
          ts: Date.now(),
        };

        await env.SCORES.put(rateLimitKey, JSON.stringify(entry), { expirationTtl: 86400 * 2 });

        // Update daily board
        const dailyKey = `daily:${date}`;
        const dailyRaw = await env.SCORES.get(dailyKey);
        let board = dailyRaw ? JSON.parse(dailyRaw) : [];
        board = board.filter(e => e.pid !== playerId);
        board.push(entry);
        board.sort((a, b) => b.score - a.score);
        board = board.slice(0, 50);
        await env.SCORES.put(dailyKey, JSON.stringify(board), { expirationTtl: 86400 * 3 });

        // Update all-time
        const allTimeRaw = await env.SCORES.get('alltime');
        let allTime = allTimeRaw ? JSON.parse(allTimeRaw) : [];
        if (allTime.length < 50 || score > allTime[allTime.length - 1].score) {
          const prevIdx = allTime.findIndex(e => e.pid === playerId);
          if (prevIdx >= 0) {
            if (score > allTime[prevIdx].score) {
              allTime.splice(prevIdx, 1);
              allTime.push({ ...entry, date });
            }
          } else {
            allTime.push({ ...entry, date });
          }
          allTime.sort((a, b) => b.score - a.score);
          allTime = allTime.slice(0, 50);
          await env.SCORES.put('alltime', JSON.stringify(allTime));
        }

        // Stats
        const statsRaw = await env.SCORES.get('stats');
        let stats = statsRaw ? JSON.parse(statsRaw) : { totalRuns: 0, players: {} };
        stats.totalRuns++;
        stats.players[playerId] = (stats.players[playerId] || 0) + 1;
        await env.SCORES.put('stats', JSON.stringify(stats));

        const rank = board.findIndex(e => e.pid === playerId) + 1;
        return json({ ok: true, rank, total: board.length });

      } catch (e) {
        return json({ error: 'Server error', detail: e.message }, 500);
      }
    }

    // GET /api/daily
    if (path === '/api/daily' && request.method === 'GET') {
      const date = url.searchParams.get('date') || today();
      const raw = await env.SCORES.get(`daily:${date}`);
      const board = raw ? JSON.parse(raw) : [];
      return json({
        date,
        board: board.slice(0, 20).map((e, i) => ({
          rank: i + 1, handle: e.handle, score: e.score, night: e.night, won: e.won,
        })),
        total: board.length,
      });
    }

    // GET /api/alltime
    if (path === '/api/alltime' && request.method === 'GET') {
      const raw = await env.SCORES.get('alltime');
      const board = raw ? JSON.parse(raw) : [];
      return json({
        board: board.slice(0, 20).map((e, i) => ({
          rank: i + 1, handle: e.handle, score: e.score, night: e.night, won: e.won, date: e.date,
        })),
      });
    }

    // GET /api/stats
    if (path === '/api/stats' && request.method === 'GET') {
      const raw = await env.SCORES.get('stats');
      const stats = raw ? JSON.parse(raw) : { totalRuns: 0, players: {} };
      return json({
        totalRuns: stats.totalRuns,
        totalPlayers: Object.keys(stats.players).length,
      });
    }

    return json({ error: 'Not found', endpoints: ['/api/score', '/api/daily', '/api/alltime', '/api/stats'] }, 404);
  },
};
