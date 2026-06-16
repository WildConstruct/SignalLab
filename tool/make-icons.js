// =============================================================================
//  tool/make-icons.js
//  Builds the home-screen / PWA icons from the hand-designed source art
//  (tool/icon-src.png) with no dependencies — pure Node: PNG decode (inflate +
//  un-filter), area-average downscale, PNG re-encode (deflate + CRC). Run:
//      node tool/make-icons.js
//  Emits icon-180.png (apple-touch-icon), icon-192.png, icon-512.png.
// =============================================================================
const zlib = require("zlib"), fs = require("fs"), path = require("path");

// ---- PNG encode (8-bit RGBA) ----
function crc32(buf){ let c=~0; for(let i=0;i<buf.length;i++){ c^=buf[i]; for(let k=0;k<8;k++) c=(c>>>1)^(0xEDB88320 & -(c&1)); } return (~c)>>>0; }
function chunk(type,data){ const t=Buffer.from(type,"ascii"), len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const body=Buffer.concat([t,data]), crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(body),0); return Buffer.concat([len,body,crc]); }
function encodePNG(W,H,rgba){ const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6;
  const stride=W*4+1, raw=Buffer.alloc(stride*H);
  for(let y=0;y<H;y++){ raw[y*stride]=0; rgba.copy(raw,y*stride+1,y*W*4,(y+1)*W*4); }
  return Buffer.concat([sig, chunk("IHDR",ihdr), chunk("IDAT",zlib.deflateSync(raw,{level:9})), chunk("IEND",Buffer.alloc(0))]); }

// ---- PNG decode (8-bit, non-interlaced; gray/RGB/GA/RGBA) ----
function decodePNG(buf){
  let p=8, W,H,bd,ct; const idat=[];
  while(p<buf.length){ const len=buf.readUInt32BE(p), type=buf.toString("ascii",p+4,p+8), data=buf.subarray(p+8,p+8+len);
    if(type==="IHDR"){ W=data.readUInt32BE(0); H=data.readUInt32BE(4); bd=data[8]; ct=data[9]; }
    else if(type==="IDAT") idat.push(data); else if(type==="IEND") break; p+=12+len; }
  if(bd!==8) throw new Error("only 8-bit PNGs supported (got "+bd+")");
  const ch = ct===6?4 : ct===2?3 : ct===4?2 : 1;
  const raw=zlib.inflateSync(Buffer.concat(idat)), stride=W*ch, out=Buffer.alloc(H*stride);
  for(let y=0;y<H;y++){ const ft=raw[y*(stride+1)], row=raw.subarray(y*(stride+1)+1, y*(stride+1)+1+stride), prev=y>0?out.subarray((y-1)*stride,y*stride):null;
    for(let i=0;i<stride;i++){ const a=i>=ch?out[y*stride+i-ch]:0, b=prev?prev[i]:0, c=(prev&&i>=ch)?prev[i-ch]:0; let v=row[i];
      if(ft===1) v+=a; else if(ft===2) v+=b; else if(ft===3) v+=((a+b)>>1);
      else if(ft===4){ const pp=a+b-c, pa=Math.abs(pp-a), pb=Math.abs(pp-b), pc=Math.abs(pp-c); v+= (pa<=pb&&pa<=pc)?a:(pb<=pc)?b:c; }
      out[y*stride+i]=v&255; } }
  return {W,H,ch,data:out};
}

// ---- area-average downscale → RGBA ----
function resize(src,W,H,ch,T){ const out=Buffer.alloc(T*T*4);
  for(let ty=0;ty<T;ty++){ const sy0=Math.floor(ty*H/T), sy1=Math.max(sy0+1,Math.floor((ty+1)*H/T));
    for(let tx=0;tx<T;tx++){ const sx0=Math.floor(tx*W/T), sx1=Math.max(sx0+1,Math.floor((tx+1)*W/T));
      let r=0,g=0,b=0,a=0,n=0;
      for(let sy=sy0;sy<sy1;sy++) for(let sx=sx0;sx<sx1;sx++){ const si=(sy*W+sx)*ch;
        if(ch>=3){ r+=src[si]; g+=src[si+1]; b+=src[si+2]; a+= ch===4?src[si+3]:255; }
        else { const v=src[si]; r+=v; g+=v; b+=v; a+= ch===2?src[si+1]:255; } n++; }
      const oi=(ty*T+tx)*4; out[oi]=r/n|0; out[oi+1]=g/n|0; out[oi+2]=b/n|0; out[oi+3]=a/n|0; } }
  return out;
}

const src=decodePNG(fs.readFileSync(path.join(__dirname,"icon-src.png")));
console.log("source", src.W+"x"+src.H, "ch="+src.ch);
for(const S of [180,192,512]){ fs.writeFileSync(path.join(__dirname,`icon-${S}.png`), encodePNG(S,S, resize(src.data,src.W,src.H,src.ch,S))); console.log("wrote icon-"+S+".png"); }
