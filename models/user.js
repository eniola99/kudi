const mongoose = require('mongoose');
const dotenv = require('dotenv')

dotenv.config()
const userSchema = new mongoose.Schema(
    {
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        password: String,
        wallet_publicAddress: String,
        wallet_privateAddress: String,
        is_verified: {type: Boolean, default: false, required: true},
        pin: {type: Number, default: null }
    },
    { timestamps: true }
)

module.exports = mongoose.model('user', userSchema)