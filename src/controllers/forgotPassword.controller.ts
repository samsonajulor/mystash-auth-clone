import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, ForgotPasswordDto, StatusCode } from '@modules/src/@types';
import { Model } from '@modules/src/services';
import { Utils } from '@/utils';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 */
class ForgotPasswordController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.FORGOT_PASSWORD, AuthModel];

  /**
   * Handles the ForgotPassword process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async ForgotPassword(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated sign-up data ************/
      const validatedForgotPasswordRequestBody: ForgotPasswordDto & Partial<AuthDocument> = res.locals.validatedForgotPasswordRequestBody;

      const { email, phoneNumber } = validatedForgotPasswordRequestBody as ForgotPasswordDto;

      /************ Find the user by email or phone ************/
      const auth = await ForgotPasswordController.authService.findOneMongo(
        {
          $or: [{ email }, { 'mobile.phoneNumber': phoneNumber }],
          deleted: false,
        },
        {},
        { session },
      );

      if (!auth.status) {
        return ForgotPasswordController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          'User not found',
          LogStatus.FAIL,
          ...ForgotPasswordController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }
      const code: number = Utils.generateRandomNumber(6);
      const expiration = Utils.addMinToDate(15);
      auth.data.verificationCodes = {
        ...auth.data.verificationCodes,
        resetPassword: { code: String(code), expiration },
      };
      await auth.data.save({ session });

      // send forgot password email i.e. verify otp

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.OK,
        {},
        {
          user: LogUsers.AUTH,
          action: LogAction.FORGOT_PASSWORD,
          message: 'success.',
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

export default new ForgotPasswordController();
