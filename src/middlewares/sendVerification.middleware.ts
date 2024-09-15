import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../modules/src/utils';
import { SendVerificationDto } from '@modules/src/@types';
import { SendVerificationValidationSchema } from '@/validations/sendVerification.validation';
import { Utils } from '@modules/src/utils';

export const SendVerificationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<SendVerificationDto>(SendVerificationValidationSchema, req.body);
    if (error) {
      return { error };
    }
    res.locals.validatedSendVerificationRequestBody = value;
    next();
  } catch (error) {
    next(new ApiError(error.message || error, 'SendVerificationMiddleware', 401));
  }
};
