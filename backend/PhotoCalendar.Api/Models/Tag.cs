namespace PhotoCalendar.Api.Models;

/// <summary>タグ。1 つのタグが 1 つのカレンダー (ICS フィード) に対応する。</summary>
public sealed class Tag
{
    public required string Id { get; init; }
    public required string Name { get; set; }
    public required string Color { get; set; }
}
