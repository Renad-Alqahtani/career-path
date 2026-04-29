import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            navigate('/auth?error=callback', { replace: true })
            return
          }
        }

        await supabase.auth.signOut()
        navigate('/auth?verified=1', { replace: true })
      } catch {
        navigate('/auth?error=callback', { replace: true })
      }
    }

    handleAuthCallback()
  }, [navigate])

  return <div className="min-h-screen flex items-center justify-center">Loading...</div>
}

export default AuthCallback