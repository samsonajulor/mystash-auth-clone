import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, BentoBoardingDto, StatusCode } from '@modules/src/@types';
import { Model } from '@modules/src/services';
import { Utils } from '@/utils';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 */
class BentoBoardingController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.ONBOARD_BENTO, AuthModel];

  /**
   * Handles the BentoBoarding process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async Onboard(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated sign-up data ************/
      const validatedBentoBoardingRequestBody: BentoBoardingDto & Partial<AuthDocument> = res.locals.validatedBentoBoardingRequestBody;

      const {} = validatedBentoBoardingRequestBody as BentoBoardingDto;

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.CREATED,
        {},
        {
          user: LogUsers.AUTH,
          action: LogAction.ONBOARD_BENTO,
          message: 'Onboard success.',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: { email: '', phone: '', authId: '', profileId: '' },
        },
      );
    } catch (error) {
      console.log(error);
      !session.transaction.isActive && (await session.abortTransaction());
      session.endSession();
      /************ Send an error response ************/
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.UNAUTHORIZED,
        { devError: error.message || 'server error' },
        {
          user: LogUsers.AUTH,
          action: LogAction.SIGNUP,
          message: JSON.stringify(error),
          status: LogStatus.FAIL,
          serviceLog: AuthModel,
          options: { email: '', phone: '', authId: '', profileId: '' },
        },
      );
    } finally {
      session.endSession();
    }
  }
}

export default new BentoBoardingController();
