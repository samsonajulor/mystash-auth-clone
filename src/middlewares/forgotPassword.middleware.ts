import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { ForgotPasswordDto } from '@modules/src/@types';
import { ForgotPasswordValidationSchema } from '@/validations/forgotPassword.validation';
import { Utils } from '@modules/src/utils';

export const ForgotPasswordMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<ForgotPasswordDto>(ForgotPasswordValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedForgotPasswordRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'ForgotPasswordMiddleware', 401));
  }
};
