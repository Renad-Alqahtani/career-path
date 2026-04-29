/*import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

const otpStore = {}

app.get('/', (req, res) => {
  res.send('Backend working')
})

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' })
})

app.post('/api/login', (req, res) => {
  const { email, password } = req.body

  if (email === 'admin@test.com' && password === '1234') {
    const otp = '654321'

    otpStore[email] = otp

    console.log(`OTP for ${email}: ${otp}`)

    return res.json({ success: true, message: 'OTP sent' })
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' })
})

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body

  if (otpStore[email] === otp) {
    return res.json({ success: true, token: 'dummy-token' })
  }

  res.status(401).json({ success: false, message: 'Invalid OTP' })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})*/