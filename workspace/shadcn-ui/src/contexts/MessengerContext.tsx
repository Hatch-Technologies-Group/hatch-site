import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { MessengerWidget } from '@/components/messenger/MessengerWidget'

interface MessengerContextValue {
  isOpen: boolean
  open: () => void
  openForContact: (personId: string) => void
  close: () => void
  toggle: () => void
}

const MessengerContext = createContext<MessengerContextValue | undefined>(undefined)

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [initialContactId, setInitialContactId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setIsOpen(false)
      setInitialContactId(null)
    }
  }, [user])

  const open = useCallback(() => {
    if (!user) return
    setIsOpen(true)
  }, [user])

  const openForContact = useCallback(
    (personId: string) => {
      if (!user) return
      setInitialContactId(personId)
      setIsOpen(true)
    },
    [user]
  )

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => {
    if (!user) return
    setIsOpen((prev) => !prev)
  }, [user])

  const value = useMemo(
    () => ({
      isOpen,
      open,
      openForContact,
      close,
      toggle
    }),
    [isOpen, open, openForContact, close, toggle]
  )

  return (
    <MessengerContext.Provider value={value}>
      {children}
      {user && isOpen ? (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
          <MessengerWidget
            onClose={close}
            initialContactId={initialContactId}
            onInitialContactConsumed={() => setInitialContactId(null)}
          />
        </div>
      ) : null}
    </MessengerContext.Provider>
  )
}

export const useMessenger = () => {
  const ctx = useContext(MessengerContext)
  if (!ctx) {
    throw new Error('useMessenger must be used within a MessengerProvider')
  }
  return ctx
}
