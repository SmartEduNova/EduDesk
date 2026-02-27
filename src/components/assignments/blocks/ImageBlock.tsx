interface ImageBlockProps {
  imageUrl: string
  caption?: string
}

export function ImageBlock({ imageUrl, caption }: ImageBlockProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100">
      <img
        src={imageUrl}
        alt={caption ?? 'Assignment image'}
        className="w-full object-cover max-h-72"
        loading="lazy"
      />
      {caption && (
        <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50">{caption}</p>
      )}
    </div>
  )
}
