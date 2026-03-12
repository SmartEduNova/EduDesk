export function ImageBlock({ data }: { data: { imageUrl: string; caption?: string } }) {
  return (
    <div className="flex flex-col gap-2">
      <img 
        src={data.imageUrl} 
        alt={data.caption || 'Assignment image'} 
        className="w-full rounded-xl object-contain bg-gray-50 border border-gray-100"
      />
      {data.caption && (
        <p className="text-[11px] text-gray-500 italic text-center px-2">
          {data.caption}
        </p>
      )}
    </div>
  )
}
