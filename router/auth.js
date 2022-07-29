const express = require('express')
const CryptoJS = require("crypto-js")
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const users = require('../models/user')
const Token = require('../models/token')
const crypto = require('crypto')
const CoinKey = require('coinkey')



const router = express.Router()
dotenv.config()

const wallet = new CoinKey.createRandom()


const api_key = process.env.api_key
const domain = process.env.domain_name
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

router.post('/register', async(req, res) => {
    users.findOne({email: req.body.email}, async(error, user) => {
        if(error) {
            return res.status(500).json('something went wronggg')
        }
        else if(req.body.email == null) {
            return res.status(403).json('please enter a valid email')
        }
        else if(user) {
            return res.status(500).json(`account already exist`)
        }
        else{
            user = new users({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                username: req.body.username,
                email: req.body.email,
                wallet_publicAddress:  wallet.publicAddress,
                wallet_privateAddress: CryptoJS.AES.encrypt(wallet.privateKey.toString('hex'), process.env.MY_SECRET_KEY).toString(),
                password: CryptoJS.AES.encrypt(req.body.password, process.env.MY_SECRET_KEY).toString(),
            })
            try{
                await user.save()
                res.status(200).json(`account as been saved successfully`)

                  //generate token and save
            const token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
            token.save()

    
            const url = `https://kudiii.herokuapp.com/auth/verify/${token.token}`

            const data = {
                from: 'KudiCrypto <kudicrypto1@gmail.com>',
                to: `${req.body.email}`,
                subject: 'Welcome to KudiCrypto',
                html: `Click <a href = '${url}'>here</a> to confirm your email.`
              };
               
              mailgun.messages().send(data, function (error, body) {
                  if(error) {
                      console.log(error)
                  }else{
                    console.log(body);
                  }
              });
            }
            catch(error) {
                res.status(400).json('username already exist')
            }
        }
    })
})

//LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await users.findOne({ email: req.body.email })
        if(!user) return res.status(401).json(`user not found`)
        if(!user.is_verified) {
            return res.status(403).json(`Your mail ${req.body.email}  has not been verified. Please check your mail`);
        }

        const bytes  = CryptoJS.AES.decrypt(user.password, process.env.MY_SECRET_KEY)
        const originalPassword = bytes.toString(CryptoJS.enc.Utf8)

        originalPassword !== req.body.password && res.status(401).json('wrong password mate')

        const generateToken = jwt.sign({ id: user._id, is_verified: user.is_verified }, process.env.MY_SECRET_KEY, {expiresIn: '1d'})

        const { password, wallet_privateAddress, ...info } = user._doc
        res.status(200).json({info, generateToken})

    } catch (err) {
        res.status(404).json('something when wrong')
    }

})

//VERIFY ACCOUNT
router.get('/verify/:id', async (req, res) => {

        Token.findOne({token: req.params.id}, (err, token) => {
        // token is not found into database i.e. token may have expired 
        console.log(token)
        if (!token){
            res.status(400).json('Your verification link may have expired. Please click on resend for verify your Email.');
        }
        // if token is found then check valid user 
        else{
            users.findOne({ _id: token._userId }, (err, users) => {
                // not valid user
                if (!users){
                    return res.status(401).json('We were unable to find a user for this verification. Please SignUp!')
                } 
                // user is already verified
                else if (users.is_verified){
                    return res.status(200).send('User has been already verified. Please Login');
                }
                // verify user
                else{
                    // change isVerified to true
                    users.is_verified = true;
                    users.save((err) => {
                        // error occur
                        if(err){
                            return res.status(500).send({msg: err.message});
                        }
                        // account successfully verified
                        else{
                            return res.redirect(301, `https://kudicrypto1.web.app/verified`)
                        }
                    });
                }
            });
        }
    });
})


module.exports = router