import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore } from '../store/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  it('starts with empty toasts', () => {
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('add() inserts a toast with correct type and message', () => {
    useToastStore.getState().add('success', 'Upload complete')
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Upload complete')
    expect(typeof toasts[0].id).toBe('string')
  })

  it('remove() deletes a toast by id', () => {
    useToastStore.getState().add('error', 'Something failed')
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().remove(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('toast auto-removes after 4500ms', () => {
    useToastStore.getState().add('info', 'Auto-dismiss test')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(4500)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})

describe('add() covers all toast types', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  it('adds a success toast', () => {
    useToastStore.getState().add('success', 'Done!')
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Done!')
  })

  it('adds an error toast', () => {
    useToastStore.getState().add('error', 'Failed')
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('adds a warning toast', () => {
    useToastStore.getState().add('warning', 'Watch out')
    expect(useToastStore.getState().toasts[0].type).toBe('warning')
  })

  it('adds an info toast', () => {
    useToastStore.getState().add('info', 'FYI')
    expect(useToastStore.getState().toasts[0].type).toBe('info')
  })
})
