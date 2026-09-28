import { useEffect, useRef } from 'react'
import type { RemoteCommand, RemoteState } from '@shared/remote'
import { IDLE_REMOTE_STATE } from '@shared/remote'

/** Runs `handler` for each command the phone remote sends while the calling screen is
 * mounted (only one screen is mounted at a time, so each command has one handler). */
export function useRemoteCommands(handler: (command: RemoteCommand) => void): void {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })
  useEffect(() => window.api.onRemoteCommand((command) => handlerRef.current(command)), [])
}

/** Reports what the phone remote should show. `getState` is polled, so it can read refs
 * and the clock without re-rendering anything. */
export function useRemoteState(getState: () => Partial<RemoteState>, intervalMs = 500): void {
  const getRef = useRef(getState)
  useEffect(() => {
    getRef.current = getState
  })
  useEffect(() => {
    const publish = (): void =>
      window.api.sendRemoteState({ ...IDLE_REMOTE_STATE, ...getRef.current() })
    publish()
    const id = setInterval(publish, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
