# /tags/%E6%9D%B1%E4%BA%AC 復旧ランブック（Next.js アセット404/厳格MIME対策）

目的: `/_next/static/...` が404や`text/plain`になる状態を、ビルド→起動→検証で確実に復旧する。
前提: リポジトリ直下、ポート:3000 を使用。

## 1) 既存プロセス停止とキャッシュクリア

```
lsof -ti:3000 | xargs -r kill -9 || true
rm -rf .next
```

## 2) 開発起動（Next純正dev; 推奨）

```
npm run dev:safe
# or: npx next dev --turbo --port 3000
```

別ターミナルで:

```
# 200/JSで返ること
curl -sI http://localhost:3000/_next/static/chunks/main-app.js | sed -n '1p;/^content-type/Ip'
# ページが200/HTMLで返ること
curl -sI 'http://localhost:3000/tags/%E6%9D%B1%E4%BA%AC' | sed -n '1p;/^content-type/Ip'
```

## 3) 本番相当（devが不安定な場合の切り分け）

```
npm run build
nohup npm run start > /tmp/next-start.log 2>&1 & echo $! > /tmp/next-start.pid
sleep 2
curl -sI http://localhost:3000/ | sed -n '1p;/^content-type/Ip'
```

## 4) 認証確認（必須; 200であること）

```
# ブラウザ: http://localhost:3000/auth/signin でログイン
# その後
curl -s -b jar.txt -c jar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b jar.txt http://localhost:3000/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
curl -i -b jar.txt -c jar.txt -H 'Content-Type: application/json' -d '{"email":"one.photolife+1@gmail.com","password":"?@thc123THC@?","csrfToken":"'$CSRF'","json":true}' http://localhost:3000/api/auth/callback/credentials | sed -n '1,10p'
curl -sI -b jar.txt http://localhost:3000/api/auth/session | sed -n '1p;/^content-type/Ip'
```

## 5) ページ/APIの200確認

```
# ページ
curl -sI 'http://localhost:3000/tags/%E6%9D%B1%E4%BA%AC' | sed -n '1p;/^content-type/Ip'
# 高評価順（人気順）API
curl -s -b jar.txt 'http://localhost:3000/api/posts?tag=%E6%9D%B1%E4%BA%AC&sort=-likes&page=1&limit=20' | sed -n '1,5p'
# 使用頻度の人気タグAPI
curl -s -b jar.txt 'http://localhost:3000/api/tags/trending?days=30&limit=20' | sed -n '1,5p'
```

## 6) 期待結果（OK/NG）

- OK: `/_next/static/...` が 200+`application/javascript`、`/tags/東京` が 200+`text/html`。
- NG: 404/text/plain のまま → 2)の起動モードを純正dev/`next start`に切替。`server.js`等のカスタム起動が混在していないか確認。

## 7) 差分が反映されない場合

- もう一度 1)→2)（または3））を実施し、ブラウザは強制再読込（Cmd/Ctrl+Shift+R）。
- それでもNGなら、`/tmp/next-start.log`の末尾50行と以下のHTTP応答を共有してください:
  - `/_next/static/chunks/main-app.js` のステータス/Content-Type
  - `/_next/static/chunks/app/tags/%5Btag%5D/page.js` のステータス

## 8) 検証の最終チェック

- UI上部に「人気タグへ」「並び替えへ」ボタン
- 「人気タグ（よく使われるタグ）」バー（7/30/90）
- 「最新順／人気順（高評価順）」トグル（またはフォールバック）
