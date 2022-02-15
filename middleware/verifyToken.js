const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

function verify (req, res, next) {
    const authHeaders = req.headers.token
    if(authHeaders) {
        const token = authHeaders.split(" ")[1]
        jwt.verify(token, process.env.MY_SECRET_KEY, (err, user) => {
            if(err) return res.sendStatus(403)
            req.user = user
            next()
        })
    }else{
        res.status(403).json('not authenticated')
    }
}

module.exports = verify