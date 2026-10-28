using System.Globalization;
using System.Text.RegularExpressions;
using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using MetadataExtractor.Formats.Xmp;
using PhotoCalendar.Api.Models;

namespace PhotoCalendar.Api.Services;

/// <summary>
/// 写真の日付時刻を決める。優先順位: EXIF/XMP → ファイル名 → ファイル更新日時 (ブラウザから送信) → アップロード時刻。
/// </summary>
public static partial class TakenAtResolver
{
    public static (DateTime TakenAt, DateSource Source) Resolve(
        Stream image, string fileName, DateTime? fileModifiedLocal, DateTime uploadLocal)
    {
        if (TryReadMetadata(image) is { } meta) return (meta, DateSource.Exif);
        if (TryParseFileName(fileName) is { } fromName) return (fromName, DateSource.FileName);
        if (fileModifiedLocal is { } modified) return (Truncate(modified), DateSource.FileModified);
        return (Truncate(uploadLocal), DateSource.Upload);
    }

    private static DateTime? TryReadMetadata(Stream image)
    {
        IReadOnlyList<MetadataExtractor.Directory> dirs;
        try
        {
            dirs = ImageMetadataReader.ReadMetadata(image);
        }
        catch (Exception)
        {
            return null;
        }

        foreach (var sub in dirs.OfType<ExifSubIfdDirectory>())
        {
            if (sub.TryGetDateTime(ExifDirectoryBase.TagDateTimeOriginal, out var dt)) return Unspecified(dt);
            if (sub.TryGetDateTime(ExifDirectoryBase.TagDateTimeDigitized, out dt)) return Unspecified(dt);
        }
        foreach (var ifd0 in dirs.OfType<ExifIfd0Directory>())
        {
            if (ifd0.TryGetDateTime(ExifDirectoryBase.TagDateTime, out var dt)) return Unspecified(dt);
        }
        foreach (var xmp in dirs.OfType<XmpDirectory>())
        {
            foreach (var key in new[] { "exif:DateTimeOriginal", "photoshop:DateCreated", "xmp:CreateDate" })
            {
                if (xmp.GetXmpProperties().TryGetValue(key, out var value)
                    && DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dto))
                {
                    // XMP はオフセット付きのことがあるが、撮影地のローカル時刻として扱う
                    return Unspecified(dto.DateTime);
                }
            }
        }
        return null;
    }

    // 例: IMG_20261003_130907.jpg, Screenshot 2026-10-03 at 13.09.07.png, PXL_20261003_040907123.jpg
    [GeneratedRegex(@"(?<y>20\d{2})[-_.]?(?<mo>\d{2})[-_.]?(?<d>\d{2})(?:[ _T-]*(?:at[ _]*)?(?<h>\d{2})[-_.:]?(?<mi>\d{2})(?:[-_.:]?(?<s>\d{2}))?)?")]
    private static partial Regex FileNameDate();

    internal static DateTime? TryParseFileName(string fileName)
    {
        foreach (Match m in FileNameDate().Matches(Path.GetFileNameWithoutExtension(fileName)))
        {
            int Get(string g, int fallback) => m.Groups[g].Success ? int.Parse(m.Groups[g].Value, CultureInfo.InvariantCulture) : fallback;
            int y = Get("y", 0), mo = Get("mo", 0), d = Get("d", 0), h = Get("h", 0), mi = Get("mi", 0), s = Get("s", 0);
            if (mo is < 1 or > 12 || d < 1 || d > DateTime.DaysInMonth(y, mo)) continue;
            if (h > 23 || mi > 59 || s > 59) (h, mi, s) = (0, 0, 0);
            return new DateTime(y, mo, d, h, mi, s, DateTimeKind.Unspecified);
        }
        return null;
    }

    private static DateTime Unspecified(DateTime dt) => DateTime.SpecifyKind(Truncate(dt), DateTimeKind.Unspecified);

    private static DateTime Truncate(DateTime dt) =>
        new(dt.Year, dt.Month, dt.Day, dt.Hour, dt.Minute, dt.Second, DateTimeKind.Unspecified);
}
