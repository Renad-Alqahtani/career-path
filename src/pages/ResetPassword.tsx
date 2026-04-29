import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,15}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ResetPassword() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsDoNotMatch = confirmPassword.length > 0 && password !== confirmPassword

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const emailFromUrl = params.get('email')

    if (emailFromUrl) {
      setEmail(emailFromUrl)
    }
  }, [])

  const goBackToLogin = async () => {
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  const sendNewCode = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error) throw error

      toast.success('A new reset code has been sent.')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!token.trim()) {
      toast.error('Please enter the reset code')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'recovery',
      })

      if (error) throw error

      setVerified(true)
      toast.success('Code verified. Enter your new password.')
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!passwordRegex.test(password)) {
      toast.error(
        'Password must be 8-15 characters and include uppercase, lowercase, number, and special character'
      )
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        toast.error('Reset session expired. Please request a new reset code.')
        setVerified(false)
        setToken('')
        return
      }

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        const msg = error.message.toLowerCase()

        if (msg.includes('same') || msg.includes('different')) {
          toast.error('New password cannot be the same as your old password.')
          return
        }

        throw error
      }

      await supabase.auth.signOut()
      toast.success('Password updated successfully. Please log in.')
      navigate('/auth', { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h1 className="text-2xl font-bold text-center">Reset Password</h1>

            {!verified ? (
              <>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />

                <Input
                  type="text"
                  placeholder="Reset code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                />

                <Button className="w-full" onClick={handleVerifyCode} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={sendNewCode}>
                  Send New Code
                </Button>

                <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={goBackToLogin}>
                  Back to Login
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Password must be 8-15 characters and include uppercase, lowercase, number, and special character.
                </p>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {passwordsDoNotMatch && (
                  <p className="text-sm text-destructive">Passwords do not match.</p>
                )}

                {passwordsMatch && (
                  <p className="text-sm text-green-600">Passwords match.</p>
                )}

                <Button className="w-full" onClick={handleUpdatePassword} disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>

                <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={goBackToLogin}>
                  Back to Login
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}