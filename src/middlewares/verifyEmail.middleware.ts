import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { VerifyEmailDto } from '@modules/src/@types';
import { VerifyEmailValidationSchema } from '@/validations/verifyEmail.validation';
import { Utils } from '@modules/src/utils';

export const VerifyEmailMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<VerifyEmailDto>(VerifyEmailValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedVerifyEmailRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'VerifyEmailMiddleware', 401));
  }
};
