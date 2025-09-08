# Console Snippets (Single-Line, No Newlines)

> そのままConsoleに貼り付けて実行できます。各スニペットは1行・改行なしです。

## 01) トグルを中央へスクロール＋枠線で可視化

```
var el=document.querySelector('[data-testid="tag-sort-toggle"]')||document.querySelector('[data-testid="tag-sort-fallback"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='2px solid #f80';console.log('TOGGLE',getComputedStyle(el),el.getBoundingClientRect());}else{console.log('TOGGLE not found');}
```

## 02) 画面を覆う固定オーバーレイ検出（z-index>=9999 上位5件）

```
Array.from(document.querySelectorAll('body *')).map(n=>{var s=getComputedStyle(n),r=n.getBoundingClientRect();return {n,s,r,z:parseFloat(s.zIndex)||0};}).filter(x=>x.s.position==='fixed'&&x.z>=9999&&x.r.width>0&&x.r.height>0).sort((a,b)=>b.z-a.z).slice(0,5).map(x=>({tag:x.n.tagName,id:x.n.id,cls:x.n.className,z:x.z,rect:{x:x.r.x,y:x.r.y,w:x.r.width,h:x.r.height},disp:x.s.display,vis:x.s.visibility,op:x.s.opacity}));
```

## 03) 高評価順（人気順=likes降順）のAPI応答確認

```
fetch('/api/posts?tag=%E6%9D%B1%E4%BA%AC&sort=-likes&page=1&limit=20',{credentials:'include'}).then(async r=>{try{var j=await r.json();console.log('[LIKES-SORT]',r.status,r.ok,Array.isArray(j&&j.data)?j.data.length:'-');}catch(e){console.log('[LIKES-SORT]',r.status,r.ok,'(no json)');}}).catch(console.error);
```

## 04) 使用頻度の人気タグ（30日）応答確認

```
fetch('/api/tags/trending?days=30&limit=20',{credentials:'include'}).then(async r=>{try{var j=await r.json();console.log('[TRENDING-30D]',r.status,r.ok,Array.isArray(j&&j.data)?j.data.length:'-');}catch(e){console.log('[TRENDING-30D]',r.status,r.ok,'(no json)');}}).catch(console.error);
```

## 05) 使用頻度の人気タグ（90日）応答確認

```
fetch('/api/tags/trending?days=90&limit=20',{credentials:'include'}).then(async r=>{try{var j=await r.json();console.log('[TRENDING-90D]',r.status,r.ok,Array.isArray(j&&j.data)?j.data.length:'-');}catch(e){console.log('[TRENDING-90D]',r.status,r.ok,'(no json)');}}).catch(console.error);
```

## 06) 「人気順（高評価順）」へプログラムで切替

```
(document.querySelector('[data-testid="tag-sort-toggle"] button[value="popular"]')||document.querySelector('[data-testid="tag-sort-fallback"] button:nth-of-type(2)'))?.click();
```

## 07) 「最新順」へプログラムで切替

```
(document.querySelector('[data-testid="tag-sort-toggle"] button[value="newest"]')||document.querySelector('[data-testid="tag-sort-fallback"] button:nth-of-type(1)'))?.click();
```

## 08) トグル枠のスタイルとサイズを即時表示

```
(function(){var t=document.querySelector('[data-testid="tag-sort-toggle"]')||document.querySelector('[data-testid="tag-sort-fallback"]');if(!t){return console.log('NOT FOUND');}var s=getComputedStyle(t),r=t.getBoundingClientRect();console.log('[STYLE]',{display:s.display,visibility:s.visibility,opacity:s.opacity,height:r.height,width:r.width});})();
```

## 09) トグル枠を最前面に強制（デバッグ用）

```
var t=document.querySelector('[data-testid="tag-sort-toggle"]')||document.querySelector('[data-testid="tag-sort-fallback"]');if(t){t.style.position='relative';t.style.zIndex='2147483647';t.style.background='rgba(255,255,0,.15)';console.log('FORCE-FRONT',getComputedStyle(t),t.getBoundingClientRect());}else{console.log('TOGGLE not found');}
```
