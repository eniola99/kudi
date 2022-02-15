const express = require('express')
const CryptoJS = require("crypto-js")
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const users = require('../models/user')

const router = express.Router()
dotenv.config()

//REGISTER
router.post('/register', async (req, res) => {
    const newUser = new users({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: CryptoJS.AES.encrypt(req.body.password, process.env.MY_SECRET_KEY).toString()
    })
    try{
        const saveNewUser = await newUser.save()
        res.status(200).json(`${saveNewUser.email} saved successfully`)
    }catch(err) {
        res.status(400).json('something went wrong')
    }
})

//LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await users.findOne({
            email: req.body.email
        })
        !user && res.status(401).json(`user not found`)

        const bytes  = CryptoJS.AES.decrypt(user.password, process.env.MY_SECRET_KEY)
        const originalPassword = bytes.toString(CryptoJS.enc.Utf8)

        originalPassword !== req.body.password && res.status(401).json('wrong password mate')

        const generateToken = jwt.sign({ id: user._id }, process.env.MY_SECRET_KEY, {expiresIn: '5d'})

        res.status(200).json({user, generateToken})
    } catch (err) {
        console.log(err)
    }
})

module.exports = router