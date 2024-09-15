import request from 'supertest';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Integration Test: Auth Module', () => {
  describe('[POST] /auth/onboard', () => {
    it('should onboard the user', async () => {
      const onboardingData = {
        uniqueId: '22177949415',
        country: 'nigeria',
        profileType: 'personal',
      };

      const response = await request(BASE_URL)
        .post('/onboard') // Use the actual route here
        .send(onboardingData);

      console.log('Test Response:', response.body);

      expect(response.body).toMatchObject({
        status: 'success',
        code: 201,
        action: 'onboard',
        message: 'Onboarding success.',
        data: {
          uniqueId: onboardingData.uniqueId,
          country: onboardingData.country,
          profileType: onboardingData.profileType,
          verifications: {
            email: false,
            mobile: false,
            uniqueId: true,
          },
        },
      });
    });
  });
});
