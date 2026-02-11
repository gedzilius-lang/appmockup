"use client";
import { useState } from "react";

export default function Admin() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

  const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || "demo@peoplewelike.club";
  const DEMO_PASS  = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "demo12345-change";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  const [venueName, setVenueName] = useState("Zurich Demo Venue");
  const [venuePin, setVenuePin] = useState("1234");
  const [venues, setVenues] = useState([]);

  const [eventTitle, setEventTitle] = useState("Demo Night");
  const [eventVenue, setEventVenue] = useState("Zurich Demo Venue");
  const [eventTime, setEventTime] = useState(new Date(Date.now()+86400000).toISOString());

  async function login(e, p) {
    const res = await fetch(`${API}/auth/login`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email: e, password: p })
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "login failed");
    setToken(j.token);
    alert("Logged in");
  }

  async function loginTyped() {
    await login(email, password);
  }

  async function loginDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASS);
    await login(DEMO_EMAIL, DEMO_PASS);
  }

  async function loadVenues() {
    const res = await fetch(`${API}/venues`, { headers:{ Authorization:`Bearer ${token}` }});
    const j = await res.json();
    if (!res.ok) return alert(j.error || "failed");
    setVenues(j);
  }

  async function createVenue() {
    const res = await fetch(`${API}/venues`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({ name: venueName, city:"Zurich", pin: venuePin })
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "failed");
    alert(`Created venue #${j.id}`);
    await loadVenues();
  }

  async function createEvent() {
    const res = await fetch(`${API}/events`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        title: eventTitle,
        starts_at: eventTime,
        venue_name: eventVenue,
        genre: "All nightlife",
        description: "Phase 1 demo event",
        ticket_url: ""
      })
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "failed");
    alert(`Created event #${j.id}`);
  }

  return (
    <main style={{fontFamily:"system-ui", padding:18, maxWidth:980, margin:"0 auto"}}>
      <h1 style={{marginTop:0}}>Operations Admin</h1>
      <p style={{opacity:.8}}>This domain is for staff/operations. Public guest sign-in will live on OS homepage.</p>

      <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, marginBottom:14}}>
        <h2>Sign in</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
          <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={loginTyped}>Sign In</button>
          <button onClick={loginDemo} title="Demo-only button for testing">Sign In Demo</button>
        </div>
      </div>

      <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, marginBottom:14}}>
        <h2>Venues</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <input value={venueName} onChange={e=>setVenueName(e.target.value)} />
          <input value={venuePin} onChange={e=>setVenuePin(e.target.value)} />
          <button onClick={createVenue} disabled={!token}>Create Venue</button>
          <button onClick={loadVenues} disabled={!token}>Refresh</button>
        </div>
        <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(venues, null, 2)}</pre>
      </div>

      <div style={{border:"1px solid #ddd", borderRadius:12, padding:12}}>
        <h2>Create Event</h2>
        <input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} />
        <input value={eventVenue} onChange={e=>setEventVenue(e.target.value)} />
        <input value={eventTime} onChange={e=>setEventTime(e.target.value)} />
        <button onClick={createEvent} disabled={!token}>Create Event</button>
      </div>
    </main>
  );
}
