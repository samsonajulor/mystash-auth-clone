import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, VerifyEmailDto, StatusCode, UserOnboardStage } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 * VerifyEmailController handles the process of verifying a user's email address.
 */
class VerifyEmailController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.EMAIL_VERIFICATION, AuthModel];

  /**
   * Handles the VerifyEmail process.
   * @param req - Express request object containing the email verification data.
   * @param res - Express response object to send the response.
   */
  async VerifyEmail(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated email verification data ************/
      const validatedVerifyEmailRequestBody: VerifyEmailDto & Partial<AuthDocument> = res.locals.validatedVerifyEmailRequestBody;
      const { email, verificationCode } = validatedVerifyEmailRequestBody as VerifyEmailDto;

      /************ Find the user by email ************/
      const auth = await VerifyEmailController.authService.findOneMongo({ email }, {}, { session });

      if (!auth.status) {
        return VerifyEmailController.abortTransactionWithResponse(
          res,
          StatusCode.NOT_FOUND,
          session,
          'User not found',
          LogStatus.FAIL,
          ...VerifyEmailController.staticsInResponse,
          {
            email,
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      /************ Check if the email verification can be performed ************/
      const canVerifyError = VerifyEmailController.canVerify(
        {
          email: auth.data.verifications?.email,
          expiration: auth.data.verificationCodes?.email?.expiration,
          code: auth.data.verificationCodes?.email?.code,
        },
        { code: verificationCode },
      );

      if (canVerifyError) {
        return VerifyEmailController.abortTransactionWithResponse(
          res,
          StatusCode.UNAUTHORIZED,
          session,
          canVerifyError.message,
          LogStatus.FAIL,
          ...VerifyEmailController.staticsInResponse,
          {
            email,
            phone: '',
            authId: auth.data._id as string,
            profileId: auth.data.profile._id as string,
          },
        );
      }

      /************ Update email verification status ************/
      const { verifications, verificationCodes } = Utils.updateVerification(auth.data, 'email');
      auth.data.verifications = verifications;
      auth.data.onBoardingStage = UserOnboardStage.VERIFICATION;
      auth.data.verificationCodes = verificationCodes;
      await auth.data.save({ session });

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.OK,
        { ...auth.data },
        {
          user: LogUsers.AUTH,
          action: LogAction.EMAIL_VERIFICATION,
          message: 'Email verification successful.',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: { email, phone: '', authId: auth.data._id as string, profileId: (auth.data.profile?._id as string) || '' },
        },
      );
    } catch (error) {
      /************ Abort the transaction and send an error response ************/
      await session.abortTransaction();
      session.endSession();
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.UNAUTHORIZED,
        { devError: error.message || 'Server error' },
        {
          user: LogUsers.AUTH,
          action: LogAction.EMAIL_VERIFICATION,
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
   * Validates whether the email verification can be performed.
   * @param authData - Data from the user's authentication document.
   * @param payloadData - The request payload containing the verification code.
   * @returns An error if the verification cannot be performed, otherwise null.
   */
  private static canVerify(authData: { email: boolean; code: string; expiration: string }, payloadData: { code: string }): Error | null {
    if (authData.email) {
      return new Error('Email is already verified.');
    }
    if (String(authData.code) !== String(payloadData.code)) {
      return new Error('Invalid verification code.');
    }
    if (new Date() > new Date(authData.expiration)) {
      return new Error('Verification code has expired.');
    }
    return null;
  }
}

export default new VerifyEmailController();
