# Application Setup and Configuration

## Environment Variables

Below is a list of the environment variables used in this application. Ensure they are properly set before running the application:

- **APPLICATION_NAME**: The name of the application.
- **NODE_ENV**: The environment in which the application is running (`development`, `production`, etc.).
- **PLAID_CLIENT_ID**: The client ID for the Plaid API.
- **PLAID_IDENTITY_TEMPLATE**: Template identifier for Plaid Identity.
- **PLAID_REDIRECT_URL**: Redirect URL for Plaid.
- **PLAID_SECRET_KEY**: Secret key for Plaid API.
- **PORT**: The port number on which the application will run.
- **JWT_SECRET_KEY**: Secret key used for JWT authentication.
- **ORIGIN**: The allowed origin for CORS.
- **MONGO_URI**: URI for connecting to the MongoDB database.
- **SENDGRID_URL**: URL for the SendGrid API.
- **SENDGRID_API_KEY**: API key for SendGrid.
- **SENDGRID_FROM_EMAIL**: The default email address to send emails from using SendGrid.
- **SIMPU_URL**: URL for the Simpu API.
- **SIMPU_KEY**: API key for Simpu.

## Getting Started

### 1. Install Dependencies
Before starting the application, ensure all dependencies are installed. Run the following command:

```bash
yarn setup <gh username>
```

### 2. Start the Application

#### Development Mode
To start the application in development mode, which includes live-reloading, run:

```bash
yarn dev
```

#### Production Mode
To start the application in production mode, first build the application and then start it:

```bash
yarn build && yarn start
```

## To-Do List

### 1. **Test Email Sending via SendGrid**
   - Integrate SendGrid for sending emails through the application.

### 2. **Double Check Each Service Transactions for Proper Sessions**
   - Ensure all service transactions are properly managed using sessions to maintain consistency.

### 3. **Add Validation Middleware to all endpoints**
   - Implement validation middleware for each controller to ensure the integrity of incoming data.

### 4. **Test the Application Flow**
   - Thoroughly test the entire application flow to identify and fix any issues.

### 5. **Setup and Test PM2 (Optional)**
   - Setup PM2 for process management and test its configuration (optional but may be recommended for production).
