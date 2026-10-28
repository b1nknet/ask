export function getQuestionPath(id: string) {
  return `/questions/${encodeURIComponent(id)}`;
}
