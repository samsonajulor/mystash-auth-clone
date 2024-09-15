import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { SignUpDto } from '@modules/src/@types';
import { signUpValidationSchema } from '@/validations/signup.validation';
import { Utils } from '@modules/src/utils';

export const SignUpMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<SignUpDto>(signUpValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedSignUpRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'SignUpMiddleware', 401));
  }
};
