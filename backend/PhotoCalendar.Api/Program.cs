using System.Globalization;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;
using PhotoCalendar.Api.Models;
using PhotoCalendar.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<PhotoStore>();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 512L * 1024 * 1024);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 512L * 1024 * 1024);

var app = builder.Build();

// フロントエンドをビルドすると wwwroot に出力され、同じポートで配信される
app.UseDefaultFiles();
app.UseStaticFiles();

var contentTypes = new FileExtensionContentTypeProvider();
string[] tagColors = ["#4f7cff", "#ff7a59", "#2bb673", "#b05cff", "#ffb020", "#ff4f8b", "#18a5b8", "#7a8699"];

string BaseUrl(HttpRequest r) => $"{r.Scheme}://{r.Host}{r.PathBase}";

TagDto ToDto(Tag t, PhotoStore.Database db, HttpRequest r) =>
    new(t.Id, t.Name, t.Color, db.Photos.Count(p => p.TagIds.Contains(t.Id)), $"{BaseUrl(r)}/api/tags/{t.Id}/calendar.ics");

var api = app.MapGroup("/api");

// ---- 写真 ----

api.MapGet("/photos", (PhotoStore store, DateTime? from, DateTime? to, string? tags) =>
{
    var tagFilter = tags?.Split(',', StringSplitOptions.RemoveEmptyEntries);
    return store.Read(db => db.Photos
        .Where(p => from is null || p.TakenAt >= from)
        .Where(p => to is null || p.TakenAt < to)
        .Where(p => tagFilter is null || p.TagIds.Any(tagFilter.Contains))
        .OrderBy(p => p.TakenAt)
        .Select(PhotoDto.From)
        .ToList());
});

api.MapPost("/photos", async (HttpRequest request, PhotoStore store) =>
{
    var form = await request.ReadFormAsync();
    // ブラウザが File.lastModified をローカル時刻 (yyyy-MM-ddTHH:mm:ss) にしたものを files と同じ順で送ってくる
    var modified = form["lastModified"];
    var created = new List<PhotoDto>();
    for (var i = 0; i < form.Files.Count; i++)
    {
        var file = form.Files[i];
        if (!contentTypes.TryGetContentType(file.FileName, out var contentType) || !contentType.StartsWith("image/"))
            continue;

        var id = Guid.NewGuid().ToString("N");
        var storedName = id + Path.GetExtension(file.FileName).ToLowerInvariant();
        var path = Path.Combine(store.FilesPath, storedName);
        await using (var fs = File.Create(path)) await file.CopyToAsync(fs);

        DateTime? fileModified = i < modified.Count && DateTime.TryParse(modified[i], CultureInfo.InvariantCulture, DateTimeStyles.None, out var m) ? m : null;
        (DateTime takenAt, DateSource source) resolved;
        await using (var fs = File.OpenRead(path))
            resolved = TakenAtResolver.Resolve(fs, file.FileName, fileModified, DateTime.Now);

        var photo = new Photo
        {
            Id = id,
            FileName = file.FileName,
            StoredName = storedName,
            ContentType = contentType,
            TakenAt = resolved.takenAt,
            DateSource = resolved.source,
            UploadedAt = DateTimeOffset.Now,
        };
        store.Write(db => { db.Photos.Add(photo); return 0; });
        created.Add(PhotoDto.From(photo));
    }
    return created.Count > 0 ? Results.Ok(created) : Results.BadRequest("画像ファイルがありません");
}).DisableAntiforgery();

api.MapGet("/photos/{id}/file", (string id, PhotoStore store) =>
{
    var photo = store.Read(db => db.Photos.FirstOrDefault(p => p.Id == id));
    return photo is null
        ? Results.NotFound()
        : Results.File(Path.Combine(store.FilesPath, photo.StoredName), photo.ContentType, enableRangeProcessing: true);
});

