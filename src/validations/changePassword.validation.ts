import Joi from 'joi';
import { ChangePasswordDto } from '@modules/src/@types';

export const changePasswordValidationSchema = Joi.object<ChangePasswordDto>({
  currentPassword: Joi.string().min(8).required().label('Current password').messages({
    'string.empty': 'Current password is required',
    'string.min': 'Current password must be at least 8 characters long',
  }),

  password: Joi.string().min(8).required().label('New password').messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 8 characters long',
  }),
});
