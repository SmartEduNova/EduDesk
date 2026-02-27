import { TextBlock }    from './blocks/TextBlock'
import { ImageBlock }   from './blocks/ImageBlock'
import { FileBlock }    from './blocks/FileBlock'
import { YoutubeBlock } from './blocks/YoutubeBlock'
import type { AssignmentBlock } from '@/types'

interface AssignmentContentProps {
  blocks: AssignmentBlock[]
}

/**
 * Renders an ordered list of assignment blocks.
 * Mirrors the block-based architecture described in MODULE_BLOCK_ARCHITECTURE.md
 * but adapted for EduSync assignments (text, image, file, youtube).
 */
export function AssignmentContent({ blocks }: AssignmentContentProps) {
  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {blocks.map(block => {
        switch (block.type) {
          case 'text':
            return block.data.content
              ? <TextBlock key={block.id} content={block.data.content} />
              : null

          case 'image':
            return block.data.imageUrl
              ? <ImageBlock key={block.id} imageUrl={block.data.imageUrl} caption={block.data.caption} />
              : null

          case 'file':
            return block.data.fileUrl && block.data.fileName
              ? <FileBlock key={block.id} fileUrl={block.data.fileUrl} fileName={block.data.fileName} />
              : null

          case 'youtube':
            return block.data.videoUrl
              ? <YoutubeBlock key={block.id} videoUrl={block.data.videoUrl} />
              : null

          default:
            return null
        }
      })}
    </div>
  )
}