api.MapPatch("/photos/{id}", (string id, UpdatePhotoRequest req, PhotoStore store) =>
    store.Write(db =>
    {
        var photo = db.Photos.FirstOrDefault(p => p.Id == id);
        if (photo is null) return Results.NotFound();
        if (req.Title is not null) photo.Title = string.IsNullOrWhiteSpace(req.Title) ? null : req.Title.Trim();
        if (req.TakenAt is { } takenAt)
        {
            photo.TakenAt = DateTime.SpecifyKind(takenAt, DateTimeKind.Unspecified);
            photo.DateSource = DateSource.Manual;
        }
        if (req.TagIds is not null)
            photo.TagIds = req.TagIds.Distinct().Where(t => db.Tags.Any(x => x.Id == t)).ToList();
        return Results.Ok(PhotoDto.From(photo));
    }));

api.MapDelete("/photos/{id}", (string id, PhotoStore store) =>
{
    var photo = store.Write(db =>
    {
        var p = db.Photos.FirstOrDefault(p => p.Id == id);
        if (p is not null) db.Photos.Remove(p);
        return p;
    });
    if (photo is null) return Results.NotFound();
    File.Delete(Path.Combine(store.FilesPath, photo.StoredName));
    return Results.NoContent();
});

// ---- タグ (= カレンダー) ----

api.MapGet("/tags", (HttpRequest r, PhotoStore store) =>
    store.Read(db => db.Tags.OrderBy(t => t.Name).Select(t => ToDto(t, db, r)).ToList()));

api.MapPost("/tags", (CreateTagRequest req, HttpRequest r, PhotoStore store) =>
{
    var name = req.Name?.Trim();
    if (string.IsNullOrEmpty(name)) return Results.BadRequest("タグ名が必要です");
    return store.Write(db =>
    {
        if (db.Tags.FirstOrDefault(t => t.Name == name) is { } existing) return Results.Ok(ToDto(existing, db, r));
        var tag = new Tag { Id = Guid.NewGuid().ToString("N"), Name = name, Color = req.Color ?? tagColors[db.Tags.Count % tagColors.Length] };
        db.Tags.Add(tag);
        return Results.Ok(ToDto(tag, db, r));
    });
});

api.MapPatch("/tags/{id}", (string id, UpdateTagRequest req, HttpRequest r, PhotoStore store) =>
    store.Write(db =>
    {
        var tag = db.Tags.FirstOrDefault(t => t.Id == id);
        if (tag is null) return Results.NotFound();
        if (!string.IsNullOrWhiteSpace(req.Name)) tag.Name = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Color)) tag.Color = req.Color;
        return Results.Ok(ToDto(tag, db, r));
    }));

api.MapDelete("/tags/{id}", (string id, PhotoStore store) =>
    store.Write(db =>
    {
        if (db.Tags.RemoveAll(t => t.Id == id) == 0) return Results.NotFound();
        foreach (var p in db.Photos) p.TagIds.Remove(id);
        return Results.NoContent();
    }));

// タグごとの ICS フィード。カレンダーアプリから URL 購読できる
api.MapGet("/tags/{id}/calendar.ics", (string id, HttpRequest r, PhotoStore store) =>
{
    var ics = store.Read(db =>
    {
        var tag = db.Tags.FirstOrDefault(t => t.Id == id);
        return tag is null ? null : IcsWriter.Write(tag.Name, tag.Color, db.Photos.Where(p => p.TagIds.Contains(id)), BaseUrl(r));
    });
    return ics is null ? Results.NotFound() : Results.Text(ics, "text/calendar; charset=utf-8");
});

// すべての写真の ICS フィード
api.MapGet("/calendar.ics", (HttpRequest r, PhotoStore store) =>
    Results.Text(store.Read(db => IcsWriter.Write("写真カレンダー", null, db.Photos, BaseUrl(r))), "text/calendar; charset=utf-8"));

app.MapFallbackToFile("index.html");

app.Run();
