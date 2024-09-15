import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { ChangePasswordDto } from '@modules/src/@types';
import { changePasswordValidationSchema } from '@/validations/changePassword.validation';
import { Utils } from '@modules/src/utils';

export const ChangePasswordMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<ChangePasswordDto>(changePasswordValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedChangePasswordRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'ChangePasswordMiddleware', 401));
  }
};
