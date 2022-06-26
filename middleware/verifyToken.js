const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

function verify (req, res, next) {
    const authHeaders = req.headers.token
    if(!authHeaders) {
        return res.status(403).json('forbbideen')
    }
        try {
            const token = authHeaders.split(" ")[1]
            if(!token) {
                return res.status(400).json('token not formatted properly')
            }
            if(token) {
                req.user = jwt.verify(token, process.env.MY_SECRET_KEY);
                return next()
            }
            return res
        } catch (error) {
            if(error instanceof jwt.TokenExpiredError) {
                return res.status(401).json('expired session, login again')
            }
            if(error instanceof jwt.JsonWebTokenError) {
                return res.status(403).json('error token, sign in again')
            }
            return res.status(500).json('UNKNOWN_ERROR_OCURRED')
        }
}

module.exports = verify