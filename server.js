const express = require('express')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const cors = require('cors')


dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())
const PORT = process.env.PORT || 5000
const url = process.env.mongooseConnect
mongoose.connect(url)
const connection = mongoose.connection
connection.once('open', () => {
    console.log('mongoDB as been connected successfully')
})
const authRouter = require('./router/auth')
const userRouter = require('./router/user')

app.use('/auth', authRouter)
app.use('/auth/user', userRouter)


app.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!")
  })

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })

app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`)
})