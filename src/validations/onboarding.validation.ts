// validation/userValidation.ts
import Joi from 'joi';
import { Countries, OnBoardingDto } from '@modules/src/@types';

export const CountriesEnum = Joi.string().valid('nigeria', 'usa', 'uk', 'canada');

export const OnBoardingPlaidSchema = Joi.object<OnBoardingDto>({
  profileType: Joi.string().required().label('Profile type').messages({
    'string.empty': 'Profile type is required',
  }),

  country: Joi.string()
    .valid(...Object.values(Countries))
    .required()
    .label('Country')
    .messages({
      'any.only': `Country must be one of the following: ${Object.values(Countries).join(', ')}`,
      'any.required': 'Country is required',
    }),

  uniqueId: Joi.string().required().label('Unique ID').messages({
    'string.empty': 'Unique ID is required',
  }),
});

export const OnBoardingValidationSchema = OnBoardingPlaidSchema.keys({
  reference: Joi.string().optional().label('Reference'),
});
