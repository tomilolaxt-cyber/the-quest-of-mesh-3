"""
Quest of Mesh 3 - Multiplayer WebSocket Server
Modes: RANDOM (matchmaking), AI, FRIEND (by username)
Roles: FIGHTER (plays hero) vs MESH MASTER (controls enemies)
"""
import asyncio
import json
import os
import http.server
import threading
from pathlib import Path

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    import subprocess
    subprocess.check_call(["pip", "install", "websockets==12.0"])
    import websockets

PORT = int(os.environ.get("PORT", 6902))
WS_PORT = int(os.environ.get("WS_PORT", 6903))
BASE_DIR = Path(__file__).parent

# === GAME STATE ===
waiting_players = []  # Players waiting for random match
active_games = {}     # game_id -> {fighter: ws, master: ws, state: {}}
player_names = {}     # ws -> username
player_ws = {}        # username -> ws


class GameRoom:
    def __init__(self, fighter_ws, master_ws, fighter_name, master_name):
        self.fighter = fighter_ws
        self.master = master_ws
        self.fighter_name = fighter_name
        self.master_name = master_name
        self.state = {
            "fighter": {"x": 100, "y": 0, "hp": 300, "facing": 1, "attacking": False},
            "enemies": [],
            "active": True,
        }
        # Master starts with points to spawn enemies
        self.master_points = 100
        self.master_regen = 5  # points per second

    async def broadcast(self, msg):
        data = json.dumps(msg)
        try:
            await self.fighter.send(data)
        except:
            pass
        try:
            await self.master.send(data)
        except:
            pass

    async def send_fighter(self, msg):
        try:
            await self.fighter.send(json.dumps(msg))
        except:
            pass

    async def send_master(self, msg):
        try:
            await self.master.send(json.dumps(msg))
        except:
            pass


rooms = {}  # room_id -> GameRoom
room_counter = 0


async def handle_connection(ws):
    """Handle a new WebSocket connection"""
    username = None
    room_id = None

    try:
        async for message in ws:
            data = json.loads(message)
            action = data.get("action")

            if action == "register":
                username = data.get("username", "Player")
                player_names[ws] = username
                player_ws[username] = ws
                await ws.send(json.dumps({"type": "registered", "username": username}))
                print(f"[+] {username} connected")

            elif action == "find_random":
                # Add to waiting list
                if ws not in waiting_players:
                    waiting_players.append(ws)
                    await ws.send(json.dumps({"type": "waiting", "msg": "Looking for opponent..."}))

                # If 2 players waiting, match them
                if len(waiting_players) >= 2:
                    p1 = waiting_players.pop(0)
                    p2 = waiting_players.pop(0)
                    room_id = await create_room(p1, p2)

            elif action == "find_friend":
                target = data.get("target", "")
                if target in player_ws:
                    target_ws = player_ws[target]
                    room_id = await create_room(ws, target_ws)
                else:
                    await ws.send(json.dumps({"type": "error", "msg": f"Player '{target}' not found or offline"}))

            elif action == "play_ai":
                # Create room with AI (master is None)
                room_id = await create_ai_room(ws)

            elif action == "fighter_update":
                # Fighter sends their position/state
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    room.state["fighter"] = data.get("state", {})
                    await room.send_master({"type": "fighter_state", "state": room.state["fighter"]})

            elif action == "master_spawn":
                # Mesh Master spawns an enemy
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    cost = data.get("cost", 20)
                    if room.master_points >= cost:
                        room.master_points -= cost
                        enemy = data.get("enemy", {})
                        room.state["enemies"].append(enemy)
                        await room.broadcast({"type": "enemy_spawned", "enemy": enemy, "master_points": room.master_points})

            elif action == "master_ability":
                # Mesh Master uses an ability on enemies
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    ability = data.get("ability", "")
                    cost = data.get("cost", 30)
                    if room.master_points >= cost:
                        room.master_points -= cost
                        await room.broadcast({"type": "master_ability", "ability": ability, "master_points": room.master_points})

            elif action == "fighter_hit":
                # Fighter hit an enemy
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    await room.send_master({"type": "enemy_hit", "index": data.get("index"), "damage": data.get("damage")})

            elif action == "enemy_attack":
                # Enemy attacked the fighter (master confirms)
                if room_id and room_id in rooms:
                    room = rooms[room_id]
                    await room.send_fighter({"type": "take_damage", "damage": data.get("damage", 10)})

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Cleanup
        if ws in waiting_players:
            waiting_players.remove(ws)
        if username:
            player_ws.pop(username, None)
            print(f"[-] {username} disconnected")
        player_names.pop(ws, None)
        # End any active room
        if room_id and room_id in rooms:
            room = rooms[room_id]
            await room.broadcast({"type": "opponent_left", "msg": "Opponent disconnected"})
            del rooms[room_id]


