import { ModuleBlock } from '@/types'
import { TextBlock } from './TextBlock'
import { AudioBlock } from './AudioBlock'
import { ImageBlock } from './ImageBlock'
import { DownloadBlock } from './DownloadBlock'
import { VimeoBlock } from './VimeoBlock'
import { QuizFillInBlankBlock } from './QuizFillInBlankBlock'
import { QuizMultipleChoiceBlock } from './QuizMultipleChoiceBlock'

interface AssignmentBlocksProps {
  blocks: ModuleBlock[]
}

export function AssignmentBlocks({ blocks }: AssignmentBlocksProps) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-6 my-4">
      {blocks.map((block) => {
        switch (block.type) {
          case 'text':
            return <TextBlock key={block.id} data={block.data} />
          case 'audio':
            return <AudioBlock key={block.id} data={block.data} />
          case 'image':
            return <ImageBlock key={block.id} data={block.data} />
          case 'download':
            return <DownloadBlock key={block.id} data={block.data} />
          case 'vimeo':
            return <VimeoBlock key={block.id} data={block.data} />
          case 'quiz_fill_in_blank':
            return <QuizFillInBlankBlock key={block.id} data={block.data} />
          case 'quiz_multiple_choice':
            return <QuizMultipleChoiceBlock key={block.id} data={block.data} />
          default:
            return (
              <div key={block.id} className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
                Unsupported content block type: {block.type}
              </div>
            )
        }
      })}
    </div>
  )
}
