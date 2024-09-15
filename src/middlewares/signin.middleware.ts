import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { SignInDto } from '@modules/src/@types';
import { SignInValidationSchema } from '@/validations/signin.validation';
import { Utils } from '@modules/src/utils';

export const SignInMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<SignInDto>(SignInValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedSignInRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'SignInMiddleware', 401));
  }
};
