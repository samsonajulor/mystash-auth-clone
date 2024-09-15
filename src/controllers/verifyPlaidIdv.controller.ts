import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, VerifyPlaidDto, StatusCode, KYC } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';
import { pick } from 'lodash';

/**
 */
class VerifyPlaidController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.PLAID_VERIFICATION, AuthModel];

  /**
   * Handles the plaid idv verification process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async VerifyPlaidIdv(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated sign-up data ************/
      const validatedVerifyPlaidRequestParams: VerifyPlaidDto & Partial<AuthDocument> = res.locals.validatedVerifyPlaidRequestParams;

      const { password } = validatedVerifyPlaidRequestParams as VerifyPlaidDto;
      const data = await VerifyPlaidController.plaidService.getIdentityVerification(password);
      if (!data || data.status !== 'success') {
        return VerifyPlaidController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          'Failed to verify plaid idv',
          LogStatus.FAIL,
          ...VerifyPlaidController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }
      const { user } = data;
      const response = {
        kycType: KYC.plaid,
        kycData: pick(data, ['kyc_check', 'id']),
        plaid: password,
        mobile: {
          phoneNumber: user?.phone_number,
          isoCode: user?.address?.country,
        },
        'verifications.uniqueId': true,
        'verifications.mobile': true,
        dob: user?.date_of_birth,
        firstName: user?.name?.given_name,
        lastName: user?.name?.family_name,
        address: user.address,
        email: user.email_address,
      };

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.OK,
        { ...response },
        {
          user: LogUsers.AUTH,
          action: LogAction.PLAID_VERIFICATION,
          message: 'verify plaid success.',
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

export default new VerifyPlaidController();
