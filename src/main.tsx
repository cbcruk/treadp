import { HotkeysProvider, type CustomHotkeys } from '@tanstack/react-hotkeys'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { storage } from './domain/storage'
import { appHotkeys } from './features/hotkeys/appHotkeys'
import { AppProviders } from './ui'

// 한 번만 읽는다: 값(참조)이 바뀌면 provider가 현재 재지정을 통째로 교체하기 때문
const savedHotkeys = storage.readHotkeys() as CustomHotkeys

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HotkeysProvider
      appHotkeys={appHotkeys}
      customHotkeys={savedHotkeys}
      onCustomHotkeysChange={(custom) => storage.writeHotkeys(custom)}
    >
      <AppProviders>
        <App />
      </AppProviders>
    </HotkeysProvider>
  </StrictMode>,
)
