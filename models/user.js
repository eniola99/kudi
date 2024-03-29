const mongoose = require('mongoose');
const dotenv = require('dotenv')

dotenv.config()
const userSchema = new mongoose.Schema(
    {
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        password: String,
        // username: { type: String, unique: true},
        wallet_publicAddress: String,
        wallet_privateAddress: String,
        is_verified: {type: Boolean, default: false, required: true},
        Phone: Number,
        Address: String,
        Account: String,
        Bank: String,
        Terms: String,
        Rate: Number,
        Pin: Number
    },
    { timestamps: true }
)

module.exports = mongoose.model('user', userSchema)