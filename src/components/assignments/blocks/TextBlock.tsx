export function TextBlock({ data }: { data: { content: string } }) {
  return (
    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
      {data.content}
    </div>
  )
}
