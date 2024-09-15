import Joi from 'joi';
import { VerifyMobileDto } from '@modules/src/@types';

export const MobileSchema = Joi.object<VerifyMobileDto['mobile']>({
  phoneNumber: Joi.string().required().label('Phone number').messages({
    'string.empty': 'Phone number is required',
  }),

  isoCode: Joi.string().required().label('ISO code').messages({
    'string.empty': 'ISO code is required',
  }),
});

export const VerifyMobileValidationSchema = Joi.object<VerifyMobileDto>({
  mobile: MobileSchema.required().label('Mobile').messages({
    'any.required': 'Mobile details are required',
  }),

  verificationCode: Joi.string().required().label('Verification code').messages({
    'string.empty': 'Verification code is required',
  }),
});
