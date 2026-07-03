// pages/AuthPage.js
// Shared Page Object for /login and /signup — both use the same
// email → OTP code flow and the same data-testid attributes.
import { expect } from '@playwright/test';

export class AuthPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.submitButton = page.getByTestId('submit-btn');
    // "We sent a 6-digit code to ..." panel shown after the email step succeeds
    this.successMessage = page.getByTestId('success-message');
    this.errorMessage = page.getByTestId('error-message');
    this.codeInput = page.getByPlaceholder('000000');
  }

  async gotoLogin() {
    await this.page.goto('/login');
  }

  async gotoSignup() {
    await this.page.goto('/signup');
  }

  async enterEmail(email) {
    await this.emailInput.fill(email);
  }

  async submit() {
    // The button stays disabled until the Turnstile CAPTCHA issues a token
    await expect(this.submitButton).toBeEnabled({ timeout: 20_000 });
    await this.submitButton.click();
  }

  async enterCode(code) {
    await this.codeInput.fill(code);
  }

  /** Flow helper: fill the email field and submit the form. */
  async submitEmail(email) {
    await this.enterEmail(email);
    await this.submit();
  }

  async expectSuccessMessage() {
    await this.successMessage.waitFor({ state: 'visible', timeout: 8_000 });
  }

  async expectErrorMessage() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5_000 });
  }
}
