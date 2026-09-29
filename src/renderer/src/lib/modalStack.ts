/** Open dialogs, innermost last: Esc closes only the one on top, and editor shortcuts
 * (undo/redo) are held back while any dialog is open. */
const openStack: object[] = []

export function pushModal(token: object): () => void {
  openStack.push(token)
  return () => {
    const i = openStack.indexOf(token)
    if (i !== -1) openStack.splice(i, 1)
  }
}

export function isTopModal(token: object): boolean {
  return openStack[openStack.length - 1] === token
}

export function isAnyModalOpen(): boolean {
  return openStack.length > 0
}
