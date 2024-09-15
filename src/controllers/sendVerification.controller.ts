import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, SendVerificationDto, StatusCode } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 * SendVerificationController handles the process of sending verification codes (email/mobile) to users.
 */
class SendVerificationController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.SEND_VERIFICATION, AuthModel];

  /**
   * Handles the SendVerification process.
   * @param req - Express request object containing the verification type and related data.
   * @param res - Express response object to send the response.
   */
  async SendVerification(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();
    const authProfile = res.locals.authProfile as AuthDocument;

    if (!authProfile) {
      return SendVerificationController.abortTransactionWithResponse(
        res,
        StatusCode.UNAUTHORIZED,
        session,
        'Unauthorized',
        LogStatus.FAIL,
        ...SendVerificationController.staticsInResponse,
        {
          email: '',
          phone: '',
          authId: '',
          profileId: '',
        },
      );
    }

    try {
      /************ Extract validated request data ************/
      const validatedRequestBody: SendVerificationDto & Partial<AuthDocument> = res.locals.validatedSendVerificationRequestBody;
      const { type, mobile, email } = validatedRequestBody;

      /************ Fetch the user's authentication document ************/
      const auth = await SendVerificationController.authService.findByIdMongo(authProfile._id as string, { session });

      if (!auth.status) {
        return SendVerificationController.abortTransactionWithResponse(
          res,
          StatusCode.NOT_FOUND,
          session,
          'User not found',
          LogStatus.FAIL,
          ...SendVerificationController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      /************ Check if the verification type is already verified ************/
      if (auth.data.verifications[type]) {
        return SendVerificationController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          `SendVerificationController ${type} is already verified`,
          LogStatus.FAIL,
          ...SendVerificationController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      /************ Handle mobile verification uniqueness check ************/
      if (type === 'mobile') {
        const foundAuth = await SendVerificationController.authService.findOneMongo(
          { 'mobile.phoneNumber': mobile.phoneNumber, _id: { $ne: auth.data._id } },
          {},
          { session },
        );

        if (foundAuth.status) {
          return SendVerificationController.abortTransactionWithResponse(
            res,
            StatusCode.CONFLICT,
            session,
            'Mobile number is already associated with another account',
            LogStatus.FAIL,
            ...SendVerificationController.staticsInResponse,
            { email: '', phone: mobile.phoneNumber, authId: '', profileId: '' },
          );
        }

        // Update the mobile number if it's not already set
        if (!auth.data.mobile?.phoneNumber) {
          auth.data.mobile.phoneNumber = mobile.phoneNumber;
        }
      }

      /************ Generate and set verification code ************/
      const code = Utils.generateRandomNumber(6);
      const expiration = Utils.addMinToDate(15);
      auth.data.verificationCodes = {
        ...auth.data.verificationCodes,
        [type]: { code, expiration },
      };

      /************ Save the updated authentication document ************/
      await auth.data.save({ session });

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      // Send verification code (email or SMS)
      if (type === 'email') {
        // Implement email sending logic here
      } else if (type === 'mobile') {
        // Implement SMS sending logic here
      }

      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.OK,
        { verificationSent: true },
        {
          user: LogUsers.AUTH,
          action: LogAction.SEND_VERIFICATION,
          message: 'Verification code sent successfully.',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        },
      );
    } catch (error) {
      /************ Abort the transaction and send an error response ************/
      console.log(error);
      !session.transaction.isActive && (await session.abortTransaction());
      session.endSession();
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.INTERNAL_SERVER_ERROR,
        { devError: error.message || 'Server error' },
        {
          user: LogUsers.AUTH,
          action: LogAction.SEND_VERIFICATION,
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

export default new SendVerificationController();
