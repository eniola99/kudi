const express = require('express')
const users = require('../models/user')
const verify = require('../middleware/verifyToken')
const CryptoJS = require('crypto-js')

const router = express.Router()

//GET ONE USER
router.get("/find/:id", verify, async (req, res) => {
        try {
            const findUser = await users.findById(req.params.id)
            const { password, wallet_privateAddress, ...info } = findUser._doc
            res.status(200).json({info})
        } catch (err) {
            res.status(404).json('not found')
    }
})

//GET ALL USER
router.get("/find", async (req, res) => {
    try {        
        const usersList = await users.find()
        res.status(200).json(usersList)
    } catch (err) {
        res.status(404).json('not user register')
    }
})

//UPDATE USER

router.patch("/:id", verify, async (req, res) => {
    if(req.user.id === req.params.id) {
        if(req.body.password) {
            req.body.password = CryptoJS.AES.encrypt(req.body.password, process.env.MY_SECRET_KEY).toString()
        }
    try {
        const updateUser = await users.findByIdAndUpdate(req.params.id, {$set: req.body}, {new: true})
        res.status(200).json(`${updateUser.email} user account as been updated`)
    } catch (err) {
        res.status(500).json("no")
    }
    }else{
        res.status(403).json('not authenticated')
    }
})

//DELETE USER

router.delete("/:id", verify, async (req, res) => {
    if(req.user.id === req.params.id) {
    try {
        await users.findByIdAndDelete(req.params.id)
        res.status(200).json(`account as been deleted`)
    } catch (err) {
        res.status(500).json(`can't delete user`)
    }
    }else{
        res.status(403).json('not authenticated')
    }
})

module.exports = router