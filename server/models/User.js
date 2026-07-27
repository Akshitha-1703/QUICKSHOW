import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    name: {type: String, required: true},
    email: {type: String, requried: true},
    image: {type: String, requried: true}
})

const User = mongoose.model('User', userSchema)

export default User;