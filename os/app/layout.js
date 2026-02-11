export const metadata = { title: "PeopleWeLike OS" };
export default function RootLayout({ children }) {
  return (
    <html lang="en"><body style={{fontFamily:"system-ui", margin:0}}>
      <div style={{maxWidth: 980, margin:"0 auto", padding: 18}}>
        <div style={{display:"flex", gap:12, alignItems:"center", marginBottom:16}}>
          <a href="/" style={{fontWeight:800, textDecoration:"none"}}>PWL • Zurich</a>
          <a href="/radio">Radio</a>
            <a href="/ops">Ops</a>
          <a href="https://admin.peoplewelike.club" target="_blank">Admin</a>
        </div>
        {children}
      </div>
    </body></html>
  );
}
