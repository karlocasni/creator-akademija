import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileCacheProvider } from './contexts/ProfileCacheContext'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <ProfileCacheProvider>
        <App />
      </ProfileCacheProvider>
    </AuthProvider>
  </BrowserRouter>,
)
