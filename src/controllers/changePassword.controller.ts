import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, ChangePasswordDto, StatusCode, KYC } from '@modules/src/@types';
import { Utils } from '@/utils';
import APP from '../server';
import { BaseController } from './base.controller';
import { Model } from '@modules/src/services';

/**
 */
class ChangePasswordController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.ONBOARD, AuthModel];

  /**
   * Handles the ChangePassword process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async ChangePassword(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();
    const authProfile = res.locals.authProfile as AuthDocument;

    if (!authProfile) {
      return ChangePasswordController.abortTransactionWithResponse(
        res,
        StatusCode.UNAUTHORIZED,
        session,
        'Unauthorized',
        LogStatus.FAIL,
        ...ChangePasswordController.staticsInResponse,
        {
          email: '',
          phone: '',
          authId: '',
          profileId: '',
        },
      );
    }

    try {
      /************ Extract validated sign-up data ************/
      const validatedChangePasswordRequestBody: ChangePasswordDto & Partial<AuthDocument> = res.locals.validatedChangePasswordRequestBody;

      const { currentPassword, password } = validatedChangePasswordRequestBody as ChangePasswordDto;
      const auth = await ChangePasswordController.authService.findOneMongo({ _id: authProfile._id, deleted: false }, {}, { session });
      const isAuthenticated = Utils.comparePasswords(currentPassword, auth.data.password);
      if (!isAuthenticated) {
        return BaseController.abortTransactionWithResponse(
          res,
          StatusCode.UNAUTHORIZED,
          session,
          'Comparison failed',
          LogStatus.FAIL,
          ...ChangePasswordController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }
      auth.data.password = Utils.encryptPassword(password);

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
          action: LogAction.CHANGE_PASSWORD,
          message: 'password change success',
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

export default new ChangePasswordController();
