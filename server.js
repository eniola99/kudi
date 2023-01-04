const app = require('express')()
const PORT = process.env.PORT || 4000

const server = require('http').Server(app)
const cors = require('cors')

app.use(cors())
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const io = require('socket.io')(server, {
  cors: {
      origin: 'http://localhost:3000',
      method: ['GET', 'POST']
  }
})

dotenv.config()
const url = process.env.mongooseConnect
mongoose.connect(url)
const connection = mongoose.connection
connection.once('open', () => {
    console.log('mongoDB as been connected successfully')
})

// io.on("connection", (socket) => {
//   console.log(`socket connected with id ${socket.id}`)
//   socket.on('disconnect', () => {
//     console.log('user disconnected')
//   })
// })

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

server.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`)
})