namespace PhotoCalendar.Api.Models;

/// <summary>
/// 写真のメタデータ。TakenAt はタイムゾーンを持たない「撮影地のローカル時刻」として扱う
/// (EXIF の DateTimeOriginal と同じ考え方)。
/// </summary>
public sealed class Photo
{
    public required string Id { get; init; }
    public required string FileName { get; set; }
    public required string StoredName { get; init; }
    public required string ContentType { get; init; }
    public string? Title { get; set; }
    public DateTime TakenAt { get; set; }
    public DateSource DateSource { get; set; }
    public DateTimeOffset UploadedAt { get; init; }
    public List<string> TagIds { get; set; } = [];
}

public enum DateSource
{
    Exif,
    FileName,
    FileModified,
    Upload,
    Manual,
}
