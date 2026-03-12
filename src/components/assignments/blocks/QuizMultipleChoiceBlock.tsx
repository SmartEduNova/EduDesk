import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface Question {
  question: string
  options: string[]
  correctIndex: number
}

export function QuizMultipleChoiceBlock({ data }: { data: { questions?: Question[]; question?: string; options?: string[]; correctIndex?: number } }) {
  // Normalize data (support legacy single question or set)
  const questions: Question[] = data.questions ?? (
    data.question ? [{ question: data.question, options: data.options ?? [], correctIndex: data.correctIndex ?? 0 }] : []
  )

  const [selected, setSelected] = useState<number[]>(new Array(questions.length).fill(-1))
  const [submitted, setSubmitted] = useState(new Array(questions.length).fill(false))

  if (questions.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, qIndex) => {
        const isDone = submitted[qIndex]
        const isCorrect = selected[qIndex] === q.correctIndex

        return (
          <div key={qIndex} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-800 mb-3">{q.question}</p>
            
            <div className="flex flex-col gap-2">
              {q.options.map((opt, oIndex) => {
                let style = 'border-gray-200 hover:border-primary-300 hover:bg-white'
                if (selected[qIndex] === oIndex) style = 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                if (isDone) {
                  if (oIndex === q.correctIndex) style = 'border-green-500 bg-green-50 ring-1 ring-green-500'
                  else if (selected[qIndex] === oIndex) style = 'border-red-500 bg-red-50 ring-1 ring-red-500 opacity-70'
                  else style = 'border-gray-200 opacity-50'
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => {
                      if (isDone) return
                      const next = [...selected]
                      next[qIndex] = oIndex
                      setSelected(next)
                    }}
                    disabled={isDone}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between ${style}`}
                  >
                    <span>{opt}</span>
                    {isDone && oIndex === q.correctIndex && <Check className="w-4 h-4 text-green-600" />}
                    {isDone && selected[qIndex] === oIndex && oIndex !== q.correctIndex && <X className="w-4 h-4 text-red-600" />}
                  </button>
                )
              })}
            </div>

            <div className="mt-4">
              {!isDone ? (
                <button
                  onClick={() => {
                    if (selected[qIndex] === -1) return
                    const next = [...submitted]
                    next[qIndex] = true
                    setSubmitted(next)
                  }}
                  disabled={selected[qIndex] === -1}
                  className="text-[11px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider disabled:opacity-30"
                >
                  Verify Answer
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                  {!isCorrect && (
                    <button
                      onClick={() => {
                        const nextSub = [...submitted]
                        nextSub[qIndex] = false
                        setSubmitted(nextSub)
                        const nextSel = [...selected]
                        nextSel[qIndex] = -1
                        setSelected(nextSel)
                      }}
                      className="text-[10px] text-gray-500 hover:underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
