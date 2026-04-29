import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, UserRole } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, UserCheck, User, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,15}$/

const getDashboardPath = (role?: UserRole) => {
  switch (role) {
    case 'student':
      return '/student/dashboard'
    case 'advisor':
      return '/advisor/dashboard'
    case 'mentor':
      return '/mentor/dashboard'
    case 'admin':
      return '/auth'
    default:
      return '/profile'
  }
}

function Auth() {
  const {
    login,
    register,
    isAuthenticated,
    isLoading,
    profile,
    resetPasswordForEmail,
  } = useAuth()

  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupRole, setSignupRole] = useState<UserRole>('student')
  const [isLogin, setIsLogin] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [isVerifyMode, setIsVerifyMode] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  useEffect(() => {
    document.title = 'CareerPath'
  }, [])

  useEffect(() => {
    const skipRedirect = sessionStorage.getItem('skip-auth-redirect') === '1'

    if (!skipRedirect && !isLoading && isAuthenticated && profile) {
      if (profile.role === 'admin') {
        toast.error('Admin accounts are managed only through Supabase')
        navigate('/auth', { replace: true })
        return
      }

      navigate(getDashboardPath(profile.role), { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, profile])

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Please enter your email'
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address'
    return null
  }

  const validatePassword = (value: string) => {
    if (!value.trim()) return 'Please enter your password'
    if (!passwordRegex.test(value)) {
      return 'Password must be 8-15 characters and include uppercase, lowercase, number, and special character'
    }
    return null
  }

  const handleSubmit = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      toast.error(emailError)
      return
    }

    if (isLogin) {
      if (!password.trim()) {
        toast.error('Please enter your password')
        return
      }
    } else {
      if (!name.trim()) {
        toast.error('Please enter your name')
        return
      }

      const passwordError = validatePassword(password)
      if (passwordError) {
        toast.error(passwordError)
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (isLogin) {
        await login(email.trim(), password)
        return
      }

      const result = await register(email.trim(), password, name.trim(), signupRole)

      if (result === 'created') {
        toast.success('A verification code has been sent to your email.')
        setVerificationEmail(email.trim())
        setVerificationCode('')
        setIsVerifyMode(true)
        setIsLogin(true)
        setPassword('')
        setName('')
        setSignupRole('student')
        return
      }

      if (result === 'existing' || result === 'resent') {
        toast.error('This account is already registered. Please sign in instead.')
        setIsLogin(true)
        setIsVerifyMode(false)
        setEmail(email.trim())
        setPassword('')
        return
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async () => {
    const emailError = validateEmail(verificationEmail)
    if (emailError) {
      toast.error(emailError)
      return
    }

    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: verificationEmail.trim(),
        token: verificationCode.trim(),
        type: 'signup',
      })

      if (error) throw error

      await supabase.auth.signOut()
      toast.success('Email verified successfully. Please sign in.')
      setIsVerifyMode(false)
      setEmail(verificationEmail.trim())
      setPassword('')
      setVerificationCode('')
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired verification code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerificationCode = async () => {
    const targetEmail = isVerifyMode ? verificationEmail : email
    const emailError = validateEmail(targetEmail)

    if (emailError) {
      toast.error(emailError)
      return
    }

    if (!isVerifyMode && !password.trim()) {
      toast.error('Please enter your password first')
      return
    }

    setIsSubmitting(true)
    sessionStorage.setItem('skip-auth-redirect', '1')

    try {
      if (!isVerifyMode) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: targetEmail.trim(),
          password,
        })

        if (!loginError && data.user?.email_confirmed_at) {
          await supabase.auth.signOut()
          toast.success('This account is already verified. Please sign in.')
          setIsLogin(true)
          setIsVerifyMode(false)
          setEmail(targetEmail.trim())
          setPassword('')
          return
        }

        if (!loginError && data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut()
        }

        if (loginError && !loginError.message.toLowerCase().includes('email not confirmed')) {
          toast.error('Incorrect email or password')
          return
        }
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail.trim(),
      })

      if (error) throw error

      toast.success('A new verification code has been sent.')
      setVerificationEmail(targetEmail.trim())
      setVerificationCode('')
      setIsVerifyMode(true)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      sessionStorage.removeItem('skip-auth-redirect')
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      toast.error(emailError)
      return
    }

    setIsSubmitting(true)

    try {
      await resetPasswordForEmail(email.trim())
      toast.success('A reset code has been sent to your email.')
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const signupRoles = [
    { value: 'student', label: 'Student', icon: GraduationCap },
    { value: 'advisor', label: 'Advisor', icon: UserCheck },
    { value: 'mentor', label: 'Mentor', icon: User },
  ] as const

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (isVerifyMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Verify Email</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the verification code sent to your email.
                </p>
              </div>

              <Input
                type="email"
                placeholder="Email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                disabled={isSubmitting}
              />

              <Input
                type="text"
                placeholder="Verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isSubmitting}
              />

              <Button className="w-full" onClick={handleVerifyCode} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Code'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendVerificationCode}
                disabled={isSubmitting}
              >
                Send New Code
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsVerifyMode(false)
                  setIsLogin(true)
                  setEmail(verificationEmail)
                  setPassword('')
                }}
                disabled={isSubmitting}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">CareerPath</h1>
              <p className="text-sm text-muted-foreground">
                Guide your future with smart recommendations
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isLogin ? 'default' : 'outline'}
                onClick={() => setIsLogin(true)}
                disabled={isSubmitting}
              >
                Login
              </Button>

              <Button
                type="button"
                variant={!isLogin ? 'default' : 'outline'}
                onClick={() => setIsLogin(false)}
                disabled={isSubmitting}
              >
                Sign Up
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {isLogin && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    Forgot your password?
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerificationCode}
                    disabled={isSubmitting}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    Resend verification code
                  </button>
                </div>
              )}

              {!isLogin && (
                <>
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />

                  <p className="text-xs text-muted-foreground">
                    Password must be 8-15 characters and include uppercase, lowercase, number, and special character.
                  </p>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Choose account type</p>

                    <div className="grid grid-cols-2 gap-3">
                      {signupRoles.map((r) => {
                        const Icon = r.icon
                        const selected = signupRole === r.value

                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => {
                              if (isSubmitting) return
                              setSignupRole(r.value as UserRole)
                            }}
                            className={`border rounded-lg p-4 text-left transition ${
                              selected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{r.label}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLogin ? (
                  'Login'
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Auth