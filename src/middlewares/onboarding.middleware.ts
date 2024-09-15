import { NextFunction, Request, Response } from 'express';
import { LogAction, LogStatus, LogUsers, OnBoardingDto, StatusCode } from '@modules/src/@types';
import { OnBoardingValidationSchema } from '@/validations/onboarding.validation';
import { Utils } from '@modules/src/utils';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';

export const OnboardingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = Utils.validateJoiSchema<OnBoardingDto>(OnBoardingValidationSchema, req.body);
    if (error) {
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.UNAUTHORIZED,
        { error },
        {
          user: LogUsers.AUTH,
          action: LogAction.ONBOARD,
          message: 'invalid request',
          status: LogStatus.FAIL,
          serviceLog: AuthModel,
          options: { email: '', phone: '', authId: '', profileId: '' },
        },
      );
    }
    res.locals.validatedOnBoardingRequestBody = value;
    next();
  } catch (error) {
    return Utils.apiResponse<AuthDocument>(
      res,
      StatusCode.UNAUTHORIZED,
      { error },
      {
        user: LogUsers.AUTH,
        action: LogAction.ONBOARD,
        message: 'invalid request',
        status: LogStatus.FAIL,
        serviceLog: AuthModel,
        options: { email: '', phone: '', authId: '', profileId: '' },
      },
    );
  }
};
