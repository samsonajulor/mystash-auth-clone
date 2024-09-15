import Joi from 'joi';
import { VerifyPlaidDto } from '@modules/src/@types';

export const VerifyPlaidValidationSchema = Joi.object<VerifyPlaidDto>({
  password: Joi.string().required().label('Password').messages({
    'string.empty': 'Password is required',
  }),
});
