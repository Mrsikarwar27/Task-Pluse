import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError, assert } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requiredString } from '../utils/validators.js';

export const login = asyncHandler(async (req, res) => {
  const email = requiredString(req.body?.email, 'Email', { max: 160 }).toLowerCase();
  const password = requiredString(req.body?.password, 'Password', { max: 128 });

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact the administrator.');
  }

  const token = signToken(user);
  res.json({ token, user: user.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = requiredString(req.body?.currentPassword, 'Current password', {
    max: 128,
  });
  const newPassword = requiredString(req.body?.newPassword, 'New password', { max: 128 });
  assert(newPassword.length >= 8, 422, 'New password must be at least 8 characters.');

  const user = await User.findById(req.user._id).select('+passwordHash');
  const matches = await user.comparePassword(currentPassword);
  assert(matches, 401, 'Current password is incorrect.');

  const bcrypt = (await import('bcryptjs')).default;
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: 'Password updated successfully.' });
});
