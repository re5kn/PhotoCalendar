using System.Globalization;
using System.Text;
using PhotoCalendar.Api.Models;

namespace PhotoCalendar.Api.Services;

/// <summary>写真の一覧を iCalendar (RFC 5545) に書き出す。1 枚の写真 = 1 つの VEVENT。</summary>
public static class IcsWriter
{
    private static readonly TimeSpan EventLength = TimeSpan.FromMinutes(30);

    public static string Write(string calendarName, string? color, IEnumerable<Photo> photos, string baseUrl)
    {
        var sb = new StringBuilder();
        Line(sb, "BEGIN:VCALENDAR");
        Line(sb, "VERSION:2.0");
        Line(sb, "PRODID:-//PhotoCalendar//Prototype//JA");
        Line(sb, "CALSCALE:GREGORIAN");
        Line(sb, "METHOD:PUBLISH");
        Line(sb, $"X-WR-CALNAME:{Escape(calendarName)}");
        Line(sb, $"NAME:{Escape(calendarName)}");
        if (color is not null) Line(sb, $"X-APPLE-CALENDAR-COLOR:{color}");

        var stamp = DateTime.UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        foreach (var p in photos.OrderBy(p => p.TakenAt))
        {
            var url = $"{baseUrl}/api/photos/{p.Id}/file";
            Line(sb, "BEGIN:VEVENT");
            Line(sb, $"UID:{p.Id}@photocalendar");
            Line(sb, $"DTSTAMP:{stamp}");
            // TakenAt はローカル時刻なので、TZID を付けない「浮動時刻」で出力する
            Line(sb, $"DTSTART:{Local(p.TakenAt)}");
            Line(sb, $"DTEND:{Local(p.TakenAt + EventLength)}");
            Line(sb, $"SUMMARY:{Escape(p.Title ?? p.FileName)}");
            Line(sb, $"DESCRIPTION:{Escape(url)}");
            Line(sb, $"URL:{url}");
            Line(sb, $"ATTACH;FMTTYPE={p.ContentType}:{url}");
            Line(sb, "END:VEVENT");
        }
        Line(sb, "END:VCALENDAR");
        return sb.ToString();
    }

    private static string Local(DateTime dt) => dt.ToString("yyyyMMdd'T'HHmmss", CultureInfo.InvariantCulture);

    private static string Escape(string s) =>
        s.Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\r\n", "\\n").Replace("\n", "\\n");

    // RFC 5545: 1 行は 75 オクテット以内に折り返し、CRLF で終える
    private static void Line(StringBuilder sb, string line)
    {
        var bytes = 0;
        var start = 0;
        for (var i = 0; i < line.Length; i++)
        {
            var len = Encoding.UTF8.GetByteCount(line.AsSpan(i, char.IsHighSurrogate(line[i]) ? 2 : 1));
            if (bytes + len > (start == 0 ? 75 : 74))
            {
                sb.Append(line, start, i - start).Append("\r\n ");
                start = i;
                bytes = 0;
            }
            bytes += len;
            if (char.IsHighSurrogate(line[i])) i++;
        }
        sb.Append(line, start, line.Length - start).Append("\r\n");
    }
}
