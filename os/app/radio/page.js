export default function Radio() {
  const src = process.env.RADIO_IFRAME_SRC;
  return (
    <main>
      <h1 style={{marginTop:0}}>Radio</h1>
      <iframe src={src} style={{width:"100%", height:180, border:"1px solid #ddd", borderRadius:12}} allow="autoplay" />
    </main>
  );
}
