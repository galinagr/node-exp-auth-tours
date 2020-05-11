const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   fileName: (req, file, cb) => {
//     //user-dgajhpr-36026106.jpeg
//     const ext = file.mimeType.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, res, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload an image!', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.fileName = `user-${req.user.id}-${Date.now()}.jpeg`;

  await (req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.fileName}`);
  next();
});


const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  }));
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1. Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates! Please use /updateMyPassword'), 4000);
  }
  //2. Filter out user body to exclude user's fields not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.fileName;
  //3.Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.body.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {

  res.status(500).json({
    status: 'error',
    message: 'THis route is not yet defined. Please use /signup instead.'
  });
};
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
//DO NOT update passwords here
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
