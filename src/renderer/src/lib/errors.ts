/** Turns an error (including one relayed from the main process over IPC, which Electron
 * prefixes with "Error invoking remote method '…': Error: ") into a readable message. */
export function userMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(/^Error invoking remote method '[^']*': (\w*Error: )?/, '')
}
