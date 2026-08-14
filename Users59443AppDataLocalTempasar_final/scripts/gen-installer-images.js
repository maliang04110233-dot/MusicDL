#!/usr/bin/env node
/** 生成 NSIS 安装器品牌图片（8-bit indexed BMP，256 色） */
const fs = require('fs');

// ── 字母像素表 ──────────────────────────────────────────
const LETTERS = {
  M: [[1,0,1,0,1],[1,1,1,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  u: [[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,1,0],[0,1,0,1,0]],
  s: [[0,0,1,1,0],[1,0,0,0,0],[0,0,1,1,0],[0,1,0,0,0],[0,1,1,1,0]],
  i: [[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
  c: [[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0]],
  D: [[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,1,0,0,0]],
  L: [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
};

function isInTextPixel(x, y, ty, tx0) {
  const word = ['M','u','s','i','c','D','L'];
  let tx = tx0;
  for (const ch of word) {
    const pat = LETTERS[ch];
    if (!pat) { tx += 6; continue; }
    for (let dy = 0; dy < pat.length; dy++)
      for (let dx = 0; dx < 5; dx++)
        if (pat[dy][dx] && x === tx+dx && y === ty+dy) return true;
    tx += 6;
  }
  return false;
}

function isNotePixel(x, y, ox, oy) {
  if (y >= oy+12 && y <= oy+17 && x >= ox+2 && x <= ox+9) {
    const dx = x-ox-5.5, dy = y-oy-14.5;
    if ((dx*dx)/12 + (dy*dy)/6 < 1) return true;
  }
  if (y >= oy+6 && y <= oy+17 && x >= ox+8 && x <= ox+10) return true;
  if (y >= oy+6 && y <= oy+12 && x >= ox+9 && x <= ox+16) return true;
  return false;
}

// ── BMP 写入 ──────────────────────────────────────────
function writeIndexedBMP(path, w, h, palette, drawFn) {
  const row = Math.ceil(w/4)*4, pSize = row*h, pal = 1024, fs2 = 54+pal+pSize;
  const b = Buffer.alloc(fs2);
  b[0]=0x42; b[1]=0x4D;
  writeU32(b,2,fs2); writeU32(b,14,66+pal);
  writeU32(b,18,40); writeU32(b,22,w); writeU32(b,26,h);
  writeU16(b,30,1); writeU16(b,32,8); writeU32(b,34,0);
  writeU32(b,38,pSize); writeU32(b,50,256); writeU32(b,54,256);
  for (let i=0;i<256;i++) { const c=palette[i]; b[66+i*4]=c[0]; b[67+i*4]=c[1]; b[68+i*4]=c[2]; }
  const po = 66+pal;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) b[po+y*row+x] = drawFn(x,y,w,h);
  fs.writeFileSync(path,b);
  console.log('Wrote', path, '('+w+'x'+h+','+fs2+' bytes)');
}

function writeU32(b,o,v){b[o]=v&0xFF;b[o+1]=(v>>8)&0xFF;b[o+2]=(v>>16)&0xFF;b[o+3]=(v>>24)&0xFF;}
function writeU16(b,o,v){b[o]=v&0xFF;b[o+1]=(v>>8)&0xFF;}

// ── 调色板 ──────────────────────────────────────────
const palette = new Array(256).fill([0,0,0]);
for (let i=0;i<224;i++){const t=i/223; palette[i]=[Math.round(12+t*35),Math.round(18+t*45),Math.round(36+t*70)];}
for (let i=0;i<8;i++){const t=i/7; palette[224+i]=[Math.round(60+t*100),Math.round(100+t*120),Math.round(180+t*60)];}
for (let i=0;i<16;i++){const t=i/15; palette[232+i]=[Math.round(80+t*175),Math.round(140+t*115),Math.round(200+t*55)];}

function find(r,g,bl){let bi=0,bd=1e9;for(let i=0;i<256;i++){const c=palette[i],dr=r-c[0],dg=g-c[1],db=bl-c[2],d=dr*dr+dg*dg+db*db;if(d<bd){bd=d;bi=i;}}return bi;}

// ── 顶部横幅 150x58 ─────────────────────────────────
writeIndexedBMP('build/installerHeader.bmp', 150, 58, palette, (x,y)=>{
  const cx=75;
  const [br,bg,bb]=[Math.round(12+(y/58)*20),Math.round(18+(y/58)*30),Math.round(36+(y/58)*52)];
  const dx=(x-cx)/(75), dy=(y-29)/29, dist=Math.sqrt(dx*dx+dy*dy), glow=Math.max(0,1-dist);
  const tr=Math.round(br+glow*40), tg=Math.round(bg+glow*55), tb=Math.round(bb+glow*80);
  if (isNotePixel(x,y,8,18)) return find(120,200,255);
  if (isInTextPixel(x,y,16,12)) return find(235,245,255);
  return find(tr,tg,tb);
});

// ── 侧边栏 164x314 ─────────────────────────────────
writeIndexedBMP('build/installerSidebar.bmp', 164, 314, palette, (x,y)=>{
  const [br,bg,bb]=[Math.round(10+(y/314)*16),Math.round(15+(y/314)*25),Math.round(30+(y/314)*45)];
  const lg=Math.exp(-(x/164)*4)*0.4;
  const dy=(y-157)/157, gl=Math.exp(-(dy*dy))*0.2;
  const tr=Math.round(br+(lg+gl)*60), tg=Math.round(bg+(lg+gl)*80), tb=Math.round(bb+(lg+gl)*100);
  if (isNotePixel(x,y,50,80)||isNotePixel(x,y,25,150)||isNotePixel(x,y,85,200)) return find(100,180,255);
  if (isInTextPixel(x,y,288,28)) return find(220,235,255);
  return find(tr,tg,tb);
});
