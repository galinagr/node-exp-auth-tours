const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

//name, email, photo, password, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name!']
    // unique: true,
    // maxlength: [50, 'A user name must have less or equal than 50 characters!'],
    // minlength: [8, 'A user name must have more or equal than 8 characters!']
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    // trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email!'],
    // validator: function(val) {
    //   const matcher = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    //   return val.match(matcher);
    // },
    message: 'Please fill a valid email address'
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'A user must have a password!'],
    // unique: true,
    // maxlength: [50, 'A user name must have less or equal than 50 characters!'],
    minlength: [8, 'A user name must have more or equal than 8 characters!'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    //ON create() and on save() ONLY!!!
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  //Only run on this function if a password in actually modified
  if (!this.isModified('password')) return next();
  //Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  //Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  //This points to a current user
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

