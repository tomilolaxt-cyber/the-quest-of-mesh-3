/**
 * Quest of Mesh 3 - Multiplayer WebSocket Server (Node.js)
 * Modes: RANDOM, AI, FRIEND
 * Roles: FIGHTER vs MESH MASTER
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 6902;
const PUBLIC = path.join(__dirname, 'public');

// === ACCOUNTS ===
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
function loadAccounts() { try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); } catch { return {}; } }
function saveAccounts(a) { fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(a, null, 2)); }

// === HTTP SERVER (serves game files + auth API) ===
const server = http.createServer((req, res) => {
    // API routes
    if (req.method === 'POST' && req.url.startsWith('/api/')) {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            let data = {}; try { data = JSON.parse(body); } catch {}
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (req.url === '/api/register') {
                const u = (data.username || '').trim(), p = (data.password || '').trim();
                if (!u || !p || u.length < 2) { res.end(JSON.stringify({ok:false,err:'Username 2+ chars and password required'})); return; }
                const accs = loadAccounts();
                if (accs[u]) { res.end(JSON.stringify({ok:false,err:'Username taken'})); return; }
                accs[u] = { pw: p, avatar: data.avatar || {}, lv: 1, money: 3000, xp: 0, pvp_wins: 0, pvp_losses: 0, world: 0 };
                saveAccounts(accs);
                res.end(JSON.stringify({ok:true,account:accs[u],username:u}));
            }
            else if (req.url === '/api/login') {
                const u = (data.username || '').trim(), p = (data.password || '').trim();
                const accs = loadAccounts();
                if (!accs[u]) { res.end(JSON.stringify({ok:false,err:'Account not found'})); return; }
                if (accs[u].pw !== p) { res.end(JSON.stringify({ok:false,err:'Wrong password'})); return; }
                res.end(JSON.stringify({ok:true,account:accs[u],username:u}));
            }
            else if (req.url === '/api/save') {
                const u = data.username || '';
                const accs = loadAccounts();
                if (accs[u]) { Object.assign(accs[u], {lv:data.lv,money:data.money,xp:data.xp,pvp_wins:data.pvp_wins||0,pvp_losses:data.pvp_losses||0,world:data.world||0,avatar:data.avatar||accs[u].avatar}); saveAccounts(accs); res.end(JSON.stringify({ok:true})); }
                else res.end(JSON.stringify({ok:false}));
            }
            else if (req.url === '/api/pvp-list') {
                const accs = loadAccounts();
                const me = data.username || '';
                const list = Object.entries(accs).filter(([k])=>k!==me).map(([k,v])=>({name:k,lv:v.lv||1,wins:v.pvp_wins||0})).sort((a,b)=>b.lv-a.lv).slice(0,10);
                res.end(JSON.stringify({ok:true,players:list}));
            }
            else { res.writeHead(404); res.end('{}'); }
        });
        return;
    }
    if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); res.writeHead(200); res.end(); return; }

    let filePath = path.join(PUBLIC, req.url === '/' ? 'index.html' : req.url);
    let ext = path.extname(filePath);
    let contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png' }[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// === WEBSOCKET SERVER ===
const wss = new WebSocket.Server({ server });

let waitingPlayers = [];
let rooms = {};
let playerNames = new Map(); // ws -> username
let playerWS = new Map();   // username -> ws
let roomCounter = 0;

wss.on('connection', (ws) => {
    let username = null;
    let roomId = null;

    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw); } catch { return; }
        const action = data.action;

        if (action === 'register') {
            username = data.username || 'Player';
            playerNames.set(ws, username);
            playerWS.set(username, ws);
            ws.send(JSON.stringify({ type: 'registered', username }));
            console.log(`[+] ${username} connected`);
        }

        else if (action === 'create_room') {
            const code = data.code || '';
            if (!code) return;
            // Store room with host waiting
            rooms[code] = { host: ws, guest: null, code };
            ws.send(JSON.stringify({ type: 'waiting', msg: 'Room created: ' + code }));
            console.log(`[ROOM] ${data.username} created room ${code}`);
        }

        else if (action === 'join_room') {
            const code = (data.code || '').toUpperCase();
            const room = rooms[code];
            if (!room) {
                ws.send(JSON.stringify({ type: 'room_error', msg: 'Room not found: ' + code }));
                return;
            }
            if (room.guest) {
                ws.send(JSON.stringify({ type: 'room_error', msg: 'Room is full' }));
                return;
            }
            room.guest = ws;
            roomId = code;
            // Tell host
            sendTo(room.host, { type: 'room_ready', opponent: data.username || 'Guest', room: code });
            // Tell guest
            ws.send(JSON.stringify({ type: 'room_joined', opponent: playerNames.get(room.host) || 'Host', room: code }));
            console.log(`[ROOM] ${data.username} joined room ${code}`);
        }

        else if (action === 'player_pos') {
            // Relay position to the other player in the same room
            const code = data.room || roomId;
            const room = rooms[code];
            if (room) {
                const other = room.host === ws ? room.guest : room.host;
                sendTo(other, { type: 'player_pos', x: data.x, y: data.y, facing: data.facing, attacking: data.attacking, name: data.name, avatar: data.avatar });
            }
        }

        else if (action === 'player_attack') {
            const code = data.room || roomId;
            const room = rooms[code];
            if (room) {
                const other = room.host === ws ? room.guest : room.host;
                sendTo(other, { type: 'player_attack' });
            }
        }

        else if (action === 'find_random') {
            if (!waitingPlayers.includes(ws)) {
                waitingPlayers.push(ws);
                ws.send(JSON.stringify({ type: 'waiting', msg: 'Looking for opponent...' }));
            }
            if (waitingPlayers.length >= 2) {
                const p1 = waitingPlayers.shift();
                const p2 = waitingPlayers.shift();
                roomId = createRoom(p1, p2);
            }
        }

        else if (action === 'find_friend') {
            const target = data.target || '';
            if (playerWS.has(target)) {
                roomId = createRoom(ws, playerWS.get(target));
            } else {
                ws.send(JSON.stringify({ type: 'error', msg: `'${target}' not found or offline` }));
            }
        }

        else if (action === 'play_ai') {
            roomId = createAIRoom(ws);
        }

        else if (action === 'fighter_update') {
            if (roomId && rooms[roomId]) {
                const room = rooms[roomId];
                room.fighterState = data.state || {};
                sendTo(room.master, { type: 'fighter_state', state: room.fighterState });
            }
        }

        else if (action === 'master_spawn') {
            if (roomId && rooms[roomId]) {
                const room = rooms[roomId];
                const cost = data.cost || 20;
                if (room.masterPoints >= cost) {
                    room.masterPoints -= cost;
                    broadcast(room, { type: 'enemy_spawned', enemy: data.enemy, master_points: room.masterPoints });
                }
            }
        }

        else if (action === 'master_ability') {
            if (roomId && rooms[roomId]) {
                const room = rooms[roomId];
                const cost = data.cost || 30;
                if (room.masterPoints >= cost) {
                    room.masterPoints -= cost;
                    broadcast(room, { type: 'master_ability', ability: data.ability, master_points: room.masterPoints });
                }
            }
        }

        else if (action === 'fighter_hit') {
            if (roomId && rooms[roomId]) {
                sendTo(rooms[roomId].master, { type: 'enemy_hit', index: data.index, damage: data.damage });
            }
        }

        else if (action === 'enemy_attack') {
            if (roomId && rooms[roomId]) {
                sendTo(rooms[roomId].fighter, { type: 'take_damage', damage: data.damage || 10 });
            }
        }
    });

    ws.on('close', () => {
        waitingPlayers = waitingPlayers.filter(p => p !== ws);
        if (username) { playerWS.delete(username); console.log(`[-] ${username} left`); }
        playerNames.delete(ws);
        if (roomId && rooms[roomId]) {
            broadcast(rooms[roomId], { type: 'opponent_left', msg: 'Opponent disconnected' });
            clearInterval(rooms[roomId].regenInterval);
            if (rooms[roomId].aiInterval) clearInterval(rooms[roomId].aiInterval);
            delete rooms[roomId];
        }
    });
});

function createRoom(p1, p2) {
    roomCounter++;
    const rid = 'room_' + roomCounter;
    const p1Name = playerNames.get(p1) || 'Fighter';
    const p2Name = playerNames.get(p2) || 'Mesh Master';

    const room = { fighter: p1, master: p2, fighterState: {}, masterPoints: 100, regenInterval: null };
    rooms[rid] = room;

    sendTo(p1, { type: 'game_start', role: 'fighter', opponent: p2Name, room: rid });
    sendTo(p2, { type: 'game_start', role: 'master', opponent: p1Name, room: rid });

    // Regen master points
    room.regenInterval = setInterval(() => {
        if (!rooms[rid]) return;
        room.masterPoints = Math.min(200, room.masterPoints + 5);
        sendTo(room.master, { type: 'points_update', points: room.masterPoints });
    }, 1000);

    console.log(`[GAME] ${p1Name} vs ${p2Name}`);
    return rid;
}

function createAIRoom(ws) {
    roomCounter++;
    const rid = 'ai_' + roomCounter;
    const name = playerNames.get(ws) || 'Player';

    const room = { fighter: ws, master: null, fighterState: { x: 100 }, masterPoints: 999, regenInterval: null, aiInterval: null };
    rooms[rid] = room;

    sendTo(ws, { type: 'game_start', role: 'fighter', opponent: 'AI Mesh Master', room: rid });

    // AI spawns enemies
    let wave = 0;
    room.aiInterval = setInterval(() => {
        if (!rooms[rid]) return;
        wave++;
        const num = Math.min(3 + wave, 8);
        for (let i = 0; i < num; i++) {
            const enemy = {
                x: (room.fighterState.x || 100) + 200 + i * 70,
                y: 0, hp: 40 + wave * 12, dmg: 4 + wave * 2, speed: 70 + wave * 8,
                type: ['grunt', 'fast', 'tank'][i % 3]
            };
            sendTo(ws, { type: 'enemy_spawned', enemy, wave });
        }
    }, 10000);

    console.log(`[AI] ${name} vs AI`);
    return rid;
}

function sendTo(ws, msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

function broadcast(room, msg) {
    sendTo(room.fighter, msg);
    sendTo(room.master, msg);
}

// === START ===
server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('  QUEST OF MESH 3 - Multiplayer Server');
    console.log(`  http://localhost:${PORT}`);
    console.log(`  WebSocket on same port (upgrade)`);
    console.log('='.repeat(50));
});
