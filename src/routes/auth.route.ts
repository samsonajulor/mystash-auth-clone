import { Router } from 'express';

/**** controllers *****/
import BentoOnboardController from '@/controllers/bentoOnboard.controller';
import ChangePasswordController from '@/controllers/changePassword.controller';
import ForgotPasswordController from '@/controllers/forgotPassword.controller';
import OnboardingController from '@/controllers/onboarding.controller';
import ResetPasswordController from '@/controllers/resetPassword.controller';
import SendVerificationController from '@/controllers/sendVerification.controller';
import SignInController from '@/controllers/signin.controller';
import SignUpController from '@/controllers/signup.controller';
import VerifyEmailController from '@/controllers/verifyEmail.controller';
import VerifyMobileController from '@/controllers/verifyMobile.controller';
import VerifyPlaidIdvController from '@/controllers/verifyPlaidIdv.controller';

/** Import Middlewares */
import { SignUpMiddleware } from '@middlewares/signup.middleware';
import { OnboardingMiddleware } from '@/middlewares/onboarding.middleware';

/** Import interfaces */
import { Routes } from '@modules/src/interfaces';

export class AuthRoute implements Routes {
  public path = '/';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}signup`, SignUpMiddleware, SignUpController.SignUp);
    this.router.post(`${this.path}signin`, SignInController.Signin);
    this.router.post(`${this.path}forgot_password`, ForgotPasswordController.ForgotPassword);
    this.router.post(`${this.path}reset_password`, ResetPasswordController.ResetPassword);
    this.router.put(`${this.path}change_password`, ChangePasswordController.ChangePassword);
    this.router.put(`${this.path}send_verification`, SendVerificationController.SendVerification);
    this.router.post(`${this.path}onboard`, OnboardingMiddleware, OnboardingController.Onboard);
    this.router.post(`${this.path}bento_onboard`, BentoOnboardController.Onboard);
    this.router.get(`${this.path}verify_email`, VerifyEmailController.VerifyEmail);
    this.router.get(`${this.path}verify_mobile`, VerifyMobileController.VerifyMobile);
    this.router.get(`${this.path}verify_plaid_idv/:password`, VerifyPlaidIdvController.VerifyPlaidIdv);
  }
}
