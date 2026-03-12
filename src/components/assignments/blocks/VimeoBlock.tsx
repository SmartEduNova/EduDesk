export function VimeoBlock({ data }: { data: { videoUrl: string } }) {
  // Extract ID from URL if necessary
  const getVideoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/)
    return match ? match[1] : url
  }
  
  const videoId = getVideoId(data.videoUrl)
  
  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-gray-100">
      <iframe
        src={`https://player.vimeo.com/video/${videoId}`}
        className="w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
