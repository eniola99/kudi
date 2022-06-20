const jwt = require("jsonwebtoken")
const dotenv = require('dotenv')

dotenv.config()

function verifyUserToken(req, res, next) {
    const { authorization } = req.headers;
    if(authorization) {
        const jwtToken = authorization.split(" ")[1]
        req.user = jwt.verify(jwtToken, process.env.MY_SECRET_KEY)
        
        return next()

    }else{
        res.status(403).json('not authenticated')
    }
}

module.exports = verifyUserToken