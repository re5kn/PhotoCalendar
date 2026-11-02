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

## 起動方法

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
