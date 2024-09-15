import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, PasswordResetDto, StatusCode } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';
import _ from 'lodash';

/**
 * ResetPasswordController handles the process of resetting a user's password.
 */
class ResetPasswordController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.RESET_PASSWORD, AuthModel];

  /**
   * Handles the reset password process.
   * @param req - Express request object containing the reset password data.
   * @param res - Express response object to send the response.
   */
  async ResetPassword(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated reset password data ************/
      const validatedResetPasswordRequestBody: PasswordResetDto & Partial<AuthDocument> = res.locals.validatedResetPasswordRequestBody;

      const { email, phoneNumber, password } = validatedResetPasswordRequestBody as PasswordResetDto;

      /************ Find the user by email or phone ************/
      const auth = await ResetPasswordController.authService.findOneMongo(
        {
          $or: [{ email }, { 'mobile.phoneNumber': phoneNumber }],
          deleted: false,
        },
        {},
        { session },
      );

      if (!auth.status) {
        return ResetPasswordController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          'User not found',
          LogStatus.FAIL,
          ...ResetPasswordController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      /************ Check if the password reset can be performed ************/
      const canResetError = ResetPasswordController.cannotResetPassword(
        {
          expiration: auth.data.verificationCodes?.resetPassword?.expiration,
          code: auth.data.verificationCodes?.resetPassword?.code,
        },
        validatedResetPasswordRequestBody,
      );

      if (canResetError) {
        return ResetPasswordController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          canResetError.message,
          LogStatus.FAIL,
          ...ResetPasswordController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      /************ Update the user's password ************/
      auth.data.password = Utils.encryptPassword(password);
      auth.data.verificationCodes = _.omit(auth.data.verificationCodes, ['resetPassword']);
      await auth.data.save({ session });

      // send reset password mail here...

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      /************ Send a successful response ************/
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.OK,
        { ...auth.data },
        {
          user: LogUsers.AUTH,
          action: LogAction.RESET_PASSWORD,
          message: 'password reset success',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: { email: '', phone: '', authId: '', profileId: '' },
        },
      );
    } catch (error) {
      /************ Abort the transaction and send an error response ************/
      console.log(error);
      !session.transaction.isActive && (await session.abortTransaction());
      session.endSession();
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

  /**
   * Validates whether the password reset can be performed.
   * @param authData - Data from the user's authentication document.
   * @param payloadData - The request payload containing the reset code.
   * @returns An error response if the reset cannot be performed, otherwise null.
   */
  private static cannotResetPassword(authData: any, payloadData: PasswordResetDto): Error | null {
    if (!authData.code) {
      return new Error('Unauthorized: No reset code provided.');
    }
    if (String(authData.code) !== String(payloadData.verificationCode)) {
      return new Error('Unauthorized: Invalid reset code.');
    }
    if (new Date() > new Date(authData.expiration)) {
      return new Error('Unauthorized: Reset code has expired.');
    }
    return null;
  }
}

export default new ResetPasswordController();
