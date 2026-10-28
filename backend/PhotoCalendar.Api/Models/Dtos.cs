namespace PhotoCalendar.Api.Models;

public sealed record PhotoDto(
    string Id,
    string FileName,
    string? Title,
    DateTime TakenAt,
    DateSource DateSource,
    DateTimeOffset UploadedAt,
    IReadOnlyList<string> TagIds,
    string Url)
{
    public static PhotoDto From(Photo p) =>
        new(p.Id, p.FileName, p.Title, p.TakenAt, p.DateSource, p.UploadedAt, p.TagIds, $"/api/photos/{p.Id}/file");
}

public sealed record UpdatePhotoRequest(string? Title, DateTime? TakenAt, List<string>? TagIds);

public sealed record TagDto(string Id, string Name, string Color, int PhotoCount, string IcsUrl);

public sealed record CreateTagRequest(string Name, string? Color);

public sealed record UpdateTagRequest(string? Name, string? Color);
