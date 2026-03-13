# Quiz: Fill in the Blanks (Technical Specification)

The `quiz_fill_in_blank` block type allows for interactive "cloze" tests where students fill in missing words or phrases within a body of text.

---

## 1. Data Schema

Defined in `QuizFillInBlankBlock.tsx`:

| Field | Type | Description |
|:---|:---|:---|
| `content` | `string` | The full text of the exercise, including placeholders for inputs. |
| `answers` | `string[]` | An ordered array of strings representing the correct answers for each placeholder. |

### Syntax for `content`
Placeholders are marked using square brackets. The text inside the brackets in the `content` string is ignored by the parser (treated strictly as a marker), but the **order** of placeholders must match the order of items in the `answers` array.

**Example**:
`"The heart has [four] chambers: the left and right [atria], and the left and right [ventricles]."`

---

## 2. Implementation Details

### Parsing Logic
The component uses a regular expression to split the content into text segments and inputs:

```typescript
const parts = data.content.split(/\[.*?\]/g);
```

The rendering loop iterates through `parts` and inserts an `<input>` element between each segment (except after the final one).

### Validation Logic
*   **Normalization**: Comparisons are case-insensitive and trimmed.
    ```typescript
    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    ```
*   **State Management**: `userAnswers` is an array of strings initialized to the length of `data.answers`.

### Persistence & Scoring
Upon clicking "Check Answers", the component:
1.  Calculates the raw score (count of correct matches).
2.  Updates the local `isSubmitted` state to trigger UI feedback (colors, icons).
3.  Calls `saveListeningScore()` in `feedbackService.ts` to log the result to Firestore for analytics.

---

## 3. Interaction Model

1.  **Input State**: Inputs start empty.
2.  **Checking**: Clicking "Check Answers" highlights inputs in green (correct) or red (incorrect).
3.  **Correction**: If answers are wrong, a "Show Correct Answers" button appears, which reveals the correct string below the input field.
4.  **Retry**: Users can clear their attempts and try again, which resets the UI state but does not overwrite the first high score if analytics logic prevents it.

---

## 4. Firestore JSON Example

```json
{
  "id": "blk_fill_123",
  "type": "quiz_fill_in_blank",
  "data": {
    "content": "In OET Listening Part A, you must record specific [details] from the consultation. It is important to check your [spelling] carefully, although minor errors are sometimes [accepted] if the meaning is clear.",
    "answers": [
      "details",
      "spelling",
      "accepted"
    ]
  }
}
```

---

## 5. Component Map

*   **Logic & UI**: `src/components/modules/blocks/QuizFillInBlankBlock.tsx`
*   **Service**: `src/lib/feedbackService.ts` (Handles score logging)
*   **Styles**: Tailwind utility classes for dynamic green/red states.
