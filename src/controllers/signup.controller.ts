import { Request, Response } from 'express';
import { LogAction, LogStatus, LogUsers, SignUpDto, StatusCode, UserOnboardStage } from '@modules/src/@types';
import { CryptoUtils, Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';

/**
 * SignUpController handles user sign-up operations, including creating authentication records,
 * profiles, settings, and associated security settings. It ensures transactional integrity and
 * performs necessary checks to prevent duplicate entries.
 */
class SignUpController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.SIGNUP, AuthModel];

  /**
   * Handles the user sign-up process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async SignUp(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated sign-up data ************/
      const validatedSignUpRequestBody: SignUpDto & Partial<AuthDocument> = res.locals.validatedSignUpRequestBody;
      const { email, uniqueId, country, password, referral, mobile } = validatedSignUpRequestBody as SignUpDto;

      console.log({ validatedSignUpRequestBody });

      /************ Check if user with the provided email already exists ************/
      const existingUser = await SignUpController.authService.findMongo({ email }, { session });
      if (existingUser) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          'Email already exists',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      /************ Check if unique ID has already been used ************/
      const alreadyUsedId = await SignUpController.authService.findMongo({ uniqueId, country }, { session });
      if (!alreadyUsedId.status) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          'you have not onboarded',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      /************ Hash the user's password ************/
      const hashedPassword = CryptoUtils.hashPassword(password);

      /************ Generate verification code and expiration ************/
      const code = Utils.generateRandomNumber(6);
      const expiration = Utils.addMinToDate(15);

      /************ Create authentication record ************/
      const auth = await SignUpController.authService.updateOneMongo(
        {
          uniqueId,
          country,
        },
        {
          ...validatedSignUpRequestBody,
          password: hashedPassword,
          onBoardingStage: UserOnboardStage.SIGNED_UP,
          verificationCodes: { email: { code: String(code), expiration } },
          referralCode: referral,
        },
        { session },
      );

      if (!auth.status) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          auth.message || 'Failed to updated user auth',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      /************ Create profile based on the profile type ************/
      const profile = await SignUpController.createProfile(auth.data, validatedSignUpRequestBody, session);
      if (!profile.status) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          'Failed to create profile',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      /***************** update current profile for user **************/
      const currentProfile = await SignUpController.profileService.updateOneMongo(
        {
          _id: profile.data.profileId,
        },
        {
          profileType: auth.data.profileType,
          auth: auth.data._id,
          verified: true,
          isDefault: true,
        },
      );

      if (!currentProfile.status) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          currentProfile.message || 'Failed to assign current profile',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      /************ Create settings for the new user ************/
      const settings = await SignUpController.settingService.createMongo(
        {
          auth: auth.data[0]._id,
          profile: profile.data.profileId,
          appearance: { mode: 'light' },
          notifications: true,
        },
        { session },
      );

      if (!settings.status) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          settings.message || 'Failed to create settings',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      /************ Create authentication settings for the new user ************/
      const authSetting = await SignUpController.authSettingService.createMongo(
        {
          auth: auth.data[0]._id,
          setting: settings.data[0]._id,
          security: { mfa: { wasTotpEnabled: false, wasEmailEnabled: false }, faceTouchId: false, transferPin: false },
        },
        { session },
      );

      if (!authSetting.status) {
        return SignUpController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          authSetting.message || 'Failed to create auth setting',
          LogStatus.FAIL,
          ...SignUpController.staticsInResponse,
          {
            email,
            phone: mobile.phoneNumber,
            authId: existingUser.data[0]?._id as string,
            profileId: String(existingUser.data[0]?.profile),
          },
        );
      }

      // send signup email here

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.CREATED,
        { ...auth.data },
        {
          user: LogUsers.AUTH,
          action: LogAction.SIGNUP,
          message: 'Signup success.',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: { email: email || '', phone: mobile.phoneNumber || '', authId: auth.data[0]._id || '', profileId: profile.data[0]._id || '' },
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

export default new SignUpController();
