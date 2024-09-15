import { Request, Response } from 'express';
import { AuthDocument, AuthModel, OtpTypes } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, SignInDto, StatusCode } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 * SignInController handles the sign-in process for users.
 * It includes multi-factor authentication (MFA) handling and user session management.
 */
class SignInController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.SIGNIN, AuthModel];

  /**
   * Handles the user signin process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async Signin(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated sign-in data ************/
      const validatedSignInRequestBody: SignInDto & Partial<AuthDocument> = res.locals.validatedSignInRequestBody;
      const { username, password, mfaCode } = validatedSignInRequestBody;

      /************ Find user by email or phone number ************/
      const auth = await SignInController.authService.findMongo(
        {
          $or: [{ email: username }, { 'mobile.phoneNumber': username }],
          deleted: false,
        },
        { session, populate: { path: 'profile', populate: ['profile'] } },
      );

      /************ Handle invalid credentials ************/
      if (!auth.status) {
        return SignInController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          auth.message || 'Invalid credentials',
          LogStatus.FAIL,
          ...SignInController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      const currentProfile = auth.data[0].profile;
      const authProfile = auth.data[0];
      const authId = authProfile._id as string;
      const profileId = currentProfile._id as string;
      const email = authProfile.email;
      const phone = authProfile.mobile.phoneNumber;

      /************ Validate password ************/
      const valid = Utils.comparePasswords(password, auth.data[0].password);
      if (!valid) {
        return SignInController.abortTransactionWithResponse(
          res,
          StatusCode.UNAUTHORIZED,
          session,
          'Invalid password',
          LogStatus.FAIL,
          ...SignInController.staticsInResponse,
          {
            email,
            phone,
            authId,
            profileId,
          },
        );
      }

      /************ Get user settings ************/
      const settings = await SignInController.settingService.findMongo(
        {
          auth: authId,
          profile: profileId,
        },
        { session },
      );

      if (!settings.status) {
        return SignInController.abortTransactionWithResponse(
          res,
          StatusCode.NOT_FOUND,
          session,
          settings.message || 'Failed to find user settings',
          LogStatus.FAIL,
          ...SignInController.staticsInResponse,
          {
            email,
            phone,
            authId,
            profileId,
          },
        );
      }

      /************ Check for Multi-Factor Authentication (MFA) ************/
      const wasTotpEnabled = !!settings.data[0].authSetting.security.mfa.wasTotpEnabled;
      const wasEmailEnabled = !!settings.data[0].authSetting.security.mfa.wasEmailEnabled;
      const mfaEnabled = wasTotpEnabled || wasEmailEnabled;

      /************ Validate MFA code if applicable ************/
      const isViaEmail = wasEmailEnabled && !wasTotpEnabled;
      const isMFACodeValid = await SignInController.isMFACodeValid(currentProfile, mfaCode, isViaEmail);
      if (mfaCode && !isMFACodeValid.status) {
        return SignInController.abortTransactionWithResponse(
          res,
          StatusCode.UNAUTHORIZED,
          session,
          'Invalid MFA code',
          LogStatus.FAIL,
          ...SignInController.staticsInResponse,
          {
            email: auth.data[0].email,
            phone: auth.data[0].mobile.phoneNumber,
            authId: authId,
            profileId: profileId,
          },
        );
      }

      /************ Handle MFA via email ************/
      if (isViaEmail && !isMFACodeValid.status) {
        const code: number = Utils.generateRandomNumber(6);
        const otpInput = {
          code: String(code),
          email: authProfile.email,
          verified: false,
          auth: currentProfile.authId,
          profile: authProfile._id,
          on: currentProfile.authId,
          onModel: OtpTypes.EmailMFA,
        };
        const condition = {
          auth: otpInput.auth,
          profile: otpInput.profile,
          email: otpInput.email,
          onModel: otpInput.onModel,
          deleted: false,
        };
        if (otpInput?.on) {
          condition['on'] = otpInput.on;
        }

        /************ Update or insert OTP for MFA ************/
        return SignInController.otpService.updateOneMongo(
          { ...condition },
          {
            code: otpInput.code || String(code),
            verified: !!otpInput.verified,
            updatedAt: new Date(),
            $setOnInsert: {
              auth: otpInput.auth,
              email: otpInput.email,
              on: otpInput.on,
              onModel: otpInput.onModel,
              publicId: Utils.generateUniqueId('otp'),
              createdAt: new Date(),
            },
          },
          { session },
        );
      }

      /************ Generate access token ************/
      const payload = {
        sub: currentProfile.authId,
        username: auth.data[0].email,
        mfaEnabled: mfaEnabled,
        mfaCompleted: isMFACodeValid.status,
      };
      const accessToken = Utils.createToken(payload);

      // send sign in notification.

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.OK,
        {
          auth: auth.data[0],
          accessToken,
          wasTotpEnabled,
          wasEmailEnabled,
          isMFAAuthenticated: isMFACodeValid.status,
        },
        {
          user: LogUsers.AUTH,
          action: LogAction.SIGNIN,
          message: 'Sign in success.',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: {
            email: auth.data[0].email,
            phone: auth.data[0].mobile.phoneNumber,
            authId,
            profileId,
          },
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
        { devError: error.message || 'Server error' },
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

export default new SignInController();
