import { Response } from 'express';
import { authenticator } from 'otplib';
import {
  AdminDocument,
  AdminModel,
  AuthDocument,
  AuthSettingDocument,
  AuthSettingModel,
  AuthModel,
  BusinessDocument,
  BusinessModel,
  SettingDocument,
  SettingModel,
  UserDocument,
  UserModel,
  ProfileModel,
  ProfileDocument,
  OtpDocument,
  OtpModel,
  OtpTypes,
} from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, StatusCode, ProfileTypes, SignUpDto, LogType, GenericAnyType, DbOptions } from '@modules/src/@types';
import { CryptoUtils, Utils } from '@/utils';
import { ClientSession, Schema, Document, Model, MongoApiService, PlaidService, Types } from '@modules/src/services';

/**
 */
export class BaseController<T extends Document> {
  protected static authService = new MongoApiService<AuthDocument>(AuthModel);
  protected static plaidService = new PlaidService();
  protected static authSettingService = new MongoApiService<AuthSettingDocument>(AuthSettingModel);
  protected static settingService = new MongoApiService<SettingDocument>(SettingModel);
  protected static userService = new MongoApiService<UserDocument>(UserModel);
  protected static businessService = new MongoApiService<BusinessDocument>(BusinessModel);
  protected static profileService = new MongoApiService<ProfileDocument>(ProfileModel);
  protected static adminService = new MongoApiService<AdminDocument>(AdminModel);
  protected static otpService = new MongoApiService<OtpDocument>(OtpModel);

  /**
   * Aborts the current transaction and sends an error response.
   * @param res - Express response object.
   * @param session - MongoDB client session.
   * @param message - Error message to send in the response.
   * @param options - Additional options for the response.
   */
  protected static async abortTransactionWithResponse<T>(
    res: Response,
    statusCode: StatusCode,
    session: ClientSession,
    message: string,
    status: LogStatus,
    user: LogUsers,
    action: LogAction,
    serviceLog: Model<T>,
    options?: LogType,
  ) {
    !session.transaction.isActive && (await session.abortTransaction());
    session.endSession();
    /************ Abort transaction and send response ************/
    return Utils.apiResponse<T>(
      res,
      statusCode,
      { error: message },
      {
        user,
        action,
        message,
        status,
        serviceLog,
        options,
      },
    );
  }

  /**
   * Creates a user profile based on the profile type.
   * @param auth - Authentication document.
   * @param payload - Sign-up request data.
   * @param session - MongoDB client session.
   */
  protected static async createProfile(
    auth: AuthDocument,
    payload: SignUpDto,
    session: ClientSession,
  ): Promise<{ status: boolean; data: { profileId: Schema.Types.ObjectId }; devError?: GenericAnyType }> {
    try {
      const profileId = new Types.ObjectId() as unknown as Schema.Types.ObjectId;
      if (auth.profileType === ProfileTypes.PERSONAL) {
        /************ Create personal profile ************/
        await BaseController.userService.createMongo(
          { ...payload, uniqueId: payload.uniqueId, auth: auth._id as Schema.Types.ObjectId, profile: profileId },
          { session },
        );
        return { status: true, data: { profileId } };
      } else if (auth.profileType === ProfileTypes.BUSINESS) {
        /************ Create business profile ************/
        const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
        const apiKeys = { publicKey: PUBLIC_KEY, secretKey: PRIVATE_KEY };
        await BaseController.businessService.createMongo(
          { ...payload, apiKeys, auth: auth._id as Schema.Types.ObjectId, profile: profileId },
          { session },
        );
        return { status: true, data: { profileId } };
      } else if (auth.profileType === ProfileTypes.ADMIN) {
        /************ Create admin profile ************/
        await BaseController.adminService.createMongo({ ...payload, auth: auth._id as Schema.Types.ObjectId, profile: profileId }, { session });
        return { status: true, data: { profileId } };
      }
      return { status: false, data: null };
    } catch (error) {
      return { status: false, data: null, devError: error };
    }
  }

  /**
   * @param authProfile: number
   * @param token: string
   * @param isViaEmail: boolean
   * @return boolean
   */
  public static async isMFACodeValid(
    authProfile: ProfileDocument,
    mfaCode: string,
    isViaEmail = false,
    options?: DbOptions,
  ): Promise<{ status: boolean; message: string; devError?: GenericAnyType }> {
    if (!mfaCode) {
      return { status: false, message: 'No MFA code provided' };
    }
    try {
      const otp = await BaseController.otpService.findOneMongo(
        {
          profile: authProfile._id,
          on: authProfile.authId,
          onModel: OtpTypes.TotpMFA,
        },
        { sort: { updatedAt: -1 } },
        options,
      );
      if (isViaEmail) {
        const status = String(otp.data.code) === mfaCode;
        return { status, message: otp.message };
      }
      if (otp && otp.data.secret) {
        const status = authenticator.check(mfaCode, otp.data.secret);
        return { status, message: otp.message };
      }
      return { status: false, message: otp.message };
    } catch (error) {
      return { status: false, message: 'error validating mfa code', devError: error };
    }
  }
}
