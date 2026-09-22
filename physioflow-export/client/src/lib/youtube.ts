/** Extracts a YouTube video ID from watch/share/shorts/embed URL formats. Returns null if
 *  the URL doesn't match — used only to build an embed src, never to fetch or store the video. */
export function getYoutubeVideoId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([\w-]+)/, /youtu\.be\/([\w-]+)/, /youtube\.com\/embed\/([\w-]+)/, /youtube\.com\/shorts\/([\w-]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
