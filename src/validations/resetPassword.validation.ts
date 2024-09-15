import Joi from 'joi';
import { PasswordResetDto } from '@modules/src/@types';

export const PasswordResetValidationSchema = Joi.object<PasswordResetDto>({
  email: Joi.string()
    .email()
    .when('phoneNumber', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    })
    .label('Email')
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email or Phone number is required',
    }),

  phoneNumber: Joi.string()
    .when('email', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    })
    .label('Phone Number')
    .messages({
      'any.required': 'Phone number is required if email is not provided',
    }),

  verificationCode: Joi.string().required().label('Verification Code').messages({
    'any.required': 'Verification code is required',
  }),

  password: Joi.string().required().label('Password').messages({
    'any.required': 'Password is required',
  }),
});
