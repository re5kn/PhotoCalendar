using System.Text.Json;
using System.Text.Json.Serialization;
using PhotoCalendar.Api.Models;

namespace PhotoCalendar.Api.Services;

/// <summary>
/// プロトタイプ用のシンプルな永続化。メタデータは JSON ファイル 1 つ、画像はディレクトリに保存する。
/// </summary>
public sealed class PhotoStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly string _dbPath;
    private readonly Lock _lock = new();
    private Database _db;

    public PhotoStore(IConfiguration config, IHostEnvironment env)
    {
        var dataPath = Path.GetFullPath(config["Storage:DataPath"] ?? "data", env.ContentRootPath);
        FilesPath = Path.Combine(dataPath, "files");
        Directory.CreateDirectory(FilesPath);
        _dbPath = Path.Combine(dataPath, "db.json");
        _db = File.Exists(_dbPath)
            ? JsonSerializer.Deserialize<Database>(File.ReadAllText(_dbPath), JsonOptions) ?? new()
            : new();
    }

    public string FilesPath { get; }

    public T Read<T>(Func<Database, T> query)
    {
        lock (_lock) return query(_db);
    }

    public T Write<T>(Func<Database, T> mutation)
    {
        lock (_lock)
        {
            var result = mutation(_db);
            var tmp = _dbPath + ".tmp";
            File.WriteAllText(tmp, JsonSerializer.Serialize(_db, JsonOptions));
            File.Move(tmp, _dbPath, overwrite: true);
            return result;
        }
    }

    public sealed class Database
    {
        public List<Photo> Photos { get; set; } = [];
        public List<Tag> Tags { get; set; } = [];
    }
}
