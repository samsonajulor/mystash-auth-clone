import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, VerifyMobileDto, StatusCode, UserOnboardStage } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 * VerifyMobileController handles the process of verifying a user's email address.
 */
class VerifyMobileController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.PHONE_VERIFICATION, AuthModel];
  /**
   * Handles the VerifyMobile process.
   * @param req - Express request object containing the email verification data.
   * @param res - Express response object to send the response.
   */
  async VerifyMobile(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      const authProfile = res.locals.authProfile;
      if (!authProfile) {
        return VerifyMobileController.abortTransactionWithResponse(
          res,
          StatusCode.UNAUTHORIZED,
          session,
          'Unauthorized',
          LogStatus.FAIL,
          ...VerifyMobileController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }
      /************ Extract validated email verification data ************/
      const validatedVerifyMobileRequestBody: VerifyMobileDto & Partial<AuthDocument> = res.locals.validatedVerifyMobileRequestBody;
      const { mobile, verificationCode } = validatedVerifyMobileRequestBody as VerifyMobileDto;

      /************ Find the user by email ************/
      const auth = await VerifyMobileController.authService.findOneMongo(
        {
          _id: authProfile.authId,
          'mobile.phoneNumber': mobile.phoneNumber,
        },
        {},
        { session },
      );

      if (!auth.status) {
        return VerifyMobileController.abortTransactionWithResponse(
          res,
          StatusCode.NOT_FOUND,
          session,
          'User not found',
          LogStatus.FAIL,
          ...VerifyMobileController.staticsInResponse,
          {
            email: '',
            phone: mobile.phoneNumber,
            authId: '',
            profileId: '',
          },
        );
      }

      /************ Check if the email verification can be performed ************/
      const canVerifyError = VerifyMobileController.canVerify(
        {
          mobile: auth.data.verifications?.mobile,
          expiration: auth.data.verificationCodes?.mobile?.expiration,
          code: auth.data.verificationCodes?.mobile?.code,
        },
        { code: verificationCode },
      );

      if (canVerifyError) {
        return VerifyMobileController.abortTransactionWithResponse(
          res,
          StatusCode.UNAUTHORIZED,
          session,
          canVerifyError.message,
          LogStatus.FAIL,
          ...VerifyMobileController.staticsInResponse,
          {
            email: '',
            phone: mobile.phoneNumber,
            authId: auth.data._id as string,
            profileId: auth.data.profile._id as string,
          },
        );
      }

      /************ Update email verification status ************/
      const { verifications, verificationCodes } = Utils.updateVerification(auth.data, 'mobile');
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
          options: { email: '', phone: mobile.phoneNumber, authId: auth.data._id as string, profileId: (auth.data.profile?._id as string) || '' },
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
  private static canVerify(authData: { mobile: boolean; code: string; expiration: string }, payloadData: { code: string }): Error | null {
    if (authData.mobile) {
      return new Error('Mobile is already verified.');
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

export default new VerifyMobileController();
