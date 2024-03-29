const express = require('express')
const users = require('../models/user')
const verify = require('../middleware/verifyToken')
const CryptoJS = require('crypto-js')
const axios = require('axios')
const bitcore = require("bitcore-lib")
const dotenv = require('dotenv')


const router = express.Router()
dotenv.config()

//GET ONE USER
router.get("/find/:id", verify, async (req, res) => {
        try {
            const findUser = await users.findById(req.params.id)
            const { password, wallet_privateAddress, _id, ...info } = findUser._doc
            res.status(200).json({info})
        } catch (err) {
            res.status(500).json('something went wrong, try again later')
    }
})

//GET ALL USER WITHOUT THE ID
router.get("/active/:id", verify, async(req, res) => {
    try {
        const activeUser = await users.find()
        const value = req.params.id
        const activeUserFinal = activeUser.filter((item) => item.id !== value)
        let input = []
        activeUserFinal.forEach((admin) => {
            const val = {
                name: admin.lastName,
                address: admin.wallet_publicAddress,
                bankAcc: admin.Account,
                addrss: admin.Address,
                bankName: admin.Bank,
                phoneNumber: admin.Phone,
                exchangeRate: admin.Rate,
                message: admin.Terms
            }
            input.push(val)
        })
        const randomizeInput = input.sort(() => 0.5 - Math.random())
        res.status(200).json(randomizeInput)
    } catch (error) {
        console.log('an error occur ' + error)
    }
})

//GET ALL USER
router.get("/find", verify, async (req, res) => {
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
        const { password, wallet_privateAddress, ...info } = updateUser._doc
        res.status(200).json({info})

        // res.status(200).json(updateUser)
    } catch (err) {
        res.status(500).json("something went wrong")
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


//SENDING BITCOIN
router.post('/send/:id', verify, async(req, res) => {
    try {
    const findUser = await users.findById(req.params.id)
        const userAddress = findUser.wallet_publicAddress
        const bytes = CryptoJS.AES.decrypt(findUser.wallet_privateAddress, process.env.MY_SECRET_KEY)


        const admin = '1KrMXYfWkRbY75yFeFqbQFffmCtqJLzZRK'
        const adminFee = 2997
            const sochain_network = "BTC"
            const privateKey = bytes.toString(CryptoJS.enc.Utf8)
            const sourceAddress = userAddress
            const satoshiToSend = req.body.amount * 100000000
            let fee = 0
            let inputCount = 0
            let outputCount = 2
        
            const utxos = await axios.get(`${process.env.UTOX}/${sochain_network}/${sourceAddress}`)
    
            //creating new transaction
            const transaction = new bitcore.Transaction()
            let totalAmountAvailable = 0
    
            let inputs = []
            utxos.data.data.txs.forEach(async (element) => {
                let utxo = {}
                utxo.satoshis = Math.floor(Number(element.value) * 100000000)
                utxo.script = element.script_hex
                utxo.address = utxos.data.data.address
                utxo.txId = element.txid
                utxo.outputIndex = element.output_no
    
                totalAmountAvailable += utxo.satoshis
                inputCount += 1
                inputs.push(utxo)
            })
    
            transactionSize = inputCount * 146 + outputCount * 34 + 10 - inputCount
    
             //checking if enough funds in the wallet
            fee = transactionSize * 20
            if (totalAmountAvailable - satoshiToSend - fee < 0) {
                res.send('balance is too low for this transaction')
                return
            }

            //setting transaction input
            transaction.from(inputs)
            transaction.to(req.body.wallet, satoshiToSend)
            // transaction.to( '1KrMXYfWkRbY75yFeFqbQFffmCtqJLzZRK', console.log(`${adminFee}`) )
            transaction.change(sourceAddress)
            transaction.fee(fee)
            transaction.sign(privateKey)
            const serializedTX = transaction.serialize()
    
            //send transaction
             const result = await axios({
                 method: "POST",
                 url: `${process.env.SEND_TX}/${sochain_network}`,
                 data: {
                     tx_hex: serializedTX
                 },
             })
            res.send('transfer successfully')
        } catch (error) {
            console.log('internal server error, not send '+ error)
            // res.status(500).json('internal server error '+ error )
        }
})

module.exports = router