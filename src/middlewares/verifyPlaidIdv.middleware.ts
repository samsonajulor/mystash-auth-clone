import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { VerifyPlaidDto } from '@modules/src/@types';
import { VerifyPlaidValidationSchema } from '@/validations/verifyPlaidIdv.validation';
import { Utils } from '@modules/src/utils';

export const VerifyPlaidMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<VerifyPlaidDto>(VerifyPlaidValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedVerifyPlaidRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'VerifyPlaidMiddleware', 401));
  }
};
