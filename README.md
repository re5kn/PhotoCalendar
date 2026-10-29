# PhotoCalendar

写真の日付時刻をもとに、写真をカレンダー上に並べて表示するアプリのプロトタイプです。

- バックエンド: .NET 10 (ASP.NET Core Minimal API)
- フロントエンド: Vite + TypeScript + React

## できること

- 写真をアップロードすると、写真の日付時刻に対応する日・時間の枠に表示される
- 日 / 週 / 月 表示の切り替え
- 写真へのタグ付け (写真の詳細画面から。タグの新規作成も可)
- タグでの絞り込み表示
- **タグ 1 つ = カレンダー 1 つ**: タグごとに iCalendar (.ics) フィードを公開する。
  写真 1 枚が 1 件の予定 (30 分) になり、カレンダーアプリから URL で購読できる
- 写真の日付時刻・タイトルの手動修正

### 写真の日付時刻の決め方

上から順に、見つかったものを使います。

1. 画像のメタデータ (EXIF の DateTimeOriginal など。iPhone のスクリーンショット PNG の eXIf チャンクにも対応)
2. ファイル名に含まれる日付 (`IMG_20261003_130907.jpg`, `Screenshot 2026-10-03 at 13.09.07.png` など)
3. ファイルの更新日時 (ブラウザから送信)
4. アップロード日時

日付時刻はタイムゾーンを持たない「撮影地のローカル時刻」として扱い、ICS でも TZID なしの浮動時刻で出力します。

## 起動方法 (Docker / WSL2)

.NET SDK や Node.js をホストに入れずに、Docker だけで開発できます。
WSL2 内の Docker Engine (または Docker Desktop の WSL2 バックエンド) を想定しています。

```sh
cp .env.example .env   # UID/GID が 1000 以外なら `id -u` / `id -g` の値に書き換える
docker compose up --build
```

- フロントエンド: http://localhost:5173 (Windows 側のブラウザからも開けます)
- バックエンド: http://localhost:5080

ソースはコンテナにバインドマウントしているので、ホスト側で編集すると `dotnet watch` と Vite が変更を拾って反映します。

| サービス | 内容 |
| --- | --- |
| `api` | `dotnet watch run` でバックエンドを起動 (ポート 5080) |
| `web` | `npm install` のあと Vite 開発サーバーを起動 (ポート 5173)。`/api` は `api` コンテナへ中継 |

よく使うコマンド:

```sh
docker compose exec web npm run build   # フロントエンドをビルドして backend の wwwroot に出力
docker compose exec web npm run lint
docker compose exec api bash            # .NET SDK と Node.js が入ったシェル
docker compose down                     # 停止 (-v を付けると node_modules や NuGet キャッシュのボリュームも消す)
```

補足:

- リポジトリは WSL2 のファイルシステム (`~/` 以下など) に置くことをおすすめします。
  Windows 側 (`/mnt/c/...`) に置くとファイル変更通知が届かないため、`.env` で `WATCH_POLLING=true` にしてください (ポーリングになり CPU 負荷が上がります)。
- コンテナ内のユーザーは `.env` の UID/GID で作られるので、コンテナが作ったファイル (`data/`, `wwwroot/` など) も WSL2 のユーザーの所有になります。UID/GID を変えたら `docker compose build` し直してください。
- `bin/`, `obj/`, `node_modules/` は名前付きボリュームに置いているので、ホスト側で `dotnet` や `npm` を直接使う場合と混ざりません。
- 写真データは従来どおり `backend/PhotoCalendar.Api/data/` に保存されます。

## 起動方法 (ローカル)

必要なもの: .NET 10 SDK, Node.js 20 以上

```sh
# バックエンド (http://localhost:5080)
cd backend/PhotoCalendar.Api
dotnet run

# フロントエンド (別のターミナルで。http://localhost:5173)
cd frontend
npm install
npm run dev
```

開発時は Vite が `/api` をバックエンドに中継します。

`npm run build` を実行するとバックエンドの `wwwroot` に出力されるので、バックエンドだけで http://localhost:5080 からアプリを開けます。

データ (メタデータの `db.json` と画像ファイル) は `backend/PhotoCalendar.Api/data/` に保存されます。

## API

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/api/photos?from=&to=&tags=` | 期間・タグで写真を取得 |
| POST | `/api/photos` | 写真をアップロード (multipart: `files`, `lastModified`) |
| GET | `/api/photos/{id}/file` | 画像本体 |
| PATCH | `/api/photos/{id}` | タイトル・日付時刻・タグを更新 |
| DELETE | `/api/photos/{id}` | 写真を削除 |
| GET / POST | `/api/tags` | タグの一覧 / 作成 |
| PATCH / DELETE | `/api/tags/{id}` | タグの名前・色の変更 / 削除 |
| GET | `/api/tags/{id}/calendar.ics` | タグの ICS フィード |
| GET | `/api/calendar.ics` | すべての写真の ICS フィード |

## プロトタイプとしての割り切り

- 永続化は JSON ファイル 1 つ (DB なし)、認証なし
- サムネイルは生成せず、元画像をそのまま縮小表示
- ICS は書き出しのみ (外部 ICS の取り込みは未対応)
