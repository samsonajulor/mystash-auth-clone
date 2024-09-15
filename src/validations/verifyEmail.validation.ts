import Joi from 'joi';
import { VerifyEmailDto } from '@modules/src/@types';

export const VerifyEmailValidationSchema = Joi.object<VerifyEmailDto>({
  email: Joi.string().email().required().label('Email').messages({
    'string.email': 'A valid email address is required',
    'string.empty': 'Email is required',
  }),

  verificationCode: Joi.string().required().label('Verification Code').messages({
    'string.empty': 'Verification code is required',
  }),
});
