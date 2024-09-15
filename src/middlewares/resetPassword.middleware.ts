import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { PasswordResetDto } from '@modules/src/@types';
import { PasswordResetValidationSchema } from '@/validations/resetPassword.validation';
import { Utils } from '@modules/src/utils';

export const PasswordResetMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<PasswordResetDto>(PasswordResetValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedPasswordResetRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'PasswordResetMiddleware', 401));
  }
};
