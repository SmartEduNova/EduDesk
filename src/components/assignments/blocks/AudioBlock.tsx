import { Play, Pause } from 'lucide-react'
import { useState, useRef } from 'react'

export function AudioBlock({ data }: { data: { audioUrl: string; title?: string } }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  return (
    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors shrink-0"
      >
        {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>
      
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate">
          {data.title || 'Audio Recording'}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5 hover:underline cursor-pointer">
          Click to play audio
        </p>
      </div>

      <audio 
        ref={audioRef} 
        src={data.audioUrl} 
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  )
}
