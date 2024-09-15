import Joi from 'joi';
import { VerificationType, SendVerificationDto, MobileDto } from '@modules/src/@types';

export const MobileSchema = Joi.object<MobileDto>({
  phoneNumber: Joi.string().required().label('Phone Number').messages({
    'any.required': 'Phone number is required',
  }),
  isoCode: Joi.string().required().label('ISO Code').messages({
    'any.required': 'ISO code is required',
  }),
});

export const SendVerificationValidationSchema = Joi.object<SendVerificationDto>({
  email: Joi.string()
    .email()
    .when('mobile', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    })
    .label('Email')
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email or Mobile is required',
    }),

  mobile: MobileSchema.when('email', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }).label('Mobile'),

  type: Joi.string()
    .valid(...Object.values(VerificationType))
    .required()
    .label('Verification Type')
    .messages({
      'any.required': 'Verification type is required',
      'any.only': 'Verification type must be either "mobile" or "email"',
    }),
});
