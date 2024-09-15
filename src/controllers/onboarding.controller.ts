import { Request, Response } from 'express';
import { AuthDocument, AuthModel } from '@modules/src/mongodb';
import { LogAction, LogStatus, LogUsers, OnBoardingDto, StatusCode, UserOnboardStage, Countries, KYC } from '@modules/src/@types';
import { Utils } from '@/utils';
import { Model } from '@modules/src/services';
import APP from '../server';
import { BaseController } from './base.controller';

/**
 */
class OnboardingController extends BaseController<AuthDocument> {
  private static staticsInResponse: [LogUsers, LogAction, Model<AuthDocument>] = [LogUsers.AUTH, LogAction.ONBOARD, AuthModel];

  /**
   * Handles the user onboarding process.
   * @param req - Express request object containing the user sign-up data.
   * @param res - Express response object to send the response.
   */
  async Onboard(req: Request, res: Response) {
    const session = await APP.connection.startSession();
    session.startTransaction();

    try {
      /************ Extract validated sign-up data ************/
      const validatedOnBoardingRequestBody: OnBoardingDto & Partial<AuthDocument> = res.locals.validatedOnBoardingRequestBody;

      if (!validatedOnBoardingRequestBody) {
        return OnboardingController.abortTransactionWithResponse(
          res,
          StatusCode.BAD_REQUEST,
          session,
          'invalid request',
          LogStatus.FAIL,
          ...OnboardingController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      const { uniqueId, country, reference } = validatedOnBoardingRequestBody as OnBoardingDto;

      /************ Check if unique ID has already been used ************/
      const auth = await OnboardingController.authService.findOneMongo({ uniqueId, country }, {}, { session });
      if (auth.status) {
        return OnboardingController.abortTransactionWithResponse(
          res,
          StatusCode.ALREADY_EXISTS,
          session,
          'user already onboarded',
          LogStatus.FAIL,
          ...OnboardingController.staticsInResponse,
          {
            email: '',
            phone: '',
            authId: '',
            profileId: '',
          },
        );
      }

      const userData = { ...validatedOnBoardingRequestBody, referralCode: reference };
      if (country === Countries.NIGERIA) {
        userData.kycType = KYC.prembly;
        userData.onBoardingStage = UserOnboardStage.ON_BOARDING;
        const updatedAuth = await OnboardingController.authService.updateOneMongo(
          { uniqueId },
          {
            ...userData,
            $set: {
              'verifications.uniqueId': userData.kycType === KYC.prembly,
            },
          },
          { session },
        );
        auth.data = updatedAuth.data;
      } else {
        // unique id is the email for non nigerians
        userData.email = validatedOnBoardingRequestBody.uniqueId;
        userData.kycType = KYC.plaid;
        const updatedAuth = await OnboardingController.authService.updateOneMongo(
          { uniqueId: validatedOnBoardingRequestBody.uniqueId },
          {
            ...userData,
            $set: {
              'verifications.uniqueId': userData.kycType === KYC.plaid,
            },
          },
          { session },
        );
        auth.data = updatedAuth.data;
      }
      // let plaidToken: LinkTokenCreateResponse;
      // if (validatedOnBoardingRequestBody.country !== Countries.NIGERIA) {
      //   plaidToken = await OnboardingController.plaidService.linkTokenCreateIDV({
      //     _id: auth.data._id as string,
      //     email: auth.data.email as string,
      //   });
      // }

      /************ Commit the transaction and send a successful response ************/
      await session.commitTransaction();
      session.endSession();

      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.CREATED,
        { ...auth.data },
        {
          user: LogUsers.AUTH,
          action: LogAction.ONBOARD,
          message: 'Onboarding success.',
          status: LogStatus.SUCCESS,
          serviceLog: AuthModel,
          options: { email: uniqueId, phone: '', authId: (auth.data._id as string) || '', profileId: '' },
        },
      );
    } catch (error) {
      console.log(error);
      !session.transaction.isActive && (await session.abortTransaction());
      session.endSession();
      /************ Send an error response ************/
      return Utils.apiResponse<AuthDocument>(
        res,
        StatusCode.INTERNAL_SERVER_ERROR,
        { devError: error.message || 'server error' },
        {
          user: LogUsers.AUTH,
          action: LogAction.ONBOARD,
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

export default new OnboardingController();
