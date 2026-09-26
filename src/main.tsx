import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileCacheProvider } from './contexts/ProfileCacheContext'
import { BrowserRouter } from 'react-router-dom'
import { initConsent } from './lib/consent'

// Meta Pixel loads only for visitors who accepted marketing cookies
initConsent()

// After a deploy, old lazy chunks disappear: reload once instead of showing an error
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('chunk_reload')) return
    sessionStorage.setItem('chunk_reload', '1')
  } catch { /* storage unavailable */ }
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <ProfileCacheProvider>
        <App />
      </ProfileCacheProvider>
    </AuthProvider>
  </BrowserRouter>,
)
