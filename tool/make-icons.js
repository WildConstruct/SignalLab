// =============================================================================
//  tool/make-icons.js
//  Generates the Signal Rack home-screen / PWA icons with no dependencies
//  (pure Node: zlib for PNG IDAT, manual chunk + CRC encoding). Run:
//      node tool/make-icons.js
//  Produces icon-180.png (apple-touch-icon), icon-192.png, icon-512.png.
//  Design: dark scope background, amber rounded-square brand frame, and a
//  glowing green signal waveform through the middle — the tool at a glance.
// =============================================================================
const zlib = require("zlib"), fs = require("fs"), path = require("path");

function crc32(buf){ let c = ~0; for (let i=0;i<buf.length;i++){ c ^= buf[i]; for (let k=0;k<8;k++) c = (c>>>1) ^ (0xEDB88320 & -(c&1)); } return (~c)>>>0; }
function chunk(type, data){ const t = Buffer.from(type,"ascii"); const len = Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const body = Buffer.concat([t,data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body),0); return Buffer.concat([len,body,crc]); }
function encodePNG(W,H,rgba){ const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6; // 8-bit, RGBA
  const stride = W*4+1, raw = Buffer.alloc(stride*H);
  for (let y=0;y<H;y++){ raw[y*stride]=0; rgba.copy(raw, y*stride+1, y*W*4, (y+1)*W*4); }
  const idat = zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig, chunk("IHDR",ihdr), chunk("IDAT",idat), chunk("IEND",Buffer.alloc(0))]); }

const clamp01 = v => v<0?0:v>1?1:v;
const mix = (a,b,t) => a+(b-a)*t;
const lerpC = (a,b,t) => [mix(a[0],b[0],t), mix(a[1],b[1],t), mix(a[2],b[2],t)];
// signed distance to a rounded square outline (negative inside)
function rrSDF(x,y,cx,cy,h,r){ const qx=Math.abs(x-cx)-(h-r), qy=Math.abs(y-cy)-(h-r);
  return Math.hypot(Math.max(qx,0),Math.max(qy,0)) + Math.min(Math.max(qx,qy),0) - r; }

function render(S){
  const buf = Buffer.alloc(S*S*4), cx=S/2, cy=S/2;
  const hw=S*0.32, rr=S*0.13, sw=S*0.042;          // brand frame
  const period=S*0.135, amp=S*0.115, lw=S*0.020;    // waveform
  for (let y=0;y<S;y++) for (let x=0;x<S;x++){
    const i=(y*S+x)*4;
    const dr=Math.min(1, Math.hypot(x-cx,y-cy)/(S*0.72));
    let [r,g,b]=lerpC([15,21,30],[7,9,11], dr);       // radial dark bg
    // glowing green waveform (drawn first so the frame sits on top)
    const wy=cy+Math.sin((x-cx)/period*Math.PI*2 + 0.4)*amp, dist=Math.abs(y-wy);
    const glow=Math.exp(-(dist*dist)/(2*(S*0.045)*(S*0.045)));
    r=mix(r,54,glow*0.35); g=mix(g,240,glow*0.9); b=mix(b,154,glow*0.6);
    if (dist<lw){ const aa=clamp01(lw-dist); r=mix(r,190,aa); g=mix(g,255,aa); b=mix(b,215,aa); }
    // amber rounded-square frame
    const sdf=rrSDF(x,y,cx,cy,hw,rr), edge=Math.abs(sdf)-sw;
    if (edge<1){ const aa=clamp01(0.6-edge); const amb=lerpC([240,182,72],[183,122,29], clamp01((y-(cy-hw))/(2*hw)));
      r=mix(r,amb[0],aa); g=mix(g,amb[1],aa); b=mix(b,amb[2],aa); }
    buf[i]=Math.round(clamp01(r/255)*255); buf[i+1]=Math.round(clamp01(g/255)*255); buf[i+2]=Math.round(clamp01(b/255)*255); buf[i+3]=255;
  }
  return buf;
}

for (const S of [180,192,512]){
  const out = path.join(__dirname, `icon-${S}.png`);
  fs.writeFileSync(out, encodePNG(S,S, render(S)));
  console.log("wrote", out);
}
