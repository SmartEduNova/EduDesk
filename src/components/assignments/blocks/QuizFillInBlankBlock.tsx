import { useState } from 'react'
import { Check, X } from 'lucide-react'

export function QuizFillInBlankBlock({ data }: { data: { content: string; answers: string[] } }) {
  const [inputs, setInputs] = useState<string[]>(new Array(data.answers.length).fill(''))
  const [submitted, setSubmitted] = useState(false)

  // Splitting text by [answer] placeholders
  const parts = data.content.split(/\[answer\]/)

  const isCorrect = (index: number) => {
    return inputs[index].trim().toLowerCase() === data.answers[index].trim().toLowerCase()
  }

  const allCorrect = inputs.every((_, i) => isCorrect(i))

  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <div className="text-sm text-gray-800 leading-loose flex flex-wrap items-center gap-y-2">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center">
            {part}
            {i < parts.length - 1 && (
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
                className={`mx-1.5 px-2 py-0.5 min-w-[80px] text-center border-b-2 bg-transparent focus:outline-none focus:ring-0 text-sm font-medium transition-colors ${
                  submitted
                    ? isCorrect(i) 
                      ? 'border-green-500 text-green-700' 
                      : 'border-red-500 text-red-700'
                    : 'border-gray-300 focus:border-primary-500'
                }`}
                placeholder="..."
              />
            )}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            className="text-[11px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider"
          >
            Check Answers
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {allCorrect ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" /> All Correct
              </span>
            ) : (
              <button
                onClick={() => setSubmitted(false)}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 uppercase tracking-wider"
              >
                <X className="w-3.5 h-3.5" /> Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