async def create_room(p1_ws, p2_ws):
    """Create a game room - p1 is fighter, p2 is master"""
    global room_counter
    room_counter += 1
    rid = f"room_{room_counter}"

    p1_name = player_names.get(p1_ws, "Fighter")
    p2_name = player_names.get(p2_ws, "Mesh Master")

    room = GameRoom(p1_ws, p2_ws, p1_name, p2_name)
    rooms[rid] = room

    await p1_ws.send(json.dumps({"type": "game_start", "role": "fighter", "opponent": p2_name, "room": rid}))
    await p2_ws.send(json.dumps({"type": "game_start", "role": "master", "opponent": p1_name, "room": rid}))

    print(f"[GAME] {p1_name} (fighter) vs {p2_name} (master) in {rid}")

    # Start master point regen
    asyncio.create_task(regen_points(rid))

    return rid


async def create_ai_room(ws):
    """Create a room where AI controls the master"""
    global room_counter
    room_counter += 1
    rid = f"room_ai_{room_counter}"

    name = player_names.get(ws, "Player")
    room = GameRoom(ws, None, name, "AI")
    rooms[rid] = room

    await ws.send(json.dumps({"type": "game_start", "role": "fighter", "opponent": "AI Mesh Master", "room": rid}))

    # AI spawns enemies periodically
    asyncio.create_task(ai_master(rid))

    print(f"[AI GAME] {name} vs AI")
    return rid


async def regen_points(room_id):
    """Regenerate master points over time"""
    while room_id in rooms:
        await asyncio.sleep(1)
        if room_id in rooms:
            room = rooms[room_id]
            room.master_points = min(200, room.master_points + room.master_regen)
            if room.master:
                await room.send_master({"type": "points_update", "points": room.master_points})


async def ai_master(room_id):
    """AI Mesh Master that spawns enemies automatically"""
    await asyncio.sleep(3)  # Give player time to start
    wave = 0
    while room_id in rooms:
        wave += 1
        room = rooms.get(room_id)
        if not room:
            break

        # Spawn wave of enemies
        num = min(3 + wave, 10)
        for i in range(num):
            if room_id not in rooms:
                break
            enemy = {
                "x": room.state["fighter"].get("x", 100) + 200 + i * 80,
                "y": 0,
                "hp": 50 + wave * 15,
                "dmg": 5 + wave * 2,
                "speed": 80 + wave * 10,
                "type": ["grunt", "fast", "tank"][i % 3],
            }
            room.state["enemies"].append(enemy)
            await room.send_fighter({"type": "enemy_spawned", "enemy": enemy, "wave": wave})
            await asyncio.sleep(0.5)

        # Wait for next wave
        await asyncio.sleep(8 + wave * 2)


# === HTTP SERVER (serves static files) ===
class StaticHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR / "public"), **kwargs)

    def log_message(self, format, *args):
        pass  # Quiet


def run_http():
    with http.server.HTTPServer(("", PORT), StaticHandler) as httpd:
        print(f"  HTTP: http://localhost:{PORT}")
        httpd.serve_forever()


# === MAIN ===
async def main():
    print("=" * 50)
    print("  QUEST OF MESH 3 - Multiplayer Server")
    print("=" * 50)

    # Start HTTP in a thread
    http_thread = threading.Thread(target=run_http, daemon=True)
    http_thread.start()

    # Start WebSocket server
    print(f"  WebSocket: ws://localhost:{WS_PORT}")
    print("=" * 50)

    async with websockets.serve(handle_connection, "0.0.0.0", WS_PORT):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
