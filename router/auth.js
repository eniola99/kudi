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

const API = process.env.API_KEY
const DOMAIN = process.env.DOMAIN

const mailgun = require('mailgun-js')({apiKey: API, domain: DOMAIN})

router.post('/register', async(req, res) => {
    try {
        if (!req.body || !req.body.email) {
            return res.status(400).json({ error: 'Email is missing in request body' });
        }
        const wallet = new CoinKey.createRandom()
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
    
                      //generate token and save
                const token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
                token.save()
    
                const url = `${process.env.URL}/${token.token}`

                const data = {
                    from: 'kudiCrypto <kudicrypto1@gmail.com>',
                    to: req.body.email,
                    subject: "Welcome to kudiCrypto",
                    html: `Click <a href = '${url}'>here</a> to confirm your email account.`

                }
                mailgun.messages().send(data, (err, body) => {
                    if(err) console.log('sorry can not send mail ' + err)
                    else console.log(body)
                })
    
                  await user.save()
                  res.status(200).json(`account as been saved successfully`)
    
            }
        })       
    } catch (err) {
        res.status(404).json('something went wrong, try again later')
    }

})

//LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await users.findOne({ email: req.body.email });
        
        if (!user) {
            return res.status(401).json('User not found');
        }
        
        const bytes  = CryptoJS.AES.decrypt(user.password, process.env.MY_SECRET_KEY);
        const originalPassword = bytes.toString(CryptoJS.enc.Utf8);
        
        if (originalPassword !== req.body.password) {
            return res.status(401).json('Incorrect password');
        }

        const generateToken = jwt.sign({ id: user._id, is_verified: user.is_verified }, process.env.MY_SECRET_KEY, {expiresIn: '1d'});

        const { password, wallet_privateAddress, ...info } = user._doc;        
        res.status(200).json({ info, generateToken });

    } catch (err) {
        console.error('Error occurred during login:', err);
        res.status(500).json('Internal server error');
    }
});


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
                            return res.redirect(301, `${process.env.VERIFIED}`)
                        }
                    });
                }
            });
        }
    });
})


module.exports = router