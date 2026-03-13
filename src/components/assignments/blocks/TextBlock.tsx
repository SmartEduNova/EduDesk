export function TextBlock({ data }: { data: { content: string } }) {
  return (
    <div 
      className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  )
}
