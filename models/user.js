const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')

dotenv.config()
const userSchema = new mongoose.Schema(
    {
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        password: String,
        is_verified: {type: Boolean, default: false, required: true},
    },
    { timestamps: true }
)

module.exports = mongoose.model('user', userSchema)