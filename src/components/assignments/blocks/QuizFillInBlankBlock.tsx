import { useState } from 'react'
import { RotateCcw, Eye } from 'lucide-react'

export function QuizFillInBlankBlock({ data }: { data: { content: string; answers: string[] } }) {
  const [inputs, setInputs] = useState<string[]>(new Array(data.answers.length).fill(''))
  const [submitted, setSubmitted] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)

  // Splitting text by [brackets] placeholders
  const parts = data.content.split(/\[.*?\]/)

  const isCorrect = (index: number) => {
    return inputs[index]?.trim().toLowerCase() === data.answers[index]?.trim().toLowerCase()
  }

  const allCorrect = data.answers.every((_, i) => isCorrect(i))
  const score = data.answers.filter((_, i) => isCorrect(i)).length

  const handleReset = () => {
    setInputs(new Array(data.answers.length).fill(''))
    setSubmitted(false)
    setShowAnswers(false)
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
      <div className="text-sm text-gray-800 leading-[2.5] flex flex-wrap items-center gap-y-3">
        {parts.map((part, i) => (
          <span key={i} className="flex flex-col items-center">
            <span className="flex items-center">
              {part}
              {i < parts.length - 1 && (
                <div className="relative inline-flex flex-col items-center">
                  <input
                    type="text"
                    value={inputs[i]}
                    onChange={e => {
                      const newInputs = [...inputs]
                      newInputs[i] = e.target.value
                      setInputs(newInputs)
                      setSubmitted(false)
                    }}
                    disabled={submitted && isCorrect(i)}
                    className={`mx-1.5 px-3 py-1 min-w-[100px] text-center border-b-2 bg-gray-50/50 rounded-t-lg focus:outline-none focus:ring-0 text-sm font-semibold transition-all ${
                      submitted
                        ? isCorrect(i) 
                          ? 'border-green-500 text-green-700 bg-green-50/30' 
                          : 'border-red-500 text-red-700 bg-red-50/30'
                        : 'border-gray-300 focus:border-primary-500 focus:bg-white'
                    }`}
                    placeholder="..."
                  />
                  {showAnswers && !isCorrect(i) && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1">
                      {data.answers[i]}
                    </div>
                  )}
                </div>
              )}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
        {!submitted ? (
          <button
            onClick={() => {
              setSubmitted(true)
              // In the future, call saveListeningScore() here
            }}
            disabled={inputs.every(v => !v.trim())}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            Check Answers
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className={`text-[11px] font-black uppercase tracking-widest ${allCorrect ? 'text-green-600' : 'text-amber-600'}`}>
                {allCorrect ? 'Perfect!' : `Score: ${score} / ${data.answers.length}`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {!allCorrect && !showAnswers && (
                <button
                  onClick={() => setShowAnswers(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> Show Answers
                </button>
              )}
              
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
