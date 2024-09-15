import Joi from 'joi';
import { MobileDto, ProfileTypes, SignUpDto } from '@modules/src/@types';

export const signUpValidationSchema = Joi.object<SignUpDto>({
  uniqueId: Joi.string().required(),
  employeeId: Joi.string(),
  profileType: Joi.string<ProfileTypes>().required(),
  firstName: Joi.string().when('country', { is: 'NG', then: Joi.required() }),
  lastName: Joi.string().when('country', { is: 'NG', then: Joi.required() }),
  businessName: Joi.string().when('profileType', { is: 'business', then: Joi.required() }),
  country: Joi.string().required(),
  email: Joi.string().when('country', { is: 'NG', then: Joi.required() }),
  mobile: Joi.object<MobileDto>({
    phoneNumber: Joi.string().required(),
    isoCode: Joi.string().required(),
  }),
  password: Joi.string().when('country', { is: 'NG', then: Joi.required() }),
  referral: Joi.string(),
});
