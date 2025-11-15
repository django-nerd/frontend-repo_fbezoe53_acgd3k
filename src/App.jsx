import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function createRoom(name, rules) {
  return fetch(`${API}/api/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, rules }),
  }).then(r => r.json())
}

function joinRoom(code, name) {
  return fetch(`${API}/api/rooms/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(r => r.json())
}

function fetchRoom(code) {
  return fetch(`${API}/api/rooms/${code}`).then(r => r.json())
}

function startRoom(code, playerId) {
  const url = new URL(`${API}/api/rooms/${code}/start`)
  url.searchParams.set('player_id', playerId)
  return fetch(url, { method: 'POST' }).then(r => r.json())
}

function playCard(code, payload) {
  return fetch(`${API}/api/rooms/${code}/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json())
}

function drawCard(code, playerId) {
  return fetch(`${API}/api/rooms/${code}/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_id: playerId }),
  }).then(r => r.json())
}

function setRules(code, rules) {
  return fetch(`${API}/api/rooms/${code}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  }).then(r => r.json())
}

const COLORS = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  wild: 'bg-gray-800',
}

function CardView({ card, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-16 h-24 rounded-xl shadow-md text-white font-bold flex items-center justify-center border-4 border-white transform hover:-translate-y-1 transition ${COLORS[card.color]}`}
    >
      {card.value.toUpperCase()}
    </button>
  )
}

function App() {
  const [step, setStep] = useState('landing')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [me, setMe] = useState(null)
  const [room, setRoom] = useState(null)
  const [rules, setRulesState] = useState({ version: 'classic', stacking: false, seven_o: false, jump_in: false })
  const myTurn = useMemo(() => room && me && room.players[room.current_player_index]?.player_id === me, [room, me])

  useEffect(() => {
    let t
    if (roomCode) {
      const poll = async () => {
        const r = await fetchRoom(roomCode)
        setRoom(r)
      }
      poll()
      t = setInterval(poll, 1200)
    }
    return () => clearInterval(t)
  }, [roomCode])

  const handleCreate = async () => {
    const res = await createRoom(name, rules)
    setRoomCode(res.code)
    setMe(res.player_id)
    setRoom(res.room)
    setStep('lobby')
  }

  const handleJoin = async () => {
    const res = await joinRoom(roomCode.trim().toUpperCase(), name)
    setMe(res.player_id)
    setRoom(res.room)
    setStep('lobby')
  }

  const handleStart = async () => {
    const r = await startRoom(roomCode, me)
    setRoom(r)
    setStep('game')
  }

  const handlePlay = async (i) => {
    const card = room.players.find(p => p.player_id === me).hand[i]
    let payload = { player_id: me, card_index: i }
    if (card.color === 'wild') {
      // pick most common color in hand
      const counts = { red:0, yellow:0, green:0, blue:0 }
      for (const c of room.players.find(p => p.player_id === me).hand) {
        if (counts[c.color] !== undefined) counts[c.color]++
      }
      const chosen = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0]
      payload.chosen_color = chosen
    }
    const r = await playCard(roomCode, payload)
    setRoom(r)
  }

  const handleDraw = async () => {
    const r = await drawCard(roomCode, me)
    setRoom(r)
  }

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h1 className="text-3xl font-extrabold mb-4">UNO with Friends</h1>
          <p className="mb-6 opacity-90">Create a room, share the code, and play. Switch between classic and party rules.</p>

          <div className="space-y-4">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-white/20 placeholder-white/70 focus:outline-none" />

            <div className="bg-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span>Version</span>
                <select value={rules.version} onChange={e=>setRulesState(s=>({ ...s, version: e.target.value }))} className="px-3 py-2 rounded bg-white/20">
                  <option value="classic">Classic</option>
                  <option value="party">Party</option>
                </select>
              </div>
              <label className="flex items-center justify-between">
                <span>Stacking</span>
                <input type="checkbox" checked={rules.stacking} onChange={e=>setRulesState(s=>({ ...s, stacking: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between">
                <span>7-0 Handswap</span>
                <input type="checkbox" checked={rules.seven_o} onChange={e=>setRulesState(s=>({ ...s, seven_o: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between">
                <span>Jump-in</span>
                <input type="checkbox" checked={rules.jump_in} onChange={e=>setRulesState(s=>({ ...s, jump_in: e.target.checked }))} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCreate} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl">Create Room</button>

              <div className="flex gap-2">
                <input value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} placeholder="Code" className="flex-1 px-3 py-3 rounded-xl bg-white/20 placeholder-white/70 focus:outline-none" />
                <button onClick={handleJoin} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl px-4">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'lobby' && room) {
    const host = room.players.find(p => p.is_host)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Room {roomCode}</h2>
            <div className="text-sm opacity-90">Share this code with your friends</div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white/10 rounded-2xl p-4">
              <h3 className="font-semibold mb-2">Players</h3>
              <div className="flex gap-2 flex-wrap">
                {room.players.map(p => (
                  <div key={p.player_id} className={`px-4 py-2 rounded-xl ${p.player_id===me ? 'bg-green-500' : 'bg-white/20'}`}>{p.name}{p.is_host ? ' (Host)' : ''}</div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold">Rules</h3>
              <div className="text-sm opacity-90">Version: {room.rules.version}</div>
              <div className="text-sm opacity-90">Stacking: {room.rules.stacking ? 'On' : 'Off'}</div>
              <div className="text-sm opacity-90">7-0: {room.rules.seven_o ? 'On' : 'Off'}</div>
              <div className="text-sm opacity-90">Jump-in: {room.rules.jump_in ? 'On' : 'Off'}</div>

              {host && host.player_id === me && (
                <button onClick={handleStart} className="w-full bg-green-500 hover:bg-green-600 py-2 rounded-xl font-semibold">Start Game</button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'game' && room) {
    const mePlayer = room.players.find(p => p.player_id === me)
    const top = room.discard_pile[room.discard_pile.length-1]

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 text-gray-900 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">Room {roomCode} • {room.rules.version.toUpperCase()} • Turn: {room.players[room.current_player_index].name}</div>
            {room.winner_id && <div className="text-lg font-bold">Winner: {room.players.find(p=>p.player_id===room.winner_id)?.name}</div>}
          </div>

          <div className="flex gap-4 items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="text-xs mb-1">Discard</div>
              <CardView card={top} />
            </div>
            <button onClick={handleDraw} disabled={!myTurn} className={`px-4 py-3 rounded-xl font-semibold text-white ${myTurn ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}>Draw</button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Your hand ({mePlayer.hand.length})</h3>
            <div className="flex gap-2 flex-wrap">
              {mePlayer.hand.map((c, i) => (
                <CardView key={i} card={c} onClick={() => myTurn && handlePlay(i)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App
