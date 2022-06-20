const express = require('express')
const CryptoJS = require("crypto-js")
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const users = require('../models/user')
const nodemailer = require('nodemailer')
const { google } = require('googleapis');
const Token = require('../models/token')
const crypto = require('crypto')
const CoinKey = require('coinkey')


const router = express.Router()
dotenv.config()

const wallet = new CoinKey.createRandom()

router.post('/register', async(req, res) => {
    users.findOne({email: req.body.email}, async(error, user) => {
        if(error) {
            return res.status(500).json('something went wrong')
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
                email: req.body.email,
                wallet_publicAddress: wallet.publicAddress,
                wallet_privateAddress: CryptoJS.AES.encrypt(wallet.privateKey.toString('hex'), process.env.MY_SECRET_KEY).toString(),
                password: CryptoJS.AES.encrypt(req.body.password, process.env.MY_SECRET_KEY).toString(),
            })
            try{
                const saveNewUser = await user.save()
                res.status(200).json(`${saveNewUser.email} as been saved successfully`)
            }catch(error) {
                res.status(400).json('something went wrong')
            }

                  //generate token and save
            var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
            token.save()

    
            const url = `https://kudiii.herokuapp.com/auth/verify/${token.token}`
            
            async function sendMail() {
                const CLIENT_EMAIL = process.env.APP_MAIL;
                const CLIENT_ID = process.env.EMAIL_CLIENT_ID;
                const CLIENT_SECRET = process.env.EMAIL_CLIENT_SECRET;
                const REDIRECT_URL = process.env.EMAIL_CLIENT_REDIRECT_URL;
                const REFRESH_TOKEN = process.env.EMAIL_REFRESH_TOKEN;
            
                const OAuth2Client = new google.auth.OAuth2(
                    CLIENT_ID,
                    CLIENT_SECRET,
                    REDIRECT_URL
                );
            
                OAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })
            
                try {
                    //generate the access token on the fly
                    const accessToken = await OAuth2Client.getAccessToken();
            
                    //creating the mail envelop
                    const transport = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            type: 'OAuth2',
                            user: CLIENT_EMAIL,
                            clientId: CLIENT_ID,
                            clientSecret: CLIENT_SECRET,
                            refreshToken: REFRESH_TOKEN,
                            accessToken: accessToken
                        }
                    })
            
                    const mailOptions = {
                        from:{
                            name: "kudiCrypto",
                            address: process.env.APP_MAIL,
                            },
                        to: `${req.body.email}`,
                        subject: 'WELCOME TO kudiCrypto FAMILY',
                        html: `Click <a href = '${url}'>here</a> to confirm your email.`
                    };
            
                    const result = await transport.sendMail(mailOptions);
                    return result
            
                } catch (error) {
                    return error
                }
            }
            sendMail()
        }
    })
})

//LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await users.findOne({
            email: req.body.email
        })
        if(!user) return res.status(401).json(`user not found`)
        if(!user.is_verified) return res.status(403).json(`Your mail ${req.body.email}  has not been verified. Please check your mail`);


        const bytes  = CryptoJS.AES.decrypt(user.password, process.env.MY_SECRET_KEY)
        const originalPassword = bytes.toString(CryptoJS.enc.Utf8)

        originalPassword !== req.body.password && res.status(401).json('wrong password mate')

        const generateToken = jwt.sign({ id: user._id, is_verified: user.is_verified }, process.env.MY_SECRET_KEY, {expiresIn: '1h'})

        const { password, ...info } = user._doc
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