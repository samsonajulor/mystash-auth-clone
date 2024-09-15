import { cleanEnv, port, str } from 'envalid';

export const ValidateEnv = () => {
  cleanEnv(process.env, {
    APPLICATION_NAME: str(),
    NODE_ENV: str({
      choices: ['development', 'production', 'test'],
    }),
    PORT: port(),
    PLAID_CLIENT_ID: str(),
    PLAID_IDENTITY_TEMPLATE: str(),
    PLAID_REDIRECT_URL: str(),
    PLAID_SECRET_KEY: str(),
    JWT_SECRET_KEY: str(),
    ORIGIN: str(),
    MONGO_URI: str(),
    SENDGRID_URL: str(),
    SENDGRID_API_KEY: str(),
    SENDGRID_FROM_EMAIL: str(),
    SIMPU_URL: str(),
    SIMPU_KEY: str(),
  });
};
