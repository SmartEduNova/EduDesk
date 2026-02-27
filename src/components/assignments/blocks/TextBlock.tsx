interface TextBlockProps {
  content: string
}

export function TextBlock({ content }: TextBlockProps) {
  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      {content.split('\n').map((line, i) => (
        <p key={i} className={line === '' ? 'h-3' : undefined}>
          {line}
        </p>
      ))}
    </div>
  )
}
