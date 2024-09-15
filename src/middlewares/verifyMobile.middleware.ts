import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { VerifyMobileDto } from '@modules/src/@types';
import { VerifyMobileValidationSchema } from '@/validations/verifyMobile.validation';
import { Utils } from '@modules/src/utils';

export const VerifyMobileMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<VerifyMobileDto>(VerifyMobileValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedVerifyMobileRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'VerifyMobileMiddleware', 401));
  }
};
