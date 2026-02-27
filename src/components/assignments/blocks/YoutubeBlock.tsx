import { AlertCircle } from 'lucide-react'

interface YoutubeBlockProps {
  videoUrl: string
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  // If the input looks like a bare video ID (11 chars, no slashes)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim()
  return null
}

export function YoutubeBlock({ videoUrl }: YoutubeBlockProps) {
  const videoId = extractYoutubeId(videoUrl)

  if (!videoId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl text-red-500 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Invalid YouTube URL
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-100"
         style={{ paddingTop: '56.25%' }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
