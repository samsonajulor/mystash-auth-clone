import { ForgotPasswordDto } from '@modules/src/@types';
import Joi from 'joi';

export const ForgotPasswordValidationSchema = Joi.object<ForgotPasswordDto>({
  email: Joi.string()
    .email()
    .when('phoneNumber', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    })
    .label('Invalid email address'),

  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .when('email', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    })
    .label('Invalid phone number'),
})
  .xor('email', 'phoneNumber')
  .messages({
    'object.missing': 'Either email or phone number must be provided',
    'object.xor': 'Only one of email or phone number should be provided',
  });
